package de.gradify.berechnung.controller;

import de.gradify.berechnung.dto.BerechnungDto;
import de.gradify.berechnung.dto.DetailBerechnungDto;
import de.gradify.berechnung.dto.FortschrittDto;
import de.gradify.shared.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/berechnungen")
@RequiredArgsConstructor
@Slf4j
public class BerechnungsController {

    // TODO: Inject BerechnungsService

    @GetMapping("/student/{einschreibungId}")
    public ResponseEntity<ApiResponse<BerechnungDto>> getGesamtnote(@PathVariable UUID einschreibungId) {
        log.info("Getting Gesamtnote for einschreibung: {}", einschreibungId);
        // TODO: Implement
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @GetMapping("/student/{einschreibungId}/details")
    public ResponseEntity<ApiResponse<DetailBerechnungDto>> getDetailBerechnung(@PathVariable UUID einschreibungId) {
        log.info("Getting Detail-Berechnung for einschreibung: {}", einschreibungId);
        // TODO: Implement
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @GetMapping("/student/{einschreibungId}/fortschritt")
    public ResponseEntity<ApiResponse<FortschrittDto>> getFortschritt(@PathVariable UUID einschreibungId) {
        log.info("Getting Fortschritt for einschreibung: {}", einschreibungId);
        // TODO: Implement
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PostMapping("/student/{einschreibungId}/refresh")
    public ResponseEntity<ApiResponse<BerechnungDto>> refreshBerechnung(@PathVariable UUID einschreibungId) {
        log.info("Refreshing Berechnung for einschreibung: {}", einschreibungId);
        // TODO: Implement
        return ResponseEntity.ok(ApiResponse.success(null, "Berechnung aktualisiert"));
    }
}


