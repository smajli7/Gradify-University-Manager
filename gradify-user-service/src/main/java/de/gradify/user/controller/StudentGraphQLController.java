package de.gradify.user.controller;

import de.gradify.user.dto.StudentDto;
import de.gradify.user.entity.Benutzer;
import de.gradify.user.entity.Rolle;
import de.gradify.user.entity.Student;
import de.gradify.user.repository.BenutzerRepository;
import de.gradify.user.repository.RolleRepository;
import de.gradify.user.repository.StudentRepository;
import de.gradify.user.service.StudentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.graphql.data.method.annotation.SchemaMapping;
import org.springframework.stereotype.Controller;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * GraphQL Controller fuer Student- und User-Abfragen.
 * 
 * Implementiert die Queries und Mutations aus schema.graphqls
 */
@Controller
@RequiredArgsConstructor
@Slf4j
public class StudentGraphQLController {

    private final StudentService studentService;
    private final StudentRepository studentRepository;
    private final BenutzerRepository benutzerRepository;
    private final RolleRepository rolleRepository;

    // ==================== QUERIES ====================

    /**
     * Holt alle Benutzer.
     * GraphQL: query { users { id, benutzername, ... } }
     */
    @QueryMapping
    public List<Benutzer> users() {
        log.info("GraphQL: Fetching all users");
        return benutzerRepository.findAll();
    }

    /**
     * Holt einen Benutzer nach ID.
     * GraphQL: query { user(id: "...") { id, benutzername, ... } }
     */
    @QueryMapping
    public Benutzer user(@Argument("id") String id) {
        log.info("GraphQL: Fetching user by id: {}", id);
        return benutzerRepository.findById(UUID.fromString(id)).orElse(null);
    }

    /**
     * Holt alle Studenten.
     * GraphQL: query { students { id, matrikelnummer, ... } }
     */
    @QueryMapping
    public List<Student> students() {
        log.info("GraphQL: Fetching all students");
        return studentRepository.findAll();
    }

    /**
     * Holt einen Studenten nach ID.
     * GraphQL: query { student(id: "...") { id, matrikelnummer, ... } }
     */
    @QueryMapping
    public Student student(@Argument("id") String id) {
        log.info("GraphQL: Fetching student by id: {}", id);
        return studentRepository.findById(UUID.fromString(id)).orElse(null);
    }

    /**
     * Holt einen Studenten nach Matrikelnummer.
     * GraphQL: query { studentByMatrikel(matrikelnummer: "THM-2026-0001") { ... } }
     */
    @QueryMapping
    public Student studentByMatrikel(@Argument("matrikelnummer") String matrikelnummer) {
        log.info("GraphQL: Fetching student by matrikelnummer: {}", matrikelnummer);
        return studentRepository.findByMatrikelnummer(matrikelnummer).orElse(null);
    }

    // ==================== MUTATIONS ====================

    /**
     * Erstellt einen neuen Benutzer.
     * GraphQL: mutation { createUser(input: {...}) { id, ... } }
     */
    @MutationMapping
    public Benutzer createUser(@Argument("input") Map<String, Object> input) {
        log.info("GraphQL: Creating user: {}", input.get("benutzername"));
        
        Benutzer benutzer = Benutzer.builder()
                .benutzername((String) input.get("benutzername"))
                .email((String) input.get("email"))
                .passwortHash("{noop}" + input.get("passwort")) // Temporaer ohne Encoding fuer GraphQL
                .vorname((String) input.get("vorname"))
                .nachname((String) input.get("nachname"))
                .mandantId(UUID.fromString((String) input.get("mandantId")))
                .aktiv(true)
                .build();
        
        // Rollen zuweisen falls vorhanden
        @SuppressWarnings("unchecked")
        List<String> rollenIds = (List<String>) input.get("rollenIds");
        if (rollenIds != null) {
            for (String rolleId : rollenIds) {
                rolleRepository.findById(UUID.fromString(rolleId))
                        .ifPresent(rolle -> benutzer.getRollen().add(rolle));
            }
        }
        
        return benutzerRepository.save(benutzer);
    }

    /**
     * Aktualisiert einen Benutzer.
     * GraphQL: mutation { updateUser(id: "...", input: {...}) { id, ... } }
     */
    @MutationMapping
    public Benutzer updateUser(@Argument("id") String id, @Argument("input") Map<String, Object> input) {
        log.info("GraphQL: Updating user: {}", id);
        
        return benutzerRepository.findById(UUID.fromString(id)).map(benutzer -> {
            if (input.containsKey("email")) {
                benutzer.setEmail((String) input.get("email"));
            }
            if (input.containsKey("vorname")) {
                benutzer.setVorname((String) input.get("vorname"));
            }
            if (input.containsKey("nachname")) {
                benutzer.setNachname((String) input.get("nachname"));
            }
            if (input.containsKey("aktiv")) {
                benutzer.setAktiv((Boolean) input.get("aktiv"));
            }
            return benutzerRepository.save(benutzer);
        }).orElseThrow(() -> new IllegalArgumentException("User not found: " + id));
    }

