package de.gradify.studiengang.grpc;

import de.gradify.shared.grpc.user.*;
import io.grpc.StatusRuntimeException;
import lombok.extern.slf4j.Slf4j;
import net.devh.boot.grpc.client.inject.GrpcClient;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.util.Optional;
import java.util.UUID;

/**
 * gRPC Client für den User-Service.
 * Wird verwendet um Studenten zu validieren.
 * Der Client ist lazy initialisiert um Startprobleme zu vermeiden.
 */
@Service
@Lazy
@Slf4j
public class StudentGrpcClient {

    @GrpcClient("user-service")
    private StudentDataServiceGrpc.StudentDataServiceBlockingStub studentStub;
    
    @PostConstruct
    public void init() {
        log.info("StudentGrpcClient initialized - gRPC stub: {}", studentStub != null ? "available" : "not available");
    }

    /**
     * Prüft ob ein Student existiert.
     * 
     * @param studentId Die ID des Studenten
     * @return true wenn der Student existiert, sonst false
     */
    public boolean studentExists(UUID studentId) {
        log.debug("Checking if student exists: {}", studentId);
        
        if (studentStub == null) {
            log.warn("gRPC stub not available - skipping student validation");
            return true; // In dev: Accept wenn gRPC nicht verfügbar
        }
        
        try {
            StudentIdRequest request = StudentIdRequest.newBuilder()
                    .setStudentId(studentId.toString())
                    .build();
            
            StudentExistsResponse response = studentStub.studentExists(request);
            return response.getExists();
            
        } catch (StatusRuntimeException e) {
            log.warn("gRPC error checking student existence (User-Service down?): {}", e.getMessage());
            return true; // In dev: Accept wenn Service nicht erreichbar
        } catch (Exception e) {
            log.warn("Error checking student existence: {}", e.getMessage());
            return true;
        }
    }

    /**
     * Holt einen Studenten.
     * 
     * @param studentId Die ID des Studenten
     * @return Der Student oder empty wenn nicht gefunden
     */
    public Optional<StudentInfo> getStudent(UUID studentId) {
        log.debug("Getting student: {}", studentId);
        
        if (studentStub == null) {
            log.warn("gRPC stub not available - returning empty");
            return Optional.empty();
        }
        
        try {
            StudentIdRequest request = StudentIdRequest.newBuilder()
                    .setStudentId(studentId.toString())
                    .build();
            
            StudentResponse response = studentStub.getStudent(request);
            
            if (response.getId().isEmpty()) {
                return Optional.empty();
            }
            
            return Optional.of(new StudentInfo(
                    UUID.fromString(response.getId()),
                    response.getMatrikelnummer(),
                    response.getVorname(),
                    response.getNachname(),
                    response.getStatus()
            ));
            
        } catch (StatusRuntimeException e) {
            log.warn("gRPC error getting student (User-Service down?): {}", e.getMessage());
            return Optional.empty();
        } catch (Exception e) {
            log.warn("Error getting student: {}", e.getMessage());
            return Optional.empty();
        }
    }

    /**
     * Info-Klasse für Studentendaten.
     */
    public record StudentInfo(
            UUID id,
            String matrikelnummer,
            String vorname,
            String nachname,
            String status
    ) {
        public String getFullName() {
            return vorname + " " + nachname;
        }
    }
}
