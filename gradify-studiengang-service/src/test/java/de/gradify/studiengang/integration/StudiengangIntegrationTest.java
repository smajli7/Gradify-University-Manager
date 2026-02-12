package de.gradify.studiengang.integration;

import de.gradify.studiengang.dto.CreateStudiengangRequest;
import de.gradify.studiengang.entity.Mandant;
import de.gradify.studiengang.entity.Studiengang;
import de.gradify.studiengang.repository.MandantRepository;
import de.gradify.studiengang.repository.StudiengangRepository;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integrationstests fuer Studiengang-Service.
 * Testet CRUD und Queries gegen echtes Postgres.
 */
@DisplayName("Studiengang-Service Integration Tests")
class StudiengangIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private StudiengangRepository studiengangRepository;

    @Autowired
    private MandantRepository mandantRepository;

    private Long mandantId;

    @BeforeEach
    void setup() {
        studiengangRepository.deleteAll();
        mandantRepository.deleteAll();

        // Test-Mandant anlegen
        Mandant mandant = mandantRepository.save(
                Mandant.builder().name("Test-Hochschule").kuerzel("TST").aktiv(true).build());
        mandantId = mandant.getId();
    }

    @Nested
    @DisplayName("POST /api/studiengaenge")
    class CreateTests {

        @Test
        @DisplayName("Erstellt Studiengang in Postgres")
        void erstelltStudiengangInPostgres() {
            // Given
            CreateStudiengangRequest request = CreateStudiengangRequest.builder()
                    .mandantId(mandantId)
                    .name("Bioverfahrenstechnik")
                    .kuerzel("BVT")
                    .abschlussart("BACHELOR")
                    .regelstudienzeit(7)
                    .gesamtEcts(210)
                    .build();

            // When
            ResponseEntity<Map> response = restTemplate.exchange(
                    "/api/studiengaenge", HttpMethod.POST,
                    authEntity(request, "ROLE_PRUEFUNGSAMT"), Map.class);

            // Then
            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(studiengangRepository.count()).isEqualTo(1);

            Studiengang gespeichert = studiengangRepository.findAll().get(0);
            assertThat(gespeichert.getName()).isEqualTo("Bioverfahrenstechnik");
            assertThat(gespeichert.getKuerzel()).isEqualTo("BVT");
            assertThat(gespeichert.getAbschlussart()).isEqualTo(Studiengang.Abschlussart.BACHELOR);
            assertThat(gespeichert.getGesamtEcts()).isEqualTo(210);
            assertThat(gespeichert.getErstelltAm()).isNotNull();
        }

        @Test
        @DisplayName("Duplikat-Kuerzel wird von Unique-Constraint abgelehnt")
        void duplikatKuerzelWirdAbgelehnt() {
            // Given: Ersten Studiengang erstellen
            CreateStudiengangRequest req1 = CreateStudiengangRequest.builder()
                    .mandantId(mandantId)
                    .name("Bioverfahrenstechnik")
                    .kuerzel("BVT")
                    .abschlussart("BACHELOR")
                    .regelstudienzeit(7)
                    .gesamtEcts(210)
                    .build();
            restTemplate.exchange("/api/studiengaenge", HttpMethod.POST,
                    authEntity(req1, "ROLE_PRUEFUNGSAMT"), Map.class);

            // When: Zweiten mit gleichem Kuerzel erstellen
            CreateStudiengangRequest req2 = CreateStudiengangRequest.builder()
                    .mandantId(mandantId)
                    .name("Anderer Studiengang")
                    .kuerzel("BVT") // Duplikat
                    .abschlussart("MASTER")
                    .regelstudienzeit(3)
                    .gesamtEcts(90)
                    .build();
            ResponseEntity<Map> response = restTemplate.exchange(
                    "/api/studiengaenge", HttpMethod.POST,
                    authEntity(req2, "ROLE_PRUEFUNGSAMT"), Map.class);

            // Then
            assertThat(response.getStatusCode().value()).isGreaterThanOrEqualTo(400);
            assertThat(studiengangRepository.count()).isEqualTo(1);
        }
    }

    @Nested
    @DisplayName("GET /api/studiengaenge")
    class ReadTests {

        @Test
        @DisplayName("Holt alle Studiengaenge aus Postgres")
        void holtAlleStudiengaenge() {
            // Given
            createStudiengang("Bioverfahrenstechnik", "BVT", "BACHELOR", 210);
            createStudiengang("Funktionale Sicherheit", "FSA", "MASTER", 120);

            // When
            ResponseEntity<Map> response = restTemplate.exchange(
                    "/api/studiengaenge", HttpMethod.GET,
                    new HttpEntity<>(authHeaders("ROLE_STUDENT")), Map.class);

            // Then
            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        }

        @Test
        @DisplayName("Findet Studiengang nach Kuerzel")
        void findetNachKuerzel() {
            // Given
            createStudiengang("Bioverfahrenstechnik", "BVT", "BACHELOR", 210);

            // When
            ResponseEntity<Map> response = restTemplate.exchange(
                    "/api/studiengaenge/kuerzel/BVT", HttpMethod.GET,
                    new HttpEntity<>(authHeaders("ROLE_STUDENT")), Map.class);

            // Then
            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(response.getBody().get("success")).isEqualTo(true);
        }

        @Test
        @DisplayName("Unauthentifizierter Zugriff wird abgelehnt")
        void unauthentifizierterZugriffAbgelehnt() {
            // When: Ohne JWT
            ResponseEntity<Map> response = restTemplate.getForEntity(
                    "/api/studiengaenge", Map.class);

            // Then
            assertThat(response.getStatusCode().value()).isGreaterThanOrEqualTo(401);
        }
    }

    private void createStudiengang(String name, String kuerzel, String abschlussart, int ects) {
        CreateStudiengangRequest request = CreateStudiengangRequest.builder()
                .mandantId(mandantId)
                .name(name)
                .kuerzel(kuerzel)
                .abschlussart(abschlussart)
                .regelstudienzeit(abschlussart.equals("BACHELOR") ? 7 : 3)
                .gesamtEcts(ects)
                .build();
        restTemplate.exchange("/api/studiengaenge", HttpMethod.POST,
                authEntity(request, "ROLE_PRUEFUNGSAMT"), Map.class);
    }
}
