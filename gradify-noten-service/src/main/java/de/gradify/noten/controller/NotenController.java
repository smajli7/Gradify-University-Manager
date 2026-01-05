package de.gradify.noten.controller;

import de.gradify.noten.dto.CreateNoteRequest;
import de.gradify.noten.dto.NoteDto;
import de.gradify.noten.dto.UpdateNoteRequest;
import de.gradify.noten.entity.Note;
import de.gradify.noten.service.NotenService;
import de.gradify.shared.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/noten")
@RequiredArgsConstructor
@Slf4j
public class NotenController {

    private final NotenService notenService;

    /**
     * Alle Noten abrufen, optional gefiltert.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<NoteDto>>> getNoten(
            @RequestParam(value = "einschreibungId", required = false) UUID einschreibungId,
            @RequestParam(value = "modulId", required = false) UUID modulId,
            @RequestParam(value = "status", required = false) String status) {
        log.info("Getting Noten - einschreibungId: {}, modulId: {}, status: {}", 
                einschreibungId, modulId, status);
        
        Note.NoteStatus noteStatus = null;
        if (status != null) {
            try {
                noteStatus = Note.NoteStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Ungültiger Status: " + status));
            }
        }
        
        List<NoteDto> noten = notenService.getNoten(einschreibungId, modulId, noteStatus);
        return ResponseEntity.ok(ApiResponse.success(noten));
    }

    /**
     * Note nach ID abrufen.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<NoteDto>> getNoteById(@PathVariable UUID id) {
        log.info("Getting Note by id: {}", id);
        
        return notenService.getNoteById(id)
                .map(note -> ResponseEntity.ok(ApiResponse.success(note)))
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error("Note nicht gefunden")));
    }

    /**
     * Alle Noten einer Einschreibung abrufen.
     */
    @GetMapping("/einschreibung/{einschreibungId}")
    public ResponseEntity<ApiResponse<List<NoteDto>>> getNotenByEinschreibung(
            @PathVariable UUID einschreibungId) {
        log.info("Getting Noten for einschreibung: {}", einschreibungId);
        
        List<NoteDto> noten = notenService.getNotenByEinschreibung(einschreibungId);
        return ResponseEntity.ok(ApiResponse.success(noten));
    }

    /**
     * Alle Noten eines Moduls abrufen.
     */
    @GetMapping("/modul/{modulId}")
    public ResponseEntity<ApiResponse<List<NoteDto>>> getNotenByModul(@PathVariable UUID modulId) {
        log.info("Getting Noten for modul: {}", modulId);
        
        List<NoteDto> noten = notenService.getNotenByModul(modulId);
        return ResponseEntity.ok(ApiResponse.success(noten));
    }

    /**
     * Neue Note erfassen.
     */
    @PostMapping
    public ResponseEntity<ApiResponse<NoteDto>> createNote(
            @Valid @RequestBody CreateNoteRequest request,
            @RequestHeader(value = "X-User-Id", required = false) UUID userId) {
        log.info("Creating Note for einschreibung: {}, modul: {}", 
                request.getEinschreibungId(), request.getModulId());
        
        // Falls kein User-Header, temporäre ID für Entwicklung
        UUID erfasstVon = userId != null ? userId : UUID.randomUUID();
        
        try {
            NoteDto note = notenService.createNote(request, erfasstVon);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success(note, "Note erfolgreich erfasst"));
        } catch (IllegalArgumentException e) {
            log.error("Error creating note: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Note bearbeiten.
     */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<NoteDto>> updateNote(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateNoteRequest request) {
        log.info("Updating Note: {}", id);
        
        try {
            return notenService.updateNote(id, request)
                    .map(note -> ResponseEntity.ok(ApiResponse.success(note, "Note aktualisiert")))
                    .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                            .body(ApiResponse.error("Note nicht gefunden")));
        } catch (IllegalStateException e) {
            log.error("Error updating note: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Note validieren (Prüfungsamt).
     */
    @PostMapping("/{id}/validate")
    public ResponseEntity<ApiResponse<NoteDto>> validateNote(
            @PathVariable UUID id,
            @RequestParam(value = "kommentar", required = false) String kommentar,
            @RequestHeader(value = "X-User-Id", required = false) UUID userId) {
        log.info("Validating Note: {}", id);
        
        UUID validiertVon = userId != null ? userId : UUID.randomUUID();
        
        try {
            return notenService.validateNote(id, validiertVon, kommentar)
                    .map(note -> ResponseEntity.ok(ApiResponse.success(note, "Note validiert")))
                    .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                            .body(ApiResponse.error("Note nicht gefunden")));
        } catch (IllegalStateException e) {
            log.error("Error validating note: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Note freigeben (Studiengangleitung).
     */
    @PostMapping("/{id}/release")
    public ResponseEntity<ApiResponse<NoteDto>> releaseNote(@PathVariable UUID id) {
        log.info("Releasing Note: {}", id);
        
        try {
            return notenService.releaseNote(id)
                    .map(note -> ResponseEntity.ok(ApiResponse.success(note, "Note freigegeben")))
                    .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                            .body(ApiResponse.error("Note nicht gefunden")));
        } catch (IllegalStateException e) {
            log.error("Error releasing note: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Note löschen (nur ERFASST).
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteNote(@PathVariable UUID id) {
        log.info("Deleting Note: {}", id);
        
        try {
            if (notenService.deleteNote(id)) {
                return ResponseEntity.ok(ApiResponse.success(null, "Note gelöscht"));
            } else {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error("Note nicht gefunden"));
            }
        } catch (IllegalStateException e) {
            log.error("Error deleting note: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        }
    }
}