    /**
     * Loescht einen Benutzer (deaktiviert ihn).
     * GraphQL: mutation { deleteUser(id: "...") }
     */
    @MutationMapping
    public Boolean deleteUser(@Argument("id") String id) {
        log.info("GraphQL: Deleting user: {}", id);
        
        return benutzerRepository.findById(UUID.fromString(id)).map(benutzer -> {
            benutzer.setAktiv(false);
            benutzerRepository.save(benutzer);
            return true;
        }).orElse(false);
    }

    /**
     * Weist einem Benutzer eine Rolle zu.
     * GraphQL: mutation { assignRole(userId: "...", roleId: "...") { id, rollen {...} } }
     */
    @MutationMapping
    public Benutzer assignRole(@Argument("userId") String userId, @Argument("roleId") String roleId) {
        log.info("GraphQL: Assigning role {} to user {}", roleId, userId);
        
        Benutzer benutzer = benutzerRepository.findById(UUID.fromString(userId))
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
        
        Rolle rolle = rolleRepository.findById(UUID.fromString(roleId))
                .orElseThrow(() -> new IllegalArgumentException("Role not found: " + roleId));
        
        benutzer.getRollen().add(rolle);
        return benutzerRepository.save(benutzer);
    }

    /**
     * Entfernt eine Rolle von einem Benutzer.
     * GraphQL: mutation { removeRole(userId: "...", roleId: "...") { id, rollen {...} } }
     */
    @MutationMapping
    public Benutzer removeRole(@Argument("userId") String userId, @Argument("roleId") String roleId) {
        log.info("GraphQL: Removing role {} from user {}", roleId, userId);
        
        Benutzer benutzer = benutzerRepository.findById(UUID.fromString(userId))
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
        
        benutzer.getRollen().removeIf(r -> r.getId().equals(UUID.fromString(roleId)));
        return benutzerRepository.save(benutzer);
    }

    /**
     * Erstellt einen neuen Studenten.
     * GraphQL: mutation { createStudent(input: {...}) { id, matrikelnummer, ... } }
     */
    @MutationMapping
    public Student createStudent(@Argument("input") Map<String, Object> input) {
        log.info("GraphQL: Creating student");
        
        UUID benutzerId = UUID.fromString((String) input.get("benutzerId"));
        String matrikelnummer = (String) input.get("matrikelnummer");
        String geburtsdatumStr = (String) input.get("geburtsdatum");
        
        Benutzer benutzer = benutzerRepository.findById(benutzerId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + benutzerId));
        
        Student student = Student.builder()
                .benutzer(benutzer)
                .matrikelnummer(matrikelnummer)
                .geburtsdatum(geburtsdatumStr != null ? LocalDate.parse(geburtsdatumStr) : null)
                .status(Student.StudentStatus.AKTIV)
                .build();
        
        return studentRepository.save(student);
    }

    /**
     * Aktualisiert einen Studenten.
     * GraphQL: mutation { updateStudent(id: "...", input: {...}) { id, ... } }
     */
    @MutationMapping
    public Student updateStudent(@Argument("id") String id, @Argument("input") Map<String, Object> input) {
        log.info("GraphQL: Updating student: {}", id);
        
        return studentRepository.findById(UUID.fromString(id)).map(student -> {
            if (input.containsKey("geburtsdatum")) {
                String datum = (String) input.get("geburtsdatum");
                student.setGeburtsdatum(datum != null ? LocalDate.parse(datum) : null);
            }
            if (input.containsKey("status")) {
                String status = (String) input.get("status");
                student.setStatus(Student.StudentStatus.valueOf(status));
            }
            return studentRepository.save(student);
        }).orElseThrow(() -> new IllegalArgumentException("Student not found: " + id));
    }

    // ==================== SCHEMA MAPPINGS (Nested Fields) ====================

    /**
     * Laedt die Rollen fuer einen Benutzer.
     * GraphQL: user { rollen { id, name } }
     */
    @SchemaMapping(typeName = "User", field = "rollen")
    public List<Rolle> getRollen(Benutzer benutzer) {
        return benutzer.getRollen().stream().collect(Collectors.toList());
    }

    /**
     * Laedt den zugehoerigen Studenten fuer einen Benutzer.
     * GraphQL: user { student { id, matrikelnummer } }
     */
    @SchemaMapping(typeName = "User", field = "student")
    public Student getStudentForUser(Benutzer benutzer) {
        return studentRepository.findByBenutzerId(benutzer.getId()).orElse(null);
    }

    /**
     * Laedt den Benutzer fuer einen Studenten.
     * GraphQL: student { benutzer { id, benutzername } }
     */
    @SchemaMapping(typeName = "Student", field = "benutzer")
    public Benutzer getBenutzerForStudent(Student student) {
        return student.getBenutzer();
    }
}

