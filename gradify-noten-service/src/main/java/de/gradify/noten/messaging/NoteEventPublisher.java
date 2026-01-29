package de.gradify.noten.messaging;

import de.gradify.noten.config.RabbitMQConfig;
import de.gradify.noten.entity.Note;
import de.gradify.shared.event.NoteEvent;
import de.gradify.shared.event.NoteEventType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;

/**
 * Publisher für Noten-Events.
 * 
 * Sendet Events an RabbitMQ, wenn Noten erstellt, geändert oder validiert werden.
 * Der Berechnungs-Service empfängt diese Events und triggert automatische Neuberechnungen.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NoteEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    /**
     * Publiziert ein Event für eine neu erstellte Note.
     */
    public void publishNoteCreated(Note note, String ausgeloestVon) {
        publishEvent(note, NoteEventType.NOTE_CREATED, RabbitMQConfig.ROUTING_KEY_NOTE_CREATED, ausgeloestVon);
    }

    /**
     * Publiziert ein Event für eine aktualisierte Note.
     */
    public void publishNoteUpdated(Note note, String ausgeloestVon) {
        publishEvent(note, NoteEventType.NOTE_UPDATED, RabbitMQConfig.ROUTING_KEY_NOTE_UPDATED, ausgeloestVon);
    }

    /**
     * Publiziert ein Event für eine validierte Note.
     */
    public void publishNoteValidated(Note note, String ausgeloestVon) {
        publishEvent(note, NoteEventType.NOTE_VALIDATED, RabbitMQConfig.ROUTING_KEY_NOTE_VALIDATED, ausgeloestVon);
    }

    /**
     * Publiziert ein Event für eine freigegebene Note.
     */
    public void publishNoteReleased(Note note, String ausgeloestVon) {
        publishEvent(note, NoteEventType.NOTE_RELEASED, RabbitMQConfig.ROUTING_KEY_NOTE_RELEASED, ausgeloestVon);
    }

    /**
     * Publiziert ein Event für eine gelöschte Note.
     */
    public void publishNoteDeleted(Note note, String ausgeloestVon) {
        publishEvent(note, NoteEventType.NOTE_DELETED, RabbitMQConfig.ROUTING_KEY_NOTE_DELETED, ausgeloestVon);
    }

    /**
     * Generische Methode zum Publizieren von Events.
     */
    private void publishEvent(Note note, NoteEventType eventType, String routingKey, String ausgeloestVon) {
        NoteEvent event = NoteEvent.builder()
                .eventType(eventType)
                .noteId(note.getId())
                .einschreibungId(note.getEinschreibungId())
                .modulId(note.getModulId())
                .noteWert(note.getNoteWert() != null ? note.getNoteWert().doubleValue() : null)
                .bestanden(note.getBestanden())
                .timestamp(Instant.now())
                .ausgeloestVon(ausgeloestVon)
                .build();

        try {
            rabbitTemplate.convertAndSend(
                    RabbitMQConfig.EXCHANGE_NAME,
                    routingKey,
                    event
            );
            
            log.info("Event publiziert: {} für Note {} (Einschreibung: {})", 
                    eventType, note.getId(), note.getEinschreibungId());
                    
        } catch (Exception e) {
            // Fehler beim Publizieren sollten die Hauptoperation nicht abbrechen
            log.error("Fehler beim Publizieren von Event {}: {}", eventType, e.getMessage());
        }
    }
}
