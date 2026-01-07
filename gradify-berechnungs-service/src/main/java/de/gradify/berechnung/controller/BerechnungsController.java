package de.gradify.berechnung.controller;

import de.gradify.berechnung.dto.BerechnungDto;
import de.gradify.berechnung.dto.BerechnungRequest;
import de.gradify.berechnung.dto.DetailBerechnungDto;
import de.gradify.berechnung.dto.FortschrittDto;
import de.gradify.berechnung.service.BerechnungsService;
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
import java.util.UUID;

@RestController
@RequestMapping("/api/berechnungen")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Berechnungen", description = "API fuer Notenberechnung nach Pruefungsordnung")
public class BerechnungsController {

    private final BerechnungsService berechnungsService;

    @Operation(summary = "Gesamtnote abrufen", description = "Liefert die berechnete Gesamtnote einer Einschreibung")
    @GetMapping("/einschreibung/{einschreibungId}")
    public ResponseEntity<ApiResponse<BerechnungDto>> getGesamtnote(
            @PathVariable("einschreibungId") UUID einschreibungId) {
        log.info("Getting Gesamtnote for einschreibung: {}", einschreibungId);
        
        return berechnungsService.getGesamtnote(einschreibungId)
                .map(dto -> ResponseEntity.ok(ApiResponse.success(dto)))
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error("Keine Berechnung gefunden fuer Einschreibung: " + einschreibungId)));
    }

    @Operation(summary = "Detail-Berechnung abrufen", description = "Zeigt die Einzelbeitraege aller Module zur Gesamtnote")
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
     * Mit poId: Vollstaendige Berechnung via gRPC
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
            return ResponseEntity.ok(ApiResponse.success(result, "Berechnung durchgefuehrt"));
        } catch (Exception e) {
            log.error("Error calculating Gesamtnote: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Berechnung fehlgeschlagen: " + e.getMessage()));
        }
    }

    @Operation(summary = "Gesamtnote berechnen", description = "Fuehrt eine vollstaendige Berechnung nach PO durch")
    @PostMapping("/berechnen")
    public ResponseEntity<ApiResponse<BerechnungDto>> berechneGesamtnoteVollstaendig(
            @Valid @RequestBody BerechnungRequest request) {
        log.info("Full calculation request for einschreibung: {}, PO: {}", 
                request.getEinschreibungId(), request.getPruefungsordnungId());
        
        try {
            int ectsGesamt = request.getEctsGesamt() > 0 ? request.getEctsGesamt() : 180;
            
            BerechnungDto result = berechnungsService.berechneGesamtnote(
                    request.getEinschreibungId(),
                    request.getPruefungsordnungId(),
                    ectsGesamt
            );
            
            String message = String.format("Gesamtnote berechnet: %s", 
                    result.getGesamtnote() != null ? result.getGesamtnote() : "noch nicht berechenbar");
            
            return ResponseEntity.ok(ApiResponse.success(result, message));
        } catch (Exception e) {
            log.error("Error in full calculation: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Berechnung fehlgeschlagen: " + e.getMessage()));
        }
    }

    /**
     * Holt die Durchschnittsnote aller abgeschlossenen Studiengaenge.
     */
    @GetMapping("/statistik/durchschnitt")
    public ResponseEntity<ApiResponse<BigDecimal>> getDurchschnittsnote() {
        log.info("Getting Durchschnittsnote");
        
        BigDecimal durchschnitt = berechnungsService.getDurchschnittsnote();
        if (durchschnitt != null) {
            return ResponseEntity.ok(ApiResponse.success(durchschnitt));
        } else {
            return ResponseEntity.ok(ApiResponse.success(null, "Keine endgueltigen Berechnungen vorhanden"));
        }
    }

    @Operation(summary = "Berechnungsarten anzeigen", description = "Zeigt die verfuegbaren Berechnungsformeln (Bachelor/Master)")
    @GetMapping("/berechnungsarten")
    public ResponseEntity<ApiResponse<Object>> getBerechnungsarten() {
        var arten = new Object() {
            public final String GEWICHTET = "ECTS-gewichteter Durchschnitt (Bachelor)";
            public final String GEWICHTET_FORMEL = "Gesamtnote = SUM(Modulnote * ECTS) / SUM(ECTS)";
            public final String ARITHMETISCH_GEMISCHT = "Thesis-gewichteter Durchschnitt (Master)";
            public final String ARITHMETISCH_GEMISCHT_FORMEL = "Gesamtnote = (2 * Thesis-Note + Modulmittel) / 3";
        };
        return ResponseEntity.ok(ApiResponse.success(arten));
    }
}
