package de.gradify.shared.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.Instant;

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
    private Long noteId;
    
    /**
     * ID der Einschreibung (Student + Studiengang)
     */
    private Long einschreibungId;
    
    /**
     * ID des Moduls
     */
    private Long modulId;
    
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
    
    /**
     * Mandant-ID für DB-per-Tenant-Routing
     */
    private Long mandantId;
}
