package de.gradify.studiengang.service;

import de.gradify.shared.tenant.TenantRegistryClient;
import de.gradify.shared.tenant.TenantSuffixResolver;
import de.gradify.studiengang.entity.Mandant;
import de.gradify.studiengang.entity.Modul;
import de.gradify.studiengang.entity.Pruefungsordnung;
import de.gradify.studiengang.entity.Studiengang;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.util.*;

/**
 * Aggregiert Mandanten über alle Tenant-DBs (für Admin-Übersicht).
 * Nutzt tenant_registry als verbindliche Quelle, damit alle registrierten Hochschulen angezeigt werden.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "gradify.tenant-routing.enabled", havingValue = "true")
public class MandantAggregationService {

    private final TenantSuffixResolver tenantSuffixResolver;

    @Value("${spring.datasource.url:jdbc:postgresql://localhost:5432/gradify_studiengang}")
    private String baseUrl;
    @Value("${spring.datasource.username:gradify}")
    private String username;
    @Value("${spring.datasource.password:gradify123}")
    private String password;

    private final Optional<TenantRegistryClient> tenantRegistryClient;

    public List<Mandant> findAllMandanten() {
        Map<Long, Mandant> byId = new LinkedHashMap<>();
        boolean loadedFromRegistry = loadFromRegistry(byId);
        if (!loadedFromRegistry) {
            loadFromSuffixes(byId);
        }

        List<Mandant> result = new ArrayList<>(byId.values());
        log.info("MandantAggregation: insgesamt {} Mandanten gefunden", result.size());
        return result;
    }

    /**
     * Fuegt einen Mandanten mit expliziter ID in die angegebene Tenant-DB ein.
     * Verwendet globale mandant_id aus tenant_registry, um Ueberschreibungen zu vermeiden.
     */
    /**
     * Fuegt einen Mandanten mit expliziter ID in die angegebene Tenant-DB ein.
     * Setzt die Sequence auf mindestens id+1, damit zukuenftige Inserts keine Konflikte verursachen.
     */
    public Mandant insertMandantWithId(String suffix, Long id, String name, String kuerzel, boolean aktiv) {
        JdbcTemplate jdbc = jdbcForSuffix(suffix);
        jdbc.update(
                "INSERT INTO mandanten (id, name, kuerzel, aktiv, erstellt_am, aktualisiert_am) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
                id, name, kuerzel, aktiv);
        // Setze Sequence auf max(aktueller Wert, id) damit zukuenftige IDENTITY-Inserts keine Konflikte verursachen
        jdbc.execute("SELECT setval('mandanten_id_seq', GREATEST((SELECT COALESCE(MAX(id), 0) FROM mandanten), " + id + "))");
        return Mandant.builder()
                .id(id)
                .name(name)
                .kuerzel(kuerzel)
                .aktiv(aktiv)
                .build();
    }

    public Optional<Mandant> findById(Long id) {
        if (tenantRegistryClient.isPresent()) {
            String suffix = tenantRegistryClient.get().getAllIdToSuffix().get(id);
            if (suffix != null) {
                return loadMandantById(suffix, id);
            }
        }
        for (String suffix : resolveSuffixes()) {
            Optional<Mandant> found = loadMandantById(suffix, id);
            if (found.isPresent()) return found;
        }
        return Optional.empty();
    }

    public Optional<Mandant> findByKuerzel(String kuerzel) {
        for (String suffix : resolveSuffixes()) {
            Optional<Mandant> found = loadMandantByKuerzel(suffix, kuerzel);
            if (found.isPresent()) return found;
        }
        return Optional.empty();
    }

    /**
     * Lädt alle Module eines Dozenten über alle Tenant-DBs (für Bioinformatik/GU etc.).
     */
    public List<Modul> loadDozentenModule(Long dozentId) {
        List<Modul> result = new ArrayList<>();
        for (String suffix : resolveSuffixes()) {
            try {
                List<Modul> found = loadDozentenModuleInTenant(suffix, dozentId);
                result.addAll(found);
            } catch (Exception e) {
                log.debug("Dozent {} hat keine Module in Tenant {}: {}", dozentId, suffix, e.getMessage());
            }
        }
        log.debug("Dozent {}: {} Module über alle Tenants", dozentId, result.size());
        return result;
    }

    /**
     * Lädt Module einer Prüfungsordnung per JDBC (für studiengang.module).
     */
    public List<Modul> loadModuleByPoId(String suffix, Long poId) {
        JdbcTemplate jdbc = jdbcForSuffix(suffix);
        return jdbc.query(
                "SELECT id, po_id, modul_nr, name, name_en, ects, semester, dauer_semester, pruefungsform, pruefungsdauer, sprache, modultyp, bewertungsart, gewichtung, in_gesamtnote, vorleistung, wahlpflicht_gruppe FROM module WHERE po_id = ?",
                (rs, rowNum) -> mapModul(rs),
                poId);
    }

    private List<Modul> loadDozentenModuleInTenant(String suffix, Long dozentId) {
        JdbcTemplate jdbc = jdbcForSuffix(suffix);
        List<Long> rawIds = jdbc.queryForList(
                "SELECT modul_id FROM modul_zuweisungen WHERE dozent_id = ?",
                Long.class,
                dozentId);
        List<Long> modulIds = rawIds.stream().distinct().toList();
        if (modulIds.isEmpty()) return List.of();

        String placeholders = String.join(",", Collections.nCopies(modulIds.size(), "?"));
        return jdbc.query(
                "SELECT m.id, m.po_id, m.modul_nr, m.name, m.name_en, m.ects, m.semester, m.dauer_semester, m.pruefungsform, m.pruefungsdauer, m.sprache, m.modultyp, m.bewertungsart, m.gewichtung, m.in_gesamtnote, m.vorleistung, m.wahlpflicht_gruppe, sg.kuerzel AS studiengang_kuerzel FROM module m JOIN pruefungsordnungen po ON m.po_id = po.id JOIN studiengaenge sg ON po.studiengang_id = sg.id WHERE m.id IN (" + placeholders + ")",
                (rs, rowNum) -> mapModulWithStudiengang(rs),
                modulIds.toArray());
    }

    private Modul mapModul(java.sql.ResultSet rs) throws java.sql.SQLException {
        Long poId = rs.getLong("po_id");
        Pruefungsordnung po = Pruefungsordnung.builder().id(poId).build();
        String pruefungsformStr = rs.getString("pruefungsform");
        String modultypStr = rs.getString("modultyp");
        String bewertungsartStr = rs.getString("bewertungsart");
        String spracheStr = rs.getString("sprache");
        return Modul.builder()
                .id(rs.getLong("id"))
                .pruefungsordnung(po)
                .modulNr(rs.getString("modul_nr"))
                .name(rs.getString("name"))
                .nameEn(rs.getString("name_en"))
                .ects(rs.getInt("ects"))
                .semester(rs.getString("semester"))
                .dauerSemester(rs.getInt("dauer_semester"))
                .pruefungsform(pruefungsformStr != null ? Modul.Pruefungsform.valueOf(pruefungsformStr) : Modul.Pruefungsform.KLAUSUR)
                .pruefungsdauer(rs.getString("pruefungsdauer"))
                .sprache(spracheStr != null ? Modul.Sprache.valueOf(spracheStr) : Modul.Sprache.DEUTSCH)
                .modultyp(modultypStr != null ? Modul.Modultyp.valueOf(modultypStr) : Modul.Modultyp.PFLICHT)
                .bewertungsart(bewertungsartStr != null ? Modul.Bewertungsart.valueOf(bewertungsartStr) : Modul.Bewertungsart.NOTE)
                .gewichtung(BigDecimal.valueOf(rs.getDouble("gewichtung")))
                .inGesamtnote(rs.getBoolean("in_gesamtnote"))
                .vorleistung(rs.getString("vorleistung"))
                .wahlpflichtGruppe(rs.getString("wahlpflicht_gruppe"))
                .build();
    }

    private Modul mapModulWithStudiengang(java.sql.ResultSet rs) throws java.sql.SQLException {
        Long poId = rs.getLong("po_id");
        Pruefungsordnung po = Pruefungsordnung.builder().id(poId).build();
        String pruefungsformStr = rs.getString("pruefungsform");
        String modultypStr = rs.getString("modultyp");
        String bewertungsartStr = rs.getString("bewertungsart");
        String spracheStr = rs.getString("sprache");
        String studiengangKuerzel = null;
        try {
            studiengangKuerzel = rs.getString("studiengang_kuerzel");
        } catch (java.sql.SQLException ignored) { /* Spalte fehlt bei alter Query */ }
        return Modul.builder()
                .id(rs.getLong("id"))
                .pruefungsordnung(po)
                .modulNr(rs.getString("modul_nr"))
                .name(rs.getString("name"))
                .nameEn(rs.getString("name_en"))
                .ects(rs.getInt("ects"))
                .semester(rs.getString("semester"))
                .dauerSemester(rs.getInt("dauer_semester"))
                .pruefungsform(pruefungsformStr != null ? Modul.Pruefungsform.valueOf(pruefungsformStr) : Modul.Pruefungsform.KLAUSUR)
                .pruefungsdauer(rs.getString("pruefungsdauer"))
                .sprache(spracheStr != null ? Modul.Sprache.valueOf(spracheStr) : Modul.Sprache.DEUTSCH)
                .modultyp(modultypStr != null ? Modul.Modultyp.valueOf(modultypStr) : Modul.Modultyp.PFLICHT)
                .bewertungsart(bewertungsartStr != null ? Modul.Bewertungsart.valueOf(bewertungsartStr) : Modul.Bewertungsart.NOTE)
                .gewichtung(BigDecimal.valueOf(rs.getDouble("gewichtung")))
                .inGesamtnote(rs.getBoolean("in_gesamtnote"))
                .vorleistung(rs.getString("vorleistung"))
                .wahlpflichtGruppe(rs.getString("wahlpflicht_gruppe"))
                .studiengangKuerzel(studiengangKuerzel)
                .build();
    }

    /**
     * Lädt Studiengänge per JDBC (umgeht JPA-Session-Problem bei Multi-Tenant).
     */
    public List<Studiengang> loadStudiengaengeForMandant(Long mandantId, String suffix, Mandant mandantRef) {
        JdbcTemplate jdbc = jdbcForSuffix(suffix);
        return jdbc.query(
                "SELECT id, name, kuerzel, abschlussart, regelstudienzeit, gesamt_ects, studienvariante, aktiv, aktuelle_po_id FROM studiengaenge WHERE mandant_id = ?",
                (rs, rowNum) -> mapStudiengang(rs, mandantRef),
                mandantId);
    }

    private Studiengang mapStudiengang(java.sql.ResultSet rs, Mandant mandantRef) throws java.sql.SQLException {
        String abschlussStr = rs.getString("abschlussart");
        String varianteStr = rs.getString("studienvariante");
        Long poId = rs.getObject("aktuelle_po_id", Long.class);
        Pruefungsordnung aktuellePo = poId != null ? Pruefungsordnung.builder().id(poId).build() : null;
        return Studiengang.builder()
                .id(rs.getLong("id"))
                .mandant(mandantRef)
                .aktuellePo(aktuellePo)
                .name(rs.getString("name"))
                .kuerzel(rs.getString("kuerzel"))
                .abschlussart(abschlussStr != null ? Studiengang.Abschlussart.valueOf(abschlussStr) : Studiengang.Abschlussart.BACHELOR)
                .regelstudienzeit(rs.getInt("regelstudienzeit"))
                .gesamtEcts(rs.getInt("gesamt_ects"))
                .studienvariante(varianteStr != null ? Studiengang.Studienvariante.valueOf(varianteStr) : Studiengang.Studienvariante.ALLGEMEIN)
                .aktiv(rs.getBoolean("aktiv"))
                .build();
    }

    private List<String> resolveSuffixes() {
        Set<String> merged = new LinkedHashSet<>();
        tenantRegistryClient.ifPresent(client -> merged.addAll(client.getAllIdToSuffix().values()));
        merged.addAll(tenantSuffixResolver.getAllSuffixes());
        return new ArrayList<>(merged);
    }

    private boolean loadFromRegistry(Map<Long, Mandant> byId) {
        if (tenantRegistryClient.isEmpty()) return false;
        Map<Long, String> idToSuffix = tenantRegistryClient.get().getAllIdToSuffix();
        if (idToSuffix.isEmpty()) return false;
        List<Long> ids = new ArrayList<>(idToSuffix.keySet());
        ids.sort(Long::compareTo);
        log.debug("MandantAggregation: iteriere {} Mandanten aus Registry: {}", ids.size(), ids);
        for (Long mandantId : ids) {
            String suffix = idToSuffix.get(mandantId);
            if (suffix == null) continue;
            try {
                loadMandantById(suffix, mandantId).ifPresent(m -> byId.putIfAbsent(m.getId(), m));
                log.debug("MandantAggregation: Mandant {} aus {} geladen", mandantId, suffix);
            } catch (Exception e) {
                log.warn("MandantAggregation: Fehler bei Mandant {} ({}): {}", mandantId, suffix, e.getMessage());
            }
        }
        return !byId.isEmpty();
    }

    private void loadFromSuffixes(Map<Long, Mandant> byId) {
        List<String> suffixes = resolveSuffixes();
        log.debug("MandantAggregation: Fallback – iteriere {} Suffixe: {}", suffixes.size(), suffixes);
        for (String suffix : suffixes) {
            try {
                List<Mandant> found = loadAllMandanten(suffix);
                for (Mandant m : found) {
                    byId.putIfAbsent(m.getId(), m);
                }
                log.debug("MandantAggregation: Suffix {} -> {} Mandanten", suffix, found.size());
            } catch (Exception e) {
                log.warn("MandantAggregation: Fehler bei Suffix {}: {}", suffix, e.getMessage());
            }
        }
    }

    private JdbcTemplate jdbcForSuffix(String suffix) {
        String urlBase = baseUrl.replaceAll("/[^/?]+(\\?.*)?$", "");
        String url = urlBase + "/gradify_studiengang_" + suffix;
        return new JdbcTemplate(new DriverManagerDataSource(url, username, password));
    }

    private List<Mandant> loadAllMandanten(String suffix) {
        JdbcTemplate jdbc = jdbcForSuffix(suffix);
        return jdbc.query("SELECT id, name, kuerzel, aktiv, erstellt_am, aktualisiert_am FROM mandanten",
                (rs, rowNum) -> mapMandant(rs));
    }

    private Optional<Mandant> loadMandantById(String suffix, Long id) {
        JdbcTemplate jdbc = jdbcForSuffix(suffix);
        List<Mandant> found = jdbc.query(
                "SELECT id, name, kuerzel, aktiv, erstellt_am, aktualisiert_am FROM mandanten WHERE id = ? LIMIT 1",
                (rs, rowNum) -> mapMandant(rs),
                id);
        return found.stream().findFirst();
    }

    private Optional<Mandant> loadMandantByKuerzel(String suffix, String kuerzel) {
        JdbcTemplate jdbc = jdbcForSuffix(suffix);
        List<Mandant> found = jdbc.query(
                "SELECT id, name, kuerzel, aktiv, erstellt_am, aktualisiert_am FROM mandanten WHERE UPPER(kuerzel) = UPPER(?) LIMIT 1",
                (rs, rowNum) -> mapMandant(rs),
                kuerzel);
        return found.stream().findFirst();
    }

    private Mandant mapMandant(java.sql.ResultSet rs) throws java.sql.SQLException {
        Timestamp created = rs.getTimestamp("erstellt_am");
        Timestamp updated = rs.getTimestamp("aktualisiert_am");
        return Mandant.builder()
                .id(rs.getLong("id"))
                .name(rs.getString("name"))
                .kuerzel(rs.getString("kuerzel"))
                .aktiv(rs.getBoolean("aktiv"))
                .erstelltAm(created != null ? created.toLocalDateTime() : null)
                .aktualisiertAm(updated != null ? updated.toLocalDateTime() : null)
                .build();
    }
}
