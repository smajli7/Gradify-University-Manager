package de.gradify.studiengang.controller;

import de.gradify.shared.dto.ApiResponse;
import de.gradify.studiengang.config.SecurityUtils;
import de.gradify.studiengang.dto.ModulZuweisungRequest;
import de.gradify.studiengang.entity.ModulZuweisung;
import de.gradify.studiengang.entity.ModulZuweisungHistorie;
import de.gradify.studiengang.repository.ModulZuweisungHistorieRepository;
import de.gradify.studiengang.repository.ModulZuweisungRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/module-zuweisungen")
@RequiredArgsConstructor
@Slf4j
public class ModulZuweisungController {

    private final ModulZuweisungRepository modulZuweisungRepository;
    private final ModulZuweisungHistorieRepository modulZuweisungHistorieRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ModulZuweisung>>> getAll() {
        List<ModulZuweisung> list = modulZuweisungRepository.findAll().stream()
                .sorted(Comparator.comparing(ModulZuweisung::getDozentId)
                        .thenComparing(ModulZuweisung::getModulId))
                .toList();
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @GetMapping("/dozent/{dozentId}")
    public ResponseEntity<ApiResponse<List<ModulZuweisung>>> getByDozent(@PathVariable("dozentId") Long dozentId) {
        List<ModulZuweisung> list = modulZuweisungRepository.findByDozentId(dozentId).stream()
                .sorted(Comparator.comparing(ModulZuweisung::getModulId))
                .toList();
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ModulZuweisung>> create(@RequestBody ModulZuweisungRequest request) {
        if (request.getDozentId() == null || request.getModulId() == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("dozentId und modulId erforderlich"));
        }
        Long dozentId = request.getDozentId();
        Long modulId = request.getModulId();
        log.info("Create ModulZuweisung: dozentId={}, modulId={}", dozentId, modulId);
        Optional<ModulZuweisung> existing = modulZuweisungRepository.findByDozentId(dozentId).stream()
                .filter(z -> z.getModulId().equals(modulId))
                .findFirst();
        if (existing.isPresent()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Zuweisung existiert bereits"));
        }
        ModulZuweisung zuweisung = ModulZuweisung.builder()
                .dozentId(dozentId)
                .modulId(modulId)
                .build();
        zuweisung = modulZuweisungRepository.save(zuweisung);
        saveHistorie(dozentId, modulId, ModulZuweisungHistorie.AenderungsTyp.ZUWEISUNG_ERSTELLT, "Zuweisung erstellt");
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(zuweisung, "Zuweisung erstellt"));
    }

    @DeleteMapping
    public ResponseEntity<ApiResponse<Void>> delete(
            @RequestParam("dozentId") Long dozentId,
            @RequestParam("modulId") Long modulId) {
        log.info("Delete ModulZuweisung: dozentId={}, modulId={}", dozentId, modulId);
        Optional<ModulZuweisung> existing = modulZuweisungRepository.findByDozentId(dozentId).stream()
                .filter(z -> z.getModulId().equals(modulId))
                .findFirst();
        if (existing.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        modulZuweisungRepository.delete(existing.get());
        saveHistorie(dozentId, modulId, ModulZuweisungHistorie.AenderungsTyp.ZUWEISUNG_GELOESCHT, "Zuweisung gelöscht");
        return ResponseEntity.ok(ApiResponse.success(null, "Zuweisung gelöscht"));
    }

    @GetMapping("/audit")
    public ResponseEntity<ApiResponse<List<ModulZuweisungHistorie>>> getAudit(
            @RequestParam(value = "vonDatum", required = false) String vonDatumStr,
            @RequestParam(value = "bisDatum", required = false) String bisDatumStr,
            @RequestParam(value = "aenderungsTyp", required = false) String aenderungsTypStr) {
        LocalDateTime vonDatum = vonDatumStr != null && !vonDatumStr.isBlank()
                ? LocalDate.parse(vonDatumStr).atStartOfDay() : null;
        LocalDateTime bisDatum = bisDatumStr != null && !bisDatumStr.isBlank()
                ? LocalDate.parse(bisDatumStr).atTime(LocalTime.MAX) : null;
        ModulZuweisungHistorie.AenderungsTyp typ = null;
        if (aenderungsTypStr != null && !aenderungsTypStr.isBlank()) {
            try {
                typ = ModulZuweisungHistorie.AenderungsTyp.valueOf(aenderungsTypStr.toUpperCase().trim());
            } catch (IllegalArgumentException ignored) {
                // Ungueltiger Typ soll nur als "kein Filter" behandelt werden.
            }
        }
        final ModulZuweisungHistorie.AenderungsTyp filterTyp = typ;
        List<ModulZuweisungHistorie> entries = modulZuweisungHistorieRepository.findAll().stream()
                .filter(h -> vonDatum == null || (h.getGeaendertAm() != null && !h.getGeaendertAm().isBefore(vonDatum)))
                .filter(h -> bisDatum == null || (h.getGeaendertAm() != null && !h.getGeaendertAm().isAfter(bisDatum)))
                .filter(h -> filterTyp == null || h.getAenderungsTyp() == filterTyp)
                .sorted(Comparator.comparing(ModulZuweisungHistorie::getGeaendertAm,
                        Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .toList();
        return ResponseEntity.ok(ApiResponse.success(entries));
    }

    private void saveHistorie(Long dozentId, Long modulId, ModulZuweisungHistorie.AenderungsTyp typ, String kommentar) {
        var ap = SecurityUtils.getAuthPrincipal();
        if (ap == null || ap.getUserId() == null) return;
        try {
            Long userId = Long.parseLong(ap.getUserId());
            var h = ModulZuweisungHistorie.builder()
                    .dozentId(dozentId)
                    .modulId(modulId)
                    .geaendertVon(userId)
                    .aenderungsTyp(typ)
                    .kommentar(kommentar != null && kommentar.length() > 500 ? kommentar.substring(0, 500) : kommentar)
                    .build();
            modulZuweisungHistorieRepository.save(h);
        } catch (NumberFormatException ignored) {
            log.warn("Could not parse userId for historie: {}", ap.getUserId());
        }
    }
}
