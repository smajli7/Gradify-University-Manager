package de.gradify.noten.controller;

import de.gradify.noten.dto.CreateNoteRequest;
import de.gradify.noten.dto.NoteDto;
import de.gradify.noten.dto.UpdateNoteRequest;
import de.gradify.noten.entity.Note;
import de.gradify.noten.service.NotenService;
import de.gradify.noten.validation.NoteValidator;
import de.gradify.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/noten")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Noten", description = "API fuer Notenverwaltung, Validierung und Freigabe")
public class NotenController {

    private final NotenService notenService;
    private final NoteValidator noteValidator;

    @Operation(summary = "Noten abrufen", description = "Liefert Noten, optional gefiltert nach Einschreibung, Modul oder Status")
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
    public ResponseEntity<ApiResponse<NoteDto>> getNoteById(@PathVariable("id") UUID id) {
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
            @PathVariable("einschreibungId") UUID einschreibungId) {
        log.info("Getting Noten for einschreibung: {}", einschreibungId);
        
        List<NoteDto> noten = notenService.getNotenByEinschreibung(einschreibungId);
        return ResponseEntity.ok(ApiResponse.success(noten));
    }

    /**
     * Alle Noten eines Moduls abrufen.
     */
    @GetMapping("/modul/{modulId}")
    public ResponseEntity<ApiResponse<List<NoteDto>>> getNotenByModul(@PathVariable("modulId") UUID modulId) {
        log.info("Getting Noten for modul: {}", modulId);
        
        List<NoteDto> noten = notenService.getNotenByModul(modulId);
        return ResponseEntity.ok(ApiResponse.success(noten));
    }

    @Operation(summary = "Note erfassen", description = "Erfasst eine neue Note. Benoetigt DOZENT oder ADMIN Rolle.")
    @PostMapping
    public ResponseEntity<ApiResponse<NoteDto>> createNote(
            @Valid @RequestBody CreateNoteRequest request,
            @RequestHeader(name = "X-User-Id", required = false) UUID userId) {
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
            @PathVariable("id") UUID id,
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

    @Operation(summary = "Note validieren", description = "Validiert eine erfasste Note. Benoetigt PRUEFUNGSAMT oder ADMIN Rolle.")
    @PostMapping("/{id}/validate")
    public ResponseEntity<ApiResponse<NoteDto>> validateNote(
            @PathVariable("id") UUID id,
            @RequestParam(value = "kommentar", required = false) String kommentar,
            @RequestHeader(name = "X-User-Id", required = false) UUID userId) {
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

    @Operation(summary = "Note freigeben", description = "Gibt eine validierte Note endgueltig frei. Benoetigt PRUEFUNGSAMT oder ADMIN Rolle.")
    @PostMapping("/{id}/release")
    public ResponseEntity<ApiResponse<NoteDto>> releaseNote(
            @Parameter(description = "UUID der Note") @PathVariable("id") UUID id) {
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
    public ResponseEntity<ApiResponse<Void>> deleteNote(@PathVariable("id") UUID id) {
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

    @Operation(summary = "Gueltige Notenwerte", description = "Liefert alle gueltigen Notenwerte (1.0, 1.3, 1.7, ... 4.0, 5.0)")
    @GetMapping("/gueltige-noten")
    public ResponseEntity<ApiResponse<Set<BigDecimal>>> getGueltigeNoten() {
        return ResponseEntity.ok(ApiResponse.success(noteValidator.getGueltigeNoten()));
    }

    @Operation(summary = "Noten exportieren", description = "Exportiert alle Noten einer Einschreibung als CSV")
    @GetMapping(value = "/export/{einschreibungId}", produces = "text/csv")
    public ResponseEntity<String> exportNoten(@PathVariable("einschreibungId") UUID einschreibungId) {
        log.info("Exporting Noten for einschreibung: {}", einschreibungId);
        
        List<NoteDto> noten = notenService.getNotenByEinschreibung(einschreibungId);
        
        StringBuilder csv = new StringBuilder();
        csv.append("Modul_Nr;Modul_Name;Note;Versuch;Pruefungsdatum;Status;Bestanden;ECTS;Kommentar\n");
        
        for (NoteDto note : noten) {
            String modulNr = note.getModulId() != null ? note.getModulId().toString().substring(0, 8) : "-";
            String modulName = "-"; // Wird im Frontend aufgelöst
            String noteWert = note.getNoteWert() != null ? note.getNoteWert().toString().replace(".", ",") : "-";
            String versuch = String.valueOf(note.getVersuch());
            String datum = note.getPruefungsdatum() != null ? note.getPruefungsdatum().toString() : "-";
            String status = note.getStatus() != null ? note.getStatus() : "-";
            String bestanden = note.getBestanden() != null ? (note.getBestanden() ? "Ja" : "Nein") : "-";
            String ects = note.getEcts() != null ? String.valueOf(note.getEcts()) : "-";
            String kommentar = note.getKommentar() != null ? note.getKommentar().replace(";", ",") : "";
            
            csv.append(String.format("%s;%s;%s;%s;%s;%s;%s;%s;%s\n",
                modulNr, modulName, noteWert, versuch, datum, status, bestanden, ects, kommentar));
        }
        
        String filename = String.format("noten_%s.csv", java.time.LocalDate.now().toString());
        
        log.info("Export completed: {} noten", noten.size());
        
        return ResponseEntity.ok()
            .header("Content-Disposition", "attachment; filename=" + filename)
            .header("Content-Type", "text/csv; charset=UTF-8")
            .body(csv.toString());
    }
}
