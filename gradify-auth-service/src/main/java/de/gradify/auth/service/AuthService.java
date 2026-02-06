package de.gradify.auth.service;

import de.gradify.auth.dto.LoginRequest;
import de.gradify.auth.dto.LoginResponse;
import de.gradify.auth.dto.TokenResponse;
import de.gradify.auth.entity.LoginVersuch;
import de.gradify.auth.entity.RefreshToken;
import de.gradify.auth.grpc.UserGrpcClient;
import de.gradify.auth.grpc.UserGrpcClient.ValidatedUser;
import de.gradify.auth.repository.LoginVersuchRepository;
import de.gradify.auth.repository.RefreshTokenRepository;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Authentifizierungs-Service.
 *
 * Verantwortlich fuer:
 * - Login/Logout
 * - Token-Generierung und -Validierung (HMAC-SHA256)
 * - Refresh-Token-Management
 * - Login-Versuch-Logging
 *
 * Die Benutzer-Validierung erfolgt ueber gRPC-Aufruf an den User-Service.
 * Dort werden die Credentials gegen die Datenbank geprueft (BCrypt).
 */
@Service
@Slf4j
public class AuthService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final LoginVersuchRepository loginVersuchRepository;
    private final UserGrpcClient userGrpcClient;
    private final SecretKey signingKey;
    private final long accessTokenExpirationMs;
    private final long refreshTokenExpirationMs;

    public AuthService(
            RefreshTokenRepository refreshTokenRepository,
            LoginVersuchRepository loginVersuchRepository,
            UserGrpcClient userGrpcClient,
            @Value("${jwt.secret}") String jwtSecret,
            @Value("${jwt.access-token-expiration:900000}") long accessTokenExpirationMs,
            @Value("${jwt.refresh-token-expiration:604800000}") long refreshTokenExpirationMs) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.loginVersuchRepository = loginVersuchRepository;
        this.userGrpcClient = userGrpcClient;
        // Verwende exakt 32 Bytes (256 bit) fuer HMAC-SHA256 – konsistent mit GradifyTokenParser
        byte[] keyBytes = jwtSecret.getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < 32) {
            keyBytes = Arrays.copyOf(keyBytes, 32);
        } else if (keyBytes.length > 32) {
            keyBytes = Arrays.copyOf(keyBytes, 32);
        }
        this.signingKey = Keys.hmacShaKeyFor(keyBytes);
        this.accessTokenExpirationMs = accessTokenExpirationMs;
        this.refreshTokenExpirationMs = refreshTokenExpirationMs;
    }

    /**
     * Fuehrt einen Login durch.
     *
     * @param request Login-Anfrage mit Benutzername und Passwort
     * @return LoginResponse mit Tokens und Benutzerinfo, oder empty bei Fehler
     */
    public Optional<LoginResponse> login(LoginRequest request) {
        log.info("Login attempt for user: {}", request.getUsername());

        // Credentials ueber gRPC beim User-Service validieren
        Optional<ValidatedUser> userOpt = userGrpcClient.validateCredentials(
                request.getUsername(),
                request.getPassword()
        );

        if (userOpt.isEmpty()) {
            log.warn("Login failed for user: {}", request.getUsername());
            logLoginVersuch(request.getUsername(), false, "Ungueltige Anmeldedaten");
            return Optional.empty();
        }

        ValidatedUser user = userOpt.get();

        // Tokens generieren
        String accessToken = generateAccessToken(user);
        String refreshToken = generateRefreshToken(user.id());

        // Refresh-Token speichern
        saveRefreshToken(user.id(), refreshToken);

        // Erfolgreichen Login loggen
        logLoginVersuch(request.getUsername(), true, null);

        int expiresInSeconds = (int) (accessTokenExpirationMs / 1000);

        LoginResponse response = LoginResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .expiresIn(expiresInSeconds)
                .user(LoginResponse.UserInfo.builder()
                        .id(user.id())
                        .username(user.username())
                        .vorname(user.vorname())
                        .nachname(user.nachname())
                        .roles(user.roles())
                        .studentId(user.studentId())
                        .mandantId(user.mandantId())
                        .build())
                .build();

        log.info("Login successful for user: {}", request.getUsername());
        return Optional.of(response);
    }

    /**
     * Erneuert den Access-Token mittels Refresh-Token.
     *
     * @param refreshTokenValue Der Refresh-Token
     * @return Neuer Access-Token, oder empty bei Fehler
     */
    public Optional<TokenResponse> refreshToken(String refreshTokenValue) {
        log.info("Token refresh request");

        Optional<RefreshToken> tokenOpt = refreshTokenRepository.findByToken(refreshTokenValue);
        if (tokenOpt.isEmpty()) {
            log.warn("Refresh token not found");
            return Optional.empty();
        }

        RefreshToken token = tokenOpt.get();

        // Pruefe Gueltigkeit UND Widerruf
        if (!token.isGueltig()) {
            log.warn("Refresh token invalid (expired={}, revoked={})", token.isAbgelaufen(), token.isWiderrufen());
            if (token.isAbgelaufen()) {
                refreshTokenRepository.delete(token);
            }
            return Optional.empty();
        }

        // Benutzer vom User-Service abrufen
        Long userId = token.getBenutzerId();
        Optional<ValidatedUser> userOpt = userGrpcClient.getUserById(userId);

        if (userOpt.isEmpty()) {
            log.warn("User not found for refresh token: {}", userId);
            return Optional.empty();
        }

        ValidatedUser user = userOpt.get();

        // Neuen Access-Token generieren
        String newAccessToken = generateAccessToken(user);

        int expiresInSeconds = (int) (accessTokenExpirationMs / 1000);

        return Optional.of(TokenResponse.builder()
                .accessToken(newAccessToken)
                .expiresIn(expiresInSeconds)
                .build());
    }

    /**
     * Fuehrt einen Logout durch.
     * Widerruft alle aktiven Refresh-Tokens des Benutzers.
     *
     * @param accessToken Der Access-Token (um Benutzer-ID zu extrahieren)
     */
    @Transactional
    public void logout(String accessToken) {
        log.info("Logout request");
        try {
            Claims claims = parseToken(accessToken);
            if (claims != null) {
                Long userId = Long.parseLong(claims.getSubject());
                int revoked = refreshTokenRepository.widerrufeAlleByBenutzerId(userId, LocalDateTime.now());
                log.info("Logout: {} refresh tokens revoked for user {}", revoked, userId);
            }
        } catch (Exception e) {
            log.warn("Could not extract user from token during logout: {}", e.getMessage());
        }
    }

    /**
     * Validiert einen Access-Token.
     *
     * @param accessToken Der zu validierende Token
     * @return true wenn valide, false sonst
     */
    public boolean validateToken(String accessToken) {
        return parseToken(accessToken) != null;
    }

    /**
     * Extrahiert die Claims aus einem Access-Token.
     *
     * @param accessToken Der Token
     * @return Claims oder null bei ungueltigem Token
     */
    public Claims parseToken(String accessToken) {
        if (accessToken == null || accessToken.isBlank()) {
            return null;
        }
        try {
            return Jwts.parser()
                    .verifyWith(signingKey)
                    .build()
                    .parseSignedClaims(accessToken)
                    .getPayload();
        } catch (ExpiredJwtException e) {
            log.debug("Token expired");
            return null;
        } catch (JwtException e) {
            log.warn("Token validation failed: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Generiert einen Access-Token mit HMAC-SHA256 Signatur.
     */
    private String generateAccessToken(ValidatedUser user) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + accessTokenExpirationMs);

        Map<String, Object> claims = new HashMap<>();
        claims.put("name", user.vorname() + " " + user.nachname());
        claims.put("roles", user.roles());
        if (user.studentId() != null) {
            claims.put("studentId", user.studentId().toString());
        }
        if (user.mandantId() != null) {
            claims.put("mandantId", user.mandantId());
        }

        return Jwts.builder()
                .claims(claims)
                .subject(String.valueOf(user.id()))
                .issuedAt(now)
                .expiration(expiry)
                .signWith(signingKey)
                .compact();
    }

    /**
     * Generiert einen Refresh-Token.
     */
    private String generateRefreshToken(Long userId) {
        return UUID.randomUUID().toString() + "-" + userId;
    }

    /**
     * Speichert einen Refresh-Token in der Datenbank.
     */
    @Transactional
    private void saveRefreshToken(Long userId, String tokenValue) {
        long refreshDays = refreshTokenExpirationMs / (1000 * 60 * 60 * 24);
        if (refreshDays < 1) refreshDays = 7;

        RefreshToken token = RefreshToken.builder()
                .benutzerId(userId)
                .token(tokenValue)
                .gueltigBis(LocalDateTime.now().plusDays(refreshDays))
                .build();
        refreshTokenRepository.save(token);
    }

    /**
     * Loggt einen Login-Versuch (erfolgreich oder fehlgeschlagen).
     */
    private void logLoginVersuch(String benutzername, boolean erfolgreich, String fehlergrund) {
        try {
            LoginVersuch versuch = LoginVersuch.builder()
                    .benutzername(benutzername)
                    .erfolgreich(erfolgreich)
                    .fehlergrund(fehlergrund)
                    .build();
            loginVersuchRepository.save(versuch);
        } catch (Exception e) {
            log.warn("Could not log login attempt: {}", e.getMessage());
        }
    }
}
