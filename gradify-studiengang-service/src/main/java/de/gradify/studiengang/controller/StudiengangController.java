package de.gradify.studiengang.controller;

import de.gradify.shared.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/studiengaenge")
@RequiredArgsConstructor
@Slf4j
public class StudiengangController {

    @GetMapping
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getAllStudiengaenge() {
        log.info("Getting all Studiengänge");
        // TODO: Implement
        return ResponseEntity.ok(ApiResponse.success(List.of()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStudiengangById(@PathVariable UUID id) {
        log.info("Getting Studiengang by id: {}", id);
        // TODO: Implement
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @GetMapping("/{id}/module")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getModuleByStudiengang(@PathVariable UUID id) {
        log.info("Getting Module for Studiengang: {}", id);
        // TODO: Implement
        return ResponseEntity.ok(ApiResponse.success(List.of()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> createStudiengang(@RequestBody Map<String, Object> request) {
        log.info("Creating Studiengang");
        // TODO: Implement
        return ResponseEntity.ok(ApiResponse.success(null, "Studiengang erstellt"));
    }
}


