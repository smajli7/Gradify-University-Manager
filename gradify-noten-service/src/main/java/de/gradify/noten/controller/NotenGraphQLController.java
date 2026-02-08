package de.gradify.noten.controller;

import de.gradify.noten.dto.CreateNoteRequest;
import de.gradify.noten.dto.NoteDto;
import de.gradify.noten.dto.UpdateNoteRequest;
import de.gradify.noten.entity.Note;
import de.gradify.noten.repository.NoteRepository;
import de.gradify.noten.service.NotenService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * GraphQL Controller fuer Noten-Abfragen und -Mutationen.
 *
 * Alle Mutations delegieren an NotenService, damit Validierung und Events konsistent sind.
 */
@Controller
@RequiredArgsConstructor
@Slf4j
public class NotenGraphQLController {

    private final NoteRepository noteRepository;
    private final NotenService notenService;

    // ==================== QUERIES ====================

    /**
     * Holt alle Noten, optional gefiltert nach Einschreibung oder Modul.
     */
    @QueryMapping
    public List<Note> noten(@Argument("einschreibungId") String einschreibungId, @Argument("modulId") String modulId) {
        log.info("GraphQL: Fetching noten - einschreibungId: {}, modulId: {}", einschreibungId, modulId);

        if (einschreibungId != null && modulId != null) {
            return noteRepository.findByEinschreibungIdAndModulIdOrderByVersuchDesc(
                    Long.parseLong(einschreibungId), Long.parseLong(modulId));
        } else if (einschreibungId != null) {
            return noteRepository.findByEinschreibungId(Long.parseLong(einschreibungId));
        } else if (modulId != null) {
            return noteRepository.findByModulId(Long.parseLong(modulId));
        }
        return noteRepository.findAll();
    }

    /**
     * Holt eine Note nach ID.
     */
    @QueryMapping
    public Note note(@Argument("id") String id) {
        log.info("GraphQL: Fetching note by id: {}", id);
        return noteRepository.findById(Long.parseLong(id)).orElse(null);
    }

    /**
     * Holt alle Noten einer Einschreibung (Student).
     */
    @QueryMapping
    public List<Note> notenByStudent(@Argument("einschreibungId") String einschreibungId) {
        log.info("GraphQL: Fetching noten for einschreibung: {}", einschreibungId);
        return noteRepository.findByEinschreibungId(Long.parseLong(einschreibungId));
    }

    /**
     * Holt alle Noten eines Moduls.
     */
    @QueryMapping
    public List<Note> notenByModul(@Argument("modulId") String modulId) {
        log.info("GraphQL: Fetching noten for modul: {}", modulId);
        return noteRepository.findByModulId(Long.parseLong(modulId));
    }

    /**
     * Berechnet die Durchschnittsnote einer Einschreibung.
     */
    @QueryMapping
    public Double durchschnittsnote(@Argument("einschreibungId") String einschreibungId) {
        log.info("GraphQL: Calculating durchschnittsnote for: {}", einschreibungId);
        List<Note> noten = noteRepository.findByEinschreibungId(Long.parseLong(einschreibungId));

        if (noten.isEmpty()) return null;

        List<Note> benotet = noten.stream()
                .filter(n -> n.getNoteWert() != null)
                .filter(n -> Boolean.TRUE.equals(n.getBestanden()))
                .toList();

        if (benotet.isEmpty()) return null;

        double sum = benotet.stream()
                .mapToDouble(n -> n.getNoteWert().doubleValue())
                .sum();

        return Math.round((sum / benotet.size()) * 10.0) / 10.0;
    }

    /**
     * Zaehlt die bestandenen Module einer Einschreibung.
     */
    @QueryMapping
    public Integer bestandeneModule(@Argument("einschreibungId") String einschreibungId) {
        log.info("GraphQL: Counting bestandene Module for: {}", einschreibungId);
        List<Note> noten = noteRepository.findByEinschreibungId(Long.parseLong(einschreibungId));

        return (int) noten.stream()
                .filter(n -> Boolean.TRUE.equals(n.getBestanden()))
                .map(Note::getModulId)
                .distinct()
                .count();
    }

