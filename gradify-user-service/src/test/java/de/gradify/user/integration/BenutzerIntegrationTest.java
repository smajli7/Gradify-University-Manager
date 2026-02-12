package de.gradify.user.integration;

import de.gradify.user.dto.CreateBenutzerRequest;
import de.gradify.user.entity.Rolle;
import de.gradify.user.repository.BenutzerRepository;
import de.gradify.user.repository.RolleRepository;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;

import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integrationstests fuer User-Service.
 * Testet CRUD-Operationen, Duplikat-Constraints und Rollen gegen echtes Postgres.
 */
@DisplayName("User-Service Integration Tests")
class BenutzerIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private BenutzerRepository benutzerRepository;

    @Autowired
    private RolleRepository rolleRepository;

    @BeforeEach
    void setup() {
        benutzerRepository.deleteAll();
        // Rollen anlegen falls nicht vorhanden
        if (rolleRepository.count() == 0) {
            rolleRepository.save(Rolle.builder().name("ROLE_STUDENT").build());
            rolleRepository.save(Rolle.builder().name("ROLE_LEHRENDER").build());
            rolleRepository.save(Rolle.builder().name("ROLE_ADMIN").build());
        }
    }

    @Nested
    @DisplayName("POST /api/users")
    class CreateTests {

        @Test
        @DisplayName("Erstellt Benutzer und speichert in Postgres")
        void erstelltBenutzerInPostgres() {
            // Given
            Rolle studentRolle = rolleRepository.findAll().stream()
                    .filter(r -> r.getName().equals("ROLE_STUDENT")).findFirst().orElseThrow();

            CreateBenutzerRequest request = CreateBenutzerRequest.builder()
                    .benutzername("max.mustermann")
                    .email("max@example.com")
                    .passwort("geheim1234")
                    .vorname("Max")
                    .nachname("Mustermann")
                    .mandantId(1L)
                    .rollenIds(Set.of(studentRolle.getId()))
                    .build();

            // When
            ResponseEntity<Map> response = restTemplate.exchange(
                    "/api/users", HttpMethod.POST,
                    authEntity(request, "ROLE_ADMIN"), Map.class);

            // Then
            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(benutzerRepository.count()).isEqualTo(1);
            assertThat(benutzerRepository.findByBenutzername("max.mustermann")).isPresent();
        }

        @Test
        @DisplayName("Duplikat-Benutzername wird von DB/Service abgelehnt")
        void duplikatBenutzernameWirdAbgelehnt() {
            // Given: Ersten Benutzer erstellen
            CreateBenutzerRequest request1 = CreateBenutzerRequest.builder()
                    .benutzername("duplicate.user")
                    .email("first@example.com")
                    .passwort("geheim1234")
                    .vorname("First")
                    .nachname("User")
                    .mandantId(1L)
                    .build();
            restTemplate.exchange("/api/users", HttpMethod.POST,
                    authEntity(request1, "ROLE_ADMIN"), Map.class);

            // When: Zweiten mit gleichem Benutzernamen erstellen
            CreateBenutzerRequest request2 = CreateBenutzerRequest.builder()
                    .benutzername("duplicate.user")
                    .email("second@example.com")
                    .passwort("geheim1234")
                    .vorname("Second")
                    .nachname("User")
                    .mandantId(1L)
                    .build();
            ResponseEntity<Map> response = restTemplate.exchange(
                    "/api/users", HttpMethod.POST,
                    authEntity(request2, "ROLE_ADMIN"), Map.class);

            // Then
            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
            assertThat(benutzerRepository.count()).isEqualTo(1);
        }

        @Test
        @DisplayName("Duplikat-Email wird abgelehnt")
        void duplikatEmailWirdAbgelehnt() {
            // Given
            CreateBenutzerRequest request1 = CreateBenutzerRequest.builder()
                    .benutzername("user.one")
                    .email("same@example.com")
                    .passwort("geheim1234")
                    .vorname("User")
                    .nachname("One")
                    .mandantId(1L)
                    .build();
            restTemplate.exchange("/api/users", HttpMethod.POST,
                    authEntity(request1, "ROLE_ADMIN"), Map.class);

            // When
            CreateBenutzerRequest request2 = CreateBenutzerRequest.builder()
                    .benutzername("user.two")
                    .email("same@example.com")
                    .passwort("geheim1234")
                    .vorname("User")
                    .nachname("Two")
                    .mandantId(1L)
                    .build();
            ResponseEntity<Map> response = restTemplate.exchange(
                    "/api/users", HttpMethod.POST,
                    authEntity(request2, "ROLE_ADMIN"), Map.class);

            // Then
            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        }
    }

    @Nested
    @DisplayName("GET /api/users")
    class ReadTests {

        @Test
        @DisplayName("Holt alle Benutzer aus Postgres")
        void holtAlleBenutzer() {
            // Given: 2 Benutzer erstellen
            createTestUser("user.a", "a@test.com");
            createTestUser("user.b", "b@test.com");

            // When
            ResponseEntity<Map> response = restTemplate.exchange(
                    "/api/users", HttpMethod.GET,
                    new HttpEntity<>(authHeaders("ROLE_ADMIN")), Map.class);

            // Then
            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        }

        @Test
        @DisplayName("Unauthentifizierter Zugriff wird abgelehnt")
        void unauthentifizierterZugriffAbgelehnt() {
            // When: Ohne JWT-Token
            ResponseEntity<Map> response = restTemplate.getForEntity(
                    "/api/users", Map.class);

            // Then: 401 oder 403
            assertThat(response.getStatusCode().value()).isGreaterThanOrEqualTo(401);
        }
    }

    @Nested
    @DisplayName("DELETE /api/users/{id}")
    class DeleteTests {

        @Test
        @DisplayName("Loescht Benutzer aus Postgres")
        void loeschtBenutzerAusPostgres() {
            // Given
            createTestUser("to.delete", "delete@test.com");
            Long userId = benutzerRepository.findByBenutzername("to.delete").orElseThrow().getId();

            // When
            ResponseEntity<Map> response = restTemplate.exchange(
                    "/api/users/" + userId, HttpMethod.DELETE,
                    new HttpEntity<>(authHeaders("ROLE_ADMIN")), Map.class);

            // Then
            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(benutzerRepository.findById(userId)).isEmpty();
        }
    }

    private void createTestUser(String benutzername, String email) {
        CreateBenutzerRequest request = CreateBenutzerRequest.builder()
                .benutzername(benutzername)
                .email(email)
                .passwort("testpasswort123")
                .vorname("Test")
                .nachname("User")
                .mandantId(1L)
                .build();
        restTemplate.exchange("/api/users", HttpMethod.POST,
                authEntity(request, "ROLE_ADMIN"), Map.class);
    }
}
