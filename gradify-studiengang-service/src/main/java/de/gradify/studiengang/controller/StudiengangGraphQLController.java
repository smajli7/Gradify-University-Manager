package de.gradify.studiengang.controller;

import de.gradify.shared.tenant.TenantContext;
import de.gradify.shared.tenant.TenantSuffixResolver;
import de.gradify.studiengang.config.AuthPrincipal;
import de.gradify.studiengang.config.SecurityUtils;
import de.gradify.studiengang.entity.*;
import de.gradify.studiengang.repository.*;
import de.gradify.studiengang.service.MandantAggregationService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import lombok.extern.slf4j.Slf4j;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.graphql.data.method.annotation.SchemaMapping;
import org.springframework.stereotype.Controller;

import java.util.List;

/**
 * GraphQL Controller fuer Studiengang-Abfragen.
 * 
 * Implementiert die Queries aus schema.graphqls.
 * Bietet flexible Abfragen fuer Frontend-Dashboards.
 */
@Controller
@RequiredArgsConstructor
@Slf4j
public class StudiengangGraphQLController {

    private final MandantRepository mandantRepository;
    @Autowired(required = false)
    private MandantAggregationService mandantAggregationService;
    @Autowired(required = false)
    private TenantSuffixResolver tenantSuffixResolver;
    private final StudiengangRepository studiengangRepository;
    private final ModulRepository modulRepository;
    private final EinschreibungRepository einschreibungRepository;
    private final PruefungsordnungRepository pruefungsordnungRepository;
    private final ModulZuweisungRepository modulZuweisungRepository;
    private final WahlpflichtWahlRepository wahlpflichtWahlRepository;

    // ==================== MANDANT QUERIES ====================

    /**
     * Holt alle Mandanten.
     * HOCHSCHUL_VERWALTER sieht nur seine zugewiesene Hochschule.
     */
    @QueryMapping
    public List<Mandant> mandanten() {
        log.info("GraphQL: Fetching mandanten");
        List<Mandant> all = mandantAggregationService != null
                ? mandantAggregationService.findAllMandanten()
                : mandantRepository.findAll();
        AuthPrincipal ap = SecurityUtils.getAuthPrincipal();
        if (ap != null && ap.isHochschulVerwalter() && ap.getMandantId() != null) {
            all = all.stream()
                    .filter(m -> ap.getMandantId().equals(m.getId()))
                    .toList();
        }
        return all;
    }

    /**
     * Holt einen Mandanten nach ID.
     * HOCHSCHUL_VERWALTER nur fuer eigene Hochschule.
     * GraphQL: query { mandant(id: "...") { id, name, studiengaenge {...} } }
     */
    @QueryMapping
    public Mandant mandant(@Argument("id") String id) {
        log.info("GraphQL: Fetching mandant by id: {}", id);
        Long mandantId = Long.parseLong(id);
        if (!SecurityUtils.ensureMandantAccess(mandantId)) {
            return null;
        }
        return mandantAggregationService != null
                ? mandantAggregationService.findById(mandantId).orElse(null)
                : mandantRepository.findById(mandantId).orElse(null);
    }

    // ==================== STUDIENGANG QUERIES ====================

    /**
     * Holt alle Studiengaenge, optional gefiltert nach Mandant.
     * HOCHSCHUL_VERWALTER nur fuer eigene Hochschule.
     * GraphQL: query { studiengaenge(mandantId: "...") { id, name, ... } }
     */
    @QueryMapping
    public List<Studiengang> studiengaenge(@Argument("mandantId") String mandantId) {
        log.info("GraphQL: Fetching studiengaenge - mandantId: {}", mandantId);
        AuthPrincipal ap = SecurityUtils.getAuthPrincipal();
        if (ap != null && ap.isHochschulVerwalter() && ap.getMandantId() != null) {
            mandantId = String.valueOf(ap.getMandantId());
        }
        if (mandantId != null) {
            Long mid = Long.parseLong(mandantId);
            if (!SecurityUtils.ensureMandantAccess(mid)) {
                return List.of();
            }
            String suffix = tenantSuffixResolver != null ? tenantSuffixResolver.resolve(mid) : null;
            if (suffix != null) {
                TenantContext.setTenantSuffix(suffix);
                try {
                    return studiengangRepository.findByMandantId(mid);
                } finally {
                    TenantContext.clear();
                }
            }
            return studiengangRepository.findByMandantId(mid);
        }
        return studiengangRepository.findAll();
    }

