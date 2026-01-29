package de.gradify.user.controller;

import de.gradify.shared.dto.ApiResponse;
import de.gradify.user.entity.Benutzer;
import de.gradify.user.entity.Rolle;
import de.gradify.user.repository.BenutzerRepository;
import de.gradify.user.repository.RolleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.*;

/**
 * Controller für den CSV-Import/Export von Benutzern.
 * 
 * CSV-Format (Semikolon-getrennt, UTF-8):
 * Benutzername;Vorname;Nachname;Email;Rolle;Passwort;Aktiv
 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Slf4j
public class UserImportExportController {

    private final BenutzerRepository benutzerRepository;
    private final RolleRepository rolleRepository;
    private final PasswordEncoder passwordEncoder;

    // Demo-Mandant-ID (sollte später aus dem Auth-Context kommen)
    private static final UUID DEMO_MANDANT_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");

    /**
     * Exportiert alle Benutzer als CSV.
     */
    @GetMapping(value = "/export", produces = "text/csv")
    public ResponseEntity<String> exportUsers() {
        log.info("CSV Export: Users");

        StringBuilder csv = new StringBuilder();
        csv.append("Benutzername;Vorname;Nachname;Email;Rolle;Aktiv\n");

        List<Benutzer> benutzer = benutzerRepository.findAll();
        
        for (Benutzer b : benutzer) {
            String rolle = b.getRollen().stream()
                .findFirst()
                .map(r -> r.getName().replace("ROLE_", ""))
                .orElse("");
            
            csv.append(String.format("%s;%s;%s;%s;%s;%s\n",
                b.getBenutzername(),
                b.getVorname(),
                b.getNachname(),
                b.getEmail(),
                rolle,
                b.isAktiv()
            ));
        }

        String filename = String.format("benutzer_%s.csv", java.time.LocalDate.now().toString());

        log.info("CSV Export completed: {} users", benutzer.size());

        return ResponseEntity.ok()
            .header("Content-Disposition", "attachment; filename=" + filename)
            .header("Content-Type", "text/csv; charset=UTF-8")
            .body(csv.toString());
    }

    /**
     * Gibt eine CSV-Vorlage für Benutzer-Import zurück.
     */
    @GetMapping(value = "/import/template", produces = "text/csv")
    public ResponseEntity<String> getTemplate() {
        String template = """
            Benutzername;Vorname;Nachname;Email;Rolle;Passwort;Aktiv
            max.mustermann;Max;Mustermann;max@example.com;STUDENT;geheim123;true
            anna.schmidt;Anna;Schmidt;anna@example.com;STUDENT;geheim123;true
            prof.mueller;Prof. Dr. Max;Mueller;prof.mueller@example.com;LEHRENDER;geheim123;true
            sabine.meier;Sabine;Meier;sabine@example.com;PRUEFUNGSAMT;geheim123;true
            """;
        
        return ResponseEntity.ok()
            .header("Content-Disposition", "attachment; filename=benutzer_template.csv")
            .header("Content-Type", "text/csv; charset=UTF-8")
            .body(template);
    }

    /**
     * Importiert Benutzer aus einer CSV-Datei.
     */
    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Transactional
    public ResponseEntity<ApiResponse<ImportResult>> importUsers(
            @RequestParam("file") MultipartFile file) {
        
        log.info("CSV Import: Users");

        try {
            List<CsvRow> rows = parseCsv(file);
            if (rows.isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(ApiResponse.error("CSV-Datei ist leer oder hat ungültiges Format"));
            }

            ImportResult result = processImport(rows);
            
            log.info("CSV Import completed: {} created, {} skipped", 
                result.created, result.skipped);

            return ResponseEntity.ok(ApiResponse.success(result, 
                String.format("Import erfolgreich: %d Benutzer erstellt, %d übersprungen", 
                    result.created, result.skipped)));

        } catch (Exception e) {
            log.error("CSV Import failed", e);
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("Import fehlgeschlagen: " + e.getMessage()));
        }
    }

    private List<CsvRow> parseCsv(MultipartFile file) throws Exception {
        List<CsvRow> rows = new ArrayList<>();
        
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            
            String line;
            boolean headerSkipped = false;
            int lineNumber = 0;
            
            while ((line = reader.readLine()) != null) {
                lineNumber++;
                line = line.trim();
                
                if (line.isEmpty()) continue;
                
                if (!headerSkipped) {
                    if (line.toLowerCase().contains("benutzername")) {
                        headerSkipped = true;
                        continue;
                    }
                    headerSkipped = true;
                }
                
                String[] parts = line.split(";", -1);
                if (parts.length < 7) {
                    log.warn("Zeile {} hat zu wenige Spalten ({}), überspringe", lineNumber, parts.length);
                    continue;
                }
                
                try {
                    CsvRow row = new CsvRow();
                    row.benutzername = parts[0].trim();
                    row.vorname = parts[1].trim();
                    row.nachname = parts[2].trim();
                    row.email = parts[3].trim();
                    row.rolle = parts[4].trim().toUpperCase();
                    row.passwort = parts[5].trim();
                    row.aktiv = Boolean.parseBoolean(parts[6].trim().toLowerCase());
                    
                    if (!row.benutzername.isEmpty() && !row.email.isEmpty()) {
                        rows.add(row);
                    }
                } catch (Exception e) {
                    log.warn("Fehler in Zeile {}: {}", lineNumber, e.getMessage());
                }
            }
        }
        
        return rows;
    }

    private ImportResult processImport(List<CsvRow> rows) {
        ImportResult result = new ImportResult();
        
        // Rollen aus DB laden
        Map<String, Rolle> rolleMap = new HashMap<>();
        rolleRepository.findAll().forEach(r -> 
            rolleMap.put(r.getName().replace("ROLE_", ""), r)
        );

        for (CsvRow row : rows) {
            // Prüfen ob Benutzer bereits existiert
            if (benutzerRepository.existsByBenutzername(row.benutzername)) {
                log.info("Benutzer existiert bereits: {}", row.benutzername);
                result.skipped++;
                continue;
            }
            
            if (benutzerRepository.existsByEmail(row.email)) {
                log.info("Email existiert bereits: {}", row.email);
                result.skipped++;
                continue;
            }

            // Rolle finden
            Rolle rolle = rolleMap.get(row.rolle);
            if (rolle == null) {
                log.warn("Unbekannte Rolle: {}, verwende STUDENT", row.rolle);
                rolle = rolleMap.get("STUDENT");
            }

            // Benutzer erstellen
            Benutzer benutzer = Benutzer.builder()
                .benutzername(row.benutzername)
                .vorname(row.vorname)
                .nachname(row.nachname)
                .email(row.email)
                .passwortHash(passwordEncoder.encode(row.passwort))
                .mandantId(DEMO_MANDANT_ID)
                .aktiv(row.aktiv)
                .rollen(rolle != null ? Set.of(rolle) : new HashSet<>())
                .build();

            benutzerRepository.save(benutzer);
            result.created++;
            log.info("Benutzer erstellt: {} ({})", row.benutzername, row.rolle);
        }
        
        return result;
    }

    private static class CsvRow {
        String benutzername;
        String vorname;
        String nachname;
        String email;
        String rolle;
        String passwort;
        boolean aktiv;
    }

    public static class ImportResult {
        public int created = 0;
        public int skipped = 0;
        public int errors = 0;
    }
}
