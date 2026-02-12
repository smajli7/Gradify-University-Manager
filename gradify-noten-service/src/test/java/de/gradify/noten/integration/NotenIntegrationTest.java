package de.gradify.noten.integration;

import de.gradify.noten.dto.CreateNoteRequest;
import de.gradify.noten.entity.Note;
import de.gradify.noten.repository.NoteRepository;
import de.gradify.noten.repository.NotenHistorieRepository;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integrationstests fuer Noten-Service.
 * Testet Note-Lifecycle, Validierung und Persistenz gegen echtes Postgres + RabbitMQ.
 */
@DisplayName("Noten-Service Integration Tests")
class NotenIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private NoteRepository noteRepository;

    @Autowired
    private NotenHistorieRepository notenHistorieRepository;

    @BeforeEach
    void setup() {
        notenHistorieRepository.deleteAll();
        noteRepository.deleteAll();
    }

    @Nested
    @DisplayName("POST /api/noten - Note erstellen")
    class CreateTests {

        @Test
        @DisplayName("Erstellt Note und speichert in Postgres")
        void erstelltNoteInPostgres() {
            // Given
            CreateNoteRequest request = CreateNoteRequest.builder()
                    .einschreibungId(1L)
                    .modulId(10L)
                    .noteWert(new BigDecimal("2.3"))
                    .pruefungsdatum(LocalDate.of(2025, 7, 15))
                    .build();

            // When
            ResponseEntity<Map> response = restTemplate.exchange(
                    "/api/noten", HttpMethod.POST,
                    authEntity(request, "ROLE_LEHRENDER"), Map.class);

            // Then: Controller gibt 201 CREATED zurueck
            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
            assertThat(noteRepository.count()).isEqualTo(1);

            Note gespeichert = noteRepository.findAll().get(0);
            assertThat(gespeichert.getNoteWert()).isEqualByComparingTo("2.3");
            assertThat(gespeichert.getBestanden()).isTrue();
            assertThat(gespeichert.getVersuch()).isEqualTo(1);
            assertThat(gespeichert.getStatus()).isEqualTo(Note.NoteStatus.ERFASST);
            assertThat(gespeichert.getErfasstAm()).isNotNull(); // @CreationTimestamp
        }

        @Test
        @DisplayName("Note 5.0 wird als nicht bestanden gespeichert")
        void note5IstNichtBestandenInDb() {
            // Given
            CreateNoteRequest request = CreateNoteRequest.builder()
                    .einschreibungId(1L)
                    .modulId(20L)
                    .noteWert(new BigDecimal("5.0"))
                    .bestanden(true) // Sollte ignoriert werden
                    .pruefungsdatum(LocalDate.of(2025, 7, 15))
                    .build();

            // When
            restTemplate.exchange("/api/noten", HttpMethod.POST,
                    authEntity(request, "ROLE_LEHRENDER"), Map.class);

            // Then
            Note gespeichert = noteRepository.findAll().get(0);
            assertThat(gespeichert.getBestanden()).isFalse();
        }

        @Test
        @DisplayName("Versuch wird automatisch inkrementiert")
        void versuchWirdInkrementiert() {
            // Given: Erste Note erstellen
            createNote(1L, 10L, "4.0");

            // When: Zweite Note fuer gleiches Modul
            CreateNoteRequest request2 = CreateNoteRequest.builder()
                    .einschreibungId(1L)
                    .modulId(10L)
                    .noteWert(new BigDecimal("3.0"))
                    .pruefungsdatum(LocalDate.of(2025, 8, 15))
                    .build();
            restTemplate.exchange("/api/noten", HttpMethod.POST,
                    authEntity(request2, "ROLE_LEHRENDER"), Map.class);

            // Then
            List<Note> noten = noteRepository.findByEinschreibungId(1L);
            assertThat(noten).hasSize(2);
            assertThat(noten.stream().mapToInt(Note::getVersuch).max().orElse(0)).isEqualTo(2);
        }

        @Test
        @DisplayName("Ungueltiger Notenwert wird abgelehnt")
        void ungueltigerNotenwertWirdAbgelehnt() {
            // Given
            CreateNoteRequest request = CreateNoteRequest.builder()
                    .einschreibungId(1L)
                    .modulId(10L)
                    .noteWert(new BigDecimal("2.5")) // Ungueltig
                    .pruefungsdatum(LocalDate.of(2025, 7, 15))
                    .build();

            // When
            ResponseEntity<Map> response = restTemplate.exchange(
                    "/api/noten", HttpMethod.POST,
                    authEntity(request, "ROLE_LEHRENDER"), Map.class);

            // Then
            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
            assertThat(noteRepository.count()).isEqualTo(0);
        }
    }

    @Nested
    @DisplayName("Status-Workflow: ERFASST -> VALIDIERT -> FREIGEGEBEN")
    class StatusWorkflowTests {

        @Test
        @DisplayName("Kompletter Status-Lifecycle in Postgres")
        void komplettterStatusLifecycle() {
            // Given: Note erstellen (ERFASST)
            Long noteId = createNote(1L, 10L, "2.0");

            // ERFASST -> VALIDIERT
            ResponseEntity<Map> validateResp = restTemplate.exchange(
                    "/api/noten/" + noteId + "/validate?kommentar=Korrekt",
                    HttpMethod.POST,
                    new HttpEntity<>(authHeaders("ROLE_PRUEFUNGSAMT")), Map.class);
            assertThat(validateResp.getStatusCode()).isEqualTo(HttpStatus.OK);

            Note validiert = noteRepository.findById(noteId).orElseThrow();
            assertThat(validiert.getStatus()).isEqualTo(Note.NoteStatus.VALIDIERT);
            assertThat(validiert.getValidiertAm()).isNotNull();
            assertThat(validiert.getValidiertVon()).isNotNull();

            // VALIDIERT -> FREIGEGEBEN
            ResponseEntity<Map> releaseResp = restTemplate.exchange(
                    "/api/noten/" + noteId + "/release",
                    HttpMethod.POST,
                    new HttpEntity<>(authHeaders("ROLE_PRUEFUNGSAMT")), Map.class);
            assertThat(releaseResp.getStatusCode()).isEqualTo(HttpStatus.OK);

            Note freigegeben = noteRepository.findById(noteId).orElseThrow();
            assertThat(freigegeben.getStatus()).isEqualTo(Note.NoteStatus.FREIGEGEBEN);
        }

        @Test
        @DisplayName("Validieren von VALIDIERT-Note schlaegt fehl")
        void validierenVonValidiertSchlaegtFehl() {
            // Given: Note erstellen und validieren
            Long noteId = createNote(1L, 10L, "2.0");
            restTemplate.exchange("/api/noten/" + noteId + "/validate",
                    HttpMethod.POST,
                    new HttpEntity<>(authHeaders("ROLE_PRUEFUNGSAMT")), Map.class);

            // When: Nochmals validieren
            ResponseEntity<Map> response = restTemplate.exchange(
                    "/api/noten/" + noteId + "/validate",
                    HttpMethod.POST,
                    new HttpEntity<>(authHeaders("ROLE_PRUEFUNGSAMT")), Map.class);

            // Then
            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        }
    }

    @Nested
    @DisplayName("DELETE /api/noten/{id}")
    class DeleteTests {

        @Test
        @DisplayName("Loescht ERFASST-Note aus Postgres")
        void loeschtErfassteNote() {
            // Given
            Long noteId = createNote(1L, 10L, "3.0");

            // When
            ResponseEntity<Map> response = restTemplate.exchange(
                    "/api/noten/" + noteId, HttpMethod.DELETE,
                    new HttpEntity<>(authHeaders("ROLE_ADMIN")), Map.class);

            // Then
            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(noteRepository.findById(noteId)).isEmpty();
        }

        @Test
        @DisplayName("Loeschen von VALIDIERT-Note schlaegt fehl")
        void loeschenValidierterNoteSchlaegtFehl() {
            // Given: Note validieren
            Long noteId = createNote(1L, 10L, "2.0");
            restTemplate.exchange("/api/noten/" + noteId + "/validate",
                    HttpMethod.POST,
                    new HttpEntity<>(authHeaders("ROLE_PRUEFUNGSAMT")), Map.class);

            // When
            ResponseEntity<Map> response = restTemplate.exchange(
                    "/api/noten/" + noteId, HttpMethod.DELETE,
                    new HttpEntity<>(authHeaders("ROLE_ADMIN")), Map.class);

            // Then
            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
            assertThat(noteRepository.findById(noteId)).isPresent();
        }
    }

    @Nested
    @DisplayName("Audit-Historie")
    class AuditTests {

        @Test
        @DisplayName("Jede Aktion erzeugt Audit-Eintrag in Postgres")
        void aktionenErzeugenAuditEintraege() {
            // Given: Note erstellen -> validieren -> freigeben
            Long noteId = createNote(1L, 10L, "2.0");
            restTemplate.exchange("/api/noten/" + noteId + "/validate",
                    HttpMethod.POST,
                    new HttpEntity<>(authHeaders("ROLE_PRUEFUNGSAMT")), Map.class);
            restTemplate.exchange("/api/noten/" + noteId + "/release",
                    HttpMethod.POST,
                    new HttpEntity<>(authHeaders("ROLE_PRUEFUNGSAMT")), Map.class);

            // Then: 3 Audit-Eintraege (ERSTELLT, VALIDIERT, FREIGEGEBEN)
            assertThat(notenHistorieRepository.count()).isGreaterThanOrEqualTo(3);
        }
    }

    /**
     * Hilfsmethode: Erstellt eine Note und gibt die ID zurueck.
     */
    private Long createNote(Long einschreibungId, Long modulId, String noteWert) {
        CreateNoteRequest request = CreateNoteRequest.builder()
                .einschreibungId(einschreibungId)
                .modulId(modulId)
                .noteWert(new BigDecimal(noteWert))
                .pruefungsdatum(LocalDate.of(2025, 7, 15))
                .build();

        restTemplate.exchange("/api/noten", HttpMethod.POST,
                authEntity(request, "ROLE_LEHRENDER"), Map.class);

        return noteRepository.findAll().stream()
                .filter(n -> n.getEinschreibungId().equals(einschreibungId)
                        && n.getModulId().equals(modulId)
                        && n.getNoteWert().compareTo(new BigDecimal(noteWert)) == 0)
                .findFirst()
                .orElseThrow()
                .getId();
    }
}
