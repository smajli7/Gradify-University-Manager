package de.gradify.user.service;

import de.gradify.user.dto.CreateStudentRequest;
import de.gradify.user.dto.StudentDto;
import de.gradify.user.dto.UpdateStudentRequest;
import de.gradify.user.entity.Benutzer;
import de.gradify.user.entity.Rolle;
import de.gradify.user.entity.Student;
import de.gradify.user.repository.BenutzerRepository;
import de.gradify.user.repository.RolleRepository;
import de.gradify.user.repository.StudentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class StudentService {

    private final StudentRepository studentRepository;
    private final BenutzerRepository benutzerRepository;
    private final RolleRepository rolleRepository;
    private final MatrikelnummerGenerator matrikelnummerGenerator;
    private final PasswordEncoder passwordEncoder;

    /**
     * Holt alle Studenten.
     */
    @Transactional(readOnly = true)
    public List<StudentDto> getAllStudents() {
        try {
            List<Student> students = studentRepository.findAll();
            log.debug("Found {} students", students.size());
            return students.stream()
                    .map(this::toDto)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Error getting all students", e);
            throw e;
        }
    }

    /**
     * Holt alle Studenten eines Mandanten.
     */
    @Transactional(readOnly = true)
    public List<StudentDto> getStudentsByMandant(UUID mandantId) {
        return studentRepository.findByMandantId(mandantId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Holt einen Studenten nach ID.
     */
    @Transactional(readOnly = true)
    public Optional<StudentDto> getStudentById(UUID id) {
        return studentRepository.findById(id).map(this::toDto);
    }

    /**
     * Holt einen Studenten nach Matrikelnummer.
     */
    @Transactional(readOnly = true)
    public Optional<StudentDto> getStudentByMatrikelnummer(String matrikelnummer) {
        return studentRepository.findByMatrikelnummer(matrikelnummer).map(this::toDto);
    }

    /**
     * Prüft ob ein Student existiert.
     */
    @Transactional(readOnly = true)
    public boolean existsById(UUID id) {
        return studentRepository.existsById(id);
    }

    /**
     * Erstellt einen neuen Studenten mit zugehörigem Benutzer.
     * 
     * @param request Die Anfrage mit Studentendaten
     * @param mandantKuerzel Das Kürzel des Mandanten für die Matrikelnummer
     * @return Der erstellte Student als DTO
     */
    @Transactional
    public StudentDto createStudent(CreateStudentRequest request, String mandantKuerzel) {
        log.info("Creating student for mandant: {}", mandantKuerzel);

        // Prüfe ob Email schon existiert
        if (benutzerRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email existiert bereits: " + request.getEmail());
        }

        // Benutzer erstellen oder laden
        Benutzer benutzer;
        if (request.getBenutzerId() != null) {
            benutzer = benutzerRepository.findById(request.getBenutzerId())
                    .orElseThrow(() -> new IllegalArgumentException("Benutzer nicht gefunden: " + request.getBenutzerId()));
        } else {
            benutzer = createBenutzer(request);
        }

        // Matrikelnummer generieren
        String matrikelnummer = matrikelnummerGenerator.generate(mandantKuerzel);
        log.info("Generated matrikelnummer: {}", matrikelnummer);

        // Student erstellen
        Student student = Student.builder()
                .benutzer(benutzer)
                .matrikelnummer(matrikelnummer)
                .geburtsdatum(request.getGeburtsdatum())
                .status(Student.StudentStatus.AKTIV)
                .build();

        student = studentRepository.save(student);
        log.info("Student created with id: {}", student.getId());

        return toDto(student);
    }

    /**
     * Aktualisiert einen bestehenden Studenten.
     */
    @Transactional
    public Optional<StudentDto> updateStudent(UUID id, UpdateStudentRequest request) {
        return studentRepository.findById(id).map(student -> {
            Benutzer benutzer = student.getBenutzer();
            
            // Benutzer-Daten aktualisieren
            if (request.getVorname() != null) {
                benutzer.setVorname(request.getVorname());
            }
            if (request.getNachname() != null) {
                benutzer.setNachname(request.getNachname());
            }
            if (request.getEmail() != null) {
                // Prüfe ob neue Email schon existiert
                if (!benutzer.getEmail().equals(request.getEmail()) 
                        && benutzerRepository.existsByEmail(request.getEmail())) {
                    throw new IllegalArgumentException("Email existiert bereits: " + request.getEmail());
                }
                benutzer.setEmail(request.getEmail());
            }
            benutzerRepository.save(benutzer);

            // Student-Daten aktualisieren
            if (request.getGeburtsdatum() != null) {
                student.setGeburtsdatum(request.getGeburtsdatum());
            }
            if (request.getStatus() != null) {
                try {
                    student.setStatus(Student.StudentStatus.valueOf(request.getStatus()));
                } catch (IllegalArgumentException e) {
                    throw new IllegalArgumentException("Ungültiger Status: " + request.getStatus());
                }
            }
            
            student = studentRepository.save(student);
            log.info("Student updated: {}", id);
            
            return toDto(student);
        });
    }

    /**
     * Löscht einen Studenten (setzt Status auf EXMATRIKULIERT).
     */
    @Transactional
    public boolean deleteStudent(UUID id) {
        return studentRepository.findById(id).map(student -> {
            student.setStatus(Student.StudentStatus.EXMATRIKULIERT);
            student.getBenutzer().setAktiv(false);
            studentRepository.save(student);
            benutzerRepository.save(student.getBenutzer());
            log.info("Student deactivated: {}", id);
            return true;
        }).orElse(false);
    }

    /**
     * Erstellt einen Benutzer für den Studenten.
     */
    private Benutzer createBenutzer(CreateStudentRequest request) {
        // Benutzername generieren (vorname.nachname)
        String benutzername = generateBenutzername(request.getVorname(), request.getNachname());
        
        // Passwort (generiert oder aus Request)
        String passwort = request.getPasswort();
        if (passwort == null || passwort.isBlank()) {
            passwort = generatePassword();
        }

        // Rolle "STUDENT" holen
        Rolle studentRolle = rolleRepository.findByName("STUDENT")
                .orElseThrow(() -> new IllegalStateException("Rolle STUDENT nicht gefunden"));

        Benutzer benutzer = Benutzer.builder()
                .benutzername(benutzername)
                .email(request.getEmail())
                .passwortHash(passwordEncoder.encode(passwort))
                .vorname(request.getVorname())
                .nachname(request.getNachname())
                .mandantId(request.getMandantId())
                .aktiv(true)
                .build();
        
        benutzer.getRollen().add(studentRolle);
        benutzer = benutzerRepository.save(benutzer);
        
        log.info("Created user for student: {} ({})", benutzername, benutzer.getId());
        return benutzer;
    }

    /**
     * Generiert einen eindeutigen Benutzernamen.
     */
    private String generateBenutzername(String vorname, String nachname) {
        String base = (vorname.toLowerCase() + "." + nachname.toLowerCase())
                .replaceAll("[^a-z.]", "");
        
        String username = base;
        int counter = 1;
        
        while (benutzerRepository.existsByBenutzername(username)) {
            username = base + counter++;
        }
        
        return username;
    }

    /**
     * Generiert ein zufälliges Passwort.
     */
    private String generatePassword() {
        // Einfaches Passwort für Entwicklung - in Produktion durch sicheres ersetzen
        return UUID.randomUUID().toString().substring(0, 12);
    }

    /**
     * Konvertiert Student Entity zu DTO.
     */
    private StudentDto toDto(Student student) {
        if (student == null) {
            log.warn("Student is null");
            return null;
        }
        Benutzer benutzer = student.getBenutzer();
        if (benutzer == null) {
            log.warn("Benutzer is null for student: {}", student.getId());
            return StudentDto.builder()
                    .id(student.getId())
                    .matrikelnummer(student.getMatrikelnummer())
                    .status(student.getStatus() != null ? student.getStatus().name() : "UNKNOWN")
                    .build();
        }
        return StudentDto.builder()
                .id(student.getId())
                .benutzerId(benutzer.getId())
                .matrikelnummer(student.getMatrikelnummer())
                .vorname(benutzer.getVorname())
                .nachname(benutzer.getNachname())
                .email(benutzer.getEmail())
                .geburtsdatum(student.getGeburtsdatum())
                .status(student.getStatus().name())
                .build();
    }
}

