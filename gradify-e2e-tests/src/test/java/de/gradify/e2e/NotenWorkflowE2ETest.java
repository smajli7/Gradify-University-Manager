package de.gradify.e2e;

import org.junit.jupiter.api.*;
import org.springframework.http.*;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * E2E-Tests fuer den Noten-Workflow.
 * Testet den kompletten Lifecycle: Note erstellen -> validieren -> freigeben -> Berechnung.
 * Geht ueber: Gateway -> Noten-Service -> RabbitMQ -> Berechnungs-Service -> gRPC.
 */
@DisplayName("E2E: Noten-Workflow")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class NotenWorkflowE2ETest extends BaseE2ETest {

    private static String lehrerToken;
    private static String paToken;
    private static Long noteId;

    @BeforeAll
    static void loginUsers() {
        setupRestClient();
        try {
            // Lehrender und Pruefungsamt einloggen
            // Annahme: Test-User existieren (via seed-data.sql oder manuelle Einrichtung)
            lehrerToken = new NotenWorkflowE2ETest().login("prof.schmidt", "web00100113!");
            paToken = new NotenWorkflowE2ETest().login("pruefungsamt", "web00100113!");
        } catch (Exception e) {
            log.warn("Login fehlgeschlagen - E2E-Services evtl. nicht gestartet: {}", e.getMessage());
        }
    }

    @Test
    @Order(1)
    @DisplayName("Lehrender erstellt Note via Gateway")
    void lehrerErstelltNote() {
        Assumptions.assumeTrue(lehrerToken != null, "Lehrer-Login muss erfolgreich sein");

        // Given: Note fuer einen Studenten
        Map<String, Object> noteRequest = Map.of(
                "einschreibungId", 1,
                "modulId", 2,
                "noteWert", 2.3,
                "pruefungsdatum", "2025-07-15"
        );

        // When
        ResponseEntity<Map> response = restTemplate.exchange(
                GATEWAY_URL + "/api/noten",
                HttpMethod.POST,
                authEntity(lehrerToken, noteRequest),
                Map.class);

        // Then: Controller gibt 201 CREATED zurueck
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().get("success")).isEqualTo(true);

        Map<String, Object> data = (Map<String, Object>) response.getBody().get("data");
        noteId = ((Number) data.get("id")).longValue();
        assertThat(data.get("noteWert")).isEqualTo(2.3);
        assertThat(data.get("status")).isEqualTo("ERFASST");
        assertThat(data.get("bestanden")).isEqualTo(true);

        log.info("Note erstellt mit ID: {}", noteId);
    }

    @Test
    @Order(2)
    @DisplayName("Pruefungsamt validiert Note")
    void pruefungsamtValidiertNote() {
        Assumptions.assumeTrue(noteId != null, "Note muss zuerst erstellt sein");
        Assumptions.assumeTrue(paToken != null, "PA-Login muss erfolgreich sein");

        // When
        ResponseEntity<Map> response = restTemplate.exchange(
                GATEWAY_URL + "/api/noten/" + noteId + "/validate?kommentar=Geprueft",
                HttpMethod.POST,
                authEntity(paToken),
                Map.class);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        Map<String, Object> data = (Map<String, Object>) response.getBody().get("data");
        assertThat(data.get("status")).isEqualTo("VALIDIERT");
    }

    @Test
    @Order(3)
    @DisplayName("Pruefungsamt gibt Note frei")
    void pruefungsamtGibtNoteFrei() {
        Assumptions.assumeTrue(noteId != null, "Note muss zuerst validiert sein");

        // When
        ResponseEntity<Map> response = restTemplate.exchange(
                GATEWAY_URL + "/api/noten/" + noteId + "/release",
                HttpMethod.POST,
                authEntity(paToken),
                Map.class);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        Map<String, Object> data = (Map<String, Object>) response.getBody().get("data");
        assertThat(data.get("status")).isEqualTo("FREIGEGEBEN");
    }

    @Test
    @Order(4)
    @DisplayName("Note 5.0 wird als nicht bestanden erstellt")
    void note5IstNichtBestanden() {
        Assumptions.assumeTrue(lehrerToken != null, "Lehrer-Login muss erfolgreich sein");

        // Given
        Map<String, Object> noteRequest = Map.of(
                "einschreibungId", 1,
                "modulId", 3,
                "noteWert", 5.0,
                "bestanden", true, // Sollte ignoriert werden
                "pruefungsdatum", "2025-07-15"
        );

        // When
        ResponseEntity<Map> response = restTemplate.exchange(
                GATEWAY_URL + "/api/noten",
                HttpMethod.POST,
                authEntity(lehrerToken, noteRequest),
                Map.class);

        // Then: Controller gibt 201 CREATED zurueck
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        Map<String, Object> data = (Map<String, Object>) response.getBody().get("data");
        assertThat(data.get("bestanden")).isEqualTo(false);
    }

    @Test
    @Order(5)
    @DisplayName("Ungueltiger Notenwert (2.5) wird abgelehnt")
    void ungueltigerNotenwertWirdAbgelehnt() {
        Assumptions.assumeTrue(lehrerToken != null, "Lehrer-Login muss erfolgreich sein");

        // Given
        Map<String, Object> noteRequest = Map.of(
                "einschreibungId", 1,
                "modulId", 4,
                "noteWert", 2.5,
                "pruefungsdatum", "2025-07-15"
        );

        // When
        ResponseEntity<Map> response = restTemplate.exchange(
                GATEWAY_URL + "/api/noten",
                HttpMethod.POST,
                authEntity(lehrerToken, noteRequest),
                Map.class);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    @Order(6)
    @DisplayName("Student kann Noten lesen aber nicht erstellen")
    void studentKannNurLesen() {
        // Given: Student einloggen
        String studentToken;
        try {
            studentToken = login("max.mustermann", "web00100113!");
        } catch (Exception e) {
            log.warn("Student-Login fehlgeschlagen: {}", e.getMessage());
            Assumptions.abort("Student-Login fehlgeschlagen");
            return;
        }

        // Lesen erlaubt
        ResponseEntity<Map> getResp = restTemplate.exchange(
                GATEWAY_URL + "/api/noten",
                HttpMethod.GET,
                authEntity(studentToken),
                Map.class);
        assertThat(getResp.getStatusCode()).isEqualTo(HttpStatus.OK);

        // Erstellen verboten (Student hat keine ROLE_LEHRENDER)
        Map<String, Object> noteRequest = Map.of(
                "einschreibungId", 1,
                "modulId", 4,
                "noteWert", 2.0,
                "pruefungsdatum", "2025-07-15"
        );
        ResponseEntity<Map> postResp = restTemplate.exchange(
                GATEWAY_URL + "/api/noten",
                HttpMethod.POST,
                authEntity(studentToken, noteRequest),
                Map.class);
        assertThat(postResp.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }
}