    // ==================== MUTATIONS (delegated to NotenService) ====================

    /**
     * Erstellt eine neue Note - delegiert an NotenService fuer Validierung und Events.
     */
    @MutationMapping
    public Note createNote(@Argument("input") Map<String, Object> input) {
        log.info("GraphQL: Creating note for modul: {}", input.get("modulId"));

        BigDecimal noteWert = null;
        if (input.get("noteWert") != null) {
            noteWert = new BigDecimal(input.get("noteWert").toString());
        }

        int versuch = input.get("versuch") != null ? (Integer) input.get("versuch") : 0;

        CreateNoteRequest request = CreateNoteRequest.builder()
                .einschreibungId(Long.parseLong((String) input.get("einschreibungId")))
                .modulId(Long.parseLong((String) input.get("modulId")))
                .noteWert(noteWert)
                .bestanden((Boolean) input.get("bestanden"))
                .versuch(versuch)
                .pruefungsdatum(LocalDate.parse((String) input.get("pruefungsdatum")))
                .kommentar((String) input.get("kommentar"))
                .build();

        Long erfasstVon = Long.parseLong((String) input.get("erfasstVon"));

        NoteDto dto = notenService.createNote(request, erfasstVon);
        return noteRepository.findById(dto.getId()).orElse(null);
    }

    /**
     * Aktualisiert eine Note - delegiert an NotenService.
     */
    @MutationMapping
    public Note updateNote(@Argument("id") String id, @Argument("input") Map<String, Object> input) {
        log.info("GraphQL: Updating note: {}", id);

        UpdateNoteRequest request = new UpdateNoteRequest();
        if (input.containsKey("noteWert") && input.get("noteWert") != null) {
            request.setNoteWert(new BigDecimal(input.get("noteWert").toString()));
        }
        if (input.containsKey("bestanden")) {
            request.setBestanden((Boolean) input.get("bestanden"));
        }
        if (input.containsKey("pruefungsdatum") && input.get("pruefungsdatum") != null) {
            request.setPruefungsdatum(LocalDate.parse((String) input.get("pruefungsdatum")));
        }
        if (input.containsKey("kommentar")) {
            request.setKommentar((String) input.get("kommentar"));
        }

        Long currentUserId = resolveCurrentUserId();
        notenService.updateNote(Long.parseLong(id), request, currentUserId);
        return noteRepository.findById(Long.parseLong(id)).orElse(null);
    }

    /**
     * Validiert eine Note - delegiert an NotenService.
     */
    @MutationMapping
    public Note validateNote(@Argument("id") String id, @Argument("validatorId") String validatorId) {
        log.info("GraphQL: Validating note: {} by: {}", id, validatorId);

        notenService.validateNote(Long.parseLong(id), Long.parseLong(validatorId), null);
        return noteRepository.findById(Long.parseLong(id)).orElse(null);
    }

    /**
     * Gibt eine Note frei - delegiert an NotenService.
     */
    @MutationMapping
    public Note releaseNote(@Argument("id") String id) {
        log.info("GraphQL: Releasing note: {}", id);

        Long currentUserId = resolveCurrentUserId();
        notenService.releaseNote(Long.parseLong(id), currentUserId);
        return noteRepository.findById(Long.parseLong(id)).orElse(null);
    }

    /**
     * Loescht eine Note - delegiert an NotenService.
     */
    @MutationMapping
    public Boolean deleteNote(@Argument("id") String id) {
        log.info("GraphQL: Deleting note: {}", id);
        Long currentUserId = resolveCurrentUserId();
        return notenService.deleteNote(Long.parseLong(id), currentUserId);
    }

    /**
     * Ermittelt die User-ID aus dem SecurityContext (JWT).
     */
    private Long resolveCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getPrincipal() == null || !auth.isAuthenticated()
                || "anonymousUser".equals(auth.getPrincipal())) {
            return 0L;
        }
        try {
            return Long.parseLong(auth.getPrincipal().toString());
        } catch (NumberFormatException e) {
            log.warn("Could not parse user ID from principal: {}", auth.getPrincipal());
            return 0L;
        }
    }
}
