package de.gradify.berechnung.service;

import de.gradify.berechnung.dto.BerechnungDto;
import de.gradify.berechnung.entity.Berechnungsergebnis;
import de.gradify.berechnung.entity.ModulBerechnung;
import de.gradify.berechnung.grpc.NotenGrpcClient;
import de.gradify.berechnung.grpc.StudiengangGrpcClient;
import de.gradify.berechnung.repository.BerechnungsergebnisRepository;
import de.gradify.berechnung.repository.ModulBerechnungRepository;
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
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

/**
 * Unit-Tests fuer BerechnungsService.
 * Testet die Kernlogik der Notenberechnung ohne externe Abhaengigkeiten.
 */
@ExtendWith(MockitoExtension.class)
class BerechnungsServiceTest {

    @Mock
    private BerechnungsergebnisRepository berechnungsergebnisRepository;

    @Mock
    private ModulBerechnungRepository modulBerechnungRepository;

    @Mock
    private NotenGrpcClient notenGrpcClient;

    @Mock
    private StudiengangGrpcClient studiengangGrpcClient;

    @InjectMocks
    private BerechnungsService berechnungsService;

    @Captor
    private ArgumentCaptor<Berechnungsergebnis> ergebnisCaptor;

    @Captor
    private ArgumentCaptor<List<ModulBerechnung>> modulListCaptor;

    @Nested
    @DisplayName("aktualisiereBerechnung - Bachelor (GEWICHTET)")
    class AktualisiereBerechnung {

        @Test
        @DisplayName("Berechnet gewichteten Durchschnitt korrekt")
        void berechnetGewichtetenDurchschnittKorrekt() {
            // Given: Module mit unterschiedlichen Gewichtungen
            List<ModulBerechnung> module = List.of(
                createModul("1", "Mathematik 1", new BigDecimal("2.0"), new BigDecimal("2.0"), true, true, 10),
                createModul("2", "Physik", new BigDecimal("1.5"), new BigDecimal("1.0"), true, true, 5),
                createModul("3", "Informatik", new BigDecimal("2.5"), new BigDecimal("1.0"), true, true, 5)
            );
            
            // Erwartung: (2.0*2.0 + 1.5*1.0 + 2.5*1.0) / (2.0 + 1.0 + 1.0) = 8.0 / 4.0 = 2.0
            when(berechnungsergebnisRepository.findByEinschreibungId(anyLong()))
                .thenReturn(Optional.empty());
            when(berechnungsergebnisRepository.save(any()))
                .thenAnswer(inv -> {
                    Berechnungsergebnis e = inv.getArgument(0);
                    e.setId(1L);
                    return e;
                });

            // When
            BerechnungDto result = berechnungsService.aktualisiereBerechnung(
                1L, new ArrayList<>(module), "GEWICHTET", 210);

            // Then
            verify(berechnungsergebnisRepository).save(ergebnisCaptor.capture());
            Berechnungsergebnis gespeichert = ergebnisCaptor.getValue();
            
            assertThat(gespeichert.getGesamtnote()).isEqualByComparingTo("2.0");
            assertThat(gespeichert.getModuleBestanden()).isEqualTo(3);
            assertThat(gespeichert.getEctsErreicht()).isEqualTo(20); // 10 + 5 + 5
        }

