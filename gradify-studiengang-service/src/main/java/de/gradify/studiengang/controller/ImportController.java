package de.gradify.studiengang.controller;

import de.gradify.shared.dto.ApiResponse;
import de.gradify.studiengang.entity.*;
import de.gradify.studiengang.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.*;

/**
 * Controller für den CSV-Import von Studiengängen und Modulen.
 * 
 * CSV-Format (Semikolon-getrennt, UTF-8):
 * Studiengang_Kuerzel;Studiengang_Name;Abschlussart;Regelstudienzeit;GesamtECTS;PO_Version;Modul_Nr;Modul_Name;ECTS;Semester;Pruefungsform;Modultyp;Gewichtung;In_Gesamtnote
 */
@RestController
@RequestMapping("/api/import")
@RequiredArgsConstructor
@Slf4j
public class ImportController {

    private final MandantRepository mandantRepository;
    private final StudiengangRepository studiengangRepository;
    private final PruefungsordnungRepository pruefungsordnungRepository;
    private final ModulRepository modulRepository;

    /**
     * Importiert Studiengänge und Module aus einer CSV-Datei.
     * 
     * @param mandantId Die ID des Mandanten, für den importiert wird
     * @param file Die CSV-Datei
     * @return Import-Statistiken
     */
    @PostMapping(value = "/studiengaenge", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Transactional
    public ResponseEntity<ApiResponse<ImportResult>> importStudiengaenge(
            @RequestParam("mandantId") UUID mandantId,
            @RequestParam("file") MultipartFile file) {
        
        log.info("CSV Import started for mandant: {}", mandantId);

        // Mandant prüfen
        Mandant mandant = mandantRepository.findById(mandantId).orElse(null);
        if (mandant == null) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("Mandant nicht gefunden: " + mandantId));
        }