    /**
     * Holt einen Studiengang nach ID.
     * GraphQL: query { studiengang(id: "...") { id, name, module {...} } }
     */
    @QueryMapping
    public Studiengang studiengang(@Argument("id") String id) {
        log.info("GraphQL: Fetching studiengang by id: {}", id);
        return studiengangRepository.findById(Long.parseLong(id)).orElse(null);
    }

    /**
     * Holt einen Studiengang nach Kuerzel.
     * GraphQL: query { studiengangByKuerzel(kuerzel: "BVT") { id, name, ... } }
     */
    @QueryMapping
    public Studiengang studiengangByKuerzel(@Argument("kuerzel") String kuerzel) {
        log.info("GraphQL: Fetching studiengang by kuerzel: {}", kuerzel);
        return studiengangRepository.findByKuerzel(kuerzel).orElse(null);
    }

    // ==================== MODUL QUERIES ====================

    /**
     * Holt alle Module, optional gefiltert.
     * GraphQL: query { module(studiengangId: "...", poId: "...") { id, name, ects } }
     */
    @QueryMapping
    public List<Modul> module(@Argument("studiengangId") String studiengangId, @Argument("poId") String poId) {
        log.info("GraphQL: Fetching module - studiengangId: {}, poId: {}", studiengangId, poId);
        
        if (poId != null) {
            return modulRepository.findByPruefungsordnungId(Long.parseLong(poId));
        }
        if (studiengangId != null) {
            // Studiengang holen und dessen aktuelle PO verwenden
            return studiengangRepository.findById(Long.parseLong(studiengangId))
                    .map(sg -> {
                        if (sg.getAktuellePo() != null) {
                            return modulRepository.findByPruefungsordnungId(sg.getAktuellePo().getId());
                        }
                        return List.<Modul>of();
                    })
                    .orElse(List.of());
        }
        return modulRepository.findAll();
    }

    /**
     * Holt ein Modul nach ID.
     * GraphQL: query { modul(id: "...") { id, name, ects, gewichtung } }
     */
    @QueryMapping
    public Modul modul(@Argument("id") String id) {
        log.info("GraphQL: Fetching modul by id: {}", id);
        return modulRepository.findById(Long.parseLong(id)).orElse(null);
    }

    // ==================== EINSCHREIBUNG QUERIES ====================

    /**
     * Holt alle Einschreibungen, optional gefiltert.
     * GraphQL: query { einschreibungen(studentId: "...", studiengangId: "...") {...} }
     */
    @QueryMapping
    public List<Einschreibung> einschreibungen(@Argument("studentId") String studentId, @Argument("studiengangId") String studiengangId) {
        String currentTenant = de.gradify.shared.tenant.TenantContext.getTenantSuffix();
        log.info("GraphQL: Fetching einschreibungen - studentId: {}, studiengangId: {}, tenant: {}", studentId, studiengangId, currentTenant);
        
        if (studentId != null) {
            List<Einschreibung> result = einschreibungRepository.findByStudentId(Long.parseLong(studentId));
            log.info("GraphQL: Found {} einschreibungen for studentId={} in tenant={}", result.size(), studentId, currentTenant);
            return result;
        }
        if (studiengangId != null) {
            return einschreibungRepository.findByStudiengangId(Long.parseLong(studiengangId));
        }
        return einschreibungRepository.findAll();
    }

    /**
     * Holt eine Einschreibung nach ID.
     * GraphQL: query { einschreibung(id: "...") { id, studentId, ... } }
     */
    @QueryMapping
    public Einschreibung einschreibung(@Argument("id") String id) {
        log.info("GraphQL: Fetching einschreibung by id: {}", id);
        return einschreibungRepository.findById(Long.parseLong(id)).orElse(null);
    }

