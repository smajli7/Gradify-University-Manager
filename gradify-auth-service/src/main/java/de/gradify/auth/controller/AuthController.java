package de.gradify.auth.controller;

import de.gradify.auth.dto.LoginRequest;
import de.gradify.auth.dto.LoginResponse;
import de.gradify.auth.dto.RefreshTokenRequest;
import de.gradify.auth.dto.TokenResponse;
import de.gradify.auth.grpc.UserGrpcClient;
import de.gradify.auth.service.AuthService;
import de.gradify.shared.dto.ApiResponse;
import io.jsonwebtoken.Claims;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final AuthService authService;
    private final UserGrpcClient userGrpcClient;

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
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCurrentUser(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        log.debug("Get current user request");
        
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401)
                .body(ApiResponse.error("Nicht authentifiziert"));
        }
        
        String token = authHeader.substring(7);
        Claims claims = authService.parseToken(token);
        if (claims == null) {
            return ResponseEntity.status(401)
                .body(ApiResponse.error("Ungueltiger Token"));
        }
        
        // Strukturierte Antwort aus Claims erstellen
        Map<String, Object> userInfo = new HashMap<>();
        userInfo.put("sub", claims.getSubject());
        userInfo.put("name", claims.get("name", String.class));
        userInfo.put("roles", claims.get("roles"));
        userInfo.put("exp", claims.getExpiration().getTime() / 1000);
        if (claims.get("studentId") != null) {
            userInfo.put("studentId", claims.get("studentId"));
        }
        if (claims.get("mandantId") != null) {
            userInfo.put("mandantId", claims.get("mandantId"));
        }
        
        return ResponseEntity.ok(ApiResponse.success(
            Map.of("tokenPayload", userInfo)));
    }
    
    @GetMapping("/grpc-status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getGrpcStatus() {
        var userStatus = userGrpcClient.getLastStatus();
        
        Map<String, Object> status = Map.of(
            "userService", Map.of(
                "available", userStatus.available(),
                "message", userStatus.message(),
                "protocol", "gRPC",
                "port", 9082
            ),
            "allAvailable", userStatus.available()
        );
        
        return ResponseEntity.ok(ApiResponse.success(status));
    }
}
