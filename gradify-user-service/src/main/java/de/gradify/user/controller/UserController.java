package de.gradify.user.controller;

import de.gradify.shared.dto.ApiResponse;
import de.gradify.user.dto.BenutzerDto;
import de.gradify.user.dto.CreateBenutzerRequest;
import de.gradify.user.entity.Rolle;
import de.gradify.user.service.BenutzerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Slf4j
public class UserController {

    private final BenutzerService benutzerService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<BenutzerDto>>> getAllUsers(
            @RequestParam(value = "mandantId", required = false) Long mandantId) {
        log.info("Getting all users, mandantId={}", mandantId);
        
        List<BenutzerDto> users;
        if (mandantId != null) {
            users = benutzerService.findByMandantId(mandantId);
        } else {
            users = benutzerService.findAll();
        }
        
        return ResponseEntity.ok(ApiResponse.success(users));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<BenutzerDto>> getUserById(
            @PathVariable(value = "id") Long id) {
        log.info("Getting user by id: {}", id);
        
        return benutzerService.findById(id)
            .map(user -> ResponseEntity.ok(ApiResponse.success(user)))
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/username/{benutzername}")
    public ResponseEntity<ApiResponse<BenutzerDto>> getUserByUsername(
            @PathVariable(value = "benutzername") String benutzername) {
        log.info("Getting user by username: {}", benutzername);
        
        return benutzerService.findByBenutzername(benutzername)
            .map(user -> ResponseEntity.ok(ApiResponse.success(user)))
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<ApiResponse<BenutzerDto>> createUser(
            @Valid @RequestBody CreateBenutzerRequest request) {
        log.info("Creating user: {}", request.getBenutzername());
        
        try {
            BenutzerDto created = benutzerService.create(request);
            return ResponseEntity.ok(ApiResponse.success(created, "Benutzer erstellt"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error(e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<BenutzerDto>> updateUser(
            @PathVariable(value = "id") Long id,
            @Valid @RequestBody CreateBenutzerRequest request) {
        log.info("Updating user: {}", id);
        
        return benutzerService.update(id, request)
            .map(user -> ResponseEntity.ok(ApiResponse.success(user, "Benutzer aktualisiert")))
            .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(
            @PathVariable(value = "id") Long id) {
        log.info("Deleting user: {}", id);
        
        if (benutzerService.delete(id)) {
            return ResponseEntity.ok(ApiResponse.success(null, "Benutzer geloescht"));
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping("/{id}/roles/{roleId}")
    public ResponseEntity<ApiResponse<Void>> assignRole(
            @PathVariable(value = "id") Long id, 
            @PathVariable(value = "roleId") Long roleId) {
        log.info("Assigning role {} to user {}", roleId, id);
        
        if (benutzerService.assignRole(id, roleId)) {
            return ResponseEntity.ok(ApiResponse.success(null, "Rolle zugewiesen"));
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}/roles/{roleId}")
    public ResponseEntity<ApiResponse<Void>> removeRole(
            @PathVariable(value = "id") Long id, 
            @PathVariable(value = "roleId") Long roleId) {
        log.info("Removing role {} from user {}", roleId, id);
        
        if (benutzerService.removeRole(id, roleId)) {
            return ResponseEntity.ok(ApiResponse.success(null, "Rolle entfernt"));
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/roles")
    public ResponseEntity<ApiResponse<List<Object>>> getAllRoles() {
        log.info("Getting all roles");
        
        List<Object> roles = benutzerService.findAllRoles().stream()
            .map(rolle -> new Object() {
                public final Long id = rolle.getId();
                public final String name = rolle.getName();
                public final String beschreibung = rolle.getBeschreibung();
            })
            .collect(Collectors.toList());
        
        return ResponseEntity.ok(ApiResponse.success(roles));
    }
}
