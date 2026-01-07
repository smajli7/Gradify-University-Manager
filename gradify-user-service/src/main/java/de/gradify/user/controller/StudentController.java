package de.gradify.user.controller;

import de.gradify.shared.dto.ApiResponse;
import de.gradify.user.dto.CreateStudentRequest;
import de.gradify.user.dto.StudentDto;
import de.gradify.user.dto.UpdateStudentRequest;
import de.gradify.user.service.StudentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@Tag(name = "Studenten", description = "API fuer Studentenverwaltung (CRUD-Operationen)")
public class StudentController {

    private final StudentService studentService;

    @Operation(summary = "Alle Studenten abrufen", description = "Liefert alle Studenten, optional gefiltert nach Mandant")
    @GetMapping
    public ResponseEntity<ApiResponse<List<StudentDto>>> getAllStudents(
            @RequestParam(value = "mandantId", required = false) UUID mandantId) {
        log.info("Getting students - mandantId: {}", mandantId);
        
        List<StudentDto> students;
        if (mandantId != null) {
            students = studentService.getStudentsByMandant(mandantId);
        } else {
            students = studentService.getAllStudents();
        }
        
        return ResponseEntity.ok(ApiResponse.success(students));
    }

    @Operation(summary = "Student nach ID abrufen", description = "Liefert einen einzelnen Studenten anhand seiner UUID")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<StudentDto>> getStudentById(
            @Parameter(description = "UUID des Studenten") @PathVariable UUID id) {
        log.info("Getting student by id: {}", id);
        
        return studentService.getStudentById(id)
                .map(student -> ResponseEntity.ok(ApiResponse.success(student)))
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error("Student nicht gefunden")));
    }

    @Operation(summary = "Student nach Matrikelnummer abrufen", description = "Liefert einen Studenten anhand seiner Matrikelnummer")
    @GetMapping("/matrikel/{matrikelnummer}")
    public ResponseEntity<ApiResponse<StudentDto>> getStudentByMatrikel(
            @Parameter(description = "Matrikelnummer (z.B. THM2026001)") @PathVariable String matrikelnummer) {
        log.info("Getting student by matrikelnummer: {}", matrikelnummer);
        
        return studentService.getStudentByMatrikelnummer(matrikelnummer)
                .map(student -> ResponseEntity.ok(ApiResponse.success(student)))
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error("Student nicht gefunden")));
    }

    @Operation(summary = "Student-Existenz pruefen", description = "Prueft ob ein Student mit der angegebenen ID existiert")
    @GetMapping("/{id}/exists")
    public ResponseEntity<ApiResponse<Boolean>> studentExists(
            @Parameter(description = "UUID des Studenten") @PathVariable UUID id) {
        boolean exists = studentService.existsById(id);
        return ResponseEntity.ok(ApiResponse.success(exists));
    }

    @Operation(summary = "Neuen Studenten erstellen", description = "Erstellt einen neuen Studenten mit automatisch generierter Matrikelnummer")
    @PostMapping
    public ResponseEntity<ApiResponse<StudentDto>> createStudent(
            @Valid @RequestBody CreateStudentRequest request,
            @RequestParam(value = "mandantKuerzel") String mandantKuerzel) {
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

    @Operation(summary = "Student aktualisieren", description = "Aktualisiert die Daten eines bestehenden Studenten")
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

    @Operation(summary = "Student exmatrikulieren", description = "Exmatrikuliert einen Studenten (setzt Status auf EXMATRIKULIERT)")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteStudent(
            @Parameter(description = "UUID des Studenten") @PathVariable UUID id) {
        log.info("Deleting student: {}", id);
        
        if (studentService.deleteStudent(id)) {
            return ResponseEntity.ok(ApiResponse.success(null, "Student exmatrikuliert"));
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("Student nicht gefunden"));
        }
    }
}
