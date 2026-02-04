package de.gradify.user.service;

import de.gradify.shared.tenant.TenantContext;
import de.gradify.shared.tenant.TenantSuffixResolver;
import de.gradify.user.entity.Benutzer;
import de.gradify.user.repository.BenutzerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * Sucht Benutzer über alle Tenant-DBs (für Login).
 * Nur aktiv wenn tenant-routing enabled (DB-per-Tenant für User).
 */
@Service
@RequiredArgsConstructor
@org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(name = "gradify.tenant-routing.enabled", havingValue = "true")
@Slf4j
public class TenantUserLookupService {

    private final BenutzerRepository benutzerRepository;
    private final TenantSuffixResolver tenantSuffixResolver;

    /**
     * Findet einen Benutzer anhand des Benutzernamens über alle Tenant-DBs.
     * Wird für Login (gRPC ValidateCredentials) verwendet.
     */
    public Optional<Benutzer> findByBenutzernameAcrossTenants(String benutzername) {
        for (String suffix : tenantSuffixResolver.getAllSuffixes()) {
            try {
                TenantContext.setTenantSuffix(suffix);
                Optional<Benutzer> found = benutzerRepository.findByBenutzername(benutzername);
                if (found.isPresent()) {
                    return found;
                }
            } finally {
                TenantContext.clear();
            }
        }
        return Optional.empty();
    }

    /**
     * Findet einen Benutzer anhand der ID über alle Tenant-DBs (für gRPC ohne Kontext).
     */
    public Optional<Benutzer> findByIdAcrossTenants(Long id) {
        for (String suffix : tenantSuffixResolver.getAllSuffixes()) {
            try {
                TenantContext.setTenantSuffix(suffix);
                Optional<Benutzer> found = benutzerRepository.findById(id);
                if (found.isPresent()) {
                    return found;
                }
            } finally {
                TenantContext.clear();
            }
        }
        return Optional.empty();
    }

    /** Nutzt aktuellen Tenant-Kontext (für REST mit JWT). */
    public Optional<Benutzer> findById(Long id) {
        return benutzerRepository.findById(id);
    }
}
