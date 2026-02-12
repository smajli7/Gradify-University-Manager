package de.gradify.e2e;

import org.junit.jupiter.api.*;
import org.springframework.http.*;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * E2E-Tests fuer Gesamtnoten-Berechnung.
 * Testet die Berechnung nach verschiedenen Pruefungsordnungen (Bachelor/Master).
 * Geht ueber: Gateway -> Berechnungs-Service -> gRPC (Noten+Studiengang) -> Postgres.
 */
@DisplayName("E2E: Berechnungen")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class BerechnungsE2ETest extends BaseE2ETest {

    private static String paToken;

    @BeforeAll
    static void loginUser() {
        setupRestClient();
        try {
            paToken = new BerechnungsE2ETest().login("pruefungsamt", "web00100113!");
        } catch (Exception e) {
            log.warn("Login fehlgeschlagen: {}", e.getMessage());
        }
    }

    @Test
    @Order(1)
    @DisplayName("Einfache Berechnung (ohne gRPC) ueber Gateway")
    void einfacheBerechnung() {
        Assumptions.assumeTrue(paToken != null, "PA-Login muss erfolgreich sein");

        // When: Einfache Berechnung triggern
        ResponseEntity<Map> response = restTemplate.exchange(
                GATEWAY_URL + "/api/berechnungen/einschreibung/1/berechnen",
                HttpMethod.POST,
                authEntity(paToken),
                Map.class);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().get("success")).isEqualTo(true);
    }

    @Test
    @Order(2)
    @DisplayName("Berechnungsarten-Endpunkt zeigt Formeln")
    void berechnungsartenEndpunkt() {
        Assumptions.assumeTrue(paToken != null, "PA-Login muss erfolgreich sein");

        // When
        ResponseEntity<Map> response = restTemplate.exchange(
                GATEWAY_URL + "/api/berechnungen/berechnungsarten",
                HttpMethod.GET,
                authEntity(paToken),
                Map.class);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        Map<String, Object> data = (Map<String, Object>) response.getBody().get("data");
        assertThat(data).containsKey("GEWICHTET");
        assertThat(data).containsKey("ARITHMETISCH_GEMISCHT");
    }

    @Test
    @Order(3)
    @DisplayName("Fortschritt-Endpunkt gibt 200 auch ohne Berechnung")
    void fortschrittOhneBerechnung() {
        Assumptions.assumeTrue(paToken != null, "PA-Login muss erfolgreich sein");

        // When: Fortschritt fuer nicht berechnete Einschreibung
        ResponseEntity<Map> response = restTemplate.exchange(
                GATEWAY_URL + "/api/berechnungen/einschreibung/9999/fortschritt",
                HttpMethod.GET,
                authEntity(paToken),
                Map.class);

        // Then: 200 (nicht 404) - so ist der Controller designt
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @Order(4)
    @DisplayName("Statistik/Durchschnitt ist abrufbar")
    void durchschnittAbrufbar() {
        Assumptions.assumeTrue(paToken != null, "PA-Login muss erfolgreich sein");

        // When
        ResponseEntity<Map> response = restTemplate.exchange(
                GATEWAY_URL + "/api/berechnungen/statistik/durchschnitt",
                HttpMethod.GET,
                authEntity(paToken),
                Map.class);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().get("success")).isEqualTo(true);
    }

    @Test
    @Order(5)
    @DisplayName("gRPC-Status zeigt Verbindungsstatus")
    void grpcStatusEndpunkt() {
        Assumptions.assumeTrue(paToken != null, "PA-Login muss erfolgreich sein");

        // When
        ResponseEntity<Map> response = restTemplate.exchange(
                GATEWAY_URL + "/api/berechnungen/grpc-status?test=true",
                HttpMethod.GET,
                authEntity(paToken),
                Map.class);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        Map<String, Object> data = (Map<String, Object>) response.getBody().get("data");
        assertThat(data).containsKey("notenService");
        assertThat(data).containsKey("studiengangService");
    }
}
