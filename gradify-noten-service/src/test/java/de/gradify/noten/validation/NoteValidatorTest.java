package de.gradify.noten.validation;

import de.gradify.noten.dto.CreateNoteRequest;
import de.gradify.noten.repository.NoteRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

/**
 * Unit-Tests fuer NoteValidator.
 * Testet Notenwert-Validierung nach deutschen Hochschulregeln.
 */
@ExtendWith(MockitoExtension.class)
class NoteValidatorTest {

    @Mock
    private NoteRepository noteRepository;

    private NoteValidator validator;

    @BeforeEach
    void setup() {
        validator = new NoteValidator(noteRepository);
    }

    @Nested
    @DisplayName("isValidNoteWert")
    class IsValidNoteWert {

        @ParameterizedTest
        @ValueSource(strings = {"1.0", "1.3", "1.7", "2.0", "2.3", "2.7", "3.0", "3.3", "3.7", "4.0", "5.0"})
        @DisplayName("Akzeptiert gültige Notenwerte")
        void akzeptiertGueltigeNoten(String note) {
            assertThat(validator.isValidNoteWert(new BigDecimal(note))).isTrue();
        }

        @ParameterizedTest
        @ValueSource(strings = {"0.0", "0.5", "1.1", "1.5", "2.5", "4.5", "5.5", "6.0"})
        @DisplayName("Lehnt ungültige Notenwerte ab")
        void lehntUngueltigeNotenAb(String note) {
            assertThat(validator.isValidNoteWert(new BigDecimal(note))).isFalse();
        }

        @Test
        @DisplayName("Null ist ungültig")
        void nullIstUngueltig() {
            assertThat(validator.isValidNoteWert(null)).isFalse();
        }

        @Test
        @DisplayName("Akzeptiert Noten mit unterschiedlicher Dezimalstellenanzahl")
        void akzeptiertUnterschiedlicheDezimalstellen() {
            // 2 = 2.0 = 2.00 sollten alle als 2.0 behandelt werden
            assertThat(validator.isValidNoteWert(new BigDecimal("2"))).isTrue();
            assertThat(validator.isValidNoteWert(new BigDecimal("2.0"))).isTrue();
            assertThat(validator.isValidNoteWert(new BigDecimal("2.00"))).isTrue();
        }
    }

    @Nested
    @DisplayName("validateCreate")
    class ValidateCreate {

        @Test
        @DisplayName("Gültige Note ohne Fehler")
        void gueltigeNoteOhneFehler() {
            // Given
            CreateNoteRequest request = CreateNoteRequest.builder()
                .einschreibungId(1L)
                .modulId(10L)
                .noteWert(new BigDecimal("2.3"))
                .versuch(0) // Auto
                .build();

            when(noteRepository.findMaxVersuch(1L, 10L)).thenReturn(null);
            when(noteRepository.findByEinschreibungIdAndModulIdAndVersuch(1L, 10L, 1))
                .thenReturn(Optional.empty());

            // When
            List<String> errors = validator.validateCreate(request);

            // Then
            assertThat(errors).isEmpty();
        }

        @Test
        @DisplayName("Ungültiger Notenwert erzeugt Fehler")
        void ungueltigerNotenwertErzeugtFehler() {
            // Given
            CreateNoteRequest request = CreateNoteRequest.builder()
                .einschreibungId(1L)
                .modulId(10L)
                .noteWert(new BigDecimal("2.5")) // Ungültig
                .build();

            when(noteRepository.findMaxVersuch(1L, 10L)).thenReturn(null);
            when(noteRepository.findByEinschreibungIdAndModulIdAndVersuch(1L, 10L, 1))
                .thenReturn(Optional.empty());

            // When
            List<String> errors = validator.validateCreate(request);

            // Then
            assertThat(errors).contains("Ungültiger Notenwert. Erlaubt: 1.0, 1.3, 1.7, 2.0, 2.3, 2.7, 3.0, 3.3, 3.7, 4.0, 5.0");
        }

