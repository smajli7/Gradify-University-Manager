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

@Component
@Profile("dev")
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final NoteRepository noteRepository;

    // Feste IDs fuer Entwicklung - muessen mit anderen Services uebereinstimmen
    // Diese werden beim Start der anderen Services generiert
    public static final UUID DOZENT_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");
    
    // Einschreibungs-IDs (werden vom Studiengang-Service generiert)
    public static final UUID EINSCHREIBUNG_1 = UUID.fromString("eeee1111-1111-1111-1111-111111111111");
    public static final UUID EINSCHREIBUNG_2 = UUID.fromString("eeee2222-2222-2222-2222-222222222222");
    public static final UUID EINSCHREIBUNG_3 = UUID.fromString("eeee3333-3333-3333-3333-333333333333");
    
    // Modul-IDs (werden vom Studiengang-Service generiert)
    public static final UUID MODUL_M1 = UUID.fromString("aaaa1111-1111-1111-1111-111111111111");
    public static final UUID MODUL_M2 = UUID.fromString("aaaa2222-2222-2222-2222-222222222222");
    public static final UUID MODUL_CH1 = UUID.fromString("aaaa3333-3333-3333-3333-333333333333");
    public static final UUID MODUL_BIO1 = UUID.fromString("aaaa4444-4444-4444-4444-444444444444");
    public static final UUID MODUL_PHY1 = UUID.fromString("aaaa5555-5555-5555-5555-555555555555");
    public static final UUID MODUL_FO1 = UUID.fromString("bbbb1111-1111-1111-1111-111111111111");
    public static final UUID MODUL_FO2 = UUID.fromString("bbbb2222-2222-2222-2222-222222222222");
    public static final UUID MODUL_SA1 = UUID.fromString("bbbb3333-3333-3333-3333-333333333333");

    @Override
    @Transactional
    public void run(String... args) {
        if (noteRepository.count() > 0) {
            log.info("Noten-Datenbank bereits initialisiert - ueberspringe Seed-Daten");
            return;
        }

        log.info("Initialisiere Noten Seed-Daten...");

        // Noten fuer Student 1 (Max Mustermann - Bioverfahrenstechnik Bachelor)
        createNote(EINSCHREIBUNG_1, MODUL_M1, new BigDecimal("1.7"), true, 1, 
            LocalDate.of(2024, 2, 15), Note.NoteStatus.FREIGEGEBEN, "Sehr gute Leistung");
        createNote(EINSCHREIBUNG_1, MODUL_M2, new BigDecimal("2.3"), true, 1, 
            LocalDate.of(2024, 7, 10), Note.NoteStatus.FREIGEGEBEN, null);
        createNote(EINSCHREIBUNG_1, MODUL_CH1, new BigDecimal("1.3"), true, 1, 
            LocalDate.of(2024, 2, 18), Note.NoteStatus.FREIGEGEBEN, "Exzellent");
        createNote(EINSCHREIBUNG_1, MODUL_BIO1, new BigDecimal("2.0"), true, 1, 
            LocalDate.of(2024, 2, 20), Note.NoteStatus.VALIDIERT, null);
        createNote(EINSCHREIBUNG_1, MODUL_PHY1, new BigDecimal("2.7"), true, 1, 
            LocalDate.of(2024, 7, 15), Note.NoteStatus.ERFASST, "Noch nicht freigegeben");

        // Noten fuer Student 2 (Erika Musterfrau - Bioverfahrenstechnik Bachelor)
        createNote(EINSCHREIBUNG_2, MODUL_M1, new BigDecimal("1.0"), true, 1, 
            LocalDate.of(2024, 2, 15), Note.NoteStatus.FREIGEGEBEN, "Bestnote!");
        createNote(EINSCHREIBUNG_2, MODUL_M2, new BigDecimal("1.3"), true, 1, 
            LocalDate.of(2024, 7, 10), Note.NoteStatus.FREIGEGEBEN, null);
        createNote(EINSCHREIBUNG_2, MODUL_CH1, new BigDecimal("5.0"), false, 1, 
            LocalDate.of(2024, 2, 18), Note.NoteStatus.FREIGEGEBEN, "Nicht bestanden - Wiederholung moeglich");
        createNote(EINSCHREIBUNG_2, MODUL_CH1, new BigDecimal("3.3"), true, 2, 
            LocalDate.of(2024, 4, 5), Note.NoteStatus.FREIGEGEBEN, "Wiederholungspruefung bestanden");

        // Noten fuer Student 3 (Jan Beispiel - Forschung Soziale Arbeit Master)
        createNote(EINSCHREIBUNG_3, MODUL_FO1, new BigDecimal("1.7"), true, 1, 
            LocalDate.of(2024, 2, 20), Note.NoteStatus.FREIGEGEBEN, null);
        createNote(EINSCHREIBUNG_3, MODUL_FO2, new BigDecimal("2.0"), true, 1, 
            LocalDate.of(2024, 7, 12), Note.NoteStatus.FREIGEGEBEN, null);
        createNote(EINSCHREIBUNG_3, MODUL_SA1, new BigDecimal("1.3"), true, 1, 
            LocalDate.of(2024, 2, 22), Note.NoteStatus.VALIDIERT, "Warte auf Freigabe");

        log.info("Noten Seed-Daten erfolgreich erstellt! {} Noten angelegt.", noteRepository.count());
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
