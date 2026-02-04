package de.gradify.user.config;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Collections;
import java.util.List;

/**
 * Principal fuer authentifizierte Requests.
 * Enthaelt User-ID und Mandant-ID (fuer HOCHSCHUL_VERWALTER-Scoping).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AuthPrincipal {
    private String userId;
    private Long mandantId;
    private List<String> roles;

    public boolean hasRole(String role) {
        if (roles == null) return false;
        String r = role.startsWith("ROLE_") ? role : "ROLE_" + role;
        return roles.contains(r);
    }

    public boolean isHochschulVerwalter() {
        return hasRole("HOCHSCHUL_VERWALTER");
    }

    public boolean isSystemAdmin() {
        return hasRole("ADMIN");
    }

    public static AuthPrincipal from(String userId, Long mandantId, List<String> roles) {
        return new AuthPrincipal(userId, mandantId, roles != null ? List.copyOf(roles) : Collections.emptyList());
    }
}
