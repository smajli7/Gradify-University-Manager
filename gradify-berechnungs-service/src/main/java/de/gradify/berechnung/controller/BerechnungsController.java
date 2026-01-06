package de.gradify.berechnung.controller;

import de.gradify.berechnung.dto.BerechnungDto;
import de.gradify.berechnung.dto.DetailBerechnungDto;
import de.gradify.berechnung.dto.FortschrittDto;
import de.gradify.berechnung.service.BerechnungsService;
import de.gradify.shared.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.UUID;

@RestController
@RequestMapping("/api/berechnungen")
@RequiredArgsConstructor
@Slf4j
public class BerechnungsController {

    private final BerechnungsService berechnungsService;

    /**
     * Holt die Gesamtnote für eine Einschreibung.
     */
    @GetMapping("/einschreibung/{einschreibungId}")
    public ResponseEntity<ApiResponse<BerechnungDto>> getGesamtnote(
            @PathVariable("einschreibungId") UUID einschreibungId) {
        log.info("Getting Gesamtnote for einschreibung: {}", einschreibungId);
        
        return berechnungsService.getGesamtnote(einschreibungId)
                .map(dto -> ResponseEntity.ok(ApiResponse.success(dto)))
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error("Keine Berechnung gefunden für Einschreibung: " + einschreibungId)));
    }

    /**
     * Holt die Detail-Berechnung mit allen Modulbeiträgen.
     */
    @GetMapping("/einschreibung/{einschreibungId}/details")
    public ResponseEntity<ApiResponse<DetailBerechnungDto>> getDetailBerechnung(
            @PathVariable("einschreibungId") UUID einschreibungId) {
        log.info("Getting Detail-Berechnung for einschreibung: {}", einschreibungId);
        
        return berechnungsService.getDetailBerechnung(einschreibungId)
                .map(dto -> ResponseEntity.ok(ApiResponse.success(dto)))
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error("Keine Berechnung gefunden")));
    }

    /**
     * Holt den Studienfortschritt (ECTS, bestandene Module).
     */
    @GetMapping("/einschreibung/{einschreibungId}/fortschritt")
    public ResponseEntity<ApiResponse<FortschrittDto>> getFortschritt(
            @PathVariable("einschreibungId") UUID einschreibungId) {
        log.info("Getting Fortschritt for einschreibung: {}", einschreibungId);
        
        return berechnungsService.getFortschritt(einschreibungId)
                .map(dto -> ResponseEntity.ok(ApiResponse.success(dto)))
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error("Kein Fortschritt gefunden")));
    }

    /**
     * Berechnet die Gesamtnote neu (triggert Neuberechnung).
     * Ohne Parameter: Einfache Berechnung
     * Mit poId: Vollständige Berechnung via gRPC
     */
    @PostMapping("/einschreibung/{einschreibungId}/berechnen")
    public ResponseEntity<ApiResponse<BerechnungDto>> berechneGesamtnote(
            @PathVariable("einschreibungId") UUID einschreibungId,
            @RequestParam(value = "poId", required = false) UUID poId,
            @RequestParam(value = "ectsGesamt", required = false, defaultValue = "180") int ectsGesamt) {
        log.info("Calculating Gesamtnote for einschreibung: {}, PO: {}", einschreibungId, poId);
        
        try {
            BerechnungDto result;
            if (poId != null) {
                // Vollständige Berechnung mit gRPC
                result = berechnungsService.berechneGesamtnote(einschreibungId, poId, ectsGesamt);
            } else {
                // Einfache Berechnung ohne gRPC
                result = berechnungsService.berechneGesamtnote(einschreibungId);
            }
            return ResponseEntity.ok(ApiResponse.success(result, "Berechnung durchgeführt"));
        } catch (Exception e) {
            log.error("Error calculating Gesamtnote: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Berechnung fehlgeschlagen: " + e.getMessage()));
        }
    }

    /**
     * Holt die Durchschnittsnote aller abgeschlossenen Studiengänge.
     */
    @GetMapping("/statistik/durchschnitt")
    public ResponseEntity<ApiResponse<BigDecimal>> getDurchschnittsnote() {
        log.info("Getting Durchschnittsnote");
        
        BigDecimal durchschnitt = berechnungsService.getDurchschnittsnote();
        if (durchschnitt != null) {
            return ResponseEntity.ok(ApiResponse.success(durchschnitt));
        } else {
            return ResponseEntity.ok(ApiResponse.success(null, "Keine endgültigen Berechnungen vorhanden"));
        }
    }
}
