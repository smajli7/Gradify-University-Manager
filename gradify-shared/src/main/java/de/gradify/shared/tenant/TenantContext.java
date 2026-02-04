package de.gradify.shared.tenant;

/**
 * ThreadLocal-Kontext für den aktuellen Mandanten (DB-per-Tenant-Routing).
 */
public final class TenantContext {

    private static final ThreadLocal<String> TENANT_SUFFIX = new ThreadLocal<>();

    private TenantContext() {}

    /** Setzt den Tenant-Suffix (z.B. "thm", "gu") für den aktuellen Request. */
    public static void setTenantSuffix(String suffix) {
        TENANT_SUFFIX.set(suffix);
    }

    /** Gibt den aktuellen Tenant-Suffix zurück oder null. */
    public static String getTenantSuffix() {
        return TENANT_SUFFIX.get();
    }

    /** Entfernt den Tenant-Kontext (nach Request-Ende aufrufen). */
    public static void clear() {
        TENANT_SUFFIX.remove();
    }
}
