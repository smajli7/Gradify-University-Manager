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
import java.util.UUID;

/**
 * Seed-Daten fuer Noten in der Entwicklungsumgebung.
 * 
 * Die Modul-IDs entsprechen den festen IDs aus dem Studiengang-Service DataSeeder.
 * 
 * Studenten:
 * - Max Mustermann (Einschreibung 1): Bioverfahrenstechnik BA, 3. Semester
 * - Erika Musterfrau (Einschreibung 2): Bioverfahrenstechnik BA, 3. Semester
 * - Jan Beispiel (Einschreibung 3): Forschung Soziale Arbeit MA, 2. Semester
 */
@Component
@Profile("dev")
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final NoteRepository noteRepository;

    // Dozent-ID (vom User-Service)
    public static final UUID DOZENT_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");
    
    // Einschreibungs-IDs (vom Studiengang-Service)
    public static final UUID EINSCHREIBUNG_1 = UUID.fromString("eeee1111-1111-1111-1111-111111111111"); // Max
    public static final UUID EINSCHREIBUNG_2 = UUID.fromString("eeee2222-2222-2222-2222-222222222222"); // Erika
    public static final UUID EINSCHREIBUNG_3 = UUID.fromString("eeee3333-3333-3333-3333-333333333333"); // Jan
    
    // ========================================
    // Bioverfahrenstechnik Module (BVT) - vom Studiengang-Service
    // ========================================
    public static final UUID BVT_01_EINFUEHRUNG = UUID.fromString("b0100000-0001-0000-0000-000000000001");
    public static final UUID BVT_02_MECHANIK = UUID.fromString("b0100000-0002-0000-0000-000000000002");
    public static final UUID BVT_03_KONSTRUKTION = UUID.fromString("b0100000-0003-0000-0000-000000000003");
    public static final UUID BVT_04_MATHE1 = UUID.fromString("b0100000-0004-0000-0000-000000000004");
    public static final UUID BVT_05_PHYSIK = UUID.fromString("b0100000-0005-0000-0000-000000000005");
    public static final UUID BVT_06_ELEKTRO = UUID.fromString("b0100000-0006-0000-0000-000000000006");
    public static final UUID BVT_07_INFORMATIK = UUID.fromString("b0100000-0007-0000-0000-000000000007");
    public static final UUID BVT_08_MATHE2 = UUID.fromString("b0100000-0008-0000-0000-000000000008");
    public static final UUID BVT_09_CHEMIE = UUID.fromString("b0100000-0009-0000-0000-000000000009");
    public static final UUID BVT_10_MIKROBIO = UUID.fromString("b0100000-0010-0000-0000-000000000010");
    public static final UUID BVT_11_ENGLISH = UUID.fromString("b0100000-0011-0000-0000-000000000011");
    public static final UUID BVT_12_THERMO = UUID.fromString("b0100000-0012-0000-0000-000000000012");
    
    // ========================================
    // Forschung Soziale Arbeit Module (FSA) - vom Studiengang-Service
    // ========================================
    public static final UUID FSA_01_PARADIGMEN = UUID.fromString("f0100000-0001-0000-0000-000000000001");
    public static final UUID FSA_02_QUANT_METHODEN = UUID.fromString("f0100000-0002-0000-0000-000000000002");
    public static final UUID FSA_03_STATISTIK1 = UUID.fromString("f0100000-0003-0000-0000-000000000003");
    public static final UUID FSA_04_QUALITATIV = UUID.fromString("f0100000-0004-0000-0000-000000000004");
    public static final UUID FSA_07_STATISTIK2 = UUID.fromString("f0100000-0007-0000-0000-000000000007");

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
        // Erika Musterfrau - Bioverfahrenstechnik BA, 3. Semester
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
        // Jan Beispiel - Forschung Soziale Arbeit MA, 2. Semester
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
        log.info("- Erika Musterfrau: 14 Noten (inkl. Wiederholung, Sem. 3 beginnt)");
        log.info("- Jan Beispiel: 5 Noten (Sem. 1 komplett, Sem. 2 laufend)");
    }

    private void createNote(UUID einschreibungId, UUID modulId, BigDecimal noteWert, 
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
