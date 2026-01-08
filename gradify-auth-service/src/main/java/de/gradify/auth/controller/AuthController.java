package de.gradify.auth.controller;

import de.gradify.auth.dto.LoginRequest;
import de.gradify.auth.dto.LoginResponse;
import de.gradify.auth.dto.RefreshTokenRequest;
import de.gradify.auth.dto.TokenResponse;
import de.gradify.auth.service.AuthService;
import de.gradify.shared.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@Valid @RequestBody LoginRequest request) {
        log.info("Login attempt for user: {}", request.getUsername());
        
        return authService.login(request)
            .map(response -> ResponseEntity.ok(ApiResponse.success(response, "Login erfolgreich")))
            .orElse(ResponseEntity.status(401)
                .body(ApiResponse.error("Ungueltige Anmeldedaten")));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        log.info("Logout request received");
        
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            authService.logout(token);
        }
        
        return ResponseEntity.ok(ApiResponse.success(null, "Logout erfolgreich"));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<TokenResponse>> refreshToken(
            @Valid @RequestBody RefreshTokenRequest request) {
        log.info("Token refresh request");
        
        return authService.refreshToken(request.getRefreshToken())
            .map(response -> ResponseEntity.ok(ApiResponse.success(response)))
            .orElse(ResponseEntity.status(401)
                .body(ApiResponse.error("Ungueltiger oder abgelaufener Refresh-Token")));
    }

    @GetMapping("/validate")
    public ResponseEntity<ApiResponse<Boolean>> validateToken(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        log.debug("Token validation request");
        
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.ok(ApiResponse.success(false));
        }
        
        String token = authHeader.substring(7);
        boolean valid = authService.validateToken(token);
        
        return ResponseEntity.ok(ApiResponse.success(valid));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<Object>> getCurrentUser(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        log.debug("Get current user request");
        
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401)
                .body(ApiResponse.error("Nicht authentifiziert"));
        }
        
        // Token dekodieren (vereinfacht)
        String token = authHeader.substring(7);
        if (!authService.validateToken(token)) {
            return ResponseEntity.status(401)
                .body(ApiResponse.error("Ungueltiger Token"));
        }
        
        // Payload aus Token extrahieren
        try {
            String[] parts = token.split("\\.");
            if (parts.length >= 3) {
                String payload = new String(java.util.Base64.getDecoder().decode(parts[2]));
                return ResponseEntity.ok(ApiResponse.success(
                    java.util.Map.of("tokenPayload", payload)));
            }
        } catch (Exception e) {
            log.warn("Error decoding token: {}", e.getMessage());
        }
        
        return ResponseEntity.status(401)
            .body(ApiResponse.error("Token konnte nicht dekodiert werden"));
    }
}
