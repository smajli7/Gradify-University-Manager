package de.gradify.noten.service;

import de.gradify.noten.dto.CreateNoteRequest;
import de.gradify.noten.dto.NoteDto;
import de.gradify.noten.dto.UpdateNoteRequest;
import de.gradify.noten.entity.Note;
import de.gradify.noten.repository.NoteRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotenService {

    private final NoteRepository noteRepository;

    /**
     * Holt alle Noten, optional gefiltert.
     */
    @Transactional(readOnly = true)
    public List<NoteDto> getNoten(UUID einschreibungId, UUID modulId, Note.NoteStatus status) {
        List<Note> noten;
        
        if (einschreibungId != null && modulId != null) {
            noten = noteRepository.findByEinschreibungIdAndModulIdOrderByVersuchDesc(einschreibungId, modulId);
        } else if (einschreibungId != null) {
            noten = noteRepository.findByEinschreibungId(einschreibungId);
        } else if (modulId != null) {
            noten = noteRepository.findByModulId(modulId);
        } else if (status != null) {
            noten = noteRepository.findByStatus(status);
        } else {
            noten = noteRepository.findAll();
        }
        
        return noten.stream().map(this::toDto).collect(Collectors.toList());
    }

    /**
     * Holt eine Note nach ID.
     */
    @Transactional(readOnly = true)
    public Optional<NoteDto> getNoteById(UUID id) {
        return noteRepository.findById(id).map(this::toDto);
    }

    /**
     * Holt alle Noten einer Einschreibung.
     */
    @Transactional(readOnly = true)
    public List<NoteDto> getNotenByEinschreibung(UUID einschreibungId) {
        return noteRepository.findByEinschreibungId(einschreibungId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Holt alle Noten eines Moduls.
     */
    @Transactional(readOnly = true)
    public List<NoteDto> getNotenByModul(UUID modulId) {
        return noteRepository.findByModulId(modulId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Erstellt eine neue Note.
     */
    @Transactional
    public NoteDto createNote(CreateNoteRequest request, UUID erfasstVon) {
        log.info("Creating note for einschreibung: {}, modul: {}", 
                request.getEinschreibungId(), request.getModulId());

        // Versuch ermitteln falls nicht angegeben
        int versuch = request.getVersuch();
        if (versuch <= 0) {
            Integer maxVersuch = noteRepository.findMaxVersuch(
                    request.getEinschreibungId(), request.getModulId());
            versuch = (maxVersuch != null ? maxVersuch : 0) + 1;
        }

        // Bestanden-Status berechnen falls nicht angegeben
        Boolean bestanden = request.getBestanden();
        if (bestanden == null && request.getNoteWert() != null) {
            bestanden = request.getNoteWert().doubleValue() <= 4.0;
        }

        Note note = Note.builder()
                .einschreibungId(request.getEinschreibungId())
                .modulId(request.getModulId())
                .erfasstVon(erfasstVon)
                .noteWert(request.getNoteWert())
                .bestanden(bestanden)
                .versuch(versuch)
                .pruefungsdatum(request.getPruefungsdatum())
                .kommentar(request.getKommentar())
                .status(Note.NoteStatus.ERFASST)
                .build();

        note = noteRepository.save(note);
        log.info("Note created with id: {}", note.getId());

        return toDto(note);
    }

    /**
     * Aktualisiert eine bestehende Note.
     */
    @Transactional
    public Optional<NoteDto> updateNote(UUID id, UpdateNoteRequest request) {
        return noteRepository.findById(id).map(note -> {
            // Nur ERFASST-Noten können bearbeitet werden
            if (note.getStatus() != Note.NoteStatus.ERFASST) {
                throw new IllegalStateException("Note kann nur im Status ERFASST bearbeitet werden");
            }

            if (request.getNoteWert() != null) {
                note.setNoteWert(request.getNoteWert());
                // Bestanden-Status neu berechnen
                if (request.getBestanden() == null) {
                    note.setBestanden(request.getNoteWert().doubleValue() <= 4.0);
                }
            }
            if (request.getBestanden() != null) {
                note.setBestanden(request.getBestanden());
            }
            if (request.getPruefungsdatum() != null) {
                note.setPruefungsdatum(request.getPruefungsdatum());
            }
            if (request.getKommentar() != null) {
                note.setKommentar(request.getKommentar());
            }

            note = noteRepository.save(note);
            log.info("Note updated: {}", id);
            
            return toDto(note);
        });
    }

    /**
     * Validiert eine Note (Prüfungsamt).
     */
    @Transactional
    public Optional<NoteDto> validateNote(UUID id, UUID validiertVon, String kommentar) {
        return noteRepository.findById(id).map(note -> {
            if (note.getStatus() != Note.NoteStatus.ERFASST) {
                throw new IllegalStateException("Nur ERFASST-Noten können validiert werden");
            }

            note.setStatus(Note.NoteStatus.VALIDIERT);
            note.setValidiertVon(validiertVon);
            note.setValidiertAm(LocalDateTime.now());
            
            if (kommentar != null && !kommentar.isBlank()) {
                String existingComment = note.getKommentar();
                note.setKommentar(existingComment != null 
                        ? existingComment + " | Validierung: " + kommentar 
                        : "Validierung: " + kommentar);
            }

            note = noteRepository.save(note);
            log.info("Note validated: {}", id);
            
            return toDto(note);
        });
    }

    /**
     * Gibt eine Note frei (Studiengangleitung).
     */
    @Transactional
    public Optional<NoteDto> releaseNote(UUID id) {
        return noteRepository.findById(id).map(note -> {
            if (note.getStatus() != Note.NoteStatus.VALIDIERT) {
                throw new IllegalStateException("Nur VALIDIERT-Noten können freigegeben werden");
            }

            note.setStatus(Note.NoteStatus.FREIGEGEBEN);
            note = noteRepository.save(note);
            log.info("Note released: {}", id);
            
            return toDto(note);
        });
    }

    /**
     * Löscht eine Note (nur im Status ERFASST).
     */
    @Transactional
    public boolean deleteNote(UUID id) {
        return noteRepository.findById(id).map(note -> {
            if (note.getStatus() != Note.NoteStatus.ERFASST) {
                throw new IllegalStateException("Nur ERFASST-Noten können gelöscht werden");
            }
            noteRepository.delete(note);
            log.info("Note deleted: {}", id);
            return true;
        }).orElse(false);
    }

    /**
     * Konvertiert Note Entity zu DTO.
     */
    private NoteDto toDto(Note note) {
        return NoteDto.builder()
                .id(note.getId())
                .einschreibungId(note.getEinschreibungId())
                .modulId(note.getModulId())
                .noteWert(note.getNoteWert())
                .bestanden(note.getBestanden())
                .versuch(note.getVersuch())
                .pruefungsdatum(note.getPruefungsdatum())
                .status(note.getStatus().name())
                .kommentar(note.getKommentar())
                .erfasstVon(note.getErfasstVon())
                .erfasstAm(note.getErfasstAm())
                .validiertVon(note.getValidiertVon())
                .validiertAm(note.getValidiertAm())
                .build();
    }
}