        @Test
        @DisplayName("Module mit bestanden=true aber ohne Note werden nicht gezaehlt")
        void bestandenOhneNoteWirdIgnoriert() {
            // Given: Modul mit bestanden=true aber Note=null (z.B. "Einfuehrung in die Bioverfahrenstechnik")
            List<ModulBerechnung> module = List.of(
                createModul("1", "Einfuehrung BVT", null, BigDecimal.ZERO, true, false, 5), // bestanden, keine Note
                createModul("2", "Mathematik", new BigDecimal("2.0"), new BigDecimal("2.0"), true, true, 10)
            );

            when(berechnungsergebnisRepository.findByEinschreibungId(anyLong()))
                .thenReturn(Optional.empty());
            when(berechnungsergebnisRepository.save(any()))
                .thenAnswer(inv -> {
                    Berechnungsergebnis e = inv.getArgument(0);
                    e.setId(1L);
                    return e;
                });

            // When
            berechnungsService.aktualisiereBerechnung(1L, new ArrayList<>(module), "GEWICHTET", 210);

            // Then
            verify(berechnungsergebnisRepository).save(ergebnisCaptor.capture());
            Berechnungsergebnis gespeichert = ergebnisCaptor.getValue();
            
            // Gesamtnote basiert nur auf Mathe (2.0)
            assertThat(gespeichert.getGesamtnote()).isEqualByComparingTo("2.0");
            // Beide Module zaehlen als bestanden
            assertThat(gespeichert.getModuleBestanden()).isEqualTo(2);
            assertThat(gespeichert.getEctsErreicht()).isEqualTo(15); // 5 + 10
        }

        @Test
        @DisplayName("Module mit inGesamtnote=false werden nicht berechnet")
        void moduleNichtInGesamtnoteWerdenIgnoriert() {
            // Given: Modul mit Gewichtung 0 (nicht in Gesamtnote)
            List<ModulBerechnung> module = List.of(
                createModul("1", "Einfuehrung BVT", new BigDecimal("1.0"), BigDecimal.ZERO, true, false, 5),
                createModul("2", "Mathematik", new BigDecimal("2.3"), new BigDecimal("2.0"), true, true, 10)
            );

            when(berechnungsergebnisRepository.findByEinschreibungId(anyLong()))
                .thenReturn(Optional.empty());
            when(berechnungsergebnisRepository.save(any()))
                .thenAnswer(inv -> {
                    Berechnungsergebnis e = inv.getArgument(0);
                    e.setId(1L);
                    return e;
                });

            // When
            berechnungsService.aktualisiereBerechnung(1L, new ArrayList<>(module), "GEWICHTET", 210);

            // Then
            verify(berechnungsergebnisRepository).save(ergebnisCaptor.capture());
            Berechnungsergebnis gespeichert = ergebnisCaptor.getValue();
            
            // Nur Mathe in Gesamtnote
            assertThat(gespeichert.getGesamtnote()).isEqualByComparingTo("2.3");
        }

        @Test
        @DisplayName("Note 5.0 wird nicht in Gesamtnote gezaehlt")
        void note5WirdNichtGezaehlt() {
            // Given: Modul mit Note 5.0 (nicht bestanden)
            List<ModulBerechnung> module = List.of(
                createModul("1", "Durchgefallen", new BigDecimal("5.0"), new BigDecimal("1.0"), false, true, 5),
                createModul("2", "Mathematik", new BigDecimal("2.0"), new BigDecimal("1.0"), true, true, 5)
            );

            when(berechnungsergebnisRepository.findByEinschreibungId(anyLong()))
                .thenReturn(Optional.empty());
            when(berechnungsergebnisRepository.save(any()))
                .thenAnswer(inv -> {
                    Berechnungsergebnis e = inv.getArgument(0);
                    e.setId(1L);
                    return e;
                });

            // When
            berechnungsService.aktualisiereBerechnung(1L, new ArrayList<>(module), "GEWICHTET", 210);

            // Then
            verify(berechnungsergebnisRepository).save(ergebnisCaptor.capture());
            Berechnungsergebnis gespeichert = ergebnisCaptor.getValue();
            
            // Nur Mathe in Gesamtnote (5.0 wird nicht gezaehlt)
            assertThat(gespeichert.getGesamtnote()).isEqualByComparingTo("2.0");
            assertThat(gespeichert.getModuleBestanden()).isEqualTo(1); // Nur Mathe
        }

