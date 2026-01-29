package de.gradify.shared.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

/**
 * Event, das bei Notenänderungen über die Message Queue gesendet wird.
 * 
 * Wird vom Noten-Service publiziert und vom Berechnungs-Service konsumiert.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NoteEvent implements Serializable {
    
    private static final long serialVersionUID = 1L;
    
    /**
     * Art des Events
     */
    private NoteEventType eventType;
    
    /**
     * ID der Note
     */
    private UUID noteId;
    
    /**
     * ID der Einschreibung (Student + Studiengang)
     */
    private UUID einschreibungId;
    
    /**
     * ID des Moduls
     */
    private UUID modulId;
    
    /**
     * Notenwert (1.0 - 5.0)
     */
    private Double noteWert;
    
    /**
     * Ob die Note bestanden ist
     */
    private Boolean bestanden;
    
    /**
     * Zeitpunkt des Events
     */
    private Instant timestamp;
    
    /**
     * Benutzer, der die Änderung durchgeführt hat
     */
    private String ausgeloestVon;
}