        try {
            List<CsvRow> rows = parseCsv(file);
            if (rows.isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(ApiResponse.error("CSV-Datei ist leer oder hat ungültiges Format"));
            }

            ImportResult result = processImport(mandant, rows);
            
            log.info("CSV Import completed: {} Studiengänge, {} Module erstellt", 
                result.studiengaengeCreated, result.moduleCreated);

            return ResponseEntity.ok(ApiResponse.success(result, 
                String.format("Import erfolgreich: %d Studiengänge, %d Module", 
                    result.studiengaengeCreated, result.moduleCreated)));

        } catch (Exception e) {
            log.error("CSV Import failed", e);
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("Import fehlgeschlagen: " + e.getMessage()));
        }
    }

    /**
     * Gibt eine CSV-Vorlage zum Download zurück.
     */
    @GetMapping(value = "/template", produces = "text/csv")
    public ResponseEntity<String> getTemplate() {
        String template = """
            Studiengang_Kuerzel;Studiengang_Name;Abschlussart;Regelstudienzeit;GesamtECTS;PO_Version;Modul_Nr;Modul_Name;ECTS;Semester;Pruefungsform;Modultyp;Gewichtung;In_Gesamtnote
            BVT;Bioverfahrenstechnik;BACHELOR;7;210;2024;1010;Mathematik 1;5;1;KLAUSUR;PFLICHT;1.0;true
            BVT;Bioverfahrenstechnik;BACHELOR;7;210;2024;1020;Physik;5;1;KLAUSUR;PFLICHT;1.0;true
            BVT;Bioverfahrenstechnik;BACHELOR;7;210;2024;1030;Chemie Grundlagen;5;1;KLAUSUR;PFLICHT;1.0;true
            BVT;Bioverfahrenstechnik;BACHELOR;7;210;2024;2010;Biologie;5;2;KLAUSUR;PFLICHT;1.0;true
            BVT;Bioverfahrenstechnik;BACHELOR;7;210;2024;2020;Informatik Grundlagen;5;2;KLAUSUR;PFLICHT;1.0;true
            INF;Informatik;BACHELOR;6;180;2024;1010;Programmierung 1;6;1;KLAUSUR;PFLICHT;1.0;true
            INF;Informatik;BACHELOR;6;180;2024;1020;Mathematik für Informatiker;6;1;KLAUSUR;PFLICHT;1.0;true
            """;
        
        return ResponseEntity.ok()
            .header("Content-Disposition", "attachment; filename=studiengang_template.csv")
            .body(template);
    }

    /**
     * Exportiert alle Studiengänge und Module eines Mandanten als CSV.
     */
    @GetMapping(value = "/export/studiengaenge", produces = "text/csv")
    public ResponseEntity<String> exportStudiengaenge(
            @RequestParam("mandantId") UUID mandantId) {
        
        log.info("CSV Export started for mandant: {}", mandantId);

        Mandant mandant = mandantRepository.findById(mandantId).orElse(null);
        if (mandant == null) {
            return ResponseEntity.notFound().build();
        }

        StringBuilder csv = new StringBuilder();
        csv.append("Studiengang_Kuerzel;Studiengang_Name;Abschlussart;Regelstudienzeit;GesamtECTS;PO_Version;Modul_Nr;Modul_Name;ECTS;Semester;Pruefungsform;Modultyp;Gewichtung;In_Gesamtnote\n");

        List<Studiengang> studiengaenge = studiengangRepository.findByMandantId(mandantId);
        
        for (Studiengang sg : studiengaenge) {
            Pruefungsordnung po = sg.getAktuellePo();
            if (po == null) {
                // Studiengang ohne Module
                csv.append(String.format("%s;%s;%s;%d;%d;-;-;(keine Module);0;-;-;-;0;false\n",
                    sg.getKuerzel(),
                    sg.getName(),
                    sg.getAbschlussart().name(),
                    sg.getRegelstudienzeit(),
                    sg.getGesamtEcts()
                ));
                continue;
            }

            List<Modul> module = modulRepository.findByPruefungsordnungId(po.getId());
            
            if (module.isEmpty()) {
                csv.append(String.format("%s;%s;%s;%d;%d;%s;-;(keine Module);0;-;-;-;0;false\n",
                    sg.getKuerzel(),
                    sg.getName(),
                    sg.getAbschlussart().name(),
                    sg.getRegelstudienzeit(),
                    sg.getGesamtEcts(),
                    po.getVersion()
                ));
            } else {
                for (Modul m : module) {
                    csv.append(String.format("%s;%s;%s;%d;%d;%s;%s;%s;%d;%s;%s;%s;%s;%s\n",
                        sg.getKuerzel(),
                        sg.getName(),
                        sg.getAbschlussart().name(),
                        sg.getRegelstudienzeit(),
                        sg.getGesamtEcts(),
                        po.getVersion(),
                        m.getModulNr(),
                        m.getName(),
                        m.getEcts(),
                        m.getSemester(),
                        m.getPruefungsform().name(),
                        m.getModultyp().name(),
                        m.getGewichtung().toString(),
                        m.isInGesamtnote()
                    ));
                }
            }
        }

        String filename = String.format("studiengaenge_%s_%s.csv", 
            mandant.getKuerzel(), 
            java.time.LocalDate.now().toString());

        log.info("CSV Export completed: {} studiengaenge", studiengaenge.size());

        return ResponseEntity.ok()
            .header("Content-Disposition", "attachment; filename=" + filename)
            .header("Content-Type", "text/csv; charset=UTF-8")
            .body(csv.toString());
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
                
                // Skip empty lines
                if (line.isEmpty()) continue;
                
                // Skip header
                if (!headerSkipped) {
                    if (line.toLowerCase().contains("studiengang_kuerzel")) {
                        headerSkipped = true;
                        continue;
                    }
                    headerSkipped = true; // No header found, treat first line as data
                }
                
                String[] parts = line.split(";", -1);
                if (parts.length < 14) {
                    log.warn("Zeile {} hat zu wenige Spalten ({}), überspringe", lineNumber, parts.length);
                    continue;
                }
                
                try {
                    CsvRow row = new CsvRow();
                    row.studiengangKuerzel = parts[0].trim();
                    row.studiengangName = parts[1].trim();
                    row.abschlussart = parts[2].trim().toUpperCase();
                    row.regelstudienzeit = Integer.parseInt(parts[3].trim());
                    row.gesamtEcts = Integer.parseInt(parts[4].trim());
                    row.poVersion = parts[5].trim();
                    row.modulNr = parts[6].trim();
                    row.modulName = parts[7].trim();
                    row.ects = Integer.parseInt(parts[8].trim());
                    row.semester = parts[9].trim();
                    row.pruefungsform = parts[10].trim().toUpperCase();
                    row.modultyp = parts[11].trim().toUpperCase();
                    row.gewichtung = new BigDecimal(parts[12].trim().replace(",", "."));
                    row.inGesamtnote = Boolean.parseBoolean(parts[13].trim().toLowerCase());
                    
                    rows.add(row);
                } catch (Exception e) {
                    log.warn("Fehler in Zeile {}: {}", lineNumber, e.getMessage());
                }
            }
        }
        
        return rows;
    }

    private ImportResult processImport(Mandant mandant, List<CsvRow> rows) {
        ImportResult result = new ImportResult();
        
        // Gruppiere nach Studiengang
        Map<String, List<CsvRow>> byStudiengang = new LinkedHashMap<>();
        for (CsvRow row : rows) {
            byStudiengang.computeIfAbsent(row.studiengangKuerzel, k -> new ArrayList<>()).add(row);
        }
        
        for (Map.Entry<String, List<CsvRow>> entry : byStudiengang.entrySet()) {
            String kuerzel = entry.getKey();
            List<CsvRow> sgRows = entry.getValue();
            CsvRow first = sgRows.get(0);
            
            // Studiengang erstellen oder finden
            Studiengang studiengang = studiengangRepository.findByKuerzel(kuerzel).orElse(null);
            boolean newStudiengang = false;
            
            if (studiengang == null) {
                studiengang = Studiengang.builder()
                    .mandant(mandant)
                    .name(first.studiengangName)
                    .kuerzel(kuerzel)
                    .abschlussart(Studiengang.Abschlussart.valueOf(first.abschlussart))
                    .regelstudienzeit(first.regelstudienzeit)
                    .gesamtEcts(first.gesamtEcts)
                    .studienvariante(Studiengang.Studienvariante.ALLGEMEIN)
                    .aktiv(true)
                    .build();
                studiengang = studiengangRepository.save(studiengang);
                result.studiengaengeCreated++;
                newStudiengang = true;
                log.info("Studiengang erstellt: {} ({})", first.studiengangName, kuerzel);
            } else {
                result.studiengaengeUpdated++;
            }
            
            // Prüfungsordnung erstellen oder finden
            String poVersion = first.poVersion;
            Pruefungsordnung po = null;
            
            if (!newStudiengang) {
                // Suche existierende PO
                List<Pruefungsordnung> existingPos = pruefungsordnungRepository.findByStudiengangId(studiengang.getId());
                po = existingPos.stream()
                    .filter(p -> p.getVersion().equals(poVersion))
                    .findFirst()
                    .orElse(null);
            }
            
            if (po == null) {
                po = Pruefungsordnung.builder()
                    .studiengang(studiengang)
                    .version(poVersion)
                    .gueltigAb(LocalDate.of(Integer.parseInt(poVersion), 1, 1))
                    .berechnungsart(Pruefungsordnung.Berechnungsart.GEWICHTET)
                    .build();
                po = pruefungsordnungRepository.save(po);
                
                // Aktuelle PO setzen
                studiengang.setAktuellePo(po);
                studiengangRepository.save(studiengang);
                
                log.info("Prüfungsordnung erstellt: {} für {}", poVersion, kuerzel);
            }
            
            // Module erstellen
            Set<String> existingModulNrs = new HashSet<>();
            if (!newStudiengang) {
                modulRepository.findByPruefungsordnungId(po.getId())
                    .forEach(m -> existingModulNrs.add(m.getModulNr()));
            }
            
            for (CsvRow row : sgRows) {
                if (existingModulNrs.contains(row.modulNr)) {
                    result.moduleSkipped++;
                    continue;
                }
                
                Modul modul = Modul.builder()
                    .pruefungsordnung(po)
                    .modulNr(row.modulNr)
                    .name(row.modulName)
                    .ects(row.ects)
                    .semester(row.semester)
                    .dauerSemester(1)
                    .pruefungsform(Modul.Pruefungsform.valueOf(row.pruefungsform))
                    .sprache(Modul.Sprache.DEUTSCH)
                    .modultyp(Modul.Modultyp.valueOf(row.modultyp))
                    .bewertungsart(Modul.Bewertungsart.NOTE)
                    .gewichtung(row.gewichtung)
                    .inGesamtnote(row.inGesamtnote)
                    .build();
                
                modulRepository.save(modul);
                result.moduleCreated++;
            }
        }
        
        return result;
    }

    // Helper classes
    private static class CsvRow {
        String studiengangKuerzel;
        String studiengangName;
        String abschlussart;
        int regelstudienzeit;
        int gesamtEcts;
        String poVersion;
        String modulNr;
        String modulName;
        int ects;
        String semester;
        String pruefungsform;
        String modultyp;
        BigDecimal gewichtung;
        boolean inGesamtnote;
    }

    public static class ImportResult {
        public int studiengaengeCreated = 0;
        public int studiengaengeUpdated = 0;
        public int moduleCreated = 0;
        public int moduleSkipped = 0;
        
        public int getTotalStudiengaenge() {
            return studiengaengeCreated + studiengaengeUpdated;
        }
    }
}
