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

    // Feste IDs fuer Entwicklung - muessen mit anderen Services uebereinstimmen
    public static final UUID THM_MANDANT_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    public static final UUID DOZENT_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");
    public static final UUID STUDENT_1_ID = UUID.fromString("aaaa1111-0000-0000-0000-000000000001");
    public static final UUID STUDENT_2_ID = UUID.fromString("aaaa2222-0000-0000-0000-000000000002");
    public static final UUID STUDENT_3_ID = UUID.fromString("aaaa3333-0000-0000-0000-000000000003");

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
            "admin", "admin@gradify.local", "web00100113!",
            "System", "Administrator",
            Set.of(adminRolle)
        );

        // Prüfungsamt-Benutzer
        Benutzer pruefungsamt = createBenutzer(
            "pruefungsamt", "pruefungsamt@gradify.local", "web00100113!",
            "Paula", "Prüfung",
            Set.of(pruefungsamtRolle)
        );

        // Dozenten (mit fester ID fuer Noten-Service)
        Benutzer dozent1 = createBenutzerWithId(DOZENT_ID,
            "prof.mueller", "mueller@gradify.local", "web00100113!",
            "Prof. Dr. Max", "Mueller",
            Set.of(dozentenRolle)
        );

        Benutzer dozent2 = createBenutzer(
            "prof.schmidt", "schmidt@gradify.local", "web00100113!",
            "Prof. Dr. Anna", "Schmidt",
            Set.of(dozentenRolle, studiengangleitungRolle)
        );

        // Studenten (mit festen IDs fuer Studiengang-/Noten-Service)
        createStudentWithId(STUDENT_1_ID, "max.mustermann", "max.mustermann@student.gradify.local",
            "web00100113!", "Max", "Mustermann",
            "1234567", LocalDate.of(1998, 5, 15), studentRolle);

        createStudentWithId(STUDENT_2_ID, "anna.schmidt", "anna.schmidt@student.gradify.local",
            "web00100113!", "Anna", "Schmidt",
            "1234568", LocalDate.of(1999, 8, 22), studentRolle);

        createStudentWithId(STUDENT_3_ID, "leon.weber", "leon.weber@student.gradify.local",
            "web00100113!", "Leon", "Weber",
            "1234569", LocalDate.of(2000, 3, 10), studentRolle);

        log.info("Seed-Daten erfolgreich erstellt!");
        log.info("=== Test-Zugangsdaten ===");
        log.info("Admin: admin / web00100113!");
        log.info("Prüfungsamt: pruefungsamt / web00100113!");
        log.info("Dozent: prof.mueller / web00100113!");
        log.info("Student: max.mustermann / web00100113!");
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

    private Benutzer createBenutzerWithId(UUID id, String benutzername, String email, String passwort,
                                          String vorname, String nachname, Set<Rolle> rollen) {
        Benutzer benutzer = Benutzer.builder()
            .id(id)
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

    private void createStudentWithId(UUID studentId, String benutzername, String email, String passwort,
                                     String vorname, String nachname, String matrikelnummer,
                                     LocalDate geburtsdatum, Rolle studentRolle) {
        Benutzer benutzer = createBenutzer(benutzername, email, passwort, vorname, nachname, Set.of(studentRolle));

        Student student = Student.builder()
            .id(studentId)
            .benutzer(benutzer)
            .matrikelnummer(matrikelnummer)
            .geburtsdatum(geburtsdatum)
            .status(Student.StudentStatus.AKTIV)
            .build();
        studentRepository.save(student);
    }
}



