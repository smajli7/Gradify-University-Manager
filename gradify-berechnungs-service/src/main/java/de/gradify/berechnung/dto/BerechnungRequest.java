package de.gradify.berechnung.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Request DTO für Gesamtnoten-Berechnung.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BerechnungRequest {
    
    @NotNull(message = "Einschreibungs-ID darf nicht leer sein")
    private UUID einschreibungId;
    
    @NotNull(message = "Prüfungsordnungs-ID darf nicht leer sein")
    private UUID pruefungsordnungId;
    
    /**
     * Gesamt-ECTS des Studiengangs.
     * Standard: 180 (Bachelor) oder 90 (Master)
     */
    private int ectsGesamt;
    
    /**
     * Optional: Berechnungsart überschreiben.
     * GEWICHTET = Bachelor (ECTS-gewichteter Durchschnitt)
     * ARITHMETISCH_GEMISCHT = Master (Thesis 2-fach)
     */
    private String berechnungsart;
}

