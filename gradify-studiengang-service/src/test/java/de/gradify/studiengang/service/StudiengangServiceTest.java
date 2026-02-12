package de.gradify.studiengang.service;

import de.gradify.studiengang.entity.Modul;
import de.gradify.studiengang.entity.Pruefungsordnung;
import de.gradify.studiengang.entity.Studiengang;
import de.gradify.studiengang.repository.ModulRepository;
import de.gradify.studiengang.repository.PruefungsordnungRepository;
import de.gradify.studiengang.repository.StudiengangRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit-Tests fuer StudiengangService.
 * Testet Studiengang- und Modul-Verwaltung.
 */
@ExtendWith(MockitoExtension.class)
class StudiengangServiceTest {

    @Mock
    private StudiengangRepository studiengangRepository;

    @Mock
    private ModulRepository modulRepository;

    @Mock
    private PruefungsordnungRepository pruefungsordnungRepository;

    @InjectMocks
    private StudiengangService studiengangService;

    private Studiengang studiengangBVT;
    private Pruefungsordnung poBVT;
    private Modul modul1;
    private Modul modul2;

    @BeforeEach
    void setup() {
        // Pruefungsordnung ohne Verweise (da @ManyToOne Lazy)
        poBVT = new Pruefungsordnung();
        poBVT.setId(1L);
        poBVT.setVersion("2024");

        studiengangBVT = new Studiengang();
        studiengangBVT.setId(1L);
        studiengangBVT.setKuerzel("BVT");
        studiengangBVT.setName("Bioverfahrenstechnik");
        studiengangBVT.setAktuellePo(poBVT);

        modul1 = new Modul();
        modul1.setId(1L);
        modul1.setModulNr("1");
        modul1.setName("Einfuehrung in die Bioverfahrenstechnik");
        modul1.setEcts(5);

        modul2 = new Modul();
        modul2.setId(2L);
        modul2.setModulNr("2");
        modul2.setName("Mathematik I");
        modul2.setEcts(10);
    }

    @Nested
    @DisplayName("findAll / findAktive")
    class FindAll {

        @Test
        @DisplayName("Findet alle Studiengaenge")
        void findetAlleStudiengaenge() {
            // Given
            when(studiengangRepository.findAll()).thenReturn(List.of(studiengangBVT));

            // When
            List<Studiengang> result = studiengangService.findAll();

            // Then
            assertThat(result).hasSize(1);
            assertThat(result.get(0).getName()).isEqualTo("Bioverfahrenstechnik");
        }

        @Test
        @DisplayName("Findet nur aktive Studiengaenge")
        void findetAktiveStudiengaenge() {
            // Given
            when(studiengangRepository.findByAktivTrue()).thenReturn(List.of(studiengangBVT));

            // When
            List<Studiengang> result = studiengangService.findAktive();

            // Then
            assertThat(result).hasSize(1);
            verify(studiengangRepository).findByAktivTrue();
        }

        @Test
        @DisplayName("Findet Studiengaenge nach Mandant")
        void findetNachMandant() {
            // Given
            when(studiengangRepository.findByMandantId(1L)).thenReturn(List.of(studiengangBVT));

            // When
            List<Studiengang> result = studiengangService.findByMandantId(1L);

            // Then
            assertThat(result).hasSize(1);
        }
    }

    @Nested
    @DisplayName("findById / findByKuerzel")
    class FindById {

        @Test
        @DisplayName("Findet Studiengang nach ID")
        void findetNachId() {
            // Given
            when(studiengangRepository.findById(1L)).thenReturn(Optional.of(studiengangBVT));

            // When
            Optional<Studiengang> result = studiengangService.findById(1L);

            // Then
            assertThat(result).isPresent();
            assertThat(result.get().getKuerzel()).isEqualTo("BVT");
        }

