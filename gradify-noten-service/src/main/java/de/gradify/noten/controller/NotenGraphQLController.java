package de.gradify.noten.controller;

import de.gradify.noten.entity.Note;
import de.gradify.noten.repository.NoteRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * GraphQL Controller fuer Noten-Abfragen und -Mutationen.
 * 
 * Implementiert die Queries und Mutations aus schema.graphqls
 */
@Controller
@RequiredArgsConstructor
@Slf4j
public class NotenGraphQLController {

    private final NoteRepository noteRepository;

    // ==================== QUERIES ====================

    /**
     * Holt alle Noten, optional gefiltert nach Einschreibung oder Modul.
     * GraphQL: query { noten(einschreibungId: "...", modulId: "...") { id, noteWert, ... } }
     */
    @QueryMapping
    public List<Note> noten(@Argument String einschreibungId, @Argument String modulId) {
        log.info("GraphQL: Fetching noten - einschreibungId: {}, modulId: {}", einschreibungId, modulId);
        
        if (einschreibungId != null && modulId != null) {
            return noteRepository.findByEinschreibungIdAndModulIdOrderByVersuchDesc(
                    UUID.fromString(einschreibungId), UUID.fromString(modulId));
        } else if (einschreibungId != null) {
            return noteRepository.findByEinschreibungId(UUID.fromString(einschreibungId));
        } else if (modulId != null) {
            return noteRepository.findByModulId(UUID.fromString(modulId));
        }
        return noteRepository.findAll();
    }

    /**
     * Holt eine Note nach ID.
     * GraphQL: query { note(id: "...") { id, noteWert, ... } }
     */
    @QueryMapping
    public Note note(@Argument String id) {
        log.info("GraphQL: Fetching note by id: {}", id);
        return noteRepository.findById(UUID.fromString(id)).orElse(null);
    }

    /**
     * Holt alle Noten einer Einschreibung (Student).
     * GraphQL: query { notenByStudent(einschreibungId: "...") { ... } }
     */
    @QueryMapping
    public List<Note> notenByStudent(@Argument String einschreibungId) {
        log.info("GraphQL: Fetching noten for einschreibung: {}", einschreibungId);
        return noteRepository.findByEinschreibungId(UUID.fromString(einschreibungId));
    }

    /**
     * Holt alle Noten eines Moduls.
     * GraphQL: query { notenByModul(modulId: "...") { ... } }
     */
    @QueryMapping
    public List<Note> notenByModul(@Argument String modulId) {
        log.info("GraphQL: Fetching noten for modul: {}", modulId);
        return noteRepository.findByModulId(UUID.fromString(modulId));
    }

    /**
     * Berechnet die Durchschnittsnote einer Einschreibung.
     * GraphQL: query { durchschnittsnote(einschreibungId: "...") }
     */
    @QueryMapping
    public Double durchschnittsnote(@Argument String einschreibungId) {
        log.info("GraphQL: Calculating durchschnittsnote for: {}", einschreibungId);
        List<Note> noten = noteRepository.findByEinschreibungId(UUID.fromString(einschreibungId));
        
        if (noten.isEmpty()) {
            return null;
        }
        
        // Nur bestandene Noten mit Notenwert beruecksichtigen
        List<Note> benotet = noten.stream()
                .filter(n -> n.getNoteWert() != null)
                .filter(n -> Boolean.TRUE.equals(n.getBestanden()))
                .toList();
        
        if (benotet.isEmpty()) {
            return null;
        }
        
        double sum = benotet.stream()
                .mapToDouble(n -> n.getNoteWert().doubleValue())
                .sum();
        
        return Math.round((sum / benotet.size()) * 10.0) / 10.0; // Auf 1 Dezimalstelle runden
    }

    /**
     * Zaehlt die bestandenen Module einer Einschreibung.
     * GraphQL: query { bestandeneModule(einschreibungId: "...") }
     */
    @QueryMapping
    public Integer bestandeneModule(@Argument String einschreibungId) {
        log.info("GraphQL: Counting bestandene Module for: {}", einschreibungId);
        List<Note> noten = noteRepository.findByEinschreibungId(UUID.fromString(einschreibungId));
        
        return (int) noten.stream()
                .filter(n -> Boolean.TRUE.equals(n.getBestanden()))
                .map(Note::getModulId)
                .distinct()
                .count();
    }

    // ==================== MUTATIONS ====================

