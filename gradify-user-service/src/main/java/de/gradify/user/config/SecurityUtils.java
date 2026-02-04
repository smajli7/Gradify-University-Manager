package de.gradify.user.config;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * Hilfsmethoden fuer Security-Zugriff.
 */
public final class SecurityUtils {

    private SecurityUtils() {}

    public static AuthPrincipal getAuthPrincipal() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getPrincipal() == null) return null;
        if (auth.getPrincipal() instanceof AuthPrincipal ap) {
            return ap;
        }
        return null;
    }

    /** Effektive Mandant-ID fuer Studenten-/Benutzer-Filter: Verwalter nur eigene, Admin null (= alle). */
    public static Long getEffectiveMandantIdForFilter() {
        AuthPrincipal ap = getAuthPrincipal();
        if (ap == null) return null;
        if (ap.isSystemAdmin()) return null; // Admin darf alles sehen
        if (ap.isHochschulVerwalter()) {
            Long mid = ap.getMandantId();
            return (mid != null && mid > 0) ? mid : null;
        }
        return null;
    }
}
