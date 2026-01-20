package de.gradify.studiengang.controller;

import de.gradify.studiengang.entity.*;
import de.gradify.studiengang.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.graphql.data.method.annotation.SchemaMapping;
import org.springframework.stereotype.Controller;

import java.util.List;
import java.util.UUID;

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
    private final StudiengangRepository studiengangRepository;
    private final ModulRepository modulRepository;
    private final EinschreibungRepository einschreibungRepository;
    private final PruefungsordnungRepository pruefungsordnungRepository;
    private final ModulZuweisungRepository modulZuweisungRepository;

    // ==================== MANDANT QUERIES ====================

    /**
     * Holt alle Mandanten.
     * GraphQL: query { mandanten { id, name, kuerzel } }
     */
    @QueryMapping
    public List<Mandant> mandanten() {
        log.info("GraphQL: Fetching all mandanten");
        return mandantRepository.findAll();
    }

    /**
     * Holt einen Mandanten nach ID.
     * GraphQL: query { mandant(id: "...") { id, name, studiengaenge {...} } }
     */
    @QueryMapping
    public Mandant mandant(@Argument("id") String id) {
        log.info("GraphQL: Fetching mandant by id: {}", id);
        return mandantRepository.findById(UUID.fromString(id)).orElse(null);
    }

    // ==================== STUDIENGANG QUERIES ====================

    /**
     * Holt alle Studiengaenge, optional gefiltert nach Mandant.
     * GraphQL: query { studiengaenge(mandantId: "...") { id, name, ... } }
     */
    @QueryMapping
    public List<Studiengang> studiengaenge(@Argument("mandantId") String mandantId) {
        log.info("GraphQL: Fetching studiengaenge - mandantId: {}", mandantId);
        
        if (mandantId != null) {
            return studiengangRepository.findByMandantId(UUID.fromString(mandantId));
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
        return studiengangRepository.findById(UUID.fromString(id)).orElse(null);
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
            return modulRepository.findByPruefungsordnungId(UUID.fromString(poId));
        }
        if (studiengangId != null) {
            // Studiengang holen und dessen aktuelle PO verwenden
            return studiengangRepository.findById(UUID.fromString(studiengangId))
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
        return modulRepository.findById(UUID.fromString(id)).orElse(null);
    }

    // ==================== EINSCHREIBUNG QUERIES ====================

    /**
     * Holt alle Einschreibungen, optional gefiltert.
     * GraphQL: query { einschreibungen(studentId: "...", studiengangId: "...") {...} }
     */
    @QueryMapping
    public List<Einschreibung> einschreibungen(@Argument("studentId") String studentId, @Argument("studiengangId") String studiengangId) {
        log.info("GraphQL: Fetching einschreibungen - studentId: {}, studiengangId: {}", studentId, studiengangId);
        
        if (studentId != null) {
            return einschreibungRepository.findByStudentId(UUID.fromString(studentId));
        }
        if (studiengangId != null) {
            return einschreibungRepository.findByStudiengangId(UUID.fromString(studiengangId));
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
        return einschreibungRepository.findById(UUID.fromString(id)).orElse(null);
    }

    // ==================== SCHEMA MAPPINGS (Nested Fields) ====================

    /**
     * Laedt die Studiengaenge fuer einen Mandanten.
     * GraphQL: mandant { studiengaenge { id, name } }
     */
    @SchemaMapping(typeName = "Mandant", field = "studiengaenge")
    public List<Studiengang> getStudiengaengeForMandant(Mandant mandant) {
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
     * GraphQL: studiengang { module { id, name, ects } }
     */
    @SchemaMapping(typeName = "Studiengang", field = "module")
    public List<Modul> getModuleForStudiengang(Studiengang studiengang) {
        if (studiengang.getAktuellePo() != null) {
            return modulRepository.findByPruefungsordnungId(studiengang.getAktuellePo().getId());
        }
        return List.of();
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

    /**
     * Holt alle Module, die einem Dozenten zugewiesen sind.
     * GraphQL: query { dozentenModule(dozentId: "...") { id, modulNr, name, ects } }
     */
    @QueryMapping
    public List<Modul> dozentenModule(@Argument("dozentId") String dozentId) {
        log.info("GraphQL: Fetching modules for dozent: {}", dozentId);
        
        List<ModulZuweisung> zuweisungen = modulZuweisungRepository.findByDozentId(UUID.fromString(dozentId));
        List<UUID> modulIds = zuweisungen.stream()
            .map(ModulZuweisung::getModulId)
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
}

