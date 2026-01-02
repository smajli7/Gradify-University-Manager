package de.gradify.noten.controller;

import de.gradify.noten.dto.CreateNoteRequest;
import de.gradify.noten.dto.NoteDto;
import de.gradify.shared.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/noten")
@RequiredArgsConstructor
@Slf4j
public class NotenController {

    // TODO: Inject NotenService

    @GetMapping
    public ResponseEntity<ApiResponse<List<NoteDto>>> getNoten(
            @RequestParam(required = false) UUID studentId,
            @RequestParam(required = false) UUID modulId,
            @RequestParam(required = false) UUID einschreibungId,
            @RequestParam(required = false) String status) {
        log.info("Getting Noten - studentId: {}, modulId: {}, status: {}", studentId, modulId, status);
        // TODO: Implement
        return ResponseEntity.ok(ApiResponse.success(List.of()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<NoteDto>> getNoteById(@PathVariable UUID id) {
        log.info("Getting Note by id: {}", id);
        // TODO: Implement
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @GetMapping("/student/{studentId}")
    public ResponseEntity<ApiResponse<List<NoteDto>>> getNotenByStudent(@PathVariable UUID studentId) {
        log.info("Getting Noten for student: {}", studentId);
        // TODO: Implement
        return ResponseEntity.ok(ApiResponse.success(List.of()));
    }

    @GetMapping("/modul/{modulId}")
    public ResponseEntity<ApiResponse<List<NoteDto>>> getNotenByModul(@PathVariable UUID modulId) {
        log.info("Getting Noten for modul: {}", modulId);
        // TODO: Implement
        return ResponseEntity.ok(ApiResponse.success(List.of()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<NoteDto>> createNote(@Valid @RequestBody CreateNoteRequest request) {
        log.info("Creating Note for einschreibung: {}, modul: {}", request.getEinschreibungId(), request.getModulId());
        // TODO: Implement
        return ResponseEntity.ok(ApiResponse.success(null, "Note erfasst"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<NoteDto>> updateNote(
            @PathVariable UUID id,
            @Valid @RequestBody CreateNoteRequest request) {
        log.info("Updating Note: {}", id);
        // TODO: Implement
        return ResponseEntity.ok(ApiResponse.success(null, "Note aktualisiert"));
    }

    @PostMapping("/{id}/validate")
    public ResponseEntity<ApiResponse<NoteDto>> validateNote(
            @PathVariable UUID id,
            @RequestParam(required = false) String kommentar) {
        log.info("Validating Note: {}", id);
        // TODO: Implement
        return ResponseEntity.ok(ApiResponse.success(null, "Note validiert"));
    }

    @PostMapping("/{id}/release")
    public ResponseEntity<ApiResponse<NoteDto>> releaseNote(@PathVariable UUID id) {
        log.info("Releasing Note: {}", id);
        // TODO: Implement
        return ResponseEntity.ok(ApiResponse.success(null, "Note freigegeben"));
    }
}


