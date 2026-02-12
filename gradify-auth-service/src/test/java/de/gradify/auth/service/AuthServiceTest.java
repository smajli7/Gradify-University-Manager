package de.gradify.auth.service;

import de.gradify.auth.dto.LoginRequest;
import de.gradify.auth.dto.LoginResponse;
import de.gradify.auth.dto.TokenResponse;
import de.gradify.auth.entity.RefreshToken;
import de.gradify.auth.grpc.UserGrpcClient;
import de.gradify.auth.grpc.UserGrpcClient.ValidatedUser;
import de.gradify.auth.repository.LoginVersuchRepository;
import de.gradify.auth.repository.RefreshTokenRepository;
import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit-Tests fuer AuthService.
 * Testet Login, Token-Generierung und -Validierung.
 */
@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private LoginVersuchRepository loginVersuchRepository;

    @Mock
    private UserGrpcClient userGrpcClient;

    @Captor
    private ArgumentCaptor<RefreshToken> refreshTokenCaptor;

    private AuthService authService;

    private static final String JWT_SECRET = "test-secret-key-for-unit-tests-only-1234567890";

    @BeforeEach
    void setup() {
        authService = new AuthService(
            refreshTokenRepository,
            loginVersuchRepository,
            userGrpcClient,
            JWT_SECRET,
            900000L,   // 15 Min Access Token
            604800000L // 7 Tage Refresh Token
        );
    }

    @Nested
    @DisplayName("login")
    class Login {

        @Test
        @DisplayName("Erfolgreicher Login gibt Tokens zurueck")
        void erfolgreichesLogin() {
            // Given
            LoginRequest request = new LoginRequest("max.mustermann", "geheim123");
            
            // ValidatedUser(id, username, vorname, nachname, roles, mandantId, studentId)
            ValidatedUser user = new ValidatedUser(
                42L, "max.mustermann", "Max", "Mustermann",
                new String[]{"ROLE_STUDENT"}, 1L, 100L
            );

            when(userGrpcClient.validateCredentials("max.mustermann", "geheim123"))
                .thenReturn(Optional.of(user));

            // When
            Optional<LoginResponse> result = authService.login(request);

            // Then
            assertThat(result).isPresent();
            assertThat(result.get().getAccessToken()).isNotBlank();
            assertThat(result.get().getRefreshToken()).isNotBlank();
            assertThat(result.get().getExpiresIn()).isEqualTo(900); // 900 Sekunden

            assertThat(result.get().getUser().getId()).isEqualTo(42L);
            assertThat(result.get().getUser().getUsername()).isEqualTo("max.mustermann");
            assertThat(result.get().getUser().getRoles()).contains("ROLE_STUDENT");

            verify(refreshTokenRepository).save(any());
            verify(loginVersuchRepository).save(argThat(v -> v.isErfolgreich()));
        }

        @Test
        @DisplayName("Fehlgeschlagener Login gibt empty zurueck")
        void fehlgeschlagenesLogin() {
            // Given
            LoginRequest request = new LoginRequest("ungueltig", "falsch");
            
            when(userGrpcClient.validateCredentials("ungueltig", "falsch"))
                .thenReturn(Optional.empty());

            // When
            Optional<LoginResponse> result = authService.login(request);

            // Then
            assertThat(result).isEmpty();
            
            verify(refreshTokenRepository, never()).save(any());
            verify(loginVersuchRepository).save(argThat(v -> !v.isErfolgreich()));
        }
    }

    @Nested
    @DisplayName("validateToken / parseToken")
    class TokenValidation {

        @Test
        @DisplayName("Validiert gueltigen Token")
        void validiertGueltigeToken() {
            // Given: Token durch Login generieren
            ValidatedUser user = new ValidatedUser(
                1L, "test", "Test", "User", new String[]{"ROLE_STUDENT"}, null, null
            );
            when(userGrpcClient.validateCredentials("test", "pass"))
                .thenReturn(Optional.of(user));

            LoginRequest request = new LoginRequest("test", "pass");
            LoginResponse response = authService.login(request).orElseThrow();
            String token = response.getAccessToken();

            // When
            boolean valid = authService.validateToken(token);

            // Then
            assertThat(valid).isTrue();
        }

        @Test
        @DisplayName("Lehnt ungueltigen Token ab")
        void lehntUngueltigeTokenAb() {
            // When
            boolean valid = authService.validateToken("ungueltig.token.wert");

            // Then
            assertThat(valid).isFalse();
        }

        @Test
        @DisplayName("Lehnt null/leeren Token ab")
        void lehntNullAb() {
            assertThat(authService.validateToken(null)).isFalse();
            assertThat(authService.validateToken("")).isFalse();
            assertThat(authService.validateToken("   ")).isFalse();
        }

        @Test
        @DisplayName("parseToken extrahiert Claims")
        void parseTokenExtrahiertClaims() {
            // Given: ValidatedUser(id, username, vorname, nachname, roles, mandantId, studentId)
            ValidatedUser user = new ValidatedUser(
                42L, "test", "Max", "Mustermann", 
                new String[]{"ROLE_STUDENT", "ROLE_LEHRENDER"}, 100L, 1L
            );
            when(userGrpcClient.validateCredentials("test", "pass"))
                .thenReturn(Optional.of(user));

            LoginResponse response = authService.login(new LoginRequest("test", "pass")).orElseThrow();
            String token = response.getAccessToken();

            // When
            Claims claims = authService.parseToken(token);

            // Then
            assertThat(claims).isNotNull();
            assertThat(claims.getSubject()).isEqualTo("42");
            assertThat(claims.get("name")).isEqualTo("Max Mustermann");
            assertThat(claims.get("mandantId")).isEqualTo(100);
        }
    }

    @Nested
    @DisplayName("refreshToken")
    class RefreshTokenTest {

        @Test
        @DisplayName("Erneuert Token mit gueltigem Refresh-Token")
        void erneuertMitGueltigemRefreshToken() {
            // Given
            RefreshToken storedToken = RefreshToken.builder()
                .id(1L)
                .benutzerId(42L)
                .token("valid-refresh-token-42")
                .gueltigBis(LocalDateTime.now().plusDays(7))
                .widerrufen(false)
                .build();

            ValidatedUser user = new ValidatedUser(
                42L, "test", "Test", "User", new String[]{"ROLE_STUDENT"}, null, null
            );

            when(refreshTokenRepository.findByToken("valid-refresh-token-42"))
                .thenReturn(Optional.of(storedToken));
            when(userGrpcClient.getUserById(42L))
                .thenReturn(Optional.of(user));

            // When
            Optional<TokenResponse> result = authService.refreshToken("valid-refresh-token-42");

            // Then
            assertThat(result).isPresent();
            assertThat(result.get().getAccessToken()).isNotBlank();
            assertThat(result.get().getExpiresIn()).isEqualTo(900);
        }

        @Test
        @DisplayName("Lehnt abgelaufenen Refresh-Token ab")
        void lehntAbgelaufenenTokenAb() {
            // Given
            RefreshToken expiredToken = RefreshToken.builder()
                .id(1L)
                .benutzerId(42L)
                .token("expired-token")
                .gueltigBis(LocalDateTime.now().minusDays(1))
                .widerrufen(false)
                .build();

            when(refreshTokenRepository.findByToken("expired-token"))
                .thenReturn(Optional.of(expiredToken));

            // When
            Optional<TokenResponse> result = authService.refreshToken("expired-token");

            // Then
            assertThat(result).isEmpty();
            verify(refreshTokenRepository).delete(expiredToken);
        }

        @Test
        @DisplayName("Lehnt widerrufenen Refresh-Token ab")
        void lehntWiderrufenenTokenAb() {
            // Given
            RefreshToken revokedToken = RefreshToken.builder()
                .id(1L)
                .benutzerId(42L)
                .token("revoked-token")
                .gueltigBis(LocalDateTime.now().plusDays(7))
                .widerrufen(true)
                .build();

            when(refreshTokenRepository.findByToken("revoked-token"))
                .thenReturn(Optional.of(revokedToken));

            // When
            Optional<TokenResponse> result = authService.refreshToken("revoked-token");

            // Then
            assertThat(result).isEmpty();
        }
    }

    @Nested
    @DisplayName("logout")
    class Logout {

        @Test
        @DisplayName("Logout widerruft alle Refresh-Tokens")
        void logoutWiderruftTokens() {
            // Given
            ValidatedUser user = new ValidatedUser(
                42L, "test", "Test", "User", new String[]{"ROLE_STUDENT"}, null, null
            );
            when(userGrpcClient.validateCredentials("test", "pass"))
                .thenReturn(Optional.of(user));

            LoginResponse loginResponse = authService.login(new LoginRequest("test", "pass")).orElseThrow();
            String accessToken = loginResponse.getAccessToken();

            when(refreshTokenRepository.widerrufeAlleByBenutzerId(eq(42L), any()))
                .thenReturn(2);

            // When
            authService.logout(accessToken);

            // Then
            verify(refreshTokenRepository).widerrufeAlleByBenutzerId(eq(42L), any());
        }

        @Test
        @DisplayName("Logout mit ungueltigem Token wirft keine Exception")
        void logoutMitUngueltigemToken() {
            // Should not throw
            authService.logout("ungueltig");
        }
    }
}
