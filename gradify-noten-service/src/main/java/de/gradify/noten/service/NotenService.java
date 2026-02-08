package de.gradify.noten.service;

import de.gradify.noten.dto.AuditEintragDto;
import de.gradify.noten.dto.CreateNoteRequest;
import de.gradify.noten.dto.NoteDto;
import de.gradify.noten.dto.NotenStatsDto;
import de.gradify.noten.dto.UpdateNoteRequest;
import de.gradify.noten.entity.Note;
import de.gradify.noten.entity.NotenHistorie;
import de.gradify.noten.messaging.NoteEventPublisher;
import de.gradify.noten.repository.NoteRepository;
import de.gradify.noten.repository.NotenHistorieRepository;
import de.gradify.noten.validation.NoteValidator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
// PageRequest entfernt – native Queries verwenden LIMIT direkt
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotenService {

    private final NoteRepository noteRepository;
    private final NotenHistorieRepository notenHistorieRepository;
    private final NoteValidator noteValidator;
    private final NoteEventPublisher eventPublisher;

    /**
     * Holt alle Noten, optional gefiltert.
     */
    @Transactional(readOnly = true)
    public List<NoteDto> getNoten(Long einschreibungId, Long modulId, Note.NoteStatus status) {
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
    public Optional<NoteDto> getNoteById(Long id) {
        return noteRepository.findById(id).map(this::toDto);
    }

    /**
     * Holt alle Noten einer Einschreibung.
     */
    @Transactional(readOnly = true)
    public List<NoteDto> getNotenByEinschreibung(Long einschreibungId) {
        return noteRepository.findByEinschreibungId(einschreibungId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Holt alle Noten eines Moduls.
     */
    @Transactional(readOnly = true)
    public List<NoteDto> getNotenByModul(Long modulId) {
        return noteRepository.findByModulId(modulId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Erstellt eine neue Note.
     */
    @Transactional
    public NoteDto createNote(CreateNoteRequest request, Long erfasstVon) {
        log.info("Creating note for einschreibung: {}, modul: {}", 
                request.getEinschreibungId(), request.getModulId());

        // Validierung durchführen
        List<String> errors = noteValidator.validateCreate(request);
        if (!errors.isEmpty()) {
            throw new IllegalArgumentException(String.join("; ", errors));
        }

        // Versuch ermitteln falls nicht angegeben
        int versuch = request.getVersuch();
        if (versuch <= 0) {
            Integer maxVersuch = noteRepository.findMaxVersuch(
                    request.getEinschreibungId(), request.getModulId());
            versuch = (maxVersuch != null ? maxVersuch : 0) + 1;
        }

        // Bestanden-Status berechnen: 5.0 ist IMMER nicht bestanden (PO-Regel)
        Boolean bestanden = request.getBestanden();
        if (request.getNoteWert() != null && request.getNoteWert().doubleValue() >= 5.0) {
            bestanden = false; // 5.0 kann nie bestanden sein
        } else if (bestanden == null && request.getNoteWert() != null) {
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

        saveHistorie(note.getId(), note.getEinschreibungId(), note.getModulId(), erfasstVon != null ? erfasstVon : 0L,
                NotenHistorie.AenderungsTyp.ERSTELLT, null, note.getNoteWert(), request.getKommentar());

        // Event an Message Queue senden für automatische Neuberechnung
        eventPublisher.publishNoteCreated(note, erfasstVon != null ? erfasstVon.toString() : "system");

        return toDto(note);
    }

    /**
     * Aktualisiert eine bestehende Note.
     */
    @Transactional
    public Optional<NoteDto> updateNote(Long id, UpdateNoteRequest request, Long geaendertVon) {
        return noteRepository.findById(id).map(note -> {
            // Alle Status erlaubt (Prüfungsamt/Admin dürfen auch validierte/freigegebene Noten korrigieren).
            // Die Zugriffskontrolle erfolgt über SecurityConfig + @PreAuthorize im Controller.
            log.info("Editing note {} in status {} by user {}", id, note.getStatus(), geaendertVon);

            BigDecimal alterWert = note.getNoteWert();

            // Notenwert validieren
            if (request.getNoteWert() != null) {
                if (!noteValidator.isValidNoteWert(request.getNoteWert())) {
                    throw new IllegalArgumentException(
                            "Ungültiger Notenwert. Erlaubt: 1.0, 1.3, 1.7, 2.0, 2.3, 2.7, 3.0, 3.3, 3.7, 4.0, 5.0");
                }
                note.setNoteWert(request.getNoteWert());
                // Bestanden-Status ableiten: 5.0 ist IMMER nicht bestanden (PO-Regel)
                if (request.getNoteWert().doubleValue() >= 5.0) {
                    note.setBestanden(false);
                } else if (request.getBestanden() == null) {
                    note.setBestanden(request.getNoteWert().doubleValue() <= 4.0);
                } else {
                    note.setBestanden(request.getBestanden());
                }
            } else if (request.getBestanden() != null) {
                // Nur bestanden-Flag ändern ohne Note: prüfe Konsistenz
                if (request.getBestanden() && note.getNoteWert() != null && note.getNoteWert().doubleValue() >= 5.0) {
                    note.setBestanden(false); // 5.0 kann nicht bestanden sein
                    log.warn("Versuch bestanden=true zu setzen bei Note 5.0 – automatisch auf false korrigiert (Note {})", id);
                } else {
                    note.setBestanden(request.getBestanden());
                }
            }
            if (request.getPruefungsdatum() != null) {
                note.setPruefungsdatum(request.getPruefungsdatum());
            }
            if (request.getKommentar() != null) {
                note.setKommentar(request.getKommentar());
            }

            note = noteRepository.save(note);
            log.info("Note updated: {}", id);

            saveHistorie(note.getId(), note.getEinschreibungId(), note.getModulId(), geaendertVon != null ? geaendertVon : 0L,
                    NotenHistorie.AenderungsTyp.NOTE_GEAENDERT, alterWert, note.getNoteWert(), request.getKommentar());

            // Event an Message Queue senden für automatische Neuberechnung
            eventPublisher.publishNoteUpdated(note, "system");

            return toDto(note);
        });
    }

    /**
     * Validiert eine Note (Prüfungsamt).
     */
    @Transactional
    public Optional<NoteDto> validateNote(Long id, Long validiertVon, String kommentar) {
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

            saveHistorie(note.getId(), note.getEinschreibungId(), note.getModulId(), validiertVon != null ? validiertVon : 0L,
                    NotenHistorie.AenderungsTyp.VALIDIERT, null, note.getNoteWert(), kommentar);

            // Event an Message Queue senden
            eventPublisher.publishNoteValidated(note, validiertVon != null ? validiertVon.toString() : "system");

            return toDto(note);
        });
    }

    /**
     * Gibt eine Note frei (Studiengangleitung / Prüfungsamt).
     */
    @Transactional
    public Optional<NoteDto> releaseNote(Long id, Long releasedBy) {
        return noteRepository.findById(id).map(note -> {
            if (note.getStatus() != Note.NoteStatus.VALIDIERT) {
                throw new IllegalStateException("Nur VALIDIERT-Noten können freigegeben werden");
            }

            note.setStatus(Note.NoteStatus.FREIGEGEBEN);
            note = noteRepository.save(note);
            log.info("Note released: {}", id);

            saveHistorie(note.getId(), note.getEinschreibungId(), note.getModulId(), releasedBy != null ? releasedBy : 0L,
                    NotenHistorie.AenderungsTyp.FREIGEGEBEN, null, note.getNoteWert(), null);

            // Event an Message Queue senden
            eventPublisher.publishNoteReleased(note, "system");

            return toDto(note);
        });
    }

    /**
     * Freigabe zurücknehmen (Zurückweisen) – nur bei bereits freigegebenen Noten.
     * Setzt Status auf VALIDIERT zurück (kann danach erneut freigegeben werden).
     */
    @Transactional
    public Optional<NoteDto> rejectNote(Long id, Long rejectedBy, String kommentar) {
        return noteRepository.findById(id).map(note -> {
            if (note.getStatus() != Note.NoteStatus.FREIGEGEBEN) {
                throw new IllegalStateException("Nur FREIGEGEBENE Noten können zurückgewiesen werden");
            }

            note.setStatus(Note.NoteStatus.VALIDIERT);
            note = noteRepository.save(note);
            log.info("Note release rejected (zurückgewiesen): {}", id);

            saveHistorie(note.getId(), note.getEinschreibungId(), note.getModulId(), rejectedBy != null ? rejectedBy : 0L,
                    NotenHistorie.AenderungsTyp.FREIGABE_ZURUECKGENOMMEN, null, note.getNoteWert(), kommentar);

            return toDto(note);
        });
    }

    /**
     * Löscht eine Note (nur im Status ERFASST).
     */
    @Transactional
    public boolean deleteNote(Long id, Long geloeschtVon) {
        return noteRepository.findById(id).map(note -> {
            if (note.getStatus() != Note.NoteStatus.ERFASST) {
                throw new IllegalStateException("Nur ERFASST-Noten können gelöscht werden");
            }

            saveHistorie(note.getId(), note.getEinschreibungId(), note.getModulId(), geloeschtVon != null ? geloeschtVon : 0L,
                    NotenHistorie.AenderungsTyp.STORNIERT, note.getNoteWert(), null, "Note gelöscht");

            // Event VOR dem Löschen senden (damit die Daten noch verfügbar sind)
            eventPublisher.publishNoteDeleted(note, "system");

            noteRepository.delete(note);
            log.info("Note deleted: {}", id);
            return true;
        }).orElse(false);
    }

    /**
     * Audit-Einträge abrufen (Protokoll) – uneingeschränkt (PA/ADMIN/HV).
     * Sieht alle Einträge im aktuellen Tenant (Hochschule), optional gefiltert.
     */
    @Transactional(readOnly = true)
    public List<AuditEintragDto> getAuditEintraege(Long noteId, Long einschreibungId, Long modulId,
                                                    LocalDateTime vonDatum, LocalDateTime bisDatum,
                                                    NotenHistorie.AenderungsTyp aenderungsTyp, Long benutzerId,
                                                    int limit) {
        if (limit <= 0 || limit > 1000) {
            limit = 500;
        }
        // Enum → String, da PostgreSQL bei null-Enum-Parametern den Typ nicht inferieren kann
        String typStr = aenderungsTyp != null ? aenderungsTyp.name() : null;
        List<NotenHistorie> list = notenHistorieRepository.findAuditEintraege(
                noteId, einschreibungId, modulId, vonDatum, bisDatum, typStr, benutzerId, limit);
        return list.stream().map(this::toAuditDto).collect(Collectors.toList());
    }

    /**
     * Audit-Einträge abrufen – eingeschränkt auf bestimmte Modul-IDs (Dozent).
     * Sieht nur Einträge zu Modulen, die ihm zugewiesen sind.
     */
    @Transactional(readOnly = true)
    public List<AuditEintragDto> getAuditEintraegeForModulIds(List<Long> allowedModulIds, Long noteId,
                                                               Long einschreibungId,
                                                               LocalDateTime vonDatum, LocalDateTime bisDatum,
                                                               NotenHistorie.AenderungsTyp aenderungsTyp,
                                                               int limit) {
        if (allowedModulIds == null || allowedModulIds.isEmpty()) {
            return List.of();
        }
        if (limit <= 0 || limit > 1000) {
            limit = 500;
        }
        String typStr = aenderungsTyp != null ? aenderungsTyp.name() : null;
        List<NotenHistorie> list = notenHistorieRepository.findAuditEintraegeByModulIds(
                allowedModulIds, noteId, einschreibungId, vonDatum, bisDatum, typStr, limit);
        return list.stream().map(this::toAuditDto).collect(Collectors.toList());
    }

    private AuditEintragDto toAuditDto(NotenHistorie h) {
        return AuditEintragDto.builder()
                .id(h.getId())
                .noteId(h.getNoteId())
                .einschreibungId(h.getEinschreibungId())
                .modulId(h.getModulId())
                .geaendertVon(h.getGeaendertVon())
                .aenderungsTyp(h.getAenderungsTyp().name())
                .alterWert(h.getAlterWert())
                .neuerWert(h.getNeuerWert())
                .kommentar(h.getKommentar())
                .geaendertAm(h.getGeaendertAm())
                .build();
    }

    /**
     * Aggregierte Statistik für Noten, optional gefiltert nach Modul-IDs (z. B. Dozenten-Module).
     */
    @Transactional(readOnly = true)
    public NotenStatsDto getStatsForModule(List<Long> modulIds) {
        List<Note> noten;
        if (modulIds == null || modulIds.isEmpty()) {
            noten = noteRepository.findAll();
        } else {
            noten = noteRepository.findByModulIdIn(modulIds);
        }
        long erfasst = noten.stream().filter(n -> n.getStatus() == Note.NoteStatus.ERFASST).count();
        long validiert = noten.stream().filter(n -> n.getStatus() == Note.NoteStatus.VALIDIERT).count();
        long freigegeben = noten.stream().filter(n -> n.getStatus() == Note.NoteStatus.FREIGEGEBEN).count();
        return NotenStatsDto.builder()
                .total(noten.size())
                .erfasst(erfasst)
                .validiert(validiert)
                .freigegeben(freigegeben)
                .build();
    }

    private void saveHistorie(Long noteId, Long einschreibungId, Long modulId, Long geaendertVon,
                              NotenHistorie.AenderungsTyp typ, BigDecimal alterWert, BigDecimal neuerWert, String kommentar) {
        NotenHistorie h = NotenHistorie.builder()
                .noteId(noteId)
                .einschreibungId(einschreibungId)
                .modulId(modulId)
                .geaendertVon(geaendertVon)
                .aenderungsTyp(typ)
                .alterWert(alterWert)
                .neuerWert(neuerWert)
                .kommentar(kommentar != null && kommentar.length() > 500 ? kommentar.substring(0, 500) : kommentar)
                .build();
        notenHistorieRepository.save(h);
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