    /**
     * Erstellt eine neue Note.
     * GraphQL: mutation { createNote(input: {...}) { id, ... } }
     */
    @MutationMapping
    public Note createNote(@Argument("input") Map<String, Object> input) {
        log.info("GraphQL: Creating note for modul: {}", input.get("modulId"));
        
        // Notenwert parsen
        BigDecimal noteWert = null;
        if (input.get("noteWert") != null) {
            noteWert = new BigDecimal(input.get("noteWert").toString());
        }
        
        // Bestanden ermitteln
        Boolean bestanden = (Boolean) input.get("bestanden");
        if (bestanden == null && noteWert != null) {
            bestanden = noteWert.doubleValue() <= 4.0;
        }
        
        Note note = Note.builder()
                .einschreibungId(UUID.fromString((String) input.get("einschreibungId")))
                .modulId(UUID.fromString((String) input.get("modulId")))
                .erfasstVon(UUID.fromString((String) input.get("erfasstVon")))
                .noteWert(noteWert)
                .bestanden(bestanden)
                .versuch((Integer) input.get("versuch"))
                .pruefungsdatum(LocalDate.parse((String) input.get("pruefungsdatum")))
                .kommentar((String) input.get("kommentar"))
                .status(Note.NoteStatus.ERFASST)
                .build();
        
        return noteRepository.save(note);
    }

    /**
     * Aktualisiert eine Note.
     * GraphQL: mutation { updateNote(id: "...", input: {...}) { id, ... } }
     */
    @MutationMapping
    public Note updateNote(@Argument String id, @Argument("input") Map<String, Object> input) {
        log.info("GraphQL: Updating note: {}", id);
        
        return noteRepository.findById(UUID.fromString(id)).map(note -> {
            if (note.getStatus() != Note.NoteStatus.ERFASST) {
                throw new IllegalStateException("Note kann nur im Status ERFASST bearbeitet werden");
            }
            
            if (input.containsKey("noteWert") && input.get("noteWert") != null) {
                note.setNoteWert(new BigDecimal(input.get("noteWert").toString()));
            }
            if (input.containsKey("bestanden")) {
                note.setBestanden((Boolean) input.get("bestanden"));
            }
            if (input.containsKey("versuch")) {
                note.setVersuch((Integer) input.get("versuch"));
            }
            if (input.containsKey("pruefungsdatum") && input.get("pruefungsdatum") != null) {
                note.setPruefungsdatum(LocalDate.parse((String) input.get("pruefungsdatum")));
            }
            if (input.containsKey("kommentar")) {
                note.setKommentar((String) input.get("kommentar"));
            }
            
            return noteRepository.save(note);
        }).orElseThrow(() -> new IllegalArgumentException("Note not found: " + id));
    }

    /**
     * Validiert eine Note (Pruefungsamt).
     * GraphQL: mutation { validateNote(id: "...", validatorId: "...") { id, status } }
     */
    @MutationMapping
    public Note validateNote(@Argument String id, @Argument String validatorId) {
        log.info("GraphQL: Validating note: {} by: {}", id, validatorId);
        
        return noteRepository.findById(UUID.fromString(id)).map(note -> {
            if (note.getStatus() != Note.NoteStatus.ERFASST) {
                throw new IllegalStateException("Nur ERFASST-Noten koennen validiert werden");
            }
            
            note.setStatus(Note.NoteStatus.VALIDIERT);
            note.setValidiertVon(UUID.fromString(validatorId));
            note.setValidiertAm(LocalDateTime.now());
            
            return noteRepository.save(note);
        }).orElseThrow(() -> new IllegalArgumentException("Note not found: " + id));
    }

    /**
     * Gibt eine Note frei (fuer Student sichtbar).
     * GraphQL: mutation { releaseNote(id: "...") { id, status } }
     */
    @MutationMapping
    public Note releaseNote(@Argument String id) {
        log.info("GraphQL: Releasing note: {}", id);
        
        return noteRepository.findById(UUID.fromString(id)).map(note -> {
            if (note.getStatus() != Note.NoteStatus.VALIDIERT) {
                throw new IllegalStateException("Nur VALIDIERT-Noten koennen freigegeben werden");
            }
            
            note.setStatus(Note.NoteStatus.FREIGEGEBEN);
            return noteRepository.save(note);
        }).orElseThrow(() -> new IllegalArgumentException("Note not found: " + id));
    }

    /**
     * Loescht eine Note.
     * GraphQL: mutation { deleteNote(id: "...") }
     */
    @MutationMapping
    public Boolean deleteNote(@Argument String id) {
        log.info("GraphQL: Deleting note: {}", id);
        
        return noteRepository.findById(UUID.fromString(id)).map(note -> {
            if (note.getStatus() != Note.NoteStatus.ERFASST) {
                throw new IllegalStateException("Nur ERFASST-Noten koennen geloescht werden");
            }
            noteRepository.delete(note);
            return true;
        }).orElse(false);
    }
}

