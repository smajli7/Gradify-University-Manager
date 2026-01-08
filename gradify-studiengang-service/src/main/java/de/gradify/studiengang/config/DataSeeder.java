package de.gradify.studiengang.config;

import de.gradify.studiengang.entity.*;
import de.gradify.studiengang.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Component
@Profile("dev")
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final MandantRepository mandantRepository;
    private final StudiengangRepository studiengangRepository;
    private final PruefungsordnungRepository pruefungsordnungRepository;
    private final ModulRepository modulRepository;
    private final PoRegelwerkRepository poRegelwerkRepository;
    private final EinschreibungRepository einschreibungRepository;

    // Feste IDs fuer Entwicklung - muessen mit anderen Services uebereinstimmen
    public static final UUID THM_MANDANT_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    
    // Student-IDs (werden vom User-Service generiert)
    public static final UUID STUDENT_1_ID = UUID.fromString("aaaa1111-0000-0000-0000-000000000001");
    public static final UUID STUDENT_2_ID = UUID.fromString("aaaa1111-0000-0000-0000-000000000002");
    public static final UUID STUDENT_3_ID = UUID.fromString("aaaa1111-0000-0000-0000-000000000003");
    
    // Einschreibungs-IDs (fuer Noten-Service)
    public static final UUID EINSCHREIBUNG_1 = UUID.fromString("eeee1111-1111-1111-1111-111111111111");
    public static final UUID EINSCHREIBUNG_2 = UUID.fromString("eeee2222-2222-2222-2222-222222222222");
    public static final UUID EINSCHREIBUNG_3 = UUID.fromString("eeee3333-3333-3333-3333-333333333333");
    
    // Modul-IDs (fuer Noten-Service)
    public static final UUID MODUL_M1 = UUID.fromString("aaaa1111-1111-1111-1111-111111111111");
    public static final UUID MODUL_M2 = UUID.fromString("aaaa2222-2222-2222-2222-222222222222");
    public static final UUID MODUL_CH1 = UUID.fromString("aaaa3333-3333-3333-3333-333333333333");
    public static final UUID MODUL_BIO1 = UUID.fromString("aaaa4444-4444-4444-4444-444444444444");
    public static final UUID MODUL_PHY1 = UUID.fromString("aaaa5555-5555-5555-5555-555555555555");
    public static final UUID MODUL_TH = UUID.fromString("aaaa6666-6666-6666-6666-666666666666");
    public static final UUID MODUL_FO1 = UUID.fromString("bbbb1111-1111-1111-1111-111111111111");
    public static final UUID MODUL_FO2 = UUID.fromString("bbbb2222-2222-2222-2222-222222222222");
    public static final UUID MODUL_SA1 = UUID.fromString("bbbb3333-3333-3333-3333-333333333333");
    public static final UUID MODUL_MTH = UUID.fromString("bbbb4444-4444-4444-4444-444444444444");

    @Override
    @Transactional
    public void run(String... args) {
        if (mandantRepository.count() > 0) {
            log.info("Datenbank bereits initialisiert - überspringe Seed-Daten");
            return;
        }

        log.info("Initialisiere Studiengang Seed-Daten...");

        // Mandant erstellen (THM) - saveAndFlush für sofortigen Commit
        Mandant thm = Mandant.builder()
            .id(THM_MANDANT_ID)
            .name("Technische Hochschule Mittelhessen")
            .kuerzel("THM")
            .aktiv(true)
            .build();
        thm = mandantRepository.saveAndFlush(thm);

        // Studiengang: Bioverfahrenstechnik (Bachelor)
        Studiengang biotech = createStudiengang(thm, "Bioverfahrenstechnik", "BVT",
            Studiengang.Abschlussart.BACHELOR, 7, 210);

        // PO für Bioverfahrenstechnik
        Pruefungsordnung poBiotech = createPruefungsordnung(biotech, "2023",
            LocalDate.of(2023, 10, 1), Pruefungsordnung.Berechnungsart.GEWICHTET);

        // Module fuer Bioverfahrenstechnik (mit festen IDs)
        createModul(MODUL_M1, poBiotech, "M1", "Mathematik 1", 5, "1", Modul.Modultyp.PFLICHT, new BigDecimal("1.0"));
        createModul(MODUL_M2, poBiotech, "M2", "Mathematik 2", 5, "2", Modul.Modultyp.PFLICHT, new BigDecimal("1.0"));
        createModul(MODUL_CH1, poBiotech, "CH1", "Allgemeine Chemie", 5, "1", Modul.Modultyp.PFLICHT, new BigDecimal("1.0"));
        createModul(MODUL_BIO1, poBiotech, "BIO1", "Biologie Grundlagen", 5, "1", Modul.Modultyp.PFLICHT, new BigDecimal("1.0"));
        createModul(MODUL_PHY1, poBiotech, "PHY1", "Physik", 5, "2", Modul.Modultyp.PFLICHT, new BigDecimal("1.0"));
        createModul(MODUL_TH, poBiotech, "TH", "Thesis", 12, "7", Modul.Modultyp.PFLICHT, new BigDecimal("3.0"));

        // Regelwerk für Bioverfahrenstechnik
        createRegelwerk(poBiotech, "ECTS-gewichteter Durchschnitt",
            "SUM(note * ects) / SUM(ects)", "Thesis zählt 3-fach");

        // Studiengang: Forschung in der Sozialen Arbeit (Master)
        Studiengang sozialarbeit = createStudiengang(thm, "Forschung in der Sozialen Arbeit", "FSA",
            Studiengang.Abschlussart.MASTER, 3, 90);

        // PO für Soziale Arbeit
        Pruefungsordnung poSozial = createPruefungsordnung(sozialarbeit, "2022",
            LocalDate.of(2022, 10, 1), Pruefungsordnung.Berechnungsart.ARITHMETISCH_GEMISCHT);

        // Module fuer Soziale Arbeit (mit festen IDs)
        createModul(MODUL_FO1, poSozial, "FO1", "Forschungsmethoden I", 6, "1", Modul.Modultyp.PFLICHT, new BigDecimal("1.0"));
        createModul(MODUL_FO2, poSozial, "FO2", "Forschungsmethoden II", 6, "2", Modul.Modultyp.PFLICHT, new BigDecimal("1.0"));
        createModul(MODUL_SA1, poSozial, "SA1", "Soziale Arbeit Theorie", 6, "1", Modul.Modultyp.PFLICHT, new BigDecimal("1.0"));
        createModul(MODUL_MTH, poSozial, "MTH", "Master-Thesis", 24, "3", Modul.Modultyp.PFLICHT, new BigDecimal("2.0"));

        // Regelwerk fuer Soziale Arbeit
        createRegelwerk(poSozial, "Arithmetischer Durchschnitt mit Thesis-Gewichtung",
            "(AVG(module) + 2 * thesis) / 3", "Thesis zaehlt 2-fach");

        // Einschreibungen erstellen (verknuepft Studenten mit Studiengaengen)
        createEinschreibung(EINSCHREIBUNG_1, STUDENT_1_ID, biotech, poBiotech, 3); // Max - BVT, 3. Semester
        createEinschreibung(EINSCHREIBUNG_2, STUDENT_2_ID, biotech, poBiotech, 3); // Erika - BVT, 3. Semester
        createEinschreibung(EINSCHREIBUNG_3, STUDENT_3_ID, sozialarbeit, poSozial, 2); // Jan - FSA Master, 2. Semester

        log.info("Studiengang Seed-Daten erfolgreich erstellt!");
    }

    private Studiengang createStudiengang(Mandant mandant, String name, String kuerzel,
                                          Studiengang.Abschlussart abschlussart, int regelstudienzeit, int ects) {
        Studiengang studiengang = Studiengang.builder()
            .mandant(mandant)
            .name(name)
            .kuerzel(kuerzel)
            .abschlussart(abschlussart)
            .regelstudienzeit(regelstudienzeit)
            .gesamtEcts(ects)
            .aktiv(true)
            .build();
        return studiengangRepository.save(studiengang);
    }

    private Pruefungsordnung createPruefungsordnung(Studiengang studiengang, String version,
                                                     LocalDate gueltigAb, Pruefungsordnung.Berechnungsart art) {
        Pruefungsordnung po = Pruefungsordnung.builder()
            .studiengang(studiengang)
            .version(version)
            .gueltigAb(gueltigAb)
            .berechnungsart(art)
            .build();
        Pruefungsordnung saved = pruefungsordnungRepository.save(po);

        // Aktuelle PO setzen
        studiengang.setAktuellePo(saved);
        studiengangRepository.save(studiengang);

        return saved;
    }

    private void createModul(UUID id, Pruefungsordnung po, String modulNr, String name, int ects,
                             String semester, Modul.Modultyp typ, BigDecimal gewichtung) {
        Modul modul = Modul.builder()
            .id(id)
            .pruefungsordnung(po)
            .modulNr(modulNr)
            .name(name)
            .ects(ects)
            .semester(semester)
            .modultyp(typ)
            .pruefungsform(Modul.Pruefungsform.KLAUSUR)
            .bewertungsart(Modul.Bewertungsart.NOTE)
            .gewichtung(gewichtung)
            .inGesamtnote(true)
            .build();
        modulRepository.save(modul);
    }

    private void createRegelwerk(Pruefungsordnung po, String name, String formel, String beschreibung) {
        PoRegelwerk regelwerk = PoRegelwerk.builder()
            .pruefungsordnung(po)
            .regelName(name)
            .formel(formel)
            .beschreibung(beschreibung)
            .build();
        poRegelwerkRepository.save(regelwerk);
    }

    private void createEinschreibung(UUID id, UUID studentId, Studiengang studiengang, 
                                     Pruefungsordnung po, int semester) {
        Einschreibung einschreibung = Einschreibung.builder()
            .id(id)
            .studentId(studentId)
            .studiengang(studiengang)
            .pruefungsordnung(po)
            .aktuellesSemester(semester)
            .immatrikuliertAm(LocalDate.of(2023, 10, 1))
            .status(Einschreibung.EinschreibungStatus.AKTIV)
            .build();
        einschreibungRepository.save(einschreibung);
    }
}

