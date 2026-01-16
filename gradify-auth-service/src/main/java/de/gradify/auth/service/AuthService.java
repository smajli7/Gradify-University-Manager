package de.gradify.auth.service;

import de.gradify.auth.dto.LoginRequest;
import de.gradify.auth.dto.LoginResponse;
import de.gradify.auth.dto.TokenResponse;
import de.gradify.auth.entity.RefreshToken;
import de.gradify.auth.repository.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final RefreshTokenRepository refreshTokenRepository;
    
    // Simulierte Benutzerdatenbank fuer Demo (wird spaeter durch gRPC-Aufruf ersetzt)
    private static final Map<String, UserCredentials> DEMO_USERS = new ConcurrentHashMap<>();
    
    // Student IDs aus User-Service DataSeeder (muessen uebereinstimmen!)
    private static final String STUDENT_1_ID = "aaaa1111-0000-0000-0000-000000000001";
    private static final String STUDENT_2_ID = "aaaa2222-0000-0000-0000-000000000002";
    private static final String STUDENT_3_ID = "aaaa3333-0000-0000-0000-000000000003";
    private static final String DOZENT_ID = "22222222-2222-2222-2222-222222222222";
    
    static {
        // Demo-Benutzer mit einheitlichem Passwort: web00100113!
        DEMO_USERS.put("admin", new UserCredentials(
            "00000000-0000-0000-0000-000000000001", "admin", "web00100113!",
            "System", "Administrator", new String[]{"ROLE_ADMIN"}, null));
        DEMO_USERS.put("pruefungsamt", new UserCredentials(
            "00000000-0000-0000-0000-000000000002", "pruefungsamt", "web00100113!",
            "Paula", "Pruefung", new String[]{"ROLE_PRUEFUNGSAMT"}, null));
        DEMO_USERS.put("prof.mueller", new UserCredentials(
            DOZENT_ID, "prof.mueller", "web00100113!",
            "Prof. Dr. Max", "Mueller", new String[]{"ROLE_LEHRENDER"}, null));
        // Studenten mit studentId (entspricht der Student-Entity ID im User-Service)
        DEMO_USERS.put("max.mustermann", new UserCredentials(
            STUDENT_1_ID, "max.mustermann", "web00100113!",
            "Max", "Mustermann", new String[]{"ROLE_STUDENT"}, STUDENT_1_ID));
        DEMO_USERS.put("anna.schmidt", new UserCredentials(
            STUDENT_2_ID, "anna.schmidt", "web00100113!",
            "Anna", "Schmidt", new String[]{"ROLE_STUDENT"}, STUDENT_2_ID));
        DEMO_USERS.put("leon.weber", new UserCredentials(
            STUDENT_3_ID, "leon.weber", "web00100113!",
            "Leon", "Weber", new String[]{"ROLE_STUDENT"}, STUDENT_3_ID));
    }

    public Optional<LoginResponse> login(LoginRequest request) {
        log.info("Login attempt for user: {}", request.getUsername());
        
        UserCredentials user = DEMO_USERS.get(request.getUsername());
        if (user == null || !user.password.equals(request.getPassword())) {
            log.warn("Login failed for user: {}", request.getUsername());
            return Optional.empty();
        }
        
        // Token generieren (simuliertes JWT-Format)
        String accessToken = generateAccessToken(user);
        String refreshToken = generateRefreshToken(user.id);
        
        // Refresh-Token speichern
        saveRefreshToken(user.id, refreshToken);
        
        LoginResponse response = LoginResponse.builder()
            .accessToken(accessToken)
            .refreshToken(refreshToken)
            .expiresIn(900) // 15 Minuten
            .user(LoginResponse.UserInfo.builder()
                .id(user.id)
                .username(user.username)
                .vorname(user.vorname)
                .nachname(user.nachname)
                .roles(user.roles)
                .studentId(user.studentId)
                .build())
            .build();
        
        log.info("Login successful for user: {}", request.getUsername());
        return Optional.of(response);
    }

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
        
        // Benutzer aus Demo-Datenbank holen
        String userId = token.getBenutzerId().toString();
        UserCredentials user = DEMO_USERS.values().stream()
            .filter(u -> u.id.equals(userId))
            .findFirst()
            .orElse(null);
        
        if (user == null) {
            log.warn("User not found for refresh token");
            return Optional.empty();
        }
        
        // Neuen Access-Token generieren
        String newAccessToken = generateAccessToken(user);
        
        return Optional.of(TokenResponse.builder()
            .accessToken(newAccessToken)
            .expiresIn(900)
            .build());
    }

    @Transactional
    public void logout(String accessToken) {
        log.info("Logout request");
        // Hier koennte der Token invalidiert werden (Blacklist)
        // Fuer Demo: nichts tun, Token laeuft einfach ab
    }

    public boolean validateToken(String accessToken) {
        // Einfache Validierung: Token muss mit "gradify." beginnen
        if (accessToken == null || !accessToken.startsWith("gradify.")) {
            return false;
        }
        
        try {
            // Token-Payload extrahieren und pruefen
            String[] parts = accessToken.split("\\.");
            if (parts.length != 3) {
                return false;
            }
            
            String payload = new String(Base64.getDecoder().decode(parts[1]));
            // Hier koennte Signatur/Ablauf geprueft werden
            return payload.contains("\"sub\":");
        } catch (Exception e) {
            log.warn("Token validation failed: {}", e.getMessage());
            return false;
        }
    }

    private String generateAccessToken(UserCredentials user) {
        // Simuliertes JWT-Format: header.payload.signature
        String header = Base64.getEncoder().encodeToString(
            "{\"alg\":\"HS256\",\"typ\":\"JWT\"}".getBytes());
        
        long exp = System.currentTimeMillis() / 1000 + 900; // 15 Minuten
        String payload = Base64.getEncoder().encodeToString(
            String.format("{\"sub\":\"%s\",\"name\":\"%s %s\",\"roles\":%s,\"exp\":%d}",
                user.id, user.vorname, user.nachname, 
                java.util.Arrays.toString(user.roles).replace("[", "[\"").replace("]", "\"]").replace(", ", "\",\""),
                exp).getBytes());
        
        String signature = Base64.getEncoder().encodeToString(
            ("gradify-secret-" + user.id).getBytes());
        
        return "gradify." + header + "." + payload + "." + signature;
    }

    private String generateRefreshToken(String userId) {
        return UUID.randomUUID().toString() + "-" + userId.substring(0, 8);
    }

    @Transactional
    private void saveRefreshToken(String userId, String tokenValue) {
        RefreshToken token = RefreshToken.builder()
            .benutzerId(UUID.fromString(userId))
            .token(tokenValue)
            .gueltigBis(LocalDateTime.now().plusDays(7)) // 7 Tage gueltig
            .build();
        refreshTokenRepository.save(token);
    }

    private static record UserCredentials(
        String id, String username, String password,
        String vorname, String nachname, String[] roles,
        String studentId  // null fuer Nicht-Studenten
    ) {}
}
