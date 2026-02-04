package de.gradify.berechnung.messaging;

import de.gradify.berechnung.config.RabbitMQConfig;
import de.gradify.berechnung.service.BerechnungsService;
import de.gradify.shared.event.NoteEvent;
import de.gradify.shared.tenant.TenantContext;
import de.gradify.shared.tenant.TenantSuffixResolver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

/**
 * Consumer für Noten-Events.
 * 
 * Empfängt Events aus der Message Queue und triggert automatische Neuberechnungen.
 * 
 * Ablauf:
 * 1. Noten-Service erstellt/ändert Note
 * 2. Noten-Service sendet Event an RabbitMQ
 * 3. Dieser Consumer empfängt das Event
 * 4. BerechnungsService berechnet Gesamtnote neu
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class NoteEventConsumer {

    private final BerechnungsService berechnungsService;
    private final TenantSuffixResolver tenantSuffixResolver;

    /**
     * Listener für alle Noten-Events.
     * 
     * Wird automatisch aufgerufen, wenn eine Nachricht in der Queue landet.
     */
    @RabbitListener(queues = RabbitMQConfig.QUEUE_BERECHNUNG)
    public void handleNoteEvent(NoteEvent event) {
        log.info("Event empfangen: {} für Einschreibung {} (Note: {})", 
                event.getEventType(), 
                event.getEinschreibungId(),
                event.getNoteId());

        try {
            switch (event.getEventType()) {
                case NOTE_CREATED:
                case NOTE_UPDATED:
                case NOTE_VALIDATED:
                case NOTE_RELEASED:
                    // Bei all diesen Events: Neuberechnung triggern
                    triggerNeuberechnung(event);
                    break;
                    
                case NOTE_DELETED:
                    // Bei Löschung ebenfalls neu berechnen
                    log.info("Note {} wurde gelöscht, triggere Neuberechnung", event.getNoteId());
                    triggerNeuberechnung(event);
                    break;
                    
                default:
                    log.warn("Unbekannter Event-Typ: {}", event.getEventType());
            }
        } catch (Exception e) {
            log.error("Fehler bei Verarbeitung von Event {}: {}", 
                    event.getEventType(), e.getMessage(), e);
            // Exception wird geworfen, damit RabbitMQ die Message erneut versucht
            throw e;
        }
    }

    /**
     * Triggert eine automatische Neuberechnung der Gesamtnote.
     */
    private void triggerNeuberechnung(NoteEvent event) {
        if (event.getEinschreibungId() == null) {
            log.warn("Keine Einschreibungs-ID im Event, überspringe Neuberechnung");
            return;
        }
        if (tenantSuffixResolver != null && event.getMandantId() != null) {
            String suffix = tenantSuffixResolver.resolve(event.getMandantId());
            if (suffix != null) {
                TenantContext.setTenantSuffix(suffix);
            }
        }
        try {
            var ergebnis = berechnungsService.berechneGesamtnote(
                    event.getEinschreibungId()
            );
            
            log.info("Neuberechnung abgeschlossen: Gesamtnote = {}, Module bestanden = {}/{}", 
                    ergebnis.getGesamtnote(),
                    ergebnis.getModuleBestanden(),
                    ergebnis.getModuleGesamt());
                    
        } catch (Exception e) {
            log.error("Fehler bei Neuberechnung für Einschreibung {}: {}", 
                    event.getEinschreibungId(), e.getMessage());
        } finally {
            TenantContext.clear();
        }
    }
}
