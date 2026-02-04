package de.gradify.shared.tenant;

import java.util.Map;

/**
 * Mappt Mandant-ID auf DB-Suffix (z.B. 1 -> "thm", 2 -> "gu").
 */
public interface TenantSuffixResolver {

    /** Gibt den DB-Suffix für die Mandant-ID zurück, oder null. */
    String resolve(Long mandantId);

    /** Gibt alle konfigurierten Tenant-Suffixe zurück (für Login-Iteration). */
    java.util.List<String> getAllSuffixes();

    /** Gibt die Mandant-ID für einen Suffix zurück, oder null. */
    Long resolveMandantId(String suffix);
}
