package de.gradify.berechnung.service;

import de.gradify.berechnung.dto.BerechnungDto;
import de.gradify.berechnung.dto.DetailBerechnungDto;
import de.gradify.berechnung.dto.FortschrittDto;
import de.gradify.berechnung.entity.Berechnungsergebnis;
import de.gradify.berechnung.entity.ModulBerechnung;
import de.gradify.berechnung.repository.BerechnungsergebnisRepository;
import de.gradify.berechnung.repository.ModulBerechnungRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class BerechnungsService {

    private final BerechnungsergebnisRepository berechnungsergebnisRepository;
    private final ModulBerechnungRepository modulBerechnungRepository;

    /**
     * Holt die Gesamtnote für eine Einschreibung.
     */
    @Transactional(readOnly = true)
    public Optional<BerechnungDto> getGesamtnote(UUID einschreibungId) {
        log.info("Getting Gesamtnote for einschreibung: {}", einschreibungId);
        return berechnungsergebnisRepository.findByEinschreibungId(einschreibungId)
                .map(this::toDto);
    }

    /**
     * Holt die Detail-Berechnung mit allen Modulbeiträgen.
     */
    @Transactional(readOnly = true)
    public Optional<DetailBerechnungDto> getDetailBerechnung(UUID einschreibungId) {
        log.info("Getting DetailBerechnung for einschreibung: {}", einschreibungId);
        return berechnungsergebnisRepository.findByEinschreibungId(einschreibungId)
                .map(this::toDetailDto);
    }

    /**
     * Holt den Studienfortschritt (ECTS, bestandene Module).
     */
    @Transactional(readOnly = true)
    public Optional<FortschrittDto> getFortschritt(UUID einschreibungId) {
        log.info("Getting Fortschritt for einschreibung: {}", einschreibungId);
        return berechnungsergebnisRepository.findByEinschreibungId(einschreibungId)
                .map(this::toFortschrittDto);
    }

    /**
     * Berechnet die Gesamtnote neu und speichert das Ergebnis.
     * Diese Methode wird in Commit 3e-2/3e-3 erweitert um Noten via gRPC abzurufen.
     */
    @Transactional
    public BerechnungDto berechneGesamtnote(UUID einschreibungId) {
        log.info("Calculating Gesamtnote for einschreibung: {}", einschreibungId);

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

        // TODO: In 3e-2/3e-3 werden hier die Modulnoten via gRPC abgerufen
        // und die Berechnung durchgeführt
        
        ergebnis = berechnungsergebnisRepository.save(ergebnis);
        log.info("Saved Berechnungsergebnis: {}", ergebnis.getId());

        return toDto(ergebnis);
    }

    /**
     * Aktualisiert die Berechnung basierend auf vorhandenen ModulBerechnungen.
     */
    @Transactional
    public BerechnungDto aktualisiereBerechnung(UUID einschreibungId, 
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

        int moduleOffen = e.getModuleGesamt() - e.getModuleBestanden();

        return FortschrittDto.builder()
                .einschreibungId(e.getEinschreibungId())
                .ectsErreicht(e.getEctsErreicht())
                .ectsGesamt(e.getEctsGesamt())
                .moduleBestanden(e.getModuleBestanden())
                .moduleOffen(moduleOffen)
                .moduleNichtBestanden(0) // TODO: aus ModulBerechnungen ermitteln
                .fortschrittProzent(BigDecimal.valueOf(prozent).setScale(1, RoundingMode.HALF_UP))
                .build();
    }
}

