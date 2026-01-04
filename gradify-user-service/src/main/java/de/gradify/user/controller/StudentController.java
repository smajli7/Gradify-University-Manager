package de.gradify.user.controller;

import de.gradify.shared.dto.ApiResponse;
import de.gradify.user.dto.CreateStudentRequest;
import de.gradify.user.dto.StudentDto;
import de.gradify.user.dto.UpdateStudentRequest;
import de.gradify.user.service.StudentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/students")
@RequiredArgsConstructor
@Slf4j
public class StudentController {

    private final StudentService studentService;

    /**
     * Alle Studenten abrufen.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<StudentDto>>> getAllStudents(
            @RequestParam(required = false) UUID mandantId) {
        log.info("Getting students - mandantId: {}", mandantId);
        
        List<StudentDto> students;
        if (mandantId != null) {
            students = studentService.getStudentsByMandant(mandantId);
        } else {
            students = studentService.getAllStudents();
        }
        
        return ResponseEntity.ok(ApiResponse.success(students));
    }

    /**
     * Student nach ID abrufen.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<StudentDto>> getStudentById(@PathVariable UUID id) {
        log.info("Getting student by id: {}", id);
        
        return studentService.getStudentById(id)
                .map(student -> ResponseEntity.ok(ApiResponse.success(student)))
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error("Student nicht gefunden")));
    }

    /**
     * Student nach Matrikelnummer abrufen.
     */
    @GetMapping("/matrikel/{matrikelnummer}")
    public ResponseEntity<ApiResponse<StudentDto>> getStudentByMatrikel(@PathVariable String matrikelnummer) {
        log.info("Getting student by matrikelnummer: {}", matrikelnummer);
        
        return studentService.getStudentByMatrikelnummer(matrikelnummer)
                .map(student -> ResponseEntity.ok(ApiResponse.success(student)))
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error("Student nicht gefunden")));
    }

    /**
     * Prüft ob ein Student existiert.
     */
    @GetMapping("/{id}/exists")
    public ResponseEntity<ApiResponse<Boolean>> studentExists(@PathVariable UUID id) {
        boolean exists = studentService.existsById(id);
        return ResponseEntity.ok(ApiResponse.success(exists));
    }

    /**
     * Neuen Studenten erstellen.
     * Erwartet mandantKuerzel als Query-Parameter für Matrikelnummer-Generierung.
     */
    @PostMapping
    public ResponseEntity<ApiResponse<StudentDto>> createStudent(
            @Valid @RequestBody CreateStudentRequest request,
            @RequestParam String mandantKuerzel) {
        log.info("Creating student for mandant: {}", mandantKuerzel);
        
        try {
            StudentDto student = studentService.createStudent(request, mandantKuerzel);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success(student, "Student erfolgreich erstellt"));
        } catch (IllegalArgumentException e) {
            log.error("Error creating student: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Studenten aktualisieren.
     */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<StudentDto>> updateStudent(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateStudentRequest request) {
        log.info("Updating student: {}", id);
        
        try {
            return studentService.updateStudent(id, request)
                    .map(student -> ResponseEntity.ok(ApiResponse.success(student, "Student aktualisiert")))
                    .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                            .body(ApiResponse.error("Student nicht gefunden")));
        } catch (IllegalArgumentException e) {
            log.error("Error updating student: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Studenten löschen (deaktivieren).
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteStudent(@PathVariable UUID id) {
        log.info("Deleting student: {}", id);
        
        if (studentService.deleteStudent(id)) {
            return ResponseEntity.ok(ApiResponse.success(null, "Student exmatrikuliert"));
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("Student nicht gefunden"));
        }
    }
}
