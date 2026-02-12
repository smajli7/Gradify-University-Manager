package de.gradify.noten.service;

import de.gradify.noten.dto.CreateNoteRequest;
import de.gradify.noten.dto.NoteDto;
import de.gradify.noten.dto.UpdateNoteRequest;
import de.gradify.noten.entity.Note;
import de.gradify.noten.entity.NotenHistorie;
import de.gradify.noten.messaging.NoteEventPublisher;
import de.gradify.noten.repository.NoteRepository;
import de.gradify.noten.repository.NotenHistorieRepository;
import de.gradify.noten.validation.NoteValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit-Tests fuer NotenService.
 * Testet Notenerfassung, Validierung, Statusuebergaenge.
 */
@ExtendWith(MockitoExtension.class)
class NotenServiceTest {

    @Mock
    private NoteRepository noteRepository;

    @Mock
    private NotenHistorieRepository notenHistorieRepository;

    @Mock
    private NoteValidator noteValidator;

    @Mock
    private NoteEventPublisher eventPublisher;

    @InjectMocks
    private NotenService notenService;

    @Captor
    private ArgumentCaptor<Note> noteCaptor;

    @Captor
    private ArgumentCaptor<NotenHistorie> historieCaptor;

    @Nested
    @DisplayName("createNote")
    class CreateNote {

        @Test
        @DisplayName("Erstellt Note mit korrektem Notenwert")
        void erstelltNoteMitKorrektemNotenwert() {
            // Given
            CreateNoteRequest request = CreateNoteRequest.builder()
                .einschreibungId(1L)
                .modulId(10L)
                .noteWert(new BigDecimal("2.3"))
                .pruefungsdatum(LocalDate.now())
                .build();

            when(noteValidator.validateCreate(any())).thenReturn(Collections.emptyList());
            when(noteRepository.findMaxVersuch(1L, 10L)).thenReturn(null);
            when(noteRepository.save(any())).thenAnswer(inv -> {
                Note n = inv.getArgument(0);
                n.setId(42L);
                n.setErfasstAm(LocalDateTime.now());
                return n;
            });

            // When
            NoteDto result = notenService.createNote(request, 99L);

            // Then
            verify(noteRepository).save(noteCaptor.capture());
            Note gespeichert = noteCaptor.getValue();
            
            assertThat(gespeichert.getNoteWert()).isEqualByComparingTo("2.3");
            assertThat(gespeichert.getBestanden()).isTrue();
            assertThat(gespeichert.getVersuch()).isEqualTo(1);
            assertThat(gespeichert.getStatus()).isEqualTo(Note.NoteStatus.ERFASST);
            
            verify(eventPublisher).publishNoteCreated(any(), eq("99"));
        }

        @Test
        @DisplayName("Note 5.0 ist IMMER nicht bestanden")
        void note5IstNichtBestanden() {
            // Given
            CreateNoteRequest request = CreateNoteRequest.builder()
                .einschreibungId(1L)
                .modulId(10L)
                .noteWert(new BigDecimal("5.0"))
                .bestanden(true) // Explizit true gesetzt - sollte ignoriert werden
                .build();

            when(noteValidator.validateCreate(any())).thenReturn(Collections.emptyList());
            when(noteRepository.findMaxVersuch(1L, 10L)).thenReturn(null);
            when(noteRepository.save(any())).thenAnswer(inv -> {
                Note n = inv.getArgument(0);
                n.setId(1L);
                return n;
            });

            // When
            notenService.createNote(request, 1L);

            // Then
            verify(noteRepository).save(noteCaptor.capture());
            Note gespeichert = noteCaptor.getValue();
            
            assertThat(gespeichert.getBestanden()).isFalse(); // MUSS false sein
        }

        @Test
        @DisplayName("Versuch wird automatisch inkrementiert")
        void versuchWirdInkrementiert() {
            // Given
            CreateNoteRequest request = CreateNoteRequest.builder()
                .einschreibungId(1L)
                .modulId(10L)
                .noteWert(new BigDecimal("4.0"))
                .versuch(0) // Auto-Berechnung
                .build();

            when(noteValidator.validateCreate(any())).thenReturn(Collections.emptyList());
            when(noteRepository.findMaxVersuch(1L, 10L)).thenReturn(2); // 2 Versuche existieren
            when(noteRepository.save(any())).thenAnswer(inv -> {
                Note n = inv.getArgument(0);
                n.setId(1L);
                return n;
            });

            // When
            notenService.createNote(request, 1L);

            // Then
            verify(noteRepository).save(noteCaptor.capture());
            assertThat(noteCaptor.getValue().getVersuch()).isEqualTo(3);
        }

