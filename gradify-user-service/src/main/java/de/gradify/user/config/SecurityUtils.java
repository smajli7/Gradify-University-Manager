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

    /**
     * Effektive Mandant-ID fuer Studenten-/Benutzer-Filter.
     * Admin: null (= sieht alles).
     * Alle anderen Rollen (Pruefungsamt, Lehrender, Student, Hochschulverwalter):
     * nur Daten der eigenen Hochschule (mandantId aus JWT).
     * Falls bei Nicht-Admins keine gueltige mandantId vorhanden ist, wird ein
     * nicht existierender Mandant (-1) zurueckgegeben, damit kein globaler
     * Datenzugriff moeglich ist.
     */
    public static Long getEffectiveMandantIdForFilter() {
        AuthPrincipal ap = getAuthPrincipal();
        if (ap == null) return null;
        if (ap.isSystemAdmin()) return null; // Admin darf alles sehen
        // Alle Nicht-Admin-Rollen sind an ihre Hochschule gebunden
        Long mid = ap.getMandantId();
        return (mid != null && mid > 0) ? mid : -1L;
    }

    /** Gibt die ID des aktuell angemeldeten Benutzers zurueck. */
    public static Long getCurrentUserId() {
        AuthPrincipal ap = getAuthPrincipal();
        if (ap == null || ap.getUserId() == null) return null;
        try {
            return Long.parseLong(ap.getUserId());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
