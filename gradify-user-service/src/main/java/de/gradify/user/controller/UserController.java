package de.gradify.user.controller;

import de.gradify.shared.dto.ApiResponse;
import de.gradify.user.config.SecurityUtils;
import de.gradify.user.dto.BenutzerDto;
import de.gradify.user.dto.CreateBenutzerRequest;
import de.gradify.user.dto.DemoLoginsResponse;
import de.gradify.user.dto.DemoUserItem;
import de.gradify.user.dto.UpdateBenutzerRequest;
import de.gradify.user.entity.BenutzerHistorie;
import de.gradify.user.service.BenutzerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Slf4j
public class UserController {

    private final BenutzerService benutzerService;

    @Value("${gradify.demo.password:web00100113!}")
    private String demoPassword;

    private static final List<String> ROLE_PRIORITY = List.of(
            "ROLE_ADMIN",
            "ROLE_HOCHSCHUL_VERWALTER",
            "ROLE_PRUEFUNGSAMT",
            "ROLE_LEHRENDER",
            "ROLE_STUDENT"
    );

    @GetMapping("/demo-logins")
    public ResponseEntity<ApiResponse<DemoLoginsResponse>> getDemoLogins() {
        log.info("Getting demo login users (public test endpoint)");

        List<DemoUserItem> users = benutzerService.findAll().stream()
                .filter(BenutzerDto::isAktiv)
                .map(u -> {
                    String rolle = getPrimaryRole(u.getRollen());
                    String roleWithoutPrefix = rolle.startsWith("ROLE_") ? rolle.substring("ROLE_".length()) : rolle;
                    String displayLabel = (u.getVorname() + " " + u.getNachname()).trim() + " (" + roleWithoutPrefix + ")";
                    return DemoUserItem.builder()
                            .username(u.getBenutzername())
                            .rolle(roleWithoutPrefix)
                            .label(displayLabel)
                            .mandantId(u.getMandantId())
                            .build();
                })
                .collect(Collectors.toList());

        DemoLoginsResponse response = DemoLoginsResponse.builder()
                .users(users)
                .demoPassword(demoPassword)
                .build();

        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<BenutzerDto>>> getAllUsers(
            @RequestParam(value = "mandantId", required = false) Long mandantId) {
        log.info("Getting all users, mandantId={}", mandantId);
        
        // Verwalter duerfen nur Benutzer ihrer eigenen Hochschule sehen
        Long effectiveMandantId = SecurityUtils.getEffectiveMandantIdForFilter();
        if (effectiveMandantId != null) {
            mandantId = effectiveMandantId;
        }
        
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
            Long currentUserId = SecurityUtils.getCurrentUserId();
            BenutzerDto created = benutzerService.create(request, currentUserId);
            return ResponseEntity.ok(ApiResponse.success(created, "Benutzer erstellt"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error(e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<BenutzerDto>> updateUser(
            @PathVariable(value = "id") Long id,
            @Valid @RequestBody UpdateBenutzerRequest request) {
        log.info("Updating user: {}", id);
        
        return benutzerService.update(id, request)
            .map(user -> ResponseEntity.ok(ApiResponse.success(user, "Benutzer aktualisiert")))
            .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(
            @PathVariable(value = "id") Long id) {
        log.info("Deleting user: {}", id);
        
        Long currentUserId = SecurityUtils.getCurrentUserId();
        if (benutzerService.delete(id, currentUserId)) {
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

    @GetMapping("/audit")
    public ResponseEntity<ApiResponse<List<Object>>> getAuditLog(
            @RequestParam(value = "benutzerId", required = false) Long benutzerId,
            @RequestParam(value = "aenderungsTyp", required = false) String aenderungsTypStr,
            @RequestParam(value = "vonDatum", required = false) 
                @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime vonDatum,
            @RequestParam(value = "bisDatum", required = false) 
                @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime bisDatum,
            @RequestParam(value = "limit", required = false, defaultValue = "500") int limit) {
        log.info("Getting user audit log, benutzerId={}, typ={}, limit={}", benutzerId, aenderungsTypStr, limit);

        BenutzerHistorie.AenderungsTyp aenderungsTyp = parseAenderungsTyp(aenderungsTypStr);
        
        List<BenutzerHistorie> historien = benutzerService.getAuditLog(benutzerId, aenderungsTyp, vonDatum, bisDatum);
        
        // Limit anwenden
        List<Object> result = historien.stream()
            .limit(limit)
            .map(h -> new Object() {
                public final Long id = h.getId();
                public final Long benutzerId = h.getBenutzerId();
                public final String benutzername = h.getBenutzername();
                public final String aenderungsTyp = h.getAenderungsTyp().name();
                public final Long geaendertVon = h.getGeaendertVon();
                public final LocalDateTime geaendertAm = h.getGeaendertAm();
                public final String details = h.getDetails();
            })
            .collect(Collectors.toList());
        
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    private static BenutzerHistorie.AenderungsTyp parseAenderungsTyp(String str) {
        if (str == null || str.isBlank()) return null;
        try {
            return BenutzerHistorie.AenderungsTyp.valueOf(str.toUpperCase().trim());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private static String getPrimaryRole(Set<String> rollen) {
        if (rollen == null || rollen.isEmpty()) return "STUDENT";
        for (String preferred : ROLE_PRIORITY) {
            if (rollen.contains(preferred)) return preferred;
        }
        return rollen.iterator().next();
    }
}
