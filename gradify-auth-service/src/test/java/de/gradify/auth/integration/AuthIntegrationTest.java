package de.gradify.auth.integration;

import de.gradify.auth.dto.LoginRequest;
import de.gradify.auth.dto.RefreshTokenRequest;
import de.gradify.auth.grpc.UserGrpcClient;
import de.gradify.auth.grpc.UserGrpcClient.ValidatedUser;
import de.gradify.auth.controller.AuthController;
import de.gradify.shared.dto.ApiResponse;
import de.gradify.auth.dto.LoginResponse;
import de.gradify.auth.repository.LoginVersuchRepository;
import de.gradify.auth.repository.RefreshTokenRepository;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.*;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

/**
 * Integrationstests fuer Auth-Service.
 * Testet Login, Token-Generierung und Refresh-Token-Persistenz gegen echtes Postgres.
 */
@DisplayName("Auth-Service Integration Tests")
class AuthIntegrationTest extends AbstractIntegrationTest {

    @MockBean
    private UserGrpcClient userGrpcClient;

    @Autowired
    private AuthController authController;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private LoginVersuchRepository loginVersuchRepository;

    @BeforeEach
    void setup() {
        refreshTokenRepository.deleteAll();
        loginVersuchRepository.deleteAll();
    }

    @Nested
    @DisplayName("POST /api/auth/login")
    class LoginTests {

        @Test
        @DisplayName("Erfolgreicher Login speichert Refresh-Token in Postgres")
        void loginSpeichertRefreshTokenInDb() {
            // Given
            ValidatedUser user = new ValidatedUser(
                    42L, "max.mustermann", "Max", "Mustermann",
                    new String[]{"ROLE_STUDENT"}, 1L, 100L
            );
            when(userGrpcClient.validateCredentials("max.mustermann", "geheim123"))
                    .thenReturn(Optional.of(user));

            LoginRequest request = new LoginRequest("max.mustermann", "geheim123");

            // When
            ResponseEntity<Map> response = restTemplate.postForEntity(
                    "/api/auth/login", request, Map.class);

            // Then
            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(response.getBody()).isNotNull();
            assertThat(response.getBody().get("success")).isEqualTo(true);

            Map<String, Object> data = (Map<String, Object>) response.getBody().get("data");
            assertThat(data.get("accessToken")).isNotNull();
            assertThat(data.get("refreshToken")).isNotNull();
            assertThat(data.get("expiresIn")).isEqualTo(900);

            // Refresh-Token in DB pruefen
            assertThat(refreshTokenRepository.count()).isEqualTo(1);
        }

        @Test
        @DisplayName("Fehlgeschlagener Login gibt 401 zurueck und loggt Versuch")
        void fehlgeschlagenesLoginGibt401() {
            // Given
            when(userGrpcClient.validateCredentials("ungueltig", "falsch"))
                    .thenReturn(Optional.empty());

            LoginRequest request = new LoginRequest("ungueltig", "falsch");

            // When
            ResponseEntity<ApiResponse<LoginResponse>> response = authController.login(request);

            // Then
            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);

            // Login-Versuch in DB pruefen
            assertThat(loginVersuchRepository.count()).isGreaterThanOrEqualTo(1);

            // Kein Refresh-Token gespeichert
            assertThat(refreshTokenRepository.count()).isEqualTo(0);
        }

