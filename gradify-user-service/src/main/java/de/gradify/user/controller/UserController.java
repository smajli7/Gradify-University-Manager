package de.gradify.user.controller;

import de.gradify.shared.dto.ApiResponse;
import de.gradify.user.dto.BenutzerDto;
import de.gradify.user.dto.CreateBenutzerRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Slf4j
public class UserController {

    // TODO: Inject UserService

    @GetMapping
    public ResponseEntity<ApiResponse<List<BenutzerDto>>> getAllUsers() {
        log.info("Getting all users");
        // TODO: Implement
        return ResponseEntity.ok(ApiResponse.success(List.of()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<BenutzerDto>> getUserById(@PathVariable UUID id) {
        log.info("Getting user by id: {}", id);
        // TODO: Implement
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<BenutzerDto>> createUser(@Valid @RequestBody CreateBenutzerRequest request) {
        log.info("Creating user: {}", request.getBenutzername());
        // TODO: Implement
        return ResponseEntity.ok(ApiResponse.success(null, "Benutzer erstellt"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<BenutzerDto>> updateUser(
            @PathVariable UUID id,
            @Valid @RequestBody CreateBenutzerRequest request) {
        log.info("Updating user: {}", id);
        // TODO: Implement
        return ResponseEntity.ok(ApiResponse.success(null, "Benutzer aktualisiert"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable UUID id) {
        log.info("Deleting user: {}", id);
        // TODO: Implement
        return ResponseEntity.ok(ApiResponse.success(null, "Benutzer gelöscht"));
    }

    @PostMapping("/{id}/roles/{roleId}")
    public ResponseEntity<ApiResponse<Void>> assignRole(@PathVariable UUID id, @PathVariable UUID roleId) {
        log.info("Assigning role {} to user {}", roleId, id);
        // TODO: Implement
        return ResponseEntity.ok(ApiResponse.success(null, "Rolle zugewiesen"));
    }

    @DeleteMapping("/{id}/roles/{roleId}")
    public ResponseEntity<ApiResponse<Void>> removeRole(@PathVariable UUID id, @PathVariable UUID roleId) {
        log.info("Removing role {} from user {}", roleId, id);
        // TODO: Implement
        return ResponseEntity.ok(ApiResponse.success(null, "Rolle entfernt"));
    }
}




