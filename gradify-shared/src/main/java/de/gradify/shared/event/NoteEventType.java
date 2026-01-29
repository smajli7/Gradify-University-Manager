package de.gradify.shared.event;

/**
 * Typen von Noten-Events für die Message Queue.
 */
public enum NoteEventType {
    
    /**
     * Neue Note wurde erfasst
     */
    NOTE_CREATED,
    
    /**
     * Note wurde aktualisiert
     */
    NOTE_UPDATED,
    
    /**
     * Note wurde validiert (vom Prüfungsamt bestätigt)
     */
    NOTE_VALIDATED,
    
    /**
     * Note wurde freigegeben (für Studenten sichtbar)
     */
    NOTE_RELEASED,
    
    /**
     * Note wurde gelöscht
     */
    NOTE_DELETED
}
