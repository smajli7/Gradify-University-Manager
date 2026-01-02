package de.gradify.user.config;

import de.gradify.user.entity.Benutzer;
import de.gradify.user.entity.Rolle;
import de.gradify.user.entity.Student;
import de.gradify.user.repository.BenutzerRepository;
import de.gradify.user.repository.RolleRepository;
import de.gradify.user.repository.StudentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;

@Component
@Profile("dev")
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final RolleRepository rolleRepository;
    private final BenutzerRepository benutzerRepository;
    private final StudentRepository studentRepository;
    private final PasswordEncoder passwordEncoder;

    // Fester Mandant-ID für Entwicklung (THM)
    public static final UUID THM_MANDANT_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");

    @Override
    @Transactional
    public void run(String... args) {
        if (rolleRepository.count() > 0) {
            log.info("Datenbank bereits initialisiert - überspringe Seed-Daten");
            return;
        }

        log.info("Initialisiere Seed-Daten für Entwicklung...");

        // Rollen erstellen
        Rolle studentRolle = createRolle(Rolle.ROLE_STUDENT, "Studierende");
        Rolle dozentenRolle = createRolle(Rolle.ROLE_LEHRENDER, "Lehrende/Dozenten");
        Rolle pruefungsamtRolle = createRolle(Rolle.ROLE_PRUEFUNGSAMT, "Prüfungsamt-Mitarbeiter");
        Rolle studiengangleitungRolle = createRolle(Rolle.ROLE_STUDIENGANGLEITUNG, "Studiengangsleitungen");
        Rolle adminRolle = createRolle(Rolle.ROLE_ADMIN, "System-Administratoren");

        // Admin-Benutzer
        Benutzer admin = createBenutzer(
            "admin", "admin@gradify.local", "admin123",
            "System", "Administrator",
            Set.of(adminRolle)
        );

        // Prüfungsamt-Benutzer
        Benutzer pruefungsamt = createBenutzer(
            "pruefungsamt", "pruefungsamt@gradify.local", "pruefung123",
            "Paula", "Prüfung",
            Set.of(pruefungsamtRolle)
        );

        // Dozenten
        Benutzer dozent1 = createBenutzer(
            "prof.mueller", "mueller@gradify.local", "dozent123",
            "Prof. Dr. Max", "Müller",
            Set.of(dozentenRolle)
        );

        Benutzer dozent2 = createBenutzer(
            "prof.schmidt", "schmidt@gradify.local", "dozent123",
            "Prof. Dr. Anna", "Schmidt",
            Set.of(dozentenRolle, studiengangleitungRolle)
        );

        // Studenten
        createStudent("max.mustermann", "max.mustermann@student.gradify.local",
            "student123", "Max", "Mustermann",
            "1234567", LocalDate.of(1998, 5, 15), studentRolle);

        createStudent("erika.musterfrau", "erika.musterfrau@student.gradify.local",
            "student123", "Erika", "Musterfrau",
            "1234568", LocalDate.of(1999, 8, 22), studentRolle);

        createStudent("jan.beispiel", "jan.beispiel@student.gradify.local",
            "student123", "Jan", "Beispiel",
            "1234569", LocalDate.of(2000, 3, 10), studentRolle);

        log.info("Seed-Daten erfolgreich erstellt!");
        log.info("=== Test-Zugangsdaten ===");
        log.info("Admin: admin / admin123");
        log.info("Prüfungsamt: pruefungsamt / pruefung123");
        log.info("Dozent: prof.mueller / dozent123");
        log.info("Student: max.mustermann / student123");
    }

    private Rolle createRolle(String name, String beschreibung) {
        Rolle rolle = Rolle.builder()
            .name(name)
            .beschreibung(beschreibung)
            .build();
        return rolleRepository.save(rolle);
    }

    private Benutzer createBenutzer(String benutzername, String email, String passwort,
                                     String vorname, String nachname, Set<Rolle> rollen) {
        Benutzer benutzer = Benutzer.builder()
            .benutzername(benutzername)
            .email(email)
            .passwortHash(passwordEncoder.encode(passwort))
            .vorname(vorname)
            .nachname(nachname)
            .mandantId(THM_MANDANT_ID)
            .aktiv(true)
            .rollen(rollen)
            .build();
        return benutzerRepository.save(benutzer);
    }

    private void createStudent(String benutzername, String email, String passwort,
                               String vorname, String nachname, String matrikelnummer,
                               LocalDate geburtsdatum, Rolle studentRolle) {
        Benutzer benutzer = createBenutzer(benutzername, email, passwort, vorname, nachname, Set.of(studentRolle));

        Student student = Student.builder()
            .benutzer(benutzer)
            .matrikelnummer(matrikelnummer)
            .geburtsdatum(geburtsdatum)
            .status(Student.StudentStatus.AKTIV)
            .build();
        studentRepository.save(student);
    }
}

