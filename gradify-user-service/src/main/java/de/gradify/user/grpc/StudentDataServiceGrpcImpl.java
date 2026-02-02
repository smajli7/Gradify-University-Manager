package de.gradify.user.grpc;

import de.gradify.shared.grpc.user.*;
import de.gradify.user.entity.Benutzer;
import de.gradify.user.entity.Student;
import de.gradify.user.repository.StudentRepository;
import io.grpc.stub.StreamObserver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.devh.boot.grpc.server.service.GrpcService;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * gRPC Server für Studentendaten.
 * Wird vom Studiengang-Service aufgerufen um Studenten zu validieren.
 */
@GrpcService
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class StudentDataServiceGrpcImpl extends StudentDataServiceGrpc.StudentDataServiceImplBase {

    private final StudentRepository studentRepository;

    /**
     * Prüft ob ein Student existiert.
     */
    @Override
    public void studentExists(StudentIdRequest request, StreamObserver<StudentExistsResponse> responseObserver) {
        log.info("gRPC: StudentExists called for id: {}", request.getStudentId());
        
        Long studentId = request.getStudentId();
        Optional<Student> studentOpt = studentRepository.findById(studentId);
        
        StudentExistsResponse.Builder responseBuilder = StudentExistsResponse.newBuilder();
        
        if (studentOpt.isPresent()) {
            Student student = studentOpt.get();
            responseBuilder
                    .setExists(true)
                    .setStudentId(student.getId())
                    .setMatrikelnummer(student.getMatrikelnummer());
        } else {
            responseBuilder.setExists(false);
        }
        
        responseObserver.onNext(responseBuilder.build());
        responseObserver.onCompleted();
    }

    /**
     * Holt einen Studenten anhand der ID.
     */
    @Override
    public void getStudent(StudentIdRequest request, StreamObserver<StudentResponse> responseObserver) {
        log.info("gRPC: GetStudent called for id: {}", request.getStudentId());
        
        Long studentId = request.getStudentId();
        Optional<Student> studentOpt = studentRepository.findById(studentId);
        
        StudentResponse response;
        if (studentOpt.isPresent()) {
            response = toStudentResponse(studentOpt.get());
        } else {
            // Leere Response wenn nicht gefunden
            response = StudentResponse.newBuilder()
                    .setId(0)
                    .build();
        }
        
        responseObserver.onNext(response);
        responseObserver.onCompleted();
    }

    /**
     * Holt alle Studenten eines Studiengangs.
     * Hinweis: Da Studenten keine direkte Beziehung zum Studiengang haben,
     * muss der Studiengang-Service die Einschreibungen verwalten.
     * Diese Methode gibt derzeit alle Studenten zurück (TODO: Filter implementieren).
     */
    @Override
    public void getStudentsByStudiengang(StudiengangIdRequest request, StreamObserver<StudentListResponse> responseObserver) {
        log.info("gRPC: GetStudentsByStudiengang called for id: {}", request.getStudiengangId());
        
        // Alle Studenten zurückgeben - Filterung passiert im Studiengang-Service
        List<Student> students = studentRepository.findAllAktive();
        
        StudentListResponse.Builder responseBuilder = StudentListResponse.newBuilder();
        for (Student student : students) {
            responseBuilder.addStudents(toStudentResponse(student));
        }
        
        responseObserver.onNext(responseBuilder.build());
        responseObserver.onCompleted();
    }

    /**
     * Konvertiert Student Entity zu gRPC Response.
     */
    private StudentResponse toStudentResponse(Student student) {
        Benutzer benutzer = student.getBenutzer();
        return StudentResponse.newBuilder()
                .setId(student.getId())
                .setUserId(benutzer.getId())
                .setMatrikelnummer(student.getMatrikelnummer())
                .setVorname(benutzer.getVorname())
                .setNachname(benutzer.getNachname())
                .setStatus(student.getStatus().name())
                .build();
    }
}

