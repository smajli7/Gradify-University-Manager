package de.gradify.studiengang.config;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Collections;
import java.util.List;

/**
 * Principal für authentifizierte Requests.
 * Enthält User-ID und Mandant-ID (fuer HOCHSCHUL_VERWALTER-Scoping).
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

    /**
     * Prueft ob der Benutzer auf den angegebenen Mandanten zugreifen darf.
     * Admin: darf auf alle Mandanten zugreifen.
     * Alle anderen Rollen: nur auf den eigenen Mandanten.
     */
    public boolean canAccessMandant(Long mandantId) {
        if (mandantId == null) return false;
        if (hasRole("ADMIN")) return true;
        // Alle Nicht-Admin-Rollen: nur eigener Mandant
        return this.mandantId != null && this.mandantId.equals(mandantId);
    }

    public static AuthPrincipal from(String userId, Long mandantId, List<String> roles) {
        return new AuthPrincipal(userId, mandantId, roles != null ? List.copyOf(roles) : Collections.emptyList());
    }
}
