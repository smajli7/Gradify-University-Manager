package de.gradify.studiengang.service;

import de.gradify.shared.tenant.TenantContext;
import de.gradify.shared.tenant.TenantRegistryClient;
import de.gradify.studiengang.dto.MandantDto;
import de.gradify.studiengang.entity.Mandant;
import de.gradify.studiengang.repository.MandantRepository;
import de.gradify.shared.tenant.TenantSuffixResolver;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MandantService {

    private final MandantRepository mandantRepository;
    private final TenantDatabaseProvisioningService tenantDatabaseProvisioning;
    @Autowired(required = false)
    private MandantAggregationService mandantAggregationService;
    @Autowired(required = false)
    private TenantSuffixResolver tenantSuffixResolver;
    @Autowired(required = false)
    private TenantRegistryClient tenantRegistryClient;

    /**
     * Holt alle aktiven Mandanten.
     */
    @Transactional(readOnly = true)
    public List<MandantDto> getAktiveMandanten() {
        List<Mandant> list = mandantAggregationService != null
                ? mandantAggregationService.findAllMandanten()
                : mandantRepository.findByAktivTrue();
        return list.stream().filter(Mandant::isAktiv).map(this::toDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Optional<MandantDto> getMandantById(Long id) {
        return (mandantAggregationService != null ? mandantAggregationService.findById(id) : mandantRepository.findById(id))
                .map(this::toDto);
    }

    @Transactional(readOnly = true)
    public Optional<String> getMandantKuerzel(Long mandantId) {
        return (mandantAggregationService != null ? mandantAggregationService.findById(mandantId) : mandantRepository.findById(mandantId))
                .map(Mandant::getKuerzel);
    }

    /**
     * Erstellt einen neuen Mandanten (Hochschule).
     * Legt synchron die zugehörigen Tenant-Datenbanken an (DB-per-Tenant).
     */
    @Transactional
    public MandantDto createMandant(de.gradify.studiengang.dto.CreateMandantRequest request) {
        String kuerzelUpper = request.getKuerzel().trim().toUpperCase();
        if ((mandantAggregationService != null ? mandantAggregationService.findByKuerzel(kuerzelUpper) : mandantRepository.findByKuerzel(kuerzelUpper)).isPresent()) {
            throw new IllegalArgumentException("Eine Hochschule mit dem Kürzel '" + request.getKuerzel() + "' existiert bereits.");
        }
        String kuerzel = kuerzelUpper;

        // Suffix für die neue Hochschule berechnen
        String suffix = kuerzel.trim().toLowerCase().replaceAll("[^a-z0-9_]", "_");

        Mandant mandant;

        // Multi-Tenant: globale mandant_id aus Registry verwenden, um Eintraege nicht zu ueberschreiben
        if (tenantRegistryClient != null && mandantAggregationService != null) {
            long nextMandantId = tenantRegistryClient.getNextMandantId();

            // 1. Datenbanken erstellen und Schemas initialisieren
            tenantDatabaseProvisioning.provisionDatabasesForNewMandant(kuerzel);

            // 2. Mandant mit expliziter ID in neuer Tenant-DB speichern (verhindert ID-Kollision mit bestehenden Mandanten)
            mandant = mandantAggregationService.insertMandantWithId(suffix, nextMandantId, request.getName().trim(), kuerzel, true);

            // 3. In zentrale Tenant-Registry eintragen
            tenantRegistryClient.register(mandant.getId(), suffix, kuerzel, mandant.getName());
            log.info("Mandant in zentrale Registry eingetragen: {} -> {}", mandant.getId(), suffix);
        } else {
            // Fallback: Einzel-Mandant ohne Registry
            tenantDatabaseProvisioning.provisionDatabasesForNewMandant(kuerzel);
            mandant = Mandant.builder()
                    .name(request.getName().trim())
                    .kuerzel(kuerzel)
                    .aktiv(true)
                    .build();
            TenantContext.setTenantSuffix(suffix);
            try {
                mandant = mandantRepository.save(mandant);
            } finally {
                TenantContext.clear();
            }
            if (tenantRegistryClient != null) {
                tenantRegistryClient.register(mandant.getId(), suffix, kuerzel, mandant.getName());
            }
        }

        log.info("Mandant erstellt: {} ({}) mit Tenant-Datenbanken", mandant.getName(), mandant.getKuerzel());
        return toDto(mandant);
    }

    /**
     * Konvertiert Mandant Entity zu DTO.
     */
    private MandantDto toDto(Mandant mandant) {
        return MandantDto.builder()
                .id(mandant.getId())
                .name(mandant.getName())
                .kuerzel(mandant.getKuerzel())
                .aktiv(mandant.isAktiv())
                .build();
    }
}



