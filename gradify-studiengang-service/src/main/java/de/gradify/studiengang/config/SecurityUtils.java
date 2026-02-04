package de.gradify.studiengang.config;

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

    /** Prueft ob aktueller User Mandant-ID zugreifen darf (HV nur eigene, ADMIN alle). */
    public static boolean canAccessMandant(Long mandantId) {
        AuthPrincipal ap = getAuthPrincipal();
        if (ap == null) return false;
        return ap.canAccessMandant(mandantId);
    }

    /** Prueft Zugriff: ADMIN immer, HV nur eigene Hochschule, sonst true (authenticated). */
    public static boolean ensureMandantAccess(Long mandantId) {
        if (mandantId == null) return false;
        AuthPrincipal ap = getAuthPrincipal();
        if (ap == null) return false;
        if (ap.hasRole("ADMIN")) return true;
        if (ap.isHochschulVerwalter()) {
            return ap.getMandantId() != null && ap.getMandantId().equals(mandantId);
        }
        return true;
    }
}
