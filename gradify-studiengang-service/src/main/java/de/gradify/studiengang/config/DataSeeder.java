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

/**
 * Seed-Daten fuer die Entwicklungsumgebung.
 * 
 * Module entsprechen 1:1 den Pruefungsordnungen:
 * - Bioverfahrenstechnik BA (PO 2023): 33 Module, 210 ECTS
 * - Forschung in der Sozialen Arbeit MA (PO 2022): 12 Module, 120 ECTS
 */
@Component
@Profile("java-seed") // Deaktiviert - verwende data.sql stattdessen
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final MandantRepository mandantRepository;
    private final StudiengangRepository studiengangRepository;
    private final PruefungsordnungRepository pruefungsordnungRepository;
    private final ModulRepository modulRepository;
    private final PoRegelwerkRepository poRegelwerkRepository;
    private final EinschreibungRepository einschreibungRepository;
    private final ModulZuweisungRepository modulZuweisungRepository;

    // Feste IDs fuer Entwicklung - muessen mit anderen Services uebereinstimmen
    public static final Long THM_MANDANT_ID = 1L;
    
    // Student-IDs (werden vom User-Service generiert)
    public static final Long STUDENT_1_ID = 1L;
    public static final Long STUDENT_2_ID = 2L;
    public static final Long STUDENT_3_ID = 3L;
    
    // Dozenten-ID (Prof. Dr. Max Mueller aus User-Service)
    public static final Long DOZENT_1_ID = 10L;
    
    // Einschreibungs-IDs (fuer Noten-Service)
    public static final Long EINSCHREIBUNG_1 = 1L;
    public static final Long EINSCHREIBUNG_2 = 2L;
    public static final Long EINSCHREIBUNG_3 = 3L;
    
    // ========================================
    // Feste Modul-IDs fuer Bioverfahrenstechnik (BVT)
    // ========================================
    public static final Long BVT_MODUL_01 = 1L;  // Einfuehrung BVT
    public static final Long BVT_MODUL_02 = 2L;  // Technische Mechanik
    public static final Long BVT_MODUL_03 = 3L;  // Konstruktion
    public static final Long BVT_MODUL_04 = 4L;  // Mathematik 1
    public static final Long BVT_MODUL_05 = 5L;  // Physik
    public static final Long BVT_MODUL_06 = 6L;  // Elektrotechnik
    public static final Long BVT_MODUL_07 = 7L;  // Informatik
    public static final Long BVT_MODUL_08 = 8L;  // Mathematik 2
    public static final Long BVT_MODUL_09 = 9L;  // Allg. Chemie
    public static final Long BVT_MODUL_10 = 10L; // Mikrobiologie
    public static final Long BVT_MODUL_11 = 11L; // English
    public static final Long BVT_MODUL_12 = 12L; // Thermodynamik
    
    // ========================================
    // Feste Modul-IDs fuer Forschung Soziale Arbeit (FSA)
    // ========================================
    public static final Long FSA_MODUL_01 = 101L; // Paradigmatische Grundlegung
    public static final Long FSA_MODUL_02 = 102L; // Quant. Forschungsmethoden
    public static final Long FSA_MODUL_03 = 103L; // Statistik I
    public static final Long FSA_MODUL_04 = 104L; // Qualitativ-rekonstruktive
    public static final Long FSA_MODUL_07 = 107L; // Statistik II

    @Override
    @Transactional
    public void run(String... args) {
        if (mandantRepository.count() > 0) {
            log.info("Datenbank bereits initialisiert - ueberspringe Seed-Daten");
            return;
        }

        log.info("Initialisiere Studiengang Seed-Daten mit vollstaendigen Modulen aus den Pruefungsordnungen...");

        // Mandant erstellen (THM)
        Mandant thm = Mandant.builder()
            .id(THM_MANDANT_ID)
            .name("Technische Hochschule Mittelhessen")
            .kuerzel("THM")
            .aktiv(true)
            .build();
        thm = mandantRepository.saveAndFlush(thm);

        // ============================================================
        // STUDIENGANG: Bioverfahrenstechnik BA (PO 2023)
        // ============================================================
        Studiengang biotech = createStudiengang(thm, "Bioverfahrenstechnik", "BVT",
            Studiengang.Abschlussart.BACHELOR, 7, 210);

        Pruefungsordnung poBiotech = createPruefungsordnung(biotech, "2023",
            LocalDate.of(2023, 10, 1), Pruefungsordnung.Berechnungsart.GEWICHTET);

        seedBioverfahrenstechnikModule(poBiotech);

        createRegelwerk(poBiotech, "ECTS-gewichteter Durchschnitt",
            "SUM(note * gewichtung) / SUM(gewichtung)", 
            "Gewichtung laut PO §11: Thesis 9-fach, Praxisphase 5-fach, Teamprojekt/Mathe1 2-fach, Rest 1-fach. Modul 1 geht nicht in Gesamtnote ein.");

        // ============================================================
        // STUDIENGANG: Forschung in der Sozialen Arbeit MA (PO 2022)
        // ============================================================
        Studiengang sozialarbeit = createStudiengang(thm, "Forschung in der Sozialen Arbeit", "FSA",
            Studiengang.Abschlussart.MASTER, 4, 120);

        Pruefungsordnung poSozial = createPruefungsordnung(sozialarbeit, "2022",
            LocalDate.of(2022, 10, 1), Pruefungsordnung.Berechnungsart.ARITHMETISCH_GEMISCHT);

        seedForschungSozialeArbeitModule(poSozial);

        createRegelwerk(poSozial, "Gewichtetes arithmetisches Mittel",
            "(2 * thesis + 1 * AVG(module_1_2_3_4_5_7_8)) / 3",
            "Thesis zaehlt 2-fach, arithmetisches Mittel der Module 1,2,3,4,5,7,8 zaehlt 1-fach. Module 6,9,10,11 gehen nicht in Gesamtnote ein.");

        // ============================================================
        // Einschreibungen erstellen
        // ============================================================
        createEinschreibung(EINSCHREIBUNG_1, STUDENT_1_ID, biotech, poBiotech, 3);
        createEinschreibung(EINSCHREIBUNG_2, STUDENT_2_ID, biotech, poBiotech, 3);
        createEinschreibung(EINSCHREIBUNG_3, STUDENT_3_ID, sozialarbeit, poSozial, 2);

        // ============================================================
        // Dozenten-Modul-Zuweisungen (Max. 3 Module pro Dozent)
        // ============================================================
        // Prof. Dr. Max Mueller unterrichtet:
        // - Mathematik 1 (BVT_MODUL_04)
        // - Technische Mechanik (BVT_MODUL_02)
        // - Physik (BVT_MODUL_05)
        createModulZuweisung(DOZENT_1_ID, BVT_MODUL_04, "Verantwortlich für Mathematik 1");
        createModulZuweisung(DOZENT_1_ID, BVT_MODUL_02, "Verantwortlich für Technische Mechanik");
        createModulZuweisung(DOZENT_1_ID, BVT_MODUL_05, "Verantwortlich für Physik");
        
        log.info("Modul-Zuweisungen erstellt: 3 Module für Prof. Mueller");

        log.info("Studiengang Seed-Daten erfolgreich erstellt!");
        log.info("- Bioverfahrenstechnik: {} Module", modulRepository.findByPruefungsordnungId(poBiotech.getId()).size());
        log.info("- Forschung in der Sozialen Arbeit: {} Module", modulRepository.findByPruefungsordnungId(poSozial.getId()).size());
    }

    /**
     * Bioverfahrenstechnik BA - Allgemeine Studienvariante
     * PO 2023, 210 ECTS, 33 Module
     */
    private void seedBioverfahrenstechnikModule(Pruefungsordnung po) {
        // ===== SEMESTER 1 =====
        createModulWithId(BVT_MODUL_01, po, "1", "Einfuehrung in die Bioverfahrenstechnik", null,
            5, "1", 1, Modul.Pruefungsform.PROJEKT, "Projektbericht (7 Wochen) mit Praesentation (3-5 Min.)",
            Modul.Sprache.DEUTSCH, Modul.Modultyp.PFLICHT, Modul.Bewertungsart.BESTANDEN_NICHT_BESTANDEN,
            BigDecimal.ZERO, false, null, null);

        createModulWithId(BVT_MODUL_02, po, "2", "Technische Mechanik", null,
            5, "1", 1, Modul.Pruefungsform.KLAUSUR, "90 Min.",
            Modul.Sprache.DEUTSCH, Modul.Modultyp.PFLICHT, Modul.Bewertungsart.NOTE,
            BigDecimal.ONE, true, null, null);

        createModulWithId(BVT_MODUL_03, po, "3", "Konstruktion", null,
            5, "1", 1, Modul.Pruefungsform.KLAUSUR, "90 Min.",
            Modul.Sprache.DEUTSCH, Modul.Modultyp.PFLICHT, Modul.Bewertungsart.NOTE,
            BigDecimal.ONE, true, "Uebungen mit schriftlicher Ausarbeitung (3 Wochen)", null);

        createModulWithId(BVT_MODUL_04, po, "4", "Mathematik 1", null,
            10, "1", 1, Modul.Pruefungsform.KLAUSUR, "90 Min.",
            Modul.Sprache.DEUTSCH, Modul.Modultyp.PFLICHT, Modul.Bewertungsart.NOTE,
            new BigDecimal("2"), true, null, null);

        createModulWithId(BVT_MODUL_05, po, "5", "Physik", null,
            5, "1", 1, Modul.Pruefungsform.KLAUSUR, "120 Min.",
            Modul.Sprache.DEUTSCH, Modul.Modultyp.PFLICHT, Modul.Bewertungsart.NOTE,
            BigDecimal.ONE, true, null, null);

        // ===== SEMESTER 1-2 =====
        createModulWithId(BVT_MODUL_11, po, "11", "English for Life Sciences and Engineering", null,
            5, "1-2", 2, Modul.Pruefungsform.KLAUSUR, "Praesentation (10-15 Min.) + Klausur (90 Min.)",
            Modul.Sprache.ENGLISCH, Modul.Modultyp.PFLICHT, Modul.Bewertungsart.NOTE,
            BigDecimal.ONE, true, null, null);

        // ===== SEMESTER 2 =====
        createModulWithId(BVT_MODUL_06, po, "6", "Elektrotechnik", null,
            5, "2", 1, Modul.Pruefungsform.KLAUSUR, "90 Min.",
            Modul.Sprache.DEUTSCH, Modul.Modultyp.PFLICHT, Modul.Bewertungsart.NOTE,
            BigDecimal.ONE, true, "Laborversuche mit schriftlicher Ausarbeitung (2 Wochen)", null);

        createModulWithId(BVT_MODUL_07, po, "7", "Informatik", null,
            5, "2", 1, Modul.Pruefungsform.KLAUSUR, "90 Min.",
            Modul.Sprache.DEUTSCH, Modul.Modultyp.PFLICHT, Modul.Bewertungsart.NOTE,
            BigDecimal.ONE, true, "Uebungen am Rechner mit schriftlicher Ausarbeitung (1 Woche)", null);

        createModulWithId(BVT_MODUL_08, po, "8", "Mathematik 2", null,
            5, "2", 1, Modul.Pruefungsform.KLAUSUR, "90 Min.",
            Modul.Sprache.DEUTSCH, Modul.Modultyp.PFLICHT, Modul.Bewertungsart.NOTE,
            BigDecimal.ONE, true, null, null);

        createModulWithId(BVT_MODUL_09, po, "9", "Allgemeine und Anorganische Chemie", null,
            5, "2", 1, Modul.Pruefungsform.KLAUSUR, "90 Min.",
            Modul.Sprache.DEUTSCH, Modul.Modultyp.PFLICHT, Modul.Bewertungsart.NOTE,
            BigDecimal.ONE, true, null, null);

        createModulWithId(BVT_MODUL_10, po, "10", "Mikrobiologie", null,
            5, "2", 1, Modul.Pruefungsform.KLAUSUR, "90 Min.",
            Modul.Sprache.DEUTSCH, Modul.Modultyp.PFLICHT, Modul.Bewertungsart.NOTE,
            BigDecimal.ONE, true, "Laborversuche mit schriftlicher Ausarbeitung (2 Wochen)", null);

        // ===== SEMESTER 3 =====
        createModulWithId(BVT_MODUL_12, po, "12", "Technische Thermodynamik", null,
            5, "3", 1, Modul.Pruefungsform.KLAUSUR, "120 Min.",
            Modul.Sprache.DEUTSCH, Modul.Modultyp.PFLICHT, Modul.Bewertungsart.NOTE,
            BigDecimal.ONE, true, null, null);

        createModul(po, "13", "Anlagenplanung", null,
            5, "3", 1, Modul.Pruefungsform.KLAUSUR, "90 Min.",
            Modul.Sprache.DEUTSCH, Modul.Modultyp.PFLICHT, Modul.Bewertungsart.NOTE,
            BigDecimal.ONE, true, "Uebungen am Rechner mit schriftlicher Ausarbeitung (2 Wochen)", null);

        createModul(po, "14", "Werkstofftechnik", null,
            5, "3", 1, Modul.Pruefungsform.MUENDLICH, "15-20 Min.",
            Modul.Sprache.DEUTSCH, Modul.Modultyp.PFLICHT, Modul.Bewertungsart.NOTE,
            BigDecimal.ONE, true, null, null);

        createModul(po, "15", "Fluid Dynamics", null,
            5, "3", 1, Modul.Pruefungsform.KLAUSUR, "90 Min.",
            Modul.Sprache.ENGLISCH, Modul.Modultyp.PFLICHT, Modul.Bewertungsart.NOTE,
            BigDecimal.ONE, true, null, null);

        createModul(po, "16", "Organische Chemie", null,
            5, "3", 1, Modul.Pruefungsform.KLAUSUR, "90 Min.",
            Modul.Sprache.DEUTSCH, Modul.Modultyp.PFLICHT, Modul.Bewertungsart.NOTE,
            BigDecimal.ONE, true, "Laborversuche mit schriftlicher Ausarbeitung (2 Wochen)", null);

        createModul(po, "17", "Molekularbiologie und Gentechnik", null,
            5, "3", 1, Modul.Pruefungsform.KLAUSUR, "90 Min. + Laborversuche",
            Modul.Sprache.DEUTSCH, Modul.Modultyp.PFLICHT, Modul.Bewertungsart.NOTE,
            BigDecimal.ONE, true, null, null);

        // ===== SEMESTER 4 =====
        createModul(po, "18", "Heat and Mass Transfer", null,
            5, "4", 1, Modul.Pruefungsform.KLAUSUR, "120 Min.",
            Modul.Sprache.ENGLISCH, Modul.Modultyp.PFLICHT, Modul.Bewertungsart.NOTE,
            BigDecimal.ONE, true, null, null);

        createModul(po, "19", "Mechanical Process Engineering", null,
            5, "4", 1, Modul.Pruefungsform.KLAUSUR, "120 Min.",
            Modul.Sprache.ENGLISCH, Modul.Modultyp.PFLICHT, Modul.Bewertungsart.NOTE,
            BigDecimal.ONE, true, "Praesentation (5-10 Min.) mit schriftlicher Abgabe (2 Wochen)", null);

        createModul(po, "20", "Process Automation", null,
            5, "4", 1, Modul.Pruefungsform.KLAUSUR, "120 Min.",
            Modul.Sprache.ENGLISCH, Modul.Modultyp.PFLICHT, Modul.Bewertungsart.NOTE,
            BigDecimal.ONE, true, "Uebungen am Rechner mit schriftlicher Abgabe (1 Woche)", null);

        createModul(po, "21", "Wahlpflichtmodul 1", null,
            5, "4", 1, Modul.Pruefungsform.KLAUSUR, "je nach Modul",
            Modul.Sprache.DEUTSCH, Modul.Modultyp.WAHLPFLICHT, Modul.Bewertungsart.NOTE,
            BigDecimal.ONE, true, null, "WP1");

        createModul(po, "22", "Physical Chemistry and Chemical Reaction Engineering", null,
            5, "4", 1, Modul.Pruefungsform.KLAUSUR, "120 Min.",
            Modul.Sprache.ENGLISCH, Modul.Modultyp.PFLICHT, Modul.Bewertungsart.NOTE,
            BigDecimal.ONE, true, "Laboratory experiments mit schriftlicher Ausarbeitung (2 Wochen)", null);

        createModul(po, "23", "Biochemistry", null,
            5, "4", 1, Modul.Pruefungsform.KLAUSUR, "120 Min.",
            Modul.Sprache.ENGLISCH, Modul.Modultyp.PFLICHT, Modul.Bewertungsart.NOTE,
            BigDecimal.ONE, true, "Laboratory experiments mit schriftlicher Abgabe (2 Wochen)", null);

        // ===== SEMESTER 5 =====
        createModul(po, "24", "Thermische Verfahrenstechnik", null,
            5, "5", 1, Modul.Pruefungsform.KLAUSUR, "120 Min.",
            Modul.Sprache.DEUTSCH, Modul.Modultyp.PFLICHT, Modul.Bewertungsart.NOTE,
            BigDecimal.ONE, true, "Laborversuche (2 Wochen) + Fachgespraech (5-15 Min.)", null);

        createModul(po, "25", "Ethik und Recht", null,
            5, "5", 1, Modul.Pruefungsform.HAUSARBEIT, "Hausarbeit (6 Wochen) + Klausur (90 Min.)",
            Modul.Sprache.DEUTSCH, Modul.Modultyp.PFLICHT, Modul.Bewertungsart.NOTE,
            BigDecimal.ONE, true, null, null);

        createModul(po, "26", "Interdisziplinaeres Studium Generale", null,
            5, "5", 1, Modul.Pruefungsform.PROJEKT, "Projektarbeit mit Praesentation",
            Modul.Sprache.DEUTSCH, Modul.Modultyp.PFLICHT, Modul.Bewertungsart.NOTE,
            BigDecimal.ONE, true, null, null);

        createModul(po, "27", "Wahlpflichtmodul 2", null,
            5, "5", 1, Modul.Pruefungsform.KLAUSUR, "je nach Modul",
            Modul.Sprache.DEUTSCH, Modul.Modultyp.WAHLPFLICHT, Modul.Bewertungsart.NOTE,
            BigDecimal.ONE, true, null, "WP2");

        createModul(po, "28", "Bioprozesstechnik", null,
            5, "5", 1, Modul.Pruefungsform.KLAUSUR, "90 Min.",
            Modul.Sprache.DEUTSCH, Modul.Modultyp.PFLICHT, Modul.Bewertungsart.NOTE,
            BigDecimal.ONE, true, "Laborversuch mit schriftlicher Ausarbeitung (2 Wochen)", null);

        createModul(po, "29", "Zellkulturtechnik", null,
            5, "5", 1, Modul.Pruefungsform.KLAUSUR, "90 Min.",
            Modul.Sprache.DEUTSCH, Modul.Modultyp.PFLICHT, Modul.Bewertungsart.NOTE,
            BigDecimal.ONE, true, "Laborversuche mit schriftlicher Ausarbeitung (2 Wochen)", null);

        // ===== SEMESTER 6 =====
        createModul(po, "30", "Prozesssimulation", null,
            5, "6", 1, Modul.Pruefungsform.PORTFOLIO, "Testate (25%) + Hausarbeit (50%) + Praesentation (25%)",
            Modul.Sprache.DEUTSCH, Modul.Modultyp.PFLICHT, Modul.Bewertungsart.NOTE,
            BigDecimal.ONE, true, null, null);

        createModul(po, "31", "Teamprojekt", null,
            10, "6", 1, Modul.Pruefungsform.PROJEKT, "Projektbericht (6 Wochen) mit Praesentation (10-15 Min.)",
            Modul.Sprache.DEUTSCH, Modul.Modultyp.PFLICHT, Modul.Bewertungsart.NOTE,
            new BigDecimal("2"), true, "Rollenspiel + Praesentation + Klausur Projektmanagement (90 Min.)", null);

        // ===== SEMESTER 6-7 =====
        createModul(po, "32", "Praxisphase", null,
            30, "6-7", 2, Modul.Pruefungsform.PRAXISBERICHT, "Praxisbericht (24 Wochen) mit Praesentation (15-45 Min.)",
            Modul.Sprache.DEUTSCH, Modul.Modultyp.PFLICHT, Modul.Bewertungsart.NOTE,
            new BigDecimal("5"), true, "Seminar Praxisphase", null);

        createModul(po, "33", "Bachelor-Arbeit mit Kolloquium", null,
            15, "6-7", 2, Modul.Pruefungsform.HAUSARBEIT, "Bachelor-Arbeit (12 Wochen) + Kolloquium (30-45 Min.)",
            Modul.Sprache.DEUTSCH, Modul.Modultyp.PFLICHT, Modul.Bewertungsart.NOTE,
            new BigDecimal("9"), true, null, null);

        log.info("Bioverfahrenstechnik Module angelegt (33 Module, 210 ECTS)");
    }

    /**
     * Forschung in der Sozialen Arbeit MA
     * PO 2022, 120 ECTS, 12 Module (inkl. Wahlpflicht-Optionen)
     */
    private void seedForschungSozialeArbeitModule(Pruefungsordnung po) {
        // ===== SEMESTER 1 =====
        createModulWithId(FSA_MODUL_01, po, "1", "Paradigmatische, theoretische und methodologische Grundlegung", null,
            10, "1", 1, Modul.Pruefungsform.HAUSARBEIT, "Bearbeitungszeit 4 Wochen",
            Modul.Sprache.DEUTSCH, Modul.Modultyp.PFLICHT, Modul.Bewertungsart.NOTE,
            BigDecimal.ONE, true, null, null);

        createModulWithId(FSA_MODUL_02, po, "2", "Quantitative Forschungsmethoden", null,
            10, "1", 1, Modul.Pruefungsform.KLAUSUR, "90 Min.",
            Modul.Sprache.DEUTSCH, Modul.Modultyp.PFLICHT, Modul.Bewertungsart.NOTE,
            BigDecimal.ONE, true, null, null);

        createModulWithId(FSA_MODUL_03, po, "3", "Statistik I", null,
            5, "1", 1, Modul.Pruefungsform.KLAUSUR, "90 Min.",
            Modul.Sprache.DEUTSCH, Modul.Modultyp.PFLICHT, Modul.Bewertungsart.NOTE,
            BigDecimal.ONE, true, null, null);

        createModulWithId(FSA_MODUL_04, po, "4", "Qualitativ-rekonstruktive Forschungsmethoden", null,
            10, "1-2", 2, Modul.Pruefungsform.HAUSARBEIT, "Bearbeitungszeit 4 Wochen",
            Modul.Sprache.DEUTSCH, Modul.Modultyp.PFLICHT, Modul.Bewertungsart.NOTE,
            BigDecimal.ONE, true, null, null);

        // ===== SEMESTER 2 =====
        createModul(po, "5.1", "Forschungsprojekt qualitativ-rekonstruktiv", null,
            30, "2-3", 2, Modul.Pruefungsform.HAUSARBEIT, "Bearbeitungszeit 8 Wochen",
            Modul.Sprache.DEUTSCH, Modul.Modultyp.WAHLPFLICHT, Modul.Bewertungsart.NOTE,
            BigDecimal.ONE, true, null, "FP");

        createModul(po, "5.2", "Forschungsprojekt quantitativ", null,
            30, "2-3", 2, Modul.Pruefungsform.HAUSARBEIT, "Bearbeitungszeit 8 Wochen",
            Modul.Sprache.DEUTSCH, Modul.Modultyp.WAHLPFLICHT, Modul.Bewertungsart.NOTE,
            BigDecimal.ONE, true, null, "FP");

        createModul(po, "6", "Aktuelle Forschungen in der Sozialen Arbeit", null,
            5, "2", 1, Modul.Pruefungsform.HAUSARBEIT, "Review, Bearbeitungszeit 4 Wochen",
            Modul.Sprache.DEUTSCH, Modul.Modultyp.PFLICHT, Modul.Bewertungsart.BESTANDEN_NICHT_BESTANDEN,
            BigDecimal.ZERO, false, null, null);

        createModulWithId(FSA_MODUL_07, po, "7", "Statistik II", null,
            5, "2", 1, Modul.Pruefungsform.KLAUSUR, "90 Min.",
            Modul.Sprache.DEUTSCH, Modul.Modultyp.PFLICHT, Modul.Bewertungsart.NOTE,
            BigDecimal.ONE, true, null, null);

        // ===== SEMESTER 3 =====
        createModul(po, "8.1", "Forschungsfelder: Jugendhilfe", null,
            5, "3", 1, Modul.Pruefungsform.HAUSARBEIT, "Bearbeitungszeit 4 Wochen",
            Modul.Sprache.DEUTSCH, Modul.Modultyp.WAHLPFLICHT, Modul.Bewertungsart.NOTE,
            BigDecimal.ONE, true, null, "FF");

        createModul(po, "8.2", "Forschungsfelder: Sozialplanung", null,
            5, "3", 1, Modul.Pruefungsform.HAUSARBEIT, "Bearbeitungszeit 4 Wochen",
            Modul.Sprache.DEUTSCH, Modul.Modultyp.WAHLPFLICHT, Modul.Bewertungsart.NOTE,
            BigDecimal.ONE, true, null, "FF");

        createModul(po, "8.3", "Forschungsfelder: Evaluation", null,
            5, "3", 1, Modul.Pruefungsform.HAUSARBEIT, "Bearbeitungszeit 4 Wochen",
            Modul.Sprache.DEUTSCH, Modul.Modultyp.WAHLPFLICHT, Modul.Bewertungsart.NOTE,
            BigDecimal.ONE, true, null, "FF");

        createModul(po, "9", "Empirische Vertiefung", null,
            5, "3", 1, Modul.Pruefungsform.PRAESENTATION, "5-15 Min. + schriftliche Ausarbeitung (2 Wochen)",
            Modul.Sprache.DEUTSCH, Modul.Modultyp.PFLICHT, Modul.Bewertungsart.BESTANDEN_NICHT_BESTANDEN,
            BigDecimal.ZERO, false, null, null);

        createModul(po, "10", "Projektorientiertes wissenschaftliches Arbeiten", "Forschungswerkstatt",
            5, "3", 1, Modul.Pruefungsform.PRAESENTATION, "15-30 Min. + schriftliche Ausarbeitung (4 Wochen)",
            Modul.Sprache.DEUTSCH, Modul.Modultyp.PFLICHT, Modul.Bewertungsart.BESTANDEN_NICHT_BESTANDEN,
            BigDecimal.ZERO, false, null, null);

        // ===== SEMESTER 4 =====
        createModul(po, "11", "Forschung beantragen, planen und verwalten", null,
            5, "4", 1, Modul.Pruefungsform.PROJEKT, "Projektarbeit (4 Wochen) + Praesentation (10-30 Min.)",
            Modul.Sprache.DEUTSCH, Modul.Modultyp.PFLICHT, Modul.Bewertungsart.BESTANDEN_NICHT_BESTANDEN,
            BigDecimal.ZERO, false, null, null);

        createModul(po, "12", "Master-Thesis mit Kolloquium", null,
            25, "4", 1, Modul.Pruefungsform.HAUSARBEIT, "Master-Thesis (22 Wochen) + Kolloquium (30-45 Min.)",
            Modul.Sprache.DEUTSCH, Modul.Modultyp.PFLICHT, Modul.Bewertungsart.NOTE,
            new BigDecimal("2"), true, null, null);

        log.info("Forschung in der Sozialen Arbeit Module angelegt (17 Module inkl. Wahlpflichtoptionen, 120 ECTS)");
    }

    // ============================================================
    // Helper Methods
    // ============================================================

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

        studiengang.setAktuellePo(saved);
        studiengangRepository.save(studiengang);

        return saved;
    }

    private void createModul(Pruefungsordnung po, String modulNr, String name, String nameEn,
                             int ects, String semester, int dauerSemester,
                             Modul.Pruefungsform pruefungsform, String pruefungsdauer,
                             Modul.Sprache sprache, Modul.Modultyp modultyp, Modul.Bewertungsart bewertungsart,
                             BigDecimal gewichtung, boolean inGesamtnote,
                             String vorleistung, String wahlpflichtGruppe) {
        createModulWithId(null, po, modulNr, name, nameEn, ects, semester, dauerSemester,
            pruefungsform, pruefungsdauer, sprache, modultyp, bewertungsart, 
            gewichtung, inGesamtnote, vorleistung, wahlpflichtGruppe);
    }

    private void createModulWithId(Long id, Pruefungsordnung po, String modulNr, String name, String nameEn,
                                   int ects, String semester, int dauerSemester,
                                   Modul.Pruefungsform pruefungsform, String pruefungsdauer,
                                   Modul.Sprache sprache, Modul.Modultyp modultyp, Modul.Bewertungsart bewertungsart,
                                   BigDecimal gewichtung, boolean inGesamtnote,
                                   String vorleistung, String wahlpflichtGruppe) {
        Modul.ModulBuilder builder = Modul.builder()
            .pruefungsordnung(po)
            .modulNr(modulNr)
            .name(name)
            .nameEn(nameEn)
            .ects(ects)
            .semester(semester)
            .dauerSemester(dauerSemester)
            .pruefungsform(pruefungsform)
            .pruefungsdauer(pruefungsdauer)
            .sprache(sprache)
            .modultyp(modultyp)
            .bewertungsart(bewertungsart)
            .gewichtung(gewichtung)
            .inGesamtnote(inGesamtnote)
            .vorleistung(vorleistung)
            .wahlpflichtGruppe(wahlpflichtGruppe);
        
        if (id != null) {
            builder.id(id);
        }
        
        modulRepository.save(builder.build());
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

    private void createEinschreibung(Long id, Long studentId, Studiengang studiengang,
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

    private void createModulZuweisung(Long dozentId, Long modulId, String bemerkung) {
        ModulZuweisung zuweisung = ModulZuweisung.builder()
            .dozentId(dozentId)
            .modulId(modulId)
            .bemerkung(bemerkung)
            .build();
        modulZuweisungRepository.save(zuweisung);
    }
}
