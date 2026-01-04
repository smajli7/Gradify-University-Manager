package de.gradify.studiengang.grpc;

import de.gradify.shared.grpc.user.*;
import io.grpc.StatusRuntimeException;
import lombok.extern.slf4j.Slf4j;
import net.devh.boot.grpc.client.inject.GrpcClient;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;

/**
 * gRPC Client für den User-Service.
 * Wird verwendet um Studenten zu validieren.
 */
@Service
@Slf4j
public class StudentGrpcClient {

    @GrpcClient("user-service")
    private StudentDataServiceGrpc.StudentDataServiceBlockingStub studentStub;

    /**
     * Prüft ob ein Student existiert.
     * 
     * @param studentId Die ID des Studenten
     * @return true wenn der Student existiert, sonst false
     */
    public boolean studentExists(UUID studentId) {
        log.debug("Checking if student exists: {}", studentId);
        
        try {
            StudentIdRequest request = StudentIdRequest.newBuilder()
                    .setStudentId(studentId.toString())
                    .build();
            
            StudentExistsResponse response = studentStub.studentExists(request);
            return response.getExists();
            
        } catch (StatusRuntimeException e) {
            log.error("gRPC error checking student existence: {}", e.getMessage());
            return false;
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
            log.error("gRPC error getting student: {}", e.getMessage());
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

