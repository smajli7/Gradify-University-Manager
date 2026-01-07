package de.gradify.noten.validation;

import de.gradify.noten.dto.CreateNoteRequest;
import de.gradify.noten.repository.NoteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

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

        // Gültige Notenstufe prüfen
        if (!GUELTIGE_NOTEN.contains(noteWert)) {
            errors.add("Ungültiger Notenwert. Erlaubt: 1.0, 1.3, 1.7, 2.0, 2.3, 2.7, 3.0, 3.3, 3.7, 4.0, 5.0");
        }
    }

    /**
     * Prüft ob der Versuch gültig ist.
     */
    private void validateVersuch(CreateNoteRequest request, List<String> errors) {
        UUID einschreibungId = request.getEinschreibungId();
        UUID modulId = request.getModulId();
        int versuch = request.getVersuch();

        // Wenn Versuch angegeben, prüfen ob gültig
        if (versuch > 0) {
            if (versuch > MAX_VERSUCHE) {
                errors.add("Maximal " + MAX_VERSUCHE + " Versuche pro Modul erlaubt");
                return;
            }
        }

        // Prüfen ob bereits mehr Versuche existieren als erlaubt
        Integer maxVersuch = noteRepository.findMaxVersuch(einschreibungId, modulId);
        if (maxVersuch != null && maxVersuch >= MAX_VERSUCHE) {
            errors.add("Maximale Anzahl Versuche (" + MAX_VERSUCHE + ") bereits erreicht");
        }
    }

    /**
     * Prüft ob bereits eine Note für diese Kombination existiert.
     */
    private void validateDuplikat(CreateNoteRequest request, List<String> errors) {
        UUID einschreibungId = request.getEinschreibungId();
        UUID modulId = request.getModulId();
        int versuch = request.getVersuch();

        if (versuch > 0) {
            boolean exists = noteRepository.findByEinschreibungIdAndModulIdAndVersuch(
                    einschreibungId, modulId, versuch).isPresent();
            
            if (exists) {
                errors.add("Note für diesen Versuch existiert bereits");
            }
        }
    }

    /**
     * Prüft ob ein Notenwert gültig ist (ohne DB-Prüfungen).
     */
    public boolean isValidNoteWert(BigDecimal noteWert) {
        return noteWert != null && GUELTIGE_NOTEN.contains(noteWert);
    }

    /**
     * Gibt alle gültigen Notenwerte zurück.
     */
    public Set<BigDecimal> getGueltigeNoten() {
        return GUELTIGE_NOTEN;
    }
}


