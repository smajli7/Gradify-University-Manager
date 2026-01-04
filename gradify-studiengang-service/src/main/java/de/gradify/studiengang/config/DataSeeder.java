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

    // Fester Mandant-ID für Entwicklung (THM)
    public static final UUID THM_MANDANT_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");

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

        // Module für Bioverfahrenstechnik (Beispiele)
        createModul(poBiotech, "M1", "Mathematik 1", 5, "1", Modul.Modultyp.PFLICHT, new BigDecimal("1.0"));
        createModul(poBiotech, "M2", "Mathematik 2", 5, "2", Modul.Modultyp.PFLICHT, new BigDecimal("1.0"));
        createModul(poBiotech, "CH1", "Allgemeine Chemie", 5, "1", Modul.Modultyp.PFLICHT, new BigDecimal("1.0"));
        createModul(poBiotech, "BIO1", "Biologie Grundlagen", 5, "1", Modul.Modultyp.PFLICHT, new BigDecimal("1.0"));
        createModul(poBiotech, "PHY1", "Physik", 5, "2", Modul.Modultyp.PFLICHT, new BigDecimal("1.0"));
        createModul(poBiotech, "TH", "Thesis", 12, "7", Modul.Modultyp.PFLICHT, new BigDecimal("3.0"));

        // Regelwerk für Bioverfahrenstechnik
        createRegelwerk(poBiotech, "ECTS-gewichteter Durchschnitt",
            "SUM(note * ects) / SUM(ects)", "Thesis zählt 3-fach");

        // Studiengang: Forschung in der Sozialen Arbeit (Master)
        Studiengang sozialarbeit = createStudiengang(thm, "Forschung in der Sozialen Arbeit", "FSA",
            Studiengang.Abschlussart.MASTER, 3, 90);

        // PO für Soziale Arbeit
        Pruefungsordnung poSozial = createPruefungsordnung(sozialarbeit, "2022",
            LocalDate.of(2022, 10, 1), Pruefungsordnung.Berechnungsart.ARITHMETISCH_GEMISCHT);

        // Module für Soziale Arbeit (Beispiele)
        createModul(poSozial, "FO1", "Forschungsmethoden I", 6, "1", Modul.Modultyp.PFLICHT, new BigDecimal("1.0"));
        createModul(poSozial, "FO2", "Forschungsmethoden II", 6, "2", Modul.Modultyp.PFLICHT, new BigDecimal("1.0"));
        createModul(poSozial, "SA1", "Soziale Arbeit Theorie", 6, "1", Modul.Modultyp.PFLICHT, new BigDecimal("1.0"));
        createModul(poSozial, "MTH", "Master-Thesis", 24, "3", Modul.Modultyp.PFLICHT, new BigDecimal("2.0"));

        // Regelwerk für Soziale Arbeit
        createRegelwerk(poSozial, "Arithmetischer Durchschnitt mit Thesis-Gewichtung",
            "(AVG(module) + 2 * thesis) / 3", "Thesis zählt 2-fach");

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

    private void createModul(Pruefungsordnung po, String modulNr, String name, int ects,
                             String semester, Modul.Modultyp typ, BigDecimal gewichtung) {
        Modul modul = Modul.builder()
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
}

