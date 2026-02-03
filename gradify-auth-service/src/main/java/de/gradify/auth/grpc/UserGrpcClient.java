package de.gradify.auth.grpc;

import de.gradify.shared.grpc.user.*;
import io.grpc.StatusRuntimeException;
import lombok.extern.slf4j.Slf4j;
import net.devh.boot.grpc.client.inject.GrpcClient;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * gRPC Client für die Kommunikation mit dem User-Service.
 * Wird für Authentifizierung und Benutzer-Abfragen verwendet.
 */
@Component
@Slf4j
public class UserGrpcClient {

    @GrpcClient("user-service")
    private UserValidationServiceGrpc.UserValidationServiceBlockingStub userValidationStub;
    
    private volatile GrpcStatus lastStatus = new GrpcStatus(false, "Nicht initialisiert");

    /**
     * Validiert Benutzername und Passwort gegen den User-Service.
     * 
     * @param username Benutzername
     * @param password Klartext-Passwort
     * @return ValidatedUser wenn erfolgreich, Optional.empty() sonst
     */
    public Optional<ValidatedUser> validateCredentials(String username, String password) {
        log.debug("Validating credentials for user: {}", username);
        
        try {
            CredentialsRequest request = CredentialsRequest.newBuilder()
                    .setUsername(username)
                    .setPassword(password)
                    .build();
            
            CredentialsResponse response = userValidationStub.validateCredentials(request);
            lastStatus = new GrpcStatus(true, "OK");
            
            if (!response.getValid()) {
                log.debug("Credentials invalid for user: {}", username);
                return Optional.empty();
            }
            
            ValidatedUser user = new ValidatedUser(
                    response.getUserId(),
                    username,
                    response.getVorname(),
                    response.getNachname(),
                    response.getRolesList().toArray(new String[0]),
                    response.getMandantId(),
                    response.getStudentId() == 0 ? null : response.getStudentId()
            );
            
            log.debug("Credentials valid for user: {} (roles: {})", username, response.getRolesList());
            return Optional.of(user);
            
        } catch (StatusRuntimeException e) {
            log.error("gRPC error validating credentials for user: {} - {}", username, e.getStatus());
            lastStatus = new GrpcStatus(false, "Fehler: " + e.getStatus().getCode());
            return Optional.empty();
        } catch (Exception e) {
            log.error("Error validating credentials for user: {}", username, e);
            lastStatus = new GrpcStatus(false, "Fehler: " + e.getMessage());
            return Optional.empty();
        }
    }
    
    public GrpcStatus getLastStatus() {
        return lastStatus;
    }
    
    public record GrpcStatus(boolean available, String message) {}

    /**
     * Holt Benutzerinformationen anhand der ID.
     * 
     * @param userId Benutzer-ID
     * @return ValidatedUser wenn gefunden, Optional.empty() sonst
     */
    public Optional<ValidatedUser> getUserById(Long userId) {
        log.debug("Fetching user by ID: {}", userId);
        
        try {
            UserIdRequest request = UserIdRequest.newBuilder()
                    .setUserId(userId)
                    .build();
            
            UserResponse response = userValidationStub.getUserById(request);
            
            if (response.getId() == 0) {
                log.debug("User not found by ID: {}", userId);
                return Optional.empty();
            }
            
            ValidatedUser user = new ValidatedUser(
                    response.getId(),
                    response.getUsername(),
                    response.getVorname(),
                    response.getNachname(),
                    response.getRolesList().toArray(new String[0]),
                    response.getMandantId(),
                    null // StudentId ist nicht in UserResponse
            );
            
            return Optional.of(user);
            
        } catch (StatusRuntimeException e) {
            log.error("gRPC error fetching user by ID: {} - {}", userId, e.getStatus());
            return Optional.empty();
        } catch (Exception e) {
            log.error("Error fetching user by ID: {}", userId, e);
            return Optional.empty();
        }
    }

    /**
     * Holt Benutzerinformationen anhand des Benutzernamens.
     * 
     * @param username Benutzername
     * @return ValidatedUser wenn gefunden, Optional.empty() sonst
     */
    public Optional<ValidatedUser> getUserByUsername(String username) {
        log.debug("Fetching user by username: {}", username);
        
        try {
            UsernameRequest request = UsernameRequest.newBuilder()
                    .setUsername(username)
                    .build();
            
            UserResponse response = userValidationStub.getUserByUsername(request);
            
            if (response.getId() == 0) {
                log.debug("User not found by username: {}", username);
                return Optional.empty();
            }
            
            ValidatedUser user = new ValidatedUser(
                    response.getId(),
                    response.getUsername(),
                    response.getVorname(),
                    response.getNachname(),
                    response.getRolesList().toArray(new String[0]),
                    response.getMandantId(),
                    null // StudentId ist nicht in UserResponse
            );
            
            return Optional.of(user);
            
        } catch (StatusRuntimeException e) {
            log.error("gRPC error fetching user by username: {} - {}", username, e.getStatus());
            return Optional.empty();
        } catch (Exception e) {
            log.error("Error fetching user by username: {}", username, e);
            return Optional.empty();
        }
    }

    /**
     * Repräsentiert einen validierten Benutzer aus dem User-Service.
     */
    public record ValidatedUser(
            Long id,
            String username,
            String vorname,
            String nachname,
            String[] roles,
            Long mandantId,
            Long studentId  // null wenn kein Student
    ) {}
}