        @Test
        @DisplayName("Login gibt korrektes User-Objekt zurueck")
        void loginGibtUserObjektZurueck() {
            // Given
            ValidatedUser user = new ValidatedUser(
                    42L, "prof.schmidt", "Prof.", "Schmidt",
                    new String[]{"ROLE_LEHRENDER", "ROLE_PRUEFUNGSAMT"}, 1L, null
            );
            when(userGrpcClient.validateCredentials("prof.schmidt", "pass123"))
                    .thenReturn(Optional.of(user));

            LoginRequest request = new LoginRequest("prof.schmidt", "pass123");

            // When
            ResponseEntity<Map> response = restTemplate.postForEntity(
                    "/api/auth/login", request, Map.class);

            // Then
            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
            Map<String, Object> data = (Map<String, Object>) response.getBody().get("data");
            Map<String, Object> userInfo = (Map<String, Object>) data.get("user");

            assertThat(userInfo.get("id")).isEqualTo(42);
            assertThat(userInfo.get("username")).isEqualTo("prof.schmidt");
        }
    }

    @Nested
    @DisplayName("POST /api/auth/refresh")
    class RefreshTests {

        @Test
        @DisplayName("Refresh-Token erneuert Access-Token")
        void refreshTokenErneuertAccessToken() {
            // Given: Login um Refresh-Token zu erhalten
            ValidatedUser user = new ValidatedUser(
                    42L, "test", "Test", "User",
                    new String[]{"ROLE_STUDENT"}, null, null
            );
            when(userGrpcClient.validateCredentials("test", "pass"))
                    .thenReturn(Optional.of(user));
            when(userGrpcClient.getUserById(42L))
                    .thenReturn(Optional.of(user));

            LoginRequest loginReq = new LoginRequest("test", "pass");
            ResponseEntity<Map> loginResp = restTemplate.postForEntity(
                    "/api/auth/login", loginReq, Map.class);

            Map<String, Object> loginData = (Map<String, Object>) loginResp.getBody().get("data");
            String refreshToken = (String) loginData.get("refreshToken");

            // When
            RefreshTokenRequest refreshReq = new RefreshTokenRequest(refreshToken);
            ResponseEntity<Map> refreshResp = restTemplate.postForEntity(
                    "/api/auth/refresh", refreshReq, Map.class);

            // Then
            assertThat(refreshResp.getStatusCode()).isEqualTo(HttpStatus.OK);
            Map<String, Object> refreshData = (Map<String, Object>) refreshResp.getBody().get("data");
            assertThat(refreshData.get("accessToken")).isNotNull();
        }
    }

    @Nested
    @DisplayName("GET /api/auth/validate")
    class ValidateTests {

        @Test
        @DisplayName("Gueltiger Token wird validiert")
        void gueltigerTokenWirdValidiert() {
            // Given: Login um Token zu erhalten
            ValidatedUser user = new ValidatedUser(
                    1L, "test", "Test", "User",
                    new String[]{"ROLE_STUDENT"}, null, null
            );
            when(userGrpcClient.validateCredentials("test", "pass"))
                    .thenReturn(Optional.of(user));

            LoginRequest loginReq = new LoginRequest("test", "pass");
            ResponseEntity<Map> loginResp = restTemplate.postForEntity(
                    "/api/auth/login", loginReq, Map.class);
            Map<String, Object> loginData = (Map<String, Object>) loginResp.getBody().get("data");
            String accessToken = (String) loginData.get("accessToken");

            // When
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(accessToken);
            ResponseEntity<Map> validateResp = restTemplate.exchange(
                    "/api/auth/validate", HttpMethod.GET,
                    new HttpEntity<>(headers), Map.class);

            // Then
            assertThat(validateResp.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(validateResp.getBody().get("success")).isEqualTo(true);
        }

        @Test
        @DisplayName("Ungueltiger Token wird als invalid erkannt")
        void ungueltigerTokenWirdAbgelehnt() {
            // When
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth("ungueltig.token.wert");
            ResponseEntity<Map> response = restTemplate.exchange(
                    "/api/auth/validate", HttpMethod.GET,
                    new HttpEntity<>(headers), Map.class);

            // Then: Controller gibt immer 200 zurueck, data=false bei ungueltigem Token
            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(response.getBody().get("data")).isEqualTo(false);
        }
    }

    @Nested
    @DisplayName("POST /api/auth/logout")
    class LogoutTests {

        @Test
        @DisplayName("Logout widerruft alle Refresh-Tokens in DB")
        void logoutWiderruftRefreshTokens() {
            // Given: Login
            ValidatedUser user = new ValidatedUser(
                    42L, "test", "Test", "User",
                    new String[]{"ROLE_STUDENT"}, null, null
            );
            when(userGrpcClient.validateCredentials("test", "pass"))
                    .thenReturn(Optional.of(user));

            LoginRequest loginReq = new LoginRequest("test", "pass");
            ResponseEntity<Map> loginResp = restTemplate.postForEntity(
                    "/api/auth/login", loginReq, Map.class);
            Map<String, Object> loginData = (Map<String, Object>) loginResp.getBody().get("data");
            String accessToken = (String) loginData.get("accessToken");

            assertThat(refreshTokenRepository.count()).isEqualTo(1);

            // When
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(accessToken);
            restTemplate.exchange("/api/auth/logout", HttpMethod.POST,
                    new HttpEntity<>(headers), Map.class);

            // Then: Refresh-Token in DB ist widerrufen
            assertThat(refreshTokenRepository.findAll().stream()
                    .allMatch(rt -> rt.isWiderrufen())).isTrue();
        }
    }
}
