package de.gradify.shared.tenant;

import java.util.List;
import java.util.Map;

/**
 * Client für die zentrale Tenant-Registry (gradify_auth.tenant_registry).
 * Ermöglicht dynamische Tenant-Registrierung ohne Neustart.
 */
public interface TenantRegistryClient {

    /** Registriert einen neuen Mandanten in der zentralen Registry. */
    void register(Long mandantId, String suffix, String kuerzel, String name);

    /** Liefert alle Tenants: mandantId -> suffix. */
    Map<Long, String> getAllIdToSuffix();

    /** Liefert alle Tenants: suffix -> mandantId. */
    Map<String, Long> getAllSuffixToId();

    /** Liefert alle konfigurierten Suffixe. */
    List<String> getAllSuffixes();
}
