package de.gradify.noten.config;

import de.gradify.noten.entity.Note;
import de.gradify.noten.repository.NoteRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Seed-Daten fuer Noten in der Entwicklungsumgebung.
 * 
 * Die Modul-IDs entsprechen den festen IDs aus dem Studiengang-Service DataSeeder.
 * 
 * Studenten (konsistent mit User-Service):
 * - Max Mustermann (Einschreibung 1): Bioverfahrenstechnik BA, 3. Semester
 * - Anna Schmidt (Einschreibung 2): Bioverfahrenstechnik BA, 3. Semester
 * - Leon Weber (Einschreibung 3): Forschung Soziale Arbeit MA, 2. Semester
 */
@Component
@Profile("java-seed") // Deaktiviert - verwende data.sql stattdessen
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final NoteRepository noteRepository;

    // Dozent-ID (vom User-Service)
    public static final Long DOZENT_ID = 10L;
    
    // Einschreibungs-IDs (vom Studiengang-Service)
    public static final Long EINSCHREIBUNG_1 = 1L; // Max Mustermann
    public static final Long EINSCHREIBUNG_2 = 2L; // Anna Schmidt
    public static final Long EINSCHREIBUNG_3 = 3L; // Leon Weber
    
    // ========================================
    // Bioverfahrenstechnik Module (BVT) - vom Studiengang-Service
    // ========================================
    public static final Long BVT_01_EINFUEHRUNG = 1L;
    public static final Long BVT_02_MECHANIK = 2L;
    public static final Long BVT_03_KONSTRUKTION = 3L;
    public static final Long BVT_04_MATHE1 = 4L;
    public static final Long BVT_05_PHYSIK = 5L;
    public static final Long BVT_06_ELEKTRO = 6L;
    public static final Long BVT_07_INFORMATIK = 7L;
    public static final Long BVT_08_MATHE2 = 8L;
    public static final Long BVT_09_CHEMIE = 9L;
    public static final Long BVT_10_MIKROBIO = 10L;
    public static final Long BVT_11_ENGLISH = 11L;
    public static final Long BVT_12_THERMO = 12L;
    
    // ========================================
    // Forschung Soziale Arbeit Module (FSA) - vom Studiengang-Service
    // ========================================
    public static final Long FSA_01_PARADIGMEN = 101L;
    public static final Long FSA_02_QUANT_METHODEN = 102L;
    public static final Long FSA_03_STATISTIK1 = 103L;
    public static final Long FSA_04_QUALITATIV = 104L;
    public static final Long FSA_07_STATISTIK2 = 107L;

    @Override
    @Transactional
    public void run(String... args) {
        if (noteRepository.count() > 0) {
            log.info("Noten-Datenbank bereits initialisiert - ueberspringe Seed-Daten");
            return;
        }

        log.info("Initialisiere Noten Seed-Daten...");

        // ============================================================
        // Max Mustermann - Bioverfahrenstechnik BA, 3. Semester
        // Hat Semester 1+2 abgeschlossen
        // ============================================================
        
        // Semester 1 - abgeschlossen
        createNote(EINSCHREIBUNG_1, BVT_01_EINFUEHRUNG, null, true, 1,  // Bestanden ohne Note
            LocalDate.of(2024, 2, 10), Note.NoteStatus.FREIGEGEBEN, "Bestanden");
        createNote(EINSCHREIBUNG_1, BVT_02_MECHANIK, new BigDecimal("2.3"), true, 1,
            LocalDate.of(2024, 2, 12), Note.NoteStatus.FREIGEGEBEN, null);
        createNote(EINSCHREIBUNG_1, BVT_03_KONSTRUKTION, new BigDecimal("1.7"), true, 1,
            LocalDate.of(2024, 2, 14), Note.NoteStatus.FREIGEGEBEN, "Gute Konstruktionsarbeit");
        createNote(EINSCHREIBUNG_1, BVT_04_MATHE1, new BigDecimal("2.0"), true, 1,
            LocalDate.of(2024, 2, 16), Note.NoteStatus.FREIGEGEBEN, null);
        createNote(EINSCHREIBUNG_1, BVT_05_PHYSIK, new BigDecimal("2.7"), true, 1,
            LocalDate.of(2024, 2, 18), Note.NoteStatus.FREIGEGEBEN, null);
        
        // Semester 2 - abgeschlossen
        createNote(EINSCHREIBUNG_1, BVT_06_ELEKTRO, new BigDecimal("2.0"), true, 1,
            LocalDate.of(2024, 7, 10), Note.NoteStatus.FREIGEGEBEN, null);
        createNote(EINSCHREIBUNG_1, BVT_07_INFORMATIK, new BigDecimal("1.3"), true, 1,
            LocalDate.of(2024, 7, 12), Note.NoteStatus.FREIGEGEBEN, "Sehr gute Programmierarbeit");
        createNote(EINSCHREIBUNG_1, BVT_08_MATHE2, new BigDecimal("2.3"), true, 1,
            LocalDate.of(2024, 7, 14), Note.NoteStatus.FREIGEGEBEN, null);
        createNote(EINSCHREIBUNG_1, BVT_09_CHEMIE, new BigDecimal("1.7"), true, 1,
            LocalDate.of(2024, 7, 16), Note.NoteStatus.FREIGEGEBEN, null);
        createNote(EINSCHREIBUNG_1, BVT_10_MIKROBIO, new BigDecimal("2.0"), true, 1,
            LocalDate.of(2024, 7, 18), Note.NoteStatus.FREIGEGEBEN, null);
        createNote(EINSCHREIBUNG_1, BVT_11_ENGLISH, new BigDecimal("1.7"), true, 1,
            LocalDate.of(2024, 7, 20), Note.NoteStatus.FREIGEGEBEN, "Good presentation skills");

        // ============================================================
        // Anna Schmidt - Bioverfahrenstechnik BA, 3. Semester
        // Hat Semester 1+2 abgeschlossen, mit einer Wiederholung
        // ============================================================
        
        // Semester 1 - abgeschlossen
        createNote(EINSCHREIBUNG_2, BVT_01_EINFUEHRUNG, null, true, 1,
            LocalDate.of(2024, 2, 10), Note.NoteStatus.FREIGEGEBEN, "Bestanden");
        createNote(EINSCHREIBUNG_2, BVT_02_MECHANIK, new BigDecimal("1.0"), true, 1,
            LocalDate.of(2024, 2, 12), Note.NoteStatus.FREIGEGEBEN, "Bestnote!");
        createNote(EINSCHREIBUNG_2, BVT_03_KONSTRUKTION, new BigDecimal("1.3"), true, 1,
            LocalDate.of(2024, 2, 14), Note.NoteStatus.FREIGEGEBEN, null);
        createNote(EINSCHREIBUNG_2, BVT_04_MATHE1, new BigDecimal("1.0"), true, 1,
            LocalDate.of(2024, 2, 16), Note.NoteStatus.FREIGEGEBEN, "Bestnote!");
        createNote(EINSCHREIBUNG_2, BVT_05_PHYSIK, new BigDecimal("5.0"), false, 1,  // Nicht bestanden!
            LocalDate.of(2024, 2, 18), Note.NoteStatus.FREIGEGEBEN, "Nicht bestanden - Wiederholung erforderlich");
        createNote(EINSCHREIBUNG_2, BVT_05_PHYSIK, new BigDecimal("2.3"), true, 2,  // Wiederholung bestanden
            LocalDate.of(2024, 4, 5), Note.NoteStatus.FREIGEGEBEN, "Wiederholungspruefung bestanden");
        
        // Semester 2 - abgeschlossen
        createNote(EINSCHREIBUNG_2, BVT_06_ELEKTRO, new BigDecimal("1.7"), true, 1,
            LocalDate.of(2024, 7, 10), Note.NoteStatus.FREIGEGEBEN, null);
        createNote(EINSCHREIBUNG_2, BVT_07_INFORMATIK, new BigDecimal("1.0"), true, 1,
            LocalDate.of(2024, 7, 12), Note.NoteStatus.FREIGEGEBEN, "Exzellente Arbeit");
        createNote(EINSCHREIBUNG_2, BVT_08_MATHE2, new BigDecimal("1.3"), true, 1,
            LocalDate.of(2024, 7, 14), Note.NoteStatus.FREIGEGEBEN, null);
        createNote(EINSCHREIBUNG_2, BVT_09_CHEMIE, new BigDecimal("1.0"), true, 1,
            LocalDate.of(2024, 7, 16), Note.NoteStatus.FREIGEGEBEN, null);
        createNote(EINSCHREIBUNG_2, BVT_10_MIKROBIO, new BigDecimal("1.7"), true, 1,
            LocalDate.of(2024, 7, 18), Note.NoteStatus.FREIGEGEBEN, null);
        createNote(EINSCHREIBUNG_2, BVT_11_ENGLISH, new BigDecimal("1.3"), true, 1,
            LocalDate.of(2024, 7, 20), Note.NoteStatus.FREIGEGEBEN, null);
        
        // Semester 3 - aktuelle Pruefungen (teilweise noch nicht freigegeben)
        createNote(EINSCHREIBUNG_2, BVT_12_THERMO, new BigDecimal("1.7"), true, 1,
            LocalDate.of(2025, 1, 8), Note.NoteStatus.VALIDIERT, "Warte auf finale Freigabe");

        // ============================================================
        // Leon Weber - Forschung Soziale Arbeit MA, 2. Semester
        // Hat Semester 1 abgeschlossen
        // ============================================================
        
        // Semester 1 - abgeschlossen
        createNote(EINSCHREIBUNG_3, FSA_01_PARADIGMEN, new BigDecimal("1.7"), true, 1,
            LocalDate.of(2024, 2, 20), Note.NoteStatus.FREIGEGEBEN, "Fundierte Hausarbeit");
        createNote(EINSCHREIBUNG_3, FSA_02_QUANT_METHODEN, new BigDecimal("2.0"), true, 1,
            LocalDate.of(2024, 2, 22), Note.NoteStatus.FREIGEGEBEN, null);
        createNote(EINSCHREIBUNG_3, FSA_03_STATISTIK1, new BigDecimal("2.3"), true, 1,
            LocalDate.of(2024, 2, 24), Note.NoteStatus.FREIGEGEBEN, null);
        createNote(EINSCHREIBUNG_3, FSA_04_QUALITATIV, new BigDecimal("1.3"), true, 1,
            LocalDate.of(2024, 7, 15), Note.NoteStatus.FREIGEGEBEN, "Sehr gute qualitative Analyse");
        
        // Semester 2 - aktuelle Pruefungen
        createNote(EINSCHREIBUNG_3, FSA_07_STATISTIK2, new BigDecimal("2.0"), true, 1,
            LocalDate.of(2025, 1, 10), Note.NoteStatus.ERFASST, "Noch in Korrektur");

        log.info("Noten Seed-Daten erfolgreich erstellt! {} Noten angelegt.", noteRepository.count());
        log.info("- Max Mustermann: 11 Noten (Sem. 1+2 komplett)");
        log.info("- Anna Schmidt: 14 Noten (inkl. Wiederholung, Sem. 3 beginnt)");
        log.info("- Leon Weber: 5 Noten (Sem. 1 komplett, Sem. 2 laufend)");
    }

    private void createNote(Long einschreibungId, Long modulId, BigDecimal noteWert, 
                           boolean bestanden, int versuch, LocalDate pruefungsdatum,
                           Note.NoteStatus status, String kommentar) {
        Note note = Note.builder()
            .einschreibungId(einschreibungId)
            .modulId(modulId)
            .erfasstVon(DOZENT_ID)
            .noteWert(noteWert)
            .bestanden(bestanden)
            .versuch(versuch)
            .pruefungsdatum(pruefungsdatum)
            .status(status)
            .kommentar(kommentar)
            .build();
        
        if (status == Note.NoteStatus.VALIDIERT || status == Note.NoteStatus.FREIGEGEBEN) {
            note.setValidiertAm(pruefungsdatum.plusDays(3).atStartOfDay());
            note.setValidiertVon(DOZENT_ID);
        }
        
        noteRepository.save(note);
    }
}
