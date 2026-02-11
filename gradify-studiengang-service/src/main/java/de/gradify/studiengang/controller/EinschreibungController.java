package de.gradify.studiengang.controller;

import de.gradify.shared.dto.ApiResponse;
import de.gradify.studiengang.dto.CreateEinschreibungRequest;
import de.gradify.studiengang.dto.EinschreibungDto;
import de.gradify.studiengang.entity.Einschreibung;
import de.gradify.studiengang.service.EinschreibungService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/api/einschreibungen")
@RequiredArgsConstructor
@Slf4j
public class EinschreibungController {

    private final EinschreibungService einschreibungService;

    /**
     * Alle Einschreibungen abrufen, optional gefiltert.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<EinschreibungDto>>> getAllEinschreibungen(
            @RequestParam(name = "studentId", required = false) Long studentId,
            @RequestParam(name = "studiengangId", required = false) Long studiengangId) {
        log.info("Getting Einschreibungen - studentId: {}, studiengangId: {}", studentId, studiengangId);
        
        List<EinschreibungDto> einschreibungen;
        
        if (studentId != null) {
            einschreibungen = einschreibungService.getEinschreibungenByStudent(studentId);
        } else if (studiengangId != null) {
            einschreibungen = einschreibungService.getEinschreibungenByStudiengang(studiengangId);
        } else {
            einschreibungen = einschreibungService.getAllEinschreibungen();
        }
        
        return ResponseEntity.ok(ApiResponse.success(einschreibungen));
    }

    /**
     * Einschreibung nach ID abrufen.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<EinschreibungDto>> getEinschreibungById(@PathVariable Long id) {
        log.info("Getting Einschreibung by id: {}", id);
        
        return einschreibungService.getEinschreibungById(id)
                .map(e -> ResponseEntity.ok(ApiResponse.success(e)))
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error("Einschreibung nicht gefunden")));
    }

    /**
     * Neue Einschreibung erstellen.
     */
    @PostMapping
    public ResponseEntity<ApiResponse<EinschreibungDto>> createEinschreibung(
            @Valid @RequestBody CreateEinschreibungRequest request) {
        log.info("Creating Einschreibung for student: {} in studiengang: {}", 
                request.getStudentId(), request.getStudiengangId());
        
        try {
            EinschreibungDto einschreibung = einschreibungService.createEinschreibung(request);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success(einschreibung, "Einschreibung erfolgreich erstellt"));
        } catch (IllegalArgumentException e) {
            log.error("Error creating Einschreibung: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Einschreibung abschließen (Student hat bestanden).
     */
    @PostMapping("/{id}/abschliessen")
    public ResponseEntity<ApiResponse<EinschreibungDto>> abschliessenEinschreibung(@PathVariable Long id) {
        log.info("Completing Einschreibung: {}", id);
        
        return einschreibungService.beendeEinschreibung(id, Einschreibung.EinschreibungStatus.ABGESCHLOSSEN)
                .map(e -> ResponseEntity.ok(ApiResponse.success(e, "Einschreibung abgeschlossen")))
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error("Einschreibung nicht gefunden")));
    }

    /**
     * Einschreibung abbrechen.
     */
    @PostMapping("/{id}/abbrechen")
    public ResponseEntity<ApiResponse<EinschreibungDto>> abbrechenEinschreibung(@PathVariable Long id) {
        log.info("Cancelling Einschreibung: {}", id);
        
        return einschreibungService.beendeEinschreibung(id, Einschreibung.EinschreibungStatus.ABGEBROCHEN)
                .map(e -> ResponseEntity.ok(ApiResponse.success(e, "Einschreibung abgebrochen")))
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error("Einschreibung nicht gefunden")));
    }

    /**
     * Semester erhöhen.
     */
    @PostMapping("/{id}/semester")
    public ResponseEntity<ApiResponse<EinschreibungDto>> erhoheSemester(@PathVariable Long id) {
        log.info("Incrementing semester for Einschreibung: {}", id);
        
        return einschreibungService.erhoheSemester(id)
                .map(e -> ResponseEntity.ok(ApiResponse.success(e, "Semester erhöht")))
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error("Einschreibung nicht gefunden")));
    }
}
