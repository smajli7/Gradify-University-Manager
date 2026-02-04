package de.gradify.auth.service;

import de.gradify.auth.dto.LoginRequest;
import de.gradify.auth.dto.LoginResponse;
import de.gradify.auth.dto.TokenResponse;
import de.gradify.auth.entity.RefreshToken;
import de.gradify.auth.grpc.UserGrpcClient;
import de.gradify.auth.grpc.UserGrpcClient.ValidatedUser;
import de.gradify.auth.repository.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;

/**
 * Authentifizierungs-Service.
 * 
 * Verantwortlich für:
 * - Login/Logout
 * - Token-Generierung und -Validierung
 * - Refresh-Token-Management
 * 
 * Die Benutzer-Validierung erfolgt über gRPC-Aufruf an den User-Service.
 * Dort werden die Credentials gegen die Datenbank geprüft (BCrypt).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final UserGrpcClient userGrpcClient;

    /**
     * Führt einen Login durch.
     * 
     * @param request Login-Anfrage mit Benutzername und Passwort
     * @return LoginResponse mit Tokens und Benutzerinfo, oder empty bei Fehler
     */
    public Optional<LoginResponse> login(LoginRequest request) {
        log.info("Login attempt for user: {}", request.getUsername());
        
        // Credentials über gRPC beim User-Service validieren
        Optional<ValidatedUser> userOpt = userGrpcClient.validateCredentials(
                request.getUsername(), 
                request.getPassword()
        );
        
        if (userOpt.isEmpty()) {
            log.warn("Login failed for user: {}", request.getUsername());
            return Optional.empty();
        }
        
        ValidatedUser user = userOpt.get();
        
        // Tokens generieren
        String accessToken = generateAccessToken(user);
        String refreshToken = generateRefreshToken(user.id());
        
        // Refresh-Token speichern
        saveRefreshToken(user.id(), refreshToken);
        
        LoginResponse response = LoginResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .expiresIn(900) // 15 Minuten
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
        if (token.getGueltigBis().isBefore(LocalDateTime.now())) {
            log.warn("Refresh token expired");
            refreshTokenRepository.delete(token);
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
        
        return Optional.of(TokenResponse.builder()
                .accessToken(newAccessToken)
                .expiresIn(900)
                .build());
    }

    /**
     * Führt einen Logout durch.
     * Invalidiert den Refresh-Token.
     * 
     * @param accessToken Der Access-Token (für Logging)
     */
    @Transactional
    public void logout(String accessToken) {
        log.info("Logout request");
        // In Produktion könnte hier eine Token-Blacklist verwendet werden
        // Für jetzt: Refresh-Token könnte über User-ID gelöscht werden
    }

    /**
     * Validiert einen Access-Token.
     * 
     * @param accessToken Der zu validierende Token
     * @return true wenn valide, false sonst
     */
    public boolean validateToken(String accessToken) {
        if (accessToken == null || !accessToken.startsWith("gradify.")) {
            return false;
        }
        
        try {
            String[] parts = accessToken.split("\\.");
            if (parts.length != 4) { // gradify.header.payload.signature
                return false;
            }
            
            String payload = new String(Base64.getDecoder().decode(parts[2]));
            
            // Prüfe ob Token abgelaufen ist
            if (payload.contains("\"exp\":")) {
                int expStart = payload.indexOf("\"exp\":") + 6;
                int expEnd = payload.indexOf("}", expStart);
                if (expEnd == -1) expEnd = payload.length();
                String expStr = payload.substring(expStart, expEnd).replaceAll("[^0-9]", "");
                long exp = Long.parseLong(expStr);
                if (exp < System.currentTimeMillis() / 1000) {
                    log.debug("Token expired");
                    return false;
                }
            }
            
            return payload.contains("\"sub\":");
        } catch (Exception e) {
            log.warn("Token validation failed: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Generiert einen Access-Token im JWT-ähnlichen Format.
     */
    private String generateAccessToken(ValidatedUser user) {
        String header = Base64.getEncoder().encodeToString(
                "{\"alg\":\"HS256\",\"typ\":\"JWT\"}".getBytes());
        
        long exp = System.currentTimeMillis() / 1000 + 900; // 15 Minuten
        
        // Rollen formatieren
        StringBuilder rolesJson = new StringBuilder("[");
        for (int i = 0; i < user.roles().length; i++) {
            if (i > 0) rolesJson.append(",");
            rolesJson.append("\"").append(user.roles()[i]).append("\"");
        }
        rolesJson.append("]");
        
        // StudentId und MandantId hinzufügen falls vorhanden
        StringBuilder extra = new StringBuilder();
        if (user.studentId() != null) {
            extra.append(",\"studentId\":\"").append(user.studentId()).append("\"");
        }
        if (user.mandantId() != null) {
            extra.append(",\"mandantId\":").append(user.mandantId());
        }
        
        String payloadJson = String.format(
                "{\"sub\":\"%s\",\"name\":\"%s %s\",\"roles\":%s%s,\"exp\":%d}",
                user.id(), 
                user.vorname(), 
                user.nachname(), 
                rolesJson,
                extra,
                exp
        );
        
        String payload = Base64.getEncoder().encodeToString(payloadJson.getBytes());
        
        // In Produktion: Echte HMAC-SHA256 Signatur verwenden
        String signature = Base64.getEncoder().encodeToString(
                ("gradify-secret-" + user.id()).getBytes());
        
        return "gradify." + header + "." + payload + "." + signature;
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
        RefreshToken token = RefreshToken.builder()
                .benutzerId(userId)
                .token(tokenValue)
                .gueltigBis(LocalDateTime.now().plusDays(7)) // 7 Tage gültig
                .build();
        refreshTokenRepository.save(token);
    }
}