        @Test
        @DisplayName("Rundung auf eine Dezimalstelle")
        void rundetAufEineDezimalstelle() {
            // Given: Note die gerundet werden muss
            List<ModulBerechnung> module = List.of(
                createModul("1", "Modul A", new BigDecimal("2.33"), new BigDecimal("1.0"), true, true, 5),
                createModul("2", "Modul B", new BigDecimal("2.67"), new BigDecimal("1.0"), true, true, 5)
            );
            // Durchschnitt: (2.33 + 2.67) / 2 = 2.50

            when(berechnungsergebnisRepository.findByEinschreibungId(anyLong()))
                .thenReturn(Optional.empty());
            when(berechnungsergebnisRepository.save(any()))
                .thenAnswer(inv -> {
                    Berechnungsergebnis e = inv.getArgument(0);
                    e.setId(1L);
                    return e;
                });

            // When
            berechnungsService.aktualisiereBerechnung(1L, new ArrayList<>(module), "GEWICHTET", 210);

            // Then
            verify(berechnungsergebnisRepository).save(ergebnisCaptor.capture());
            Berechnungsergebnis gespeichert = ergebnisCaptor.getValue();
            
            assertThat(gespeichert.getGesamtnote()).isEqualByComparingTo("2.5");
        }

        @Test
        @DisplayName("Status ENDGUELTIG wenn alle ECTS erreicht")
        void statusEndgueltigWennAlleEctsErreicht() {
            // Given: Alle Module bestanden, ECTS erreicht
            List<ModulBerechnung> module = List.of(
                createModul("1", "Modul A", new BigDecimal("2.0"), new BigDecimal("1.0"), true, true, 100),
                createModul("2", "Modul B", new BigDecimal("2.0"), new BigDecimal("1.0"), true, true, 110)
            );

            when(berechnungsergebnisRepository.findByEinschreibungId(anyLong()))
                .thenReturn(Optional.empty());
            when(berechnungsergebnisRepository.save(any()))
                .thenAnswer(inv -> {
                    Berechnungsergebnis e = inv.getArgument(0);
                    e.setId(1L);
                    return e;
                });

            // When
            berechnungsService.aktualisiereBerechnung(1L, new ArrayList<>(module), "GEWICHTET", 210);

            // Then
            verify(berechnungsergebnisRepository).save(ergebnisCaptor.capture());
            Berechnungsergebnis gespeichert = ergebnisCaptor.getValue();
            
            assertThat(gespeichert.getStatus()).isEqualTo(Berechnungsergebnis.BerechnungsStatus.ENDGUELTIG);
        }
    }

    @Nested
    @DisplayName("aktualisiereBerechnung - Master (ARITHMETISCH_GEMISCHT)")
    class AktualisiereBerechungMaster {

        @Test
        @DisplayName("Master-Formel: (2 x Thesis + Modulmittel) / 3")
        void berechneMasterFormelKorrekt() {
            // Given: Master-Module nach PO FSA
            List<ModulBerechnung> module = List.of(
                createModul("1", "Paradigmatische Grundlegung", new BigDecimal("1.7"), new BigDecimal("1.0"), true, true, 10),
                createModul("2", "Quantitative Forschungsmethoden", new BigDecimal("2.0"), new BigDecimal("1.0"), true, true, 10),
                createModul("3", "Statistik I", new BigDecimal("2.3"), new BigDecimal("1.0"), true, true, 5),
                createModul("12", "Master-Thesis mit Kolloquium", new BigDecimal("1.3"), new BigDecimal("2.0"), true, true, 30)
            );
            
            // Modulmittel: (1.7 + 2.0 + 2.3) / 3 = 2.0
            // Gesamtnote: (2 * 1.3 + 2.0) / 3 = (2.6 + 2.0) / 3 = 4.6 / 3 = 1.533... ≈ 1.5

            when(berechnungsergebnisRepository.findByEinschreibungId(anyLong()))
                .thenReturn(Optional.empty());
            when(berechnungsergebnisRepository.save(any()))
                .thenAnswer(inv -> {
                    Berechnungsergebnis e = inv.getArgument(0);
                    e.setId(1L);
                    return e;
                });

            // When
            berechnungsService.aktualisiereBerechnung(1L, new ArrayList<>(module), "ARITHMETISCH_GEMISCHT", 120);

            // Then
            verify(berechnungsergebnisRepository).save(ergebnisCaptor.capture());
            Berechnungsergebnis gespeichert = ergebnisCaptor.getValue();
            
            // (2 * 1.3 + 2.0) / 3 = 1.533...
            assertThat(gespeichert.getGesamtnote()).isEqualByComparingTo("1.5");
        }