        @Test
        @DisplayName("Wirft Exception bei Validierungsfehlern")
        void wirftExceptionBeiValidierungsfehler() {
            // Given
            CreateNoteRequest request = CreateNoteRequest.builder()
                .einschreibungId(1L)
                .modulId(10L)
                .noteWert(new BigDecimal("6.0"))
                .build();

            when(noteValidator.validateCreate(any()))
                .thenReturn(List.of("Note darf maximal 5.0 sein"));

            // When / Then
            assertThatThrownBy(() -> notenService.createNote(request, 1L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Note darf maximal 5.0 sein");
        }
    }

    @Nested
    @DisplayName("updateNote")
    class UpdateNote {

        @Test
        @DisplayName("Aktualisiert Notenwert und berechnet bestanden")
        void aktualisiertNotenwert() {
            // Given
            Note bestehendeNote = Note.builder()
                .id(42L)
                .einschreibungId(1L)
                .modulId(10L)
                .noteWert(new BigDecimal("3.0"))
                .bestanden(true)
                .status(Note.NoteStatus.ERFASST)
                .build();

            UpdateNoteRequest request = UpdateNoteRequest.builder()
                .noteWert(new BigDecimal("2.0"))
                .build();

            when(noteRepository.findById(42L)).thenReturn(Optional.of(bestehendeNote));
            when(noteValidator.isValidNoteWert(new BigDecimal("2.0"))).thenReturn(true);
            when(noteRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            // When
            Optional<NoteDto> result = notenService.updateNote(42L, request, 99L);

            // Then
            assertThat(result).isPresent();
            assertThat(result.get().getNoteWert()).isEqualByComparingTo("2.0");
            assertThat(result.get().getBestanden()).isTrue();
            
            verify(notenHistorieRepository).save(any());
            verify(eventPublisher).publishNoteUpdated(any(), anyString());
        }

        @Test
        @DisplayName("Note 5.0 Update setzt bestanden auf false")
        void noteUpdate5SiztBestandenFalse() {
            // Given
            Note bestehendeNote = Note.builder()
                .id(42L)
                .einschreibungId(1L)
                .modulId(10L)
                .noteWert(new BigDecimal("2.0"))
                .bestanden(true)
                .status(Note.NoteStatus.ERFASST)
                .build();

            UpdateNoteRequest request = UpdateNoteRequest.builder()
                .noteWert(new BigDecimal("5.0"))
                .bestanden(true) // Sollte ignoriert werden
                .build();

            when(noteRepository.findById(42L)).thenReturn(Optional.of(bestehendeNote));
            when(noteValidator.isValidNoteWert(new BigDecimal("5.0"))).thenReturn(true);
            when(noteRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            // When
            Optional<NoteDto> result = notenService.updateNote(42L, request, 99L);

            // Then
            assertThat(result).isPresent();
            assertThat(result.get().getBestanden()).isFalse();
        }

        @Test
        @DisplayName("Ungültiger Notenwert wirft Exception")
        void ungueltigerNotenwertWirftException() {
            // Given
            Note bestehendeNote = Note.builder()
                .id(42L)
                .status(Note.NoteStatus.ERFASST)
                .build();

            UpdateNoteRequest request = UpdateNoteRequest.builder()
                .noteWert(new BigDecimal("2.5")) // Ungültig
                .build();

            when(noteRepository.findById(42L)).thenReturn(Optional.of(bestehendeNote));
            when(noteValidator.isValidNoteWert(new BigDecimal("2.5"))).thenReturn(false);

            // When / Then
            assertThatThrownBy(() -> notenService.updateNote(42L, request, 1L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Ungültiger Notenwert");
        }
    }

    @Nested
    @DisplayName("validateNote / releaseNote")
    class StatusWorkflow {

        @Test
        @DisplayName("Validiert ERFASST-Note erfolgreich")
        void validiertErfassteNote() {
            // Given
            Note erfassteNote = Note.builder()
                .id(42L)
                .einschreibungId(1L)
                .modulId(10L)
                .noteWert(new BigDecimal("2.0"))
                .status(Note.NoteStatus.ERFASST)
                .build();

            when(noteRepository.findById(42L)).thenReturn(Optional.of(erfassteNote));
            when(noteRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            // When
            Optional<NoteDto> result = notenService.validateNote(42L, 99L, "Korrekt");

            // Then
            assertThat(result).isPresent();
            assertThat(result.get().getStatus()).isEqualTo("VALIDIERT");
            
            verify(eventPublisher).publishNoteValidated(any(), eq("99"));
        }

        @Test
        @DisplayName("Validieren von nicht-ERFASST Note wirft Exception")
        void validiertNichtErfassteNoteWirftException() {
            // Given
            Note validiertNote = Note.builder()
                .id(42L)
                .status(Note.NoteStatus.VALIDIERT)
                .build();

            when(noteRepository.findById(42L)).thenReturn(Optional.of(validiertNote));

            // When / Then
            assertThatThrownBy(() -> notenService.validateNote(42L, 1L, null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Nur ERFASST-Noten können validiert werden");
        }

        @Test
        @DisplayName("Gibt VALIDIERT-Note frei")
        void gibtValidierteNoteFrei() {
            // Given
            Note validierteNote = Note.builder()
                .id(42L)
                .einschreibungId(1L)
                .modulId(10L)
                .noteWert(new BigDecimal("1.7"))
                .status(Note.NoteStatus.VALIDIERT)
                .build();

            when(noteRepository.findById(42L)).thenReturn(Optional.of(validierteNote));
            when(noteRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            // When
            Optional<NoteDto> result = notenService.releaseNote(42L, 99L);

            // Then
            assertThat(result).isPresent();
            assertThat(result.get().getStatus()).isEqualTo("FREIGEGEBEN");
            
            verify(eventPublisher).publishNoteReleased(any(), anyString());
        }

        @Test
        @DisplayName("Freigabe von nicht-VALIDIERT Note wirft Exception")
        void freigebenNichtValidiertWirftException() {
            // Given
            Note erfassteNote = Note.builder()
                .id(42L)
                .status(Note.NoteStatus.ERFASST)
                .build();

            when(noteRepository.findById(42L)).thenReturn(Optional.of(erfassteNote));

            // When / Then
            assertThatThrownBy(() -> notenService.releaseNote(42L, 1L))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Nur VALIDIERT-Noten können freigegeben werden");
        }
    }

    @Nested
    @DisplayName("deleteNote")
    class DeleteNote {

        @Test
        @DisplayName("Löscht ERFASST-Note")
        void loeschtErfassteNote() {
            // Given
            Note erfassteNote = Note.builder()
                .id(42L)
                .einschreibungId(1L)
                .modulId(10L)
                .noteWert(new BigDecimal("3.0"))
                .status(Note.NoteStatus.ERFASST)
                .build();

            when(noteRepository.findById(42L)).thenReturn(Optional.of(erfassteNote));

            // When
            boolean result = notenService.deleteNote(42L, 99L);

            // Then
            assertThat(result).isTrue();
            verify(noteRepository).delete(erfassteNote);
            verify(eventPublisher).publishNoteDeleted(any(), anyString());
        }

        @Test
        @DisplayName("Löschen von VALIDIERT Note wirft Exception")
        void loeschenValidierteNoteWirftException() {
            // Given
            Note validierteNote = Note.builder()
                .id(42L)
                .status(Note.NoteStatus.VALIDIERT)
                .build();

            when(noteRepository.findById(42L)).thenReturn(Optional.of(validierteNote));

            // When / Then
            assertThatThrownBy(() -> notenService.deleteNote(42L, 1L))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Nur ERFASST-Noten können gelöscht werden");
        }
    }

    @Nested
    @DisplayName("getNoten")
    class GetNoten {

        @Test
        @DisplayName("Holt alle Noten ohne Filter")
        void holtAlleNoten() {
            // Given
            Note note1 = Note.builder().id(1L).noteWert(new BigDecimal("2.0")).status(Note.NoteStatus.ERFASST).build();
            Note note2 = Note.builder().id(2L).noteWert(new BigDecimal("3.0")).status(Note.NoteStatus.VALIDIERT).build();
            
            when(noteRepository.findAll()).thenReturn(List.of(note1, note2));

            // When
            List<NoteDto> result = notenService.getNoten(null, null, null);

            // Then
            assertThat(result).hasSize(2);
        }

        @Test
        @DisplayName("Filtert nach Einschreibung")
        void filtertNachEinschreibung() {
            // Given
            when(noteRepository.findByEinschreibungId(42L)).thenReturn(List.of());

            // When
            notenService.getNoten(42L, null, null);

            // Then
            verify(noteRepository).findByEinschreibungId(42L);
            verify(noteRepository, never()).findAll();
        }
    }
}
