package de.gradify.studiengang.controller;

import de.gradify.shared.dto.ApiResponse;
import de.gradify.studiengang.dto.MandantDto;
import de.gradify.studiengang.service.MandantService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/mandanten")
@RequiredArgsConstructor
@Slf4j
public class MandantController {

    private final MandantService mandantService;

    /**
     * Alle aktiven Mandanten abrufen.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<MandantDto>>> getAllMandanten() {
        log.info("Getting all active Mandanten");
        List<MandantDto> mandanten = mandantService.getAktiveMandanten();
        return ResponseEntity.ok(ApiResponse.success(mandanten));
    }

    /**
     * Mandant nach ID abrufen.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<MandantDto>> getMandantById(@PathVariable UUID id) {
        log.info("Getting Mandant by id: {}", id);
        
        return mandantService.getMandantById(id)
                .map(m -> ResponseEntity.ok(ApiResponse.success(m)))
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error("Mandant nicht gefunden")));
    }

    /**
     * Mandant-Kürzel abrufen (für Matrikelnummer-Generierung).
     */
    @GetMapping("/{id}/kuerzel")
    public ResponseEntity<ApiResponse<String>> getMandantKuerzel(@PathVariable UUID id) {
        log.info("Getting Mandant Kürzel for id: {}", id);
        
        return mandantService.getMandantKuerzel(id)
                .map(k -> ResponseEntity.ok(ApiResponse.success(k)))
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error("Mandant nicht gefunden")));
    }
}



