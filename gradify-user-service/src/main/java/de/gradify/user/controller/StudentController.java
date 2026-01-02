package de.gradify.user.controller;

import de.gradify.shared.dto.ApiResponse;
import de.gradify.user.dto.CreateStudentRequest;
import de.gradify.user.dto.StudentDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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

    // TODO: Inject StudentService

    @GetMapping
    public ResponseEntity<ApiResponse<List<StudentDto>>> getAllStudents() {
        log.info("Getting all students");
        // TODO: Implement
        return ResponseEntity.ok(ApiResponse.success(List.of()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<StudentDto>> getStudentById(@PathVariable UUID id) {
        log.info("Getting student by id: {}", id);
        // TODO: Implement
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @GetMapping("/matrikel/{matrikelnummer}")
    public ResponseEntity<ApiResponse<StudentDto>> getStudentByMatrikel(@PathVariable String matrikelnummer) {
        log.info("Getting student by matrikelnummer: {}", matrikelnummer);
        // TODO: Implement
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<StudentDto>> createStudent(@Valid @RequestBody CreateStudentRequest request) {
        log.info("Creating student with matrikelnummer: {}", request.getMatrikelnummer());
        // TODO: Implement
        return ResponseEntity.ok(ApiResponse.success(null, "Student erstellt"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<StudentDto>> updateStudent(
            @PathVariable UUID id,
            @Valid @RequestBody CreateStudentRequest request) {
        log.info("Updating student: {}", id);
        // TODO: Implement
        return ResponseEntity.ok(ApiResponse.success(null, "Student aktualisiert"));
    }
}


