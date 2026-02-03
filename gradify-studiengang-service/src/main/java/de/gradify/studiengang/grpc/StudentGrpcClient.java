package de.gradify.studiengang.grpc;

import de.gradify.shared.grpc.user.*;
import de.gradify.studiengang.entity.Einschreibung;
import de.gradify.studiengang.repository.EinschreibungRepository;
import io.grpc.StatusRuntimeException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.devh.boot.grpc.client.inject.GrpcClient;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

/**
 * gRPC Client für den User-Service.
 * Wird verwendet um Studenten zu validieren.
 * Der Client ist lazy initialisiert um Startprobleme zu vermeiden.
 */
@Service
@Lazy
@Slf4j
@RequiredArgsConstructor
public class StudentGrpcClient {

    private final EinschreibungRepository einschreibungRepository;

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
     * @return StudentValidationResult mit Status und gRPC-Verfügbarkeit
     */
    public StudentValidationResult studentExists(Long studentId) {
        log.debug("Checking if student exists: {}", studentId);
        
        if (studentStub == null) {
            log.error("gRPC stub not available - cannot validate student!");
            return new StudentValidationResult(false, false, "gRPC nicht verfügbar");
        }
        
        try {
            StudentIdRequest request = StudentIdRequest.newBuilder()
                    .setStudentId(studentId)
                    .build();
            
            StudentExistsResponse response = studentStub.studentExists(request);
            return new StudentValidationResult(response.getExists(), true, "gRPC OK");
            
        } catch (StatusRuntimeException e) {
            log.error("gRPC error checking student existence: {} - {}", e.getStatus().getCode(), e.getMessage());
            return new StudentValidationResult(false, false, "gRPC Fehler: " + e.getStatus().getCode());
        } catch (Exception e) {
            log.error("Error checking student existence: {}", e.getMessage());
            return new StudentValidationResult(false, false, "Fehler: " + e.getMessage());
        }
    }
    
    /**
     * Ergebnis der Student-Validierung mit gRPC-Status.
     */
    public record StudentValidationResult(
            boolean exists,
            boolean grpcAvailable,
            String statusMessage
    ) {}

    /**
     * Holt einen Studenten.
     * 
     * @param studentId Die ID des Studenten
     * @return Der Student oder empty wenn nicht gefunden
     */
    public Optional<StudentInfo> getStudent(Long studentId) {
        log.debug("Getting student: {}", studentId);
        
        if (studentStub == null) {
            log.warn("gRPC stub not available - returning empty");
            return Optional.empty();
        }
        
        try {
            StudentIdRequest request = StudentIdRequest.newBuilder()
                    .setStudentId(studentId)
                    .build();
            
            StudentResponse response = studentStub.getStudent(request);
            
            if (response.getId() == 0) {
                return Optional.empty();
            }
            
            return Optional.of(new StudentInfo(
                    response.getId(),
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
     * Holt alle Studenten eines Studiengangs.
     * Ermittelt zuerst die Student-IDs aus den Einschreibungen, dann User-Service per GetStudentsByIds.
     *
     * @param studiengangId Die Studiengang-ID
     * @return Liste der Studenten (leer wenn keine gefunden oder Fehler)
     */
    public List<StudentInfo> getStudentsByStudiengang(Long studiengangId) {
        log.debug("Getting students for studiengang: {}", studiengangId);
        
        if (studentStub == null) {
            log.warn("gRPC stub not available - returning empty list");
            return Collections.emptyList();
        }
        
        List<Long> studentIds = einschreibungRepository.findAktiveByStudiengangId(studiengangId).stream()
                .map(Einschreibung::getStudentId)
                .distinct()
                .toList();
        
        if (studentIds.isEmpty()) {
            log.info("gRPC: No enrollments for studiengang: {}", studiengangId);
            return Collections.emptyList();
        }
        
        return getStudentsByIds(studentIds);
    }

    /**
     * Holt Studenten anhand einer Liste von IDs.
     */
    public List<StudentInfo> getStudentsByIds(List<Long> studentIds) {
        if (studentStub == null || studentIds == null || studentIds.isEmpty()) {
            return Collections.emptyList();
        }
        try {
            StudentIdsRequest request = StudentIdsRequest.newBuilder()
                    .addAllStudentIds(studentIds)
                    .build();
            StudentListResponse response = studentStub.getStudentsByIds(request);
            List<StudentInfo> students = new ArrayList<>();
            for (StudentResponse sr : response.getStudentsList()) {
                if (sr.getId() != 0) {
                    students.add(new StudentInfo(
                            sr.getId(),
                            sr.getMatrikelnummer(),
                            sr.getVorname(),
                            sr.getNachname(),
                            sr.getStatus()
                    ));
                }
            }
            return students;
        } catch (StatusRuntimeException e) {
            log.warn("gRPC error getting students by IDs: {}", e.getMessage());
            return Collections.emptyList();
        } catch (Exception e) {
            log.warn("Error getting students by IDs: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * Info-Klasse für Studentendaten.
     */
    public record StudentInfo(
            Long id,
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
