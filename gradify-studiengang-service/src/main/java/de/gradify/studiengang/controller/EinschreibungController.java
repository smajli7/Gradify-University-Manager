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
@RequestMapping("/api/einschreibungen")
@RequiredArgsConstructor
@Slf4j
public class EinschreibungController {

    @GetMapping
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getAllEinschreibungen(
            @RequestParam(required = false) UUID studentId,
            @RequestParam(required = false) UUID studiengangId) {
        log.info("Getting Einschreibungen - studentId: {}, studiengangId: {}", studentId, studiengangId);
        // TODO: Implement
        return ResponseEntity.ok(ApiResponse.success(List.of()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getEinschreibungById(@PathVariable UUID id) {
        log.info("Getting Einschreibung by id: {}", id);
        // TODO: Implement
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> createEinschreibung(@RequestBody Map<String, Object> request) {
        log.info("Creating Einschreibung");
        // TODO: Implement
        return ResponseEntity.ok(ApiResponse.success(null, "Einschreibung erstellt"));
    }
}