    // ==================== SCHEMA MAPPINGS (Nested Fields) ====================

    /**
     * Laedt die Studiengaenge fuer einen Mandanten.
     * Nutzt JDBC (via MandantAggregationService), um JPA-Session-Probleme bei Multi-Tenant zu vermeiden.
     * GraphQL: mandant { studiengaenge { id, name } }
     */
    @SchemaMapping(typeName = "Mandant", field = "studiengaenge")
    public List<Studiengang> getStudiengaengeForMandant(Mandant mandant) {
        String suffix = tenantSuffixResolver != null ? tenantSuffixResolver.resolve(mandant.getId()) : null;
        if (suffix != null && mandantAggregationService != null) {
            return mandantAggregationService.loadStudiengaengeForMandant(mandant.getId(), suffix, mandant);
        }
        if (suffix != null) {
            TenantContext.setTenantSuffix(suffix);
            try {
                return studiengangRepository.findByMandantId(mandant.getId());
            } finally {
                TenantContext.clear();
            }
        }
        return studiengangRepository.findByMandantId(mandant.getId());
    }

    /**
     * Laedt den Mandanten fuer einen Studiengang.
     * GraphQL: studiengang { mandant { id, name } }
     */
    @SchemaMapping(typeName = "Studiengang", field = "mandant")
    public Mandant getMandantForStudiengang(Studiengang studiengang) {
        return studiengang.getMandant();
    }

    /**
     * Laedt die Module fuer einen Studiengang.
     * Setzt TenantContext, damit GU/Bioinformatik-Module korrekt geladen werden.
     * GraphQL: studiengang { module { id, name, ects } }
     */
    @SchemaMapping(typeName = "Studiengang", field = "module")
    public List<Modul> getModuleForStudiengang(Studiengang studiengang) {
        if (studiengang.getAktuellePo() == null) return List.of();
        String suffix = tenantSuffixResolver != null && studiengang.getMandant() != null
                ? tenantSuffixResolver.resolve(studiengang.getMandant().getId()) : null;
        if (suffix != null && mandantAggregationService != null) {
            return mandantAggregationService.loadModuleByPoId(suffix, studiengang.getAktuellePo().getId());
        }
        if (suffix != null) {
            TenantContext.setTenantSuffix(suffix);
            try {
                return modulRepository.findByPruefungsordnungId(studiengang.getAktuellePo().getId());
            } finally {
                TenantContext.clear();
            }
        }
        return modulRepository.findByPruefungsordnungId(studiengang.getAktuellePo().getId());
    }

    // ==================== EINSCHREIBUNG SCHEMA MAPPINGS ====================

    /**
     * Laedt den Studiengang fuer eine Einschreibung.
     * GraphQL: einschreibung { studiengang { id, name, ... } }
     */
    @SchemaMapping(typeName = "Einschreibung", field = "studiengang")
    public Studiengang getStudiengangForEinschreibung(Einschreibung einschreibung) {
        return einschreibung.getStudiengang();
    }

    /**
     * Gibt die studiengangId als String zurueck.
     * GraphQL: einschreibung { studiengangId }
     */
    @SchemaMapping(typeName = "Einschreibung", field = "studiengangId")
    public String getStudiengangIdForEinschreibung(Einschreibung einschreibung) {
        return einschreibung.getStudiengang() != null 
            ? einschreibung.getStudiengang().getId().toString() 
            : null;
    }

    /**
     * Gibt die poId als String zurueck.
     * GraphQL: einschreibung { poId }
     */
    @SchemaMapping(typeName = "Einschreibung", field = "poId")
    public String getPoIdForEinschreibung(Einschreibung einschreibung) {
        return einschreibung.getPruefungsordnung() != null 
            ? einschreibung.getPruefungsordnung().getId().toString() 
            : null;
    }

