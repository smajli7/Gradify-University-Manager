package de.gradify.studiengang.controller;

import de.gradify.shared.dto.ApiResponse;
import de.gradify.studiengang.config.AuthPrincipal;
import de.gradify.studiengang.config.SecurityUtils;
import de.gradify.studiengang.dto.CreateMandantRequest;
import de.gradify.studiengang.dto.MandantDto;
import de.gradify.studiengang.service.MandantService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/mandanten")
@RequiredArgsConstructor
@Slf4j
public class MandantController {

    private final MandantService mandantService;

    /**
     * Neue Hochschule (Mandant) anlegen.
     */
    @PostMapping
    public ResponseEntity<ApiResponse<MandantDto>> createMandant(
            @Valid @RequestBody CreateMandantRequest request) {
        log.info("Creating Mandant: {} ({})", request.getName(), request.getKuerzel());
        try {
            MandantDto created = mandantService.createMandant(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(created, "Hochschule wurde angelegt."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        } catch (IllegalStateException e) {
            log.error("Fehler beim Anlegen der Tenant-Datenbanken: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Alle aktiven Mandanten abrufen.
     * HOCHSCHUL_VERWALTER sieht nur seine zugewiesene Hochschule.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<MandantDto>>> getAllMandanten() {
        log.info("Getting all active Mandanten");
        List<MandantDto> mandanten = mandantService.getAktiveMandanten();
        AuthPrincipal ap = SecurityUtils.getAuthPrincipal();
        if (ap != null && ap.isHochschulVerwalter() && ap.getMandantId() != null) {
            mandanten = mandanten.stream()
                    .filter(m -> ap.getMandantId().equals(m.getId()))
                    .collect(Collectors.toList());
        }
        return ResponseEntity.ok(ApiResponse.success(mandanten));
    }

    /**
     * Mandant nach ID abrufen.
     * HOCHSCHUL_VERWALTER nur fuer eigene Hochschule.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<MandantDto>> getMandantById(@PathVariable Long id) {
        log.info("Getting Mandant by id: {}", id);
        if (!SecurityUtils.ensureMandantAccess(id)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error("Kein Zugriff auf diese Hochschule"));
        }
        return mandantService.getMandantById(id)
                .map(m -> ResponseEntity.ok(ApiResponse.success(m)))
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error("Mandant nicht gefunden")));
    }

    /**
     * Mandant-Kürzel abrufen (für Matrikelnummer-Generierung).
     */
    @GetMapping("/{id}/kuerzel")
    public ResponseEntity<ApiResponse<String>> getMandantKuerzel(@PathVariable Long id) {
        log.info("Getting Mandant Kürzel for id: {}", id);
        if (!SecurityUtils.ensureMandantAccess(id)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error("Kein Zugriff auf diese Hochschule"));
        }
        return mandantService.getMandantKuerzel(id)
                .map(k -> ResponseEntity.ok(ApiResponse.success(k)))
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error("Mandant nicht gefunden")));
    }
}



