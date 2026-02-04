package de.gradify.studiengang.controller;

import de.gradify.shared.dto.ApiResponse;
import de.gradify.studiengang.dto.ModulZuweisungRequest;
import de.gradify.studiengang.entity.ModulZuweisung;
import de.gradify.studiengang.repository.ModulZuweisungRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/module-zuweisungen")
@RequiredArgsConstructor
@Slf4j
public class ModulZuweisungController {

    private final ModulZuweisungRepository modulZuweisungRepository;

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
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(zuweisung, "Zuweisung erstellt"));
    }

    @DeleteMapping
    public ResponseEntity<ApiResponse<Void>> delete(
            @RequestParam Long dozentId,
            @RequestParam Long modulId) {
        log.info("Delete ModulZuweisung: dozentId={}, modulId={}", dozentId, modulId);
        Optional<ModulZuweisung> existing = modulZuweisungRepository.findByDozentId(dozentId).stream()
                .filter(z -> z.getModulId().equals(modulId))
                .findFirst();
        if (existing.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        modulZuweisungRepository.delete(existing.get());
        return ResponseEntity.ok(ApiResponse.success(null, "Zuweisung gelöscht"));
    }
}