        @Test
        @DisplayName("Note unter 1.0 erzeugt Fehler")
        void noteUnter1ErzeugtFehler() {
            // Given
            CreateNoteRequest request = CreateNoteRequest.builder()
                .einschreibungId(1L)
                .modulId(10L)
                .noteWert(new BigDecimal("0.7"))
                .build();

            when(noteRepository.findMaxVersuch(1L, 10L)).thenReturn(null);
            when(noteRepository.findByEinschreibungIdAndModulIdAndVersuch(1L, 10L, 1))
                .thenReturn(Optional.empty());

            // When
            List<String> errors = validator.validateCreate(request);

            // Then
            assertThat(errors).contains("Note muss mindestens 1.0 sein");
        }

        @Test
        @DisplayName("Note über 5.0 erzeugt Fehler")
        void noteUeber5ErzeugtFehler() {
            // Given
            CreateNoteRequest request = CreateNoteRequest.builder()
                .einschreibungId(1L)
                .modulId(10L)
                .noteWert(new BigDecimal("6.0"))
                .build();

            when(noteRepository.findMaxVersuch(1L, 10L)).thenReturn(null);
            when(noteRepository.findByEinschreibungIdAndModulIdAndVersuch(1L, 10L, 1))
                .thenReturn(Optional.empty());

            // When
            List<String> errors = validator.validateCreate(request);

            // Then
            assertThat(errors).contains("Note darf maximal 5.0 sein");
        }

        @Test
        @DisplayName("Mehr als 3 Versuche nicht erlaubt")
        void mehrAls3VersucheNichtErlaubt() {
            // Given
            CreateNoteRequest request = CreateNoteRequest.builder()
                .einschreibungId(1L)
                .modulId(10L)
                .noteWert(new BigDecimal("4.0"))
                .versuch(4)
                .build();

            // Kein Mock nötig - die Validierung bricht früh ab wegen versuch > MAX_VERSUCHE

            // When
            List<String> errors = validator.validateCreate(request);

            // Then
            assertThat(errors).contains("Maximal 3 Versuche pro Modul erlaubt");
        }

        @Test
        @DisplayName("Maximale Versuche bereits erreicht")
        void maximaleVersucheErreicht() {
            // Given
            CreateNoteRequest request = CreateNoteRequest.builder()
                .einschreibungId(1L)
                .modulId(10L)
                .noteWert(new BigDecimal("4.0"))
                .versuch(0) // Auto
                .build();

            when(noteRepository.findMaxVersuch(1L, 10L)).thenReturn(3); // Bereits 3 Versuche

            // When
            List<String> errors = validator.validateCreate(request);

            // Then
            assertThat(errors).contains("Maximale Anzahl Versuche (3) bereits erreicht");
        }

        @Test
        @DisplayName("Duplikat erzeugt Fehler")
        void duplikatErzeugtFehler() {
            // Given
            CreateNoteRequest request = CreateNoteRequest.builder()
                .einschreibungId(1L)
                .modulId(10L)
                .noteWert(new BigDecimal("2.0"))
                .versuch(1)
                .build();

            when(noteRepository.findMaxVersuch(1L, 10L)).thenReturn(null);
            when(noteRepository.findByEinschreibungIdAndModulIdAndVersuch(1L, 10L, 1))
                .thenReturn(Optional.of(de.gradify.noten.entity.Note.builder().build()));

            // When
            List<String> errors = validator.validateCreate(request);

            // Then
            assertThat(errors).contains("Note fuer diesen Versuch existiert bereits");
        }
    }

    @Nested
    @DisplayName("getGueltigeNoten")
    class GetGueltigeNoten {

        @Test
        @DisplayName("Gibt alle 11 gültigen Notenwerte zurück")
        void gibt11GueltigeNotenZurueck() {
            assertThat(validator.getGueltigeNoten()).hasSize(11);
        }
    }
}
