package de.gradify.noten.validation;

import de.gradify.noten.dto.CreateNoteRequest;
import de.gradify.noten.repository.NoteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/**
 * Validiert Noten nach deutschen Hochschulregeln.
 */
@Component
@RequiredArgsConstructor
public class NoteValidator {

    private final NoteRepository noteRepository;

    // Gültige deutsche Notenwerte (1.0, 1.3, 1.7, 2.0, 2.3, 2.7, 3.0, 3.3, 3.7, 4.0, 5.0)
    private static final Set<BigDecimal> GUELTIGE_NOTEN = Set.of(
            new BigDecimal("1.0"),
            new BigDecimal("1.3"),
            new BigDecimal("1.7"),
            new BigDecimal("2.0"),
            new BigDecimal("2.3"),
            new BigDecimal("2.7"),
            new BigDecimal("3.0"),
            new BigDecimal("3.3"),
            new BigDecimal("3.7"),
            new BigDecimal("4.0"),
            new BigDecimal("5.0")
    );

    private static final int MAX_VERSUCHE = 3;

    /**
     * Validiert eine neue Note.
     * @return Liste von Fehlermeldungen (leer wenn valid)
     */
    public List<String> validateCreate(CreateNoteRequest request) {
        List<String> errors = new ArrayList<>();

        // Notenwert validieren
        if (request.getNoteWert() != null) {
            validateNoteWert(request.getNoteWert(), errors);
        }

        // Versuch validieren
        validateVersuch(request, errors);

        // Duplikat prüfen
        validateDuplikat(request, errors);

        return errors;
    }

    /**
     * Prüft ob der Notenwert gültig ist.
     */
    private void validateNoteWert(BigDecimal noteWert, List<String> errors) {
        // Bereich prüfen
        if (noteWert.compareTo(new BigDecimal("1.0")) < 0) {
            errors.add("Note muss mindestens 1.0 sein");
            return;
        }
        if (noteWert.compareTo(new BigDecimal("5.0")) > 0) {
            errors.add("Note darf maximal 5.0 sein");
            return;
        }

        // Gültige Notenstufe prüfen (compareTo ignoriert Dezimalstellen: 3 = 3.0)
        boolean gueltig = GUELTIGE_NOTEN.stream().anyMatch(g -> g.compareTo(noteWert) == 0);
        if (!gueltig) {
            errors.add("Ungültiger Notenwert. Erlaubt: 1.0, 1.3, 1.7, 2.0, 2.3, 2.7, 3.0, 3.3, 3.7, 4.0, 5.0");
        }
    }

    /**
     * Prueft ob der Versuch gueltig ist.
     */
    private void validateVersuch(CreateNoteRequest request, List<String> errors) {
        Long einschreibungId = request.getEinschreibungId();
        Long modulId = request.getModulId();
        int versuch = request.getVersuch();

        // Wenn Versuch explizit angegeben, pruefen ob im erlaubten Bereich
        if (versuch > 0 && versuch > MAX_VERSUCHE) {
            errors.add("Maximal " + MAX_VERSUCHE + " Versuche pro Modul erlaubt");
            return;
        }

        // Pruefen ob bereits die maximale Anzahl Versuche erreicht ist
        Integer maxVersuch = noteRepository.findMaxVersuch(einschreibungId, modulId);
        if (maxVersuch != null && maxVersuch >= MAX_VERSUCHE) {
            errors.add("Maximale Anzahl Versuche (" + MAX_VERSUCHE + ") bereits erreicht");
        }

        // Bei Auto-Berechnung (versuch <= 0): naechster Versuch waere maxVersuch + 1
        if (versuch <= 0 && maxVersuch != null && (maxVersuch + 1) > MAX_VERSUCHE) {
            errors.add("Maximale Anzahl Versuche (" + MAX_VERSUCHE + ") bereits erreicht");
        }
    }

    /**
     * Prueft ob bereits eine Note fuer diese Kombination existiert.
     */
    private void validateDuplikat(CreateNoteRequest request, List<String> errors) {
        Long einschreibungId = request.getEinschreibungId();
        Long modulId = request.getModulId();
        int versuch = request.getVersuch();

        if (versuch > 0) {
            // Expliziter Versuch: pruefen ob genau dieser Versuch schon existiert
            boolean exists = noteRepository.findByEinschreibungIdAndModulIdAndVersuch(
                    einschreibungId, modulId, versuch).isPresent();
            if (exists) {
                errors.add("Note fuer diesen Versuch existiert bereits");
            }
        } else {
            // Auto-Berechnung: naechsten Versuch berechnen und pruefen
            Integer maxVersuch = noteRepository.findMaxVersuch(einschreibungId, modulId);
            int nextVersuch = (maxVersuch != null ? maxVersuch : 0) + 1;
            boolean exists = noteRepository.findByEinschreibungIdAndModulIdAndVersuch(
                    einschreibungId, modulId, nextVersuch).isPresent();
            if (exists) {
                errors.add("Note fuer Versuch " + nextVersuch + " existiert bereits");
            }
        }
    }

    /**
     * Prüft ob ein Notenwert gültig ist (ohne DB-Prüfungen).
     */
    public boolean isValidNoteWert(BigDecimal noteWert) {
        return noteWert != null && GUELTIGE_NOTEN.stream().anyMatch(g -> g.compareTo(noteWert) == 0);
    }

    /**
     * Gibt alle gültigen Notenwerte zurück.
     */
    public Set<BigDecimal> getGueltigeNoten() {
        return GUELTIGE_NOTEN;
    }
}