        @Test
        @DisplayName("Module 6, 9, 10, 11 werden bei Master nicht gezaehlt (bestanden/nicht bestanden)")
        void bestandenModuleWerdenBeiMasterIgnoriert() {
            // Given: Module mit inGesamtnote=false (bestanden/nicht bestanden)
            List<ModulBerechnung> module = List.of(
                createModul("1", "Paradigmatische Grundlegung", new BigDecimal("2.0"), new BigDecimal("1.0"), true, true, 10),
                createModul("6", "Aktuelle Forschungen", new BigDecimal("1.0"), BigDecimal.ZERO, true, false, 5), // nicht in Gesamtnote
                createModul("12", "Master-Thesis", new BigDecimal("1.3"), new BigDecimal("2.0"), true, true, 30)
            );

            when(berechnungsergebnisRepository.findByEinschreibungId(anyLong()))
                .thenReturn(Optional.empty());
            when(berechnungsergebnisRepository.save(any()))
                .thenAnswer(inv -> {
                    Berechnungsergebnis e = inv.getArgument(0);
                    e.setId(1L);
                    return e;
                });

            // When
            berechnungsService.aktualisiereBerechnung(1L, new ArrayList<>(module), "ARITHMETISCH_GEMISCHT", 120);

            // Then
            verify(berechnungsergebnisRepository).save(ergebnisCaptor.capture());
            Berechnungsergebnis gespeichert = ergebnisCaptor.getValue();
            
            // Modulmittel nur aus Modul 1: 2.0
            // (2 * 1.3 + 2.0) / 3 = 1.533... ≈ 1.5
            assertThat(gespeichert.getGesamtnote()).isEqualByComparingTo("1.5");
        }
    }

    @Nested
    @DisplayName("getGesamtnote / getDetailBerechnung / getFortschritt")
    class GetterMethoden {

        @Test
        @DisplayName("getGesamtnote liefert vorhandene Berechnung")
        void getGesamtnoteFindetBerechnung() {
            // Given
            Berechnungsergebnis ergebnis = Berechnungsergebnis.builder()
                .id(1L)
                .einschreibungId(42L)
                .gesamtnote(new BigDecimal("2.3"))
                .status(Berechnungsergebnis.BerechnungsStatus.VORLAEUFIG)
                .moduleBestanden(10)
                .moduleGesamt(15)
                .build();
            
            when(berechnungsergebnisRepository.findByEinschreibungId(42L))
                .thenReturn(Optional.of(ergebnis));

            // When
            Optional<BerechnungDto> result = berechnungsService.getGesamtnote(42L);

            // Then
            assertThat(result).isPresent();
            assertThat(result.get().getGesamtnote()).isEqualByComparingTo("2.3");
            assertThat(result.get().getModuleBestanden()).isEqualTo(10);
        }

        @Test
        @DisplayName("getGesamtnote liefert empty bei unbekannter Einschreibung")
        void getGesamtnoteFindetNichts() {
            // Given
            when(berechnungsergebnisRepository.findByEinschreibungId(999L))
                .thenReturn(Optional.empty());

            // When
            Optional<BerechnungDto> result = berechnungsService.getGesamtnote(999L);

            // Then
            assertThat(result).isEmpty();
        }
    }

    // ===== Hilfsmethoden =====

    private ModulBerechnung createModul(String modulNr, String name, BigDecimal note, 
            BigDecimal gewichtung, boolean bestanden, boolean inGesamtnote, int ects) {
        return ModulBerechnung.builder()
            .modulId(Long.parseLong(modulNr.replaceAll("[^0-9]", "1")))
            .modulNr(modulNr)
            .modulName(name)
            .note(note)
            .gewichtung(gewichtung)
            .bestanden(bestanden)
            .inGesamtnote(inGesamtnote)
            .ects(ects)
            .build();
    }
}
