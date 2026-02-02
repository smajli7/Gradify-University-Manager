package de.gradify.user.grpc;

import de.gradify.shared.grpc.user.*;
import de.gradify.user.entity.Benutzer;
import de.gradify.user.entity.Rolle;
import de.gradify.user.entity.Student;
import de.gradify.user.repository.BenutzerRepository;
import io.grpc.stub.StreamObserver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.devh.boot.grpc.server.service.GrpcService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * gRPC Server für User-Authentifizierung und -Validierung.
 * Wird vom Auth-Service aufgerufen um Credentials zu prüfen.
 */
@GrpcService
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class UserValidationServiceGrpcImpl extends UserValidationServiceGrpc.UserValidationServiceImplBase {

    private final BenutzerRepository benutzerRepository;
    private final PasswordEncoder passwordEncoder;

    /**
     * Validiert Benutzername und Passwort.
     * Das Passwort wird mit BCrypt gegen den gespeicherten Hash geprüft.
     */
    @Override
    public void validateCredentials(CredentialsRequest request, StreamObserver<CredentialsResponse> responseObserver) {
        log.info("gRPC: ValidateCredentials called for user: {}", request.getUsername());
        
        try {
            Optional<Benutzer> benutzerOpt = benutzerRepository.findByBenutzername(request.getUsername());
            
            if (benutzerOpt.isEmpty()) {
                log.warn("User not found: {}", request.getUsername());
                responseObserver.onNext(CredentialsResponse.newBuilder()
                        .setValid(false)
                        .build());
                responseObserver.onCompleted();
                return;
            }
            
            Benutzer benutzer = benutzerOpt.get();
            
            // Prüfe ob Benutzer aktiv ist
            if (!benutzer.isAktiv()) {
                log.warn("User is inactive: {}", request.getUsername());
                responseObserver.onNext(CredentialsResponse.newBuilder()
                        .setValid(false)
                        .build());
                responseObserver.onCompleted();
                return;
            }
            
            // Passwort mit BCrypt prüfen
            String receivedPassword = request.getPassword();
            String storedHash = benutzer.getPasswortHash();
            
            log.debug("Password check - Received: '{}' (length: {})", receivedPassword, receivedPassword.length());
            log.debug("Stored hash: '{}' (length: {})", storedHash, storedHash.length());
            
            boolean passwordValid = passwordEncoder.matches(receivedPassword, storedHash);
            log.debug("Password match result: {}", passwordValid);
            
            if (!passwordValid) {
                log.warn("Invalid password for user: {}", request.getUsername());
                responseObserver.onNext(CredentialsResponse.newBuilder()
                        .setValid(false)
                        .build());
                responseObserver.onCompleted();
                return;
            }
            
            // Erfolgreiche Authentifizierung
            CredentialsResponse.Builder responseBuilder = CredentialsResponse.newBuilder()
                    .setValid(true)
                    .setUserId(benutzer.getId())
                    .setMandantId(benutzer.getMandantId())
                    .setVorname(benutzer.getVorname())
                    .setNachname(benutzer.getNachname());
            
            // Rollen hinzufügen
            for (Rolle rolle : benutzer.getRollen()) {
                responseBuilder.addRoles(rolle.getName());
            }
            
            // Student-ID hinzufügen falls vorhanden
            Student student = benutzer.getStudent();
            if (student != null) {
                responseBuilder.setStudentId(student.getId());
            }
            
            log.info("Authentication successful for user: {}", request.getUsername());
            responseObserver.onNext(responseBuilder.build());
            responseObserver.onCompleted();
            
        } catch (Exception e) {
            log.error("Error validating credentials for user: {}", request.getUsername(), e);
            responseObserver.onNext(CredentialsResponse.newBuilder()
                    .setValid(false)
                    .build());
            responseObserver.onCompleted();
        }
    }

    /**
     * Holt Benutzer anhand der ID.
     */
    @Override
    public void getUserById(UserIdRequest request, StreamObserver<UserResponse> responseObserver) {
        log.info("gRPC: GetUserById called for id: {}", request.getUserId());
        
        Long userId = request.getUserId();
        Optional<Benutzer> benutzerOpt = benutzerRepository.findById(userId);
        
        if (benutzerOpt.isPresent()) {
            responseObserver.onNext(toUserResponse(benutzerOpt.get()));
        } else {
            responseObserver.onNext(UserResponse.newBuilder().setId(0).build());
        }
        responseObserver.onCompleted();
    }

    /**
     * Holt Benutzer anhand des Benutzernamens.
     */
    @Override
    public void getUserByUsername(UsernameRequest request, StreamObserver<UserResponse> responseObserver) {
        log.info("gRPC: GetUserByUsername called for username: {}", request.getUsername());
        
        Optional<Benutzer> benutzerOpt = benutzerRepository.findByBenutzername(request.getUsername());
        
        if (benutzerOpt.isPresent()) {
            responseObserver.onNext(toUserResponse(benutzerOpt.get()));
        } else {
            responseObserver.onNext(UserResponse.newBuilder().setId(0).build());
        }
        responseObserver.onCompleted();
    }

    /**
     * Konvertiert Benutzer Entity zu gRPC Response.
     */
    private UserResponse toUserResponse(Benutzer benutzer) {
        UserResponse.Builder builder = UserResponse.newBuilder()
                .setId(benutzer.getId())
                .setUsername(benutzer.getBenutzername())
                .setEmail(benutzer.getEmail())
                .setVorname(benutzer.getVorname())
                .setNachname(benutzer.getNachname())
                .setMandantId(benutzer.getMandantId())
                .setActive(benutzer.isAktiv());
        
        for (Rolle rolle : benutzer.getRollen()) {
            builder.addRoles(rolle.getName());
        }
        
        return builder.build();
    }
}