    /**
     * Laedt die Pruefungsordnung fuer eine Einschreibung.
     * GraphQL: einschreibung { pruefungsordnung { id, version, module {...} } }
     */
    @SchemaMapping(typeName = "Einschreibung", field = "pruefungsordnung")
    public Pruefungsordnung getPruefungsordnungForEinschreibung(Einschreibung einschreibung) {
        return einschreibung.getPruefungsordnung();
    }

    // ==================== DOZENTEN-MODUL-ZUWEISUNGEN ====================

    @SchemaMapping(typeName = "Modul", field = "studiengangKuerzel")
    public String studiengangKuerzel(Modul modul) {
        if (modul.getStudiengangKuerzel() != null) {
            return modul.getStudiengangKuerzel();
        }
        return modulRepository.findStudiengangKuerzelByModulId(modul.getId()).orElse(null);
    }

    /**
     * Holt alle Module, die einem Dozenten zugewiesen sind.
     * Nutzt JDBC-Aggregation über alle Tenant-DBs, damit Bioinformatik/GU-Dozenten sichtbar sind.
     * GraphQL: query { dozentenModule(dozentId: "...") { id, modulNr, name, ects } }
     */
    @QueryMapping
    public List<Modul> dozentenModule(@Argument("dozentId") String dozentId) {
        log.info("GraphQL: Fetching modules for dozent: {}", dozentId);
        Long id = Long.parseLong(dozentId);

        if (mandantAggregationService != null) {
            return mandantAggregationService.loadDozentenModule(id);
        }

        List<ModulZuweisung> zuweisungen = modulZuweisungRepository.findByDozentId(id);
        List<Long> modulIds = zuweisungen.stream()
            .map(ModulZuweisung::getModulId)
            .distinct()
            .toList();
        return modulRepository.findAllById(modulIds);
    }

    // ==================== PRUEFUNGSORDNUNG SCHEMA MAPPINGS ====================

    /**
     * Laedt die Module fuer eine Pruefungsordnung.
     * GraphQL: pruefungsordnung { module { id, name, ects, ... } }
     */
    @SchemaMapping(typeName = "Pruefungsordnung", field = "module")
    public List<Modul> getModuleForPruefungsordnung(Pruefungsordnung po) {
        return modulRepository.findByPruefungsordnungId(po.getId());
    }

    // ==================== WAHLPFLICHT QUERIES + MUTATIONS ====================

    /**
     * Holt alle Wahlpflicht-Wahlen einer Einschreibung.
     * GraphQL: query { wahlpflichtWahlen(einschreibungId: "...") { id, wahlpflichtGruppe, modulId } }
     */
    @QueryMapping
    public List<WahlpflichtWahl> wahlpflichtWahlen(@Argument("einschreibungId") String einschreibungId) {
        log.info("GraphQL: Fetching wahlpflicht selections for einschreibung: {}", einschreibungId);
        return wahlpflichtWahlRepository.findByEinschreibungId(Long.valueOf(einschreibungId));
    }

    /**
     * Setzt die Wahlpflicht-Auswahl eines Studenten (upsert).
     * GraphQL: mutation { setWahlpflichtWahl(einschreibungId: "...", wahlpflichtGruppe: "FP", modulId: "...") { id } }
     */
    @MutationMapping
    public WahlpflichtWahl setWahlpflichtWahl(
            @Argument("einschreibungId") String einschreibungId,
            @Argument("wahlpflichtGruppe") String wahlpflichtGruppe,
            @Argument("modulId") String modulId) {
        log.info("GraphQL: Setting wahlpflicht wahl - einschreibung: {}, gruppe: {}, modul: {}",
                einschreibungId, wahlpflichtGruppe, modulId);

        Long eid = Long.valueOf(einschreibungId);
        Long mid = Long.valueOf(modulId);

        WahlpflichtWahl wahl = wahlpflichtWahlRepository
                .findByEinschreibungIdAndWahlpflichtGruppe(eid, wahlpflichtGruppe)
                .orElse(WahlpflichtWahl.builder()
                        .einschreibungId(eid)
                        .wahlpflichtGruppe(wahlpflichtGruppe)
                        .build());

        wahl.setModulId(mid);
        return wahlpflichtWahlRepository.save(wahl);
    }
}

