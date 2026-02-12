package de.gradify.e2e;

import org.junit.jupiter.api.*;
import org.springframework.http.*;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * E2E-Tests fuer den Auth-Flow.
 * Testet Login, Token-Validierung, Refresh und Logout durch alle Services hindurch.
 */
@DisplayName("E2E: Auth-Flow")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class AuthE2ETest extends BaseE2ETest {

    private static String accessToken;
    private static String refreshToken;

    @Test
    @Order(1)
    @DisplayName("Login ueber Gateway -> Auth-Service -> User-Service (gRPC)")
    void loginUeberGateway() {
        // Given
        Map<String, String> loginRequest = Map.of(
                "username", "admin",
                "password", "web00100113!"
        );

        // When
        ResponseEntity<Map> response = restTemplate.postForEntity(
                GATEWAY_URL + "/api/auth/login", loginRequest, Map.class);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().get("success")).isEqualTo(true);

        Map<String, Object> data = (Map<String, Object>) response.getBody().get("data");
        accessToken = (String) data.get("accessToken");
        refreshToken = (String) data.get("refreshToken");

        assertThat(accessToken).isNotBlank();
        assertThat(refreshToken).isNotBlank();
        // In application.yml: 3h = 10800s (Tests sollten nicht auf 15min hardcoden)
        assertThat(((Number) data.get("expiresIn")).intValue()).isEqualTo(10800);

        Map<String, Object> user = (Map<String, Object>) data.get("user");
        assertThat(user.get("username")).isEqualTo("admin");

        log.info("Login erfolgreich: Token erhalten (length={})", accessToken.length());
    }

    @Test
    @Order(2)
    @DisplayName("Token-Validierung ueber Gateway")
    void tokenValidierung() {
        Assumptions.assumeTrue(accessToken != null, "Login muss zuerst erfolgreich sein");

        // When
        ResponseEntity<Map> response = restTemplate.exchange(
                GATEWAY_URL + "/api/auth/validate",
                HttpMethod.GET,
                authEntity(accessToken),
                Map.class);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().get("success")).isEqualTo(true);
    }

    @Test
    @Order(3)
    @DisplayName("Token-Refresh gibt neuen Access-Token")
    void tokenRefresh() {
        Assumptions.assumeTrue(refreshToken != null, "Login muss zuerst erfolgreich sein");

        // When
        Map<String, String> refreshReq = Map.of("refreshToken", refreshToken);
        ResponseEntity<Map> response = restTemplate.postForEntity(
                GATEWAY_URL + "/api/auth/refresh", refreshReq, Map.class);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        Map<String, Object> data = (Map<String, Object>) response.getBody().get("data");
        assertThat(data.get("accessToken")).isNotNull();

        // Neuen Token fuer weitere Tests merken
        accessToken = (String) data.get("accessToken");
    }

    @Test
    @Order(4)
    @DisplayName("Fehlgeschlagener Login gibt 401")
    void fehlgeschlagenesLogin() {
        // When
        Map<String, String> loginRequest = Map.of(
                "username", "nonexistent",
                "password", "wrongpassword"
        );
        ResponseEntity<Map> response = restTemplate.postForEntity(
                GATEWAY_URL + "/api/auth/login", loginRequest, Map.class);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @Order(5)
    @DisplayName("Logout widerruft Tokens")
    void logout() {
        Assumptions.assumeTrue(accessToken != null, "Login muss zuerst erfolgreich sein");

        // When
        ResponseEntity<Map> response = restTemplate.exchange(
                GATEWAY_URL + "/api/auth/logout",
                HttpMethod.POST,
                authEntity(accessToken),
                Map.class);

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }
}
