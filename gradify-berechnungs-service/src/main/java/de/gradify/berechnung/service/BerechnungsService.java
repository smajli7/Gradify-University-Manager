package de.gradify.berechnung.service;

import de.gradify.berechnung.dto.BerechnungDto;
import de.gradify.berechnung.dto.DetailBerechnungDto;
import de.gradify.berechnung.dto.FortschrittDto;
import de.gradify.berechnung.entity.Berechnungsergebnis;
import de.gradify.berechnung.entity.ModulBerechnung;
import de.gradify.berechnung.grpc.NotenGrpcClient;
import de.gradify.berechnung.grpc.StudiengangGrpcClient;
import de.gradify.berechnung.repository.BerechnungsergebnisRepository;
import de.gradify.berechnung.repository.ModulBerechnungRepository;
import de.gradify.shared.grpc.berechnung.ModulGewichtung;
import de.gradify.shared.grpc.berechnung.NoteData;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class BerechnungsService {

    private final BerechnungsergebnisRepository berechnungsergebnisRepository;
    private final ModulBerechnungRepository modulBerechnungRepository;
    private final NotenGrpcClient notenGrpcClient;
    private final StudiengangGrpcClient studiengangGrpcClient;

    /**
     * Holt die Gesamtnote für eine Einschreibung.
     */
    @Transactional(readOnly = true)
    public Optional<BerechnungDto> getGesamtnote(Long einschreibungId) {
        log.info("Getting Gesamtnote for einschreibung: {}", einschreibungId);
        return berechnungsergebnisRepository.findByEinschreibungId(einschreibungId)
                .map(this::toDto);
    }

    /**
     * Holt die Detail-Berechnung mit allen Modulbeiträgen.
     */
    @Transactional(readOnly = true)
    public Optional<DetailBerechnungDto> getDetailBerechnung(Long einschreibungId) {
        log.info("Getting DetailBerechnung for einschreibung: {}", einschreibungId);
        return berechnungsergebnisRepository.findByEinschreibungId(einschreibungId)
                .map(this::toDetailDto);
    }

    /**
     * Holt den Studienfortschritt (ECTS, bestandene Module).
     */
    @Transactional(readOnly = true)
    public Optional<FortschrittDto> getFortschritt(Long einschreibungId) {
        log.info("Getting Fortschritt for einschreibung: {}", einschreibungId);
        return berechnungsergebnisRepository.findByEinschreibungId(einschreibungId)
                .map(this::toFortschrittDto);
    }

    /**
     * Berechnet die Gesamtnote neu basierend auf Daten via gRPC.
     * 
     * @param einschreibungId Die Einschreibungs-ID
     * @param poId Die Prüfungsordnungs-ID für Regelwerk und Gewichtungen
     * @param ectsGesamt Gesamt-ECTS des Studiengangs
     */
    @Transactional
    public BerechnungDto berechneGesamtnote(Long einschreibungId, Long poId, int ectsGesamt) {
        log.info("Calculating Gesamtnote for einschreibung: {}, PO: {}", einschreibungId, poId);

        // 1. Noten via gRPC abrufen
        var notenResult = notenGrpcClient.getNotenFuerBerechnung(einschreibungId);
        List<NoteData> notenDaten = notenResult.noten();
        log.info("gRPC Noten-Service: {} - {} Noten erhalten", 
                notenResult.status().available() ? "OK" : "FEHLER", notenDaten.size());

        // 2. Modul-Gewichtungen via gRPC abrufen
        var gewichtungenResult = studiengangGrpcClient.getModulGewichtungen(poId);
        List<ModulGewichtung> gewichtungen = gewichtungenResult.gewichtungen();
        log.info("gRPC Studiengang-Service: {} - {} Module erhalten", 
                gewichtungenResult.status().available() ? "OK" : "FEHLER", gewichtungen.size());

        // 3. Regelwerk abrufen
        var regelwerkResult = studiengangGrpcClient.getRegelwerk(poId);
        String berechnungsart = regelwerkResult.regelwerk()
                .map(StudiengangGrpcClient.RegelwerkInfo::berechnungsart)
                .orElse("GEWICHTET");

        // 4. Noten und Gewichtungen zusammenführen
        Map<Long, ModulGewichtung> gewichtungMap = gewichtungen.stream()
                .collect(Collectors.toMap(ModulGewichtung::getModulId, g -> g));

        List<ModulBerechnung> modulBerechnungen = new ArrayList<>();
        
        for (NoteData note : notenDaten) {
            ModulGewichtung gew = gewichtungMap.get(note.getModulId());
            
            // ECTS und Modulname aus gRPC-Daten (mit Fallback-Werten)
            int ectsWert = (gew != null && gew.getEcts() > 0) ? gew.getEcts() : 5;
            String modulName = (gew != null && !gew.getModulName().isEmpty()) 
                    ? gew.getModulName() 
                    : "Modul " + (gew != null ? gew.getModulNr() : note.getModulId());
            
            ModulBerechnung mb = ModulBerechnung.builder()
                    .modulId(note.getModulId())
                    .modulNr(gew != null ? gew.getModulNr() : "?")
                    .modulName(modulName)
                    .note(BigDecimal.valueOf(note.getNoteWert()))
                    .gewichtung(gew != null ? BigDecimal.valueOf(gew.getGewichtung()) : BigDecimal.ONE)
                    .inGesamtnote(gew != null ? gew.getInGesamtnote() : true)
                    .bestanden(note.getBestanden())
                    .ects(ectsWert)
                    .build();
            
            // Gewichteten Beitrag berechnen
            if (mb.isInGesamtnote() && mb.getNote() != null) {
                mb.setGewichteterBeitrag(mb.getNote().multiply(mb.getGewichtung()));
            }
            
            modulBerechnungen.add(mb);
        }

        // 5. Berechnung aktualisieren
        return aktualisiereBerechnung(einschreibungId, modulBerechnungen, berechnungsart, ectsGesamt);
    }

    /**
     * Einfache Berechnung ohne gRPC (für Tests / wenn Services nicht erreichbar).
     */
    @Transactional
    public BerechnungDto berechneGesamtnote(Long einschreibungId) {
        log.info("Calculating Gesamtnote for einschreibung (ohne gRPC): {}", einschreibungId);

        // Bestehende Berechnung laden oder neue erstellen
        Berechnungsergebnis ergebnis = berechnungsergebnisRepository
                .findByEinschreibungId(einschreibungId)
                .orElseGet(() -> Berechnungsergebnis.builder()
                        .einschreibungId(einschreibungId)
                        .moduleBestanden(0)
                        .moduleGesamt(0)
                        .ectsErreicht(0)
                        .ectsGesamt(0)
                        .build());
        
        ergebnis = berechnungsergebnisRepository.save(ergebnis);
        log.info("Saved Berechnungsergebnis: {}", ergebnis.getId());

        return toDto(ergebnis);
    }

    /**
     * Aktualisiert die Berechnung basierend auf vorhandenen ModulBerechnungen.
     */
    @Transactional
    public BerechnungDto aktualisiereBerechnung(Long einschreibungId, 
                                                 List<ModulBerechnung> modulBerechnungen,
                                                 String berechnungsart,
                                                 int ectsGesamt) {
        log.info("Updating calculation for einschreibung: {} with {} modules", 
                einschreibungId, modulBerechnungen.size());

        // Bestehende Berechnung laden oder neue erstellen
        Berechnungsergebnis ergebnis = berechnungsergebnisRepository
                .findByEinschreibungId(einschreibungId)
                .orElseGet(() -> Berechnungsergebnis.builder()
                        .einschreibungId(einschreibungId)
                        .build());

        // Statistiken berechnen
        int moduleBestanden = (int) modulBerechnungen.stream()
                .filter(ModulBerechnung::isBestanden)
                .count();
        int ectsErreicht = modulBerechnungen.stream()
                .filter(ModulBerechnung::isBestanden)
                .mapToInt(ModulBerechnung::getEcts)
                .sum();

        // Gesamtnote berechnen
        BigDecimal gesamtnoteRoh = berechneGesamtnoteNachFormel(modulBerechnungen, berechnungsart);
        BigDecimal gesamtnote = rundeNote(gesamtnoteRoh);

        // Ergebnis aktualisieren
        ergebnis.setModuleBestanden(moduleBestanden);
        ergebnis.setModuleGesamt(modulBerechnungen.size());
        ergebnis.setEctsErreicht(ectsErreicht);
        ergebnis.setEctsGesamt(ectsGesamt);
        ergebnis.setGesamtnoteRoh(gesamtnoteRoh);
        ergebnis.setGesamtnote(gesamtnote);

        // Status auf ENDGUELTIG setzen wenn alle Module bestanden
        if (ectsErreicht >= ectsGesamt && moduleBestanden == modulBerechnungen.size()) {
            ergebnis.setStatus(Berechnungsergebnis.BerechnungsStatus.ENDGUELTIG);
        }

        ergebnis = berechnungsergebnisRepository.save(ergebnis);

        // ModulBerechnungen verknüpfen und speichern
        for (ModulBerechnung mb : modulBerechnungen) {
            mb.setBerechnungsergebnis(ergebnis);
        }
        modulBerechnungRepository.saveAll(modulBerechnungen);

        log.info("Calculated Gesamtnote: {} (raw: {}) for einschreibung: {}", 
                gesamtnote, gesamtnoteRoh, einschreibungId);

        return toDto(ergebnis);
    }

    /**
     * Berechnet die Gesamtnote nach der angegebenen Formel.
     * 
     * GEWICHTET (Bachelor): Σ(Note × Gewichtung) / Σ(Gewichtungen)
     * ARITHMETISCH_GEMISCHT (Master): (2 × Thesis + Modulmittel) / 3
     */
    private BigDecimal berechneGesamtnoteNachFormel(List<ModulBerechnung> module, String berechnungsart) {
        if (module.isEmpty()) {
            return null;
        }

        List<ModulBerechnung> benoteteModule = module.stream()
                .filter(m -> m.isInGesamtnote() && m.getNote() != null)
                .collect(Collectors.toList());

        if (benoteteModule.isEmpty()) {
            return null;
        }

        if ("ARITHMETISCH_GEMISCHT".equals(berechnungsart)) {
            // Master-Formel: (2 × Thesis + Durchschnitt) / 3
            return berechneMasterNote(benoteteModule);
        } else {
            // Standard: ECTS-gewichteter Durchschnitt
            return berechneGewichteterDurchschnitt(benoteteModule);
        }
    }

    /**
     * Berechnet ECTS-gewichteten Durchschnitt (Bachelor-Formel).
     */
    private BigDecimal berechneGewichteterDurchschnitt(List<ModulBerechnung> module) {
        BigDecimal summeGewichteteNoten = BigDecimal.ZERO;
        BigDecimal summeGewichtungen = BigDecimal.ZERO;

        for (ModulBerechnung m : module) {
            BigDecimal gewichteteNote = m.getNote().multiply(m.getGewichtung());
            summeGewichteteNoten = summeGewichteteNoten.add(gewichteteNote);
            summeGewichtungen = summeGewichtungen.add(m.getGewichtung());
        }

        if (summeGewichtungen.compareTo(BigDecimal.ZERO) == 0) {
            return null;
        }

        return summeGewichteteNoten.divide(summeGewichtungen, 3, RoundingMode.HALF_UP);
    }

    /**
     * Berechnet Master-Note: (2 × Thesis + Modulmittel) / 3
     */
    private BigDecimal berechneMasterNote(List<ModulBerechnung> module) {
        // Thesis finden (modulNr enthält "TH" oder "MTH")
        Optional<ModulBerechnung> thesis = module.stream()
                .filter(m -> m.getModulNr().contains("TH"))
                .findFirst();

        if (thesis.isEmpty()) {
            // Fallback: gewichteter Durchschnitt wenn keine Thesis
            return berechneGewichteterDurchschnitt(module);
        }

        // Restliche Module ohne Thesis
        List<ModulBerechnung> ohneThesis = module.stream()
                .filter(m -> !m.getModulNr().contains("TH"))
                .collect(Collectors.toList());

        BigDecimal thesisNote = thesis.get().getNote();
        
        if (ohneThesis.isEmpty()) {
            return thesisNote;
        }

        // Durchschnitt der anderen Module
        BigDecimal modulDurchschnitt = berechneGewichteterDurchschnitt(ohneThesis);
        if (modulDurchschnitt == null) {
            return thesisNote;
        }

        // (2 × Thesis + Modulmittel) / 3
        BigDecimal ergebnis = thesisNote.multiply(new BigDecimal("2"))
                .add(modulDurchschnitt)
                .divide(new BigDecimal("3"), 3, RoundingMode.HALF_UP);

        return ergebnis;
    }

    /**
     * Rundet die Note auf eine Dezimalstelle (deutsche Notenskala).
     */
    private BigDecimal rundeNote(BigDecimal note) {
        if (note == null) {
            return null;
        }
        return note.setScale(1, RoundingMode.HALF_UP);
    }

    /**
     * Holt die Durchschnittsnote aller endgültigen Berechnungen.
     */
    public BigDecimal getDurchschnittsnote() {
        return berechnungsergebnisRepository.calculateDurchschnittsnote();
    }

    // ===== Mapper-Methoden =====

    private BerechnungDto toDto(Berechnungsergebnis e) {
        return BerechnungDto.builder()
                .einschreibungId(e.getEinschreibungId())
                .gesamtnote(e.getGesamtnote())
                .gesamtnoteRoh(e.getGesamtnoteRoh())
                .status(e.getStatus().name())
                .berechnetAm(e.getBerechnetAm())
                .moduleBestanden(e.getModuleBestanden())
                .moduleGesamt(e.getModuleGesamt())
                .build();
    }

    private DetailBerechnungDto toDetailDto(Berechnungsergebnis e) {
        List<ModulBerechnung> modulBerechnungen = 
                modulBerechnungRepository.findByBerechnungsergebnisId(e.getId());

        List<DetailBerechnungDto.ModulBeitrag> beitraege = modulBerechnungen.stream()
                .map(m -> DetailBerechnungDto.ModulBeitrag.builder()
                        .modulId(m.getModulId())
                        .modulName(m.getModulName())
                        .modulNr(m.getModulNr())
                        .note(m.getNote())
                        .gewichtung(m.getGewichtung())
                        .beitragZurGesamtnote(m.getGewichteterBeitrag())
                        .inBerechnung(m.isInGesamtnote())
                        .build())
                .collect(Collectors.toList());

        return DetailBerechnungDto.builder()
                .einschreibungId(e.getEinschreibungId())
                .gesamtnote(e.getGesamtnote())
                .module(beitraege)
                .build();
    }

    private FortschrittDto toFortschrittDto(Berechnungsergebnis e) {
        double prozent = e.getEctsGesamt() > 0 
                ? (double) e.getEctsErreicht() / e.getEctsGesamt() * 100 
                : 0;

        // Module nicht bestanden aus DB ermitteln
        List<ModulBerechnung> modulBerechnungen = 
                modulBerechnungRepository.findByBerechnungsergebnisId(e.getId());
        
        int moduleNichtBestanden = (int) modulBerechnungen.stream()
                .filter(m -> !m.isBestanden() && m.getNote() != null)
                .count();
        
        int moduleOffen = e.getModuleGesamt() - e.getModuleBestanden() - moduleNichtBestanden;

        return FortschrittDto.builder()
                .einschreibungId(e.getEinschreibungId())
                .ectsErreicht(e.getEctsErreicht())
                .ectsGesamt(e.getEctsGesamt())
                .moduleBestanden(e.getModuleBestanden())
                .moduleOffen(moduleOffen)
                .moduleNichtBestanden(moduleNichtBestanden)
                .fortschrittProzent(BigDecimal.valueOf(prozent).setScale(1, RoundingMode.HALF_UP))
                .build();
    }
}