        @Test
        @DisplayName("Findet Studiengang nach Kuerzel")
        void findetNachKuerzel() {
            // Given
            when(studiengangRepository.findByKuerzel("BVT")).thenReturn(Optional.of(studiengangBVT));

            // When
            Optional<Studiengang> result = studiengangService.findByKuerzel("BVT");

            // Then
            assertThat(result).isPresent();
        }
    }

    @Nested
    @DisplayName("findModule...")
    class FindModule {

        @Test
        @DisplayName("Findet Module nach Studiengang-ID")
        void findetModuleNachStudiengangId() {
            // Given
            when(studiengangRepository.findById(1L)).thenReturn(Optional.of(studiengangBVT));
            when(modulRepository.findByPruefungsordnungId(1L)).thenReturn(List.of(modul1, modul2));

            // When
            List<Modul> result = studiengangService.findModuleByStudiengangId(1L);

            // Then
            assertThat(result).hasSize(2);
        }

        @Test
        @DisplayName("Gibt leere Liste wenn Studiengang keine PO hat")
        void gibtLeerWennKeinePo() {
            // Given
            Studiengang ohnePoStudiengang = new Studiengang();
            ohnePoStudiengang.setId(2L);
            ohnePoStudiengang.setName("Ohne PO");
            ohnePoStudiengang.setAktuellePo(null);

            when(studiengangRepository.findById(2L)).thenReturn(Optional.of(ohnePoStudiengang));

            // When
            List<Modul> result = studiengangService.findModuleByStudiengangId(2L);

            // Then
            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("Findet Module nach PO-ID")
        void findetModuleNachPoId() {
            // Given
            when(modulRepository.findByPruefungsordnungId(1L)).thenReturn(List.of(modul1, modul2));

            // When
            List<Modul> result = studiengangService.findModuleByPoId(1L);

            // Then
            assertThat(result).hasSize(2);
        }

        @Test
        @DisplayName("Findet einzelnes Modul nach ID")
        void findetModulNachId() {
            // Given
            when(modulRepository.findById(1L)).thenReturn(Optional.of(modul1));

            // When
            Optional<Modul> result = studiengangService.findModulById(1L);

            // Then
            assertThat(result).isPresent();
            assertThat(result.get().getName()).isEqualTo("Einfuehrung in die Bioverfahrenstechnik");
        }
    }

    @Nested
    @DisplayName("findPruefungsordnung...")
    class FindPruefungsordnung {

        @Test
        @DisplayName("Findet Pruefungsordnungen nach Studiengang-ID")
        void findetPoNachStudiengang() {
            // Given
            when(pruefungsordnungRepository.findByStudiengangId(1L)).thenReturn(List.of(poBVT));

            // When
            List<Pruefungsordnung> result = studiengangService.findPruefungsordnungenByStudiengangId(1L);

            // Then
            assertThat(result).hasSize(1);
        }

        @Test
        @DisplayName("Findet Pruefungsordnung nach ID")
        void findetPoNachId() {
            // Given
            when(pruefungsordnungRepository.findById(1L)).thenReturn(Optional.of(poBVT));

            // When
            Optional<Pruefungsordnung> result = studiengangService.findPruefungsordnungById(1L);

            // Then
            assertThat(result).isPresent();
            assertThat(result.get().getVersion()).isEqualTo("2024");
        }
    }

    @Nested
    @DisplayName("save / deleteById")
    class SaveDelete {

        @Test
        @DisplayName("Speichert Studiengang")
        void speichertStudiengang() {
            // Given
            when(studiengangRepository.save(any())).thenReturn(studiengangBVT);

            // When
            Studiengang result = studiengangService.save(studiengangBVT);

            // Then
            assertThat(result).isNotNull();
            verify(studiengangRepository).save(studiengangBVT);
        }

        @Test
        @DisplayName("Loescht Studiengang nach ID")
        void loeschtStudiengang() {
            // When
            studiengangService.deleteById(1L);

            // Then
            verify(studiengangRepository).deleteById(1L);
        }
    }
}
