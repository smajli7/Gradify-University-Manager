package de.gradify.user.service;

import de.gradify.user.dto.BenutzerDto;
import de.gradify.user.dto.CreateBenutzerRequest;
import de.gradify.user.dto.UpdateBenutzerRequest;
import de.gradify.user.entity.Benutzer;
import de.gradify.user.entity.BenutzerHistorie;
import de.gradify.user.entity.Rolle;
import de.gradify.user.repository.BenutzerHistorieRepository;
import de.gradify.user.repository.BenutzerRepository;
import de.gradify.user.repository.RolleRepository;
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
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit-Tests fuer BenutzerService.
 * Testet Benutzerverwaltung und Rollenzuweisung.
 */
@ExtendWith(MockitoExtension.class)
class BenutzerServiceTest {

    @Mock
    private BenutzerRepository benutzerRepository;

    @Mock
    private BenutzerHistorieRepository benutzerHistorieRepository;

    @Mock
    private RolleRepository rolleRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private BenutzerService benutzerService;

    @Captor
    private ArgumentCaptor<Benutzer> benutzerCaptor;

    @Captor
    private ArgumentCaptor<BenutzerHistorie> historieCaptor;

    private Rolle rolleStudent;
    private Rolle rolleLehrender;

    @BeforeEach
    void setup() {
        rolleStudent = Rolle.builder().id(1L).name("ROLE_STUDENT").build();
        rolleLehrender = Rolle.builder().id(2L).name("ROLE_LEHRENDER").build();
    }

    @Nested
    @DisplayName("create")
    class Create {

        @Test
        @DisplayName("Erstellt Benutzer erfolgreich")
        void erstelltBenutzerErfolgreich() {
            // Given
            CreateBenutzerRequest request = CreateBenutzerRequest.builder()
                .benutzername("max.mustermann")
                .email("max@example.com")
                .passwort("geheim123")
                .vorname("Max")
                .nachname("Mustermann")
                .mandantId(1L)
                .rollenIds(Set.of(1L))
                .build();

            when(benutzerRepository.existsByBenutzername("max.mustermann")).thenReturn(false);
            when(benutzerRepository.existsByEmail("max@example.com")).thenReturn(false);
            when(rolleRepository.findById(1L)).thenReturn(Optional.of(rolleStudent));
            when(passwordEncoder.encode("geheim123")).thenReturn("$encoded$");
            when(benutzerRepository.save(any())).thenAnswer(inv -> {
                Benutzer b = inv.getArgument(0);
                b.setId(42L);
                b.setErstelltAm(LocalDateTime.now());
                return b;
            });

            // When
            BenutzerDto result = benutzerService.create(request, 99L);

            // Then
            verify(benutzerRepository).save(benutzerCaptor.capture());
            Benutzer gespeichert = benutzerCaptor.getValue();

            assertThat(gespeichert.getBenutzername()).isEqualTo("max.mustermann");
            assertThat(gespeichert.getPasswortHash()).isEqualTo("$encoded$");
            assertThat(gespeichert.isAktiv()).isTrue();
            assertThat(gespeichert.getRollen()).contains(rolleStudent);

            verify(benutzerHistorieRepository).save(historieCaptor.capture());
            BenutzerHistorie historie = historieCaptor.getValue();
            assertThat(historie.getAenderungsTyp()).isEqualTo(BenutzerHistorie.AenderungsTyp.ERSTELLT);
        }

        @Test
        @DisplayName("Wirft Exception bei dupliziertem Benutzernamen")
        void wirftExceptionBeiDupliziertemBenutzernamen() {
            // Given
            CreateBenutzerRequest request = CreateBenutzerRequest.builder()
                .benutzername("existing.user")
                .email("new@example.com")
                .passwort("test")
                .build();

            when(benutzerRepository.existsByBenutzername("existing.user")).thenReturn(true);

            // When / Then
            assertThatThrownBy(() -> benutzerService.create(request, 1L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Benutzername existiert bereits");
        }

        @Test
        @DisplayName("Wirft Exception bei duplizierter E-Mail")
        void wirftExceptionBeiDuplizierterEmail() {
            // Given
            CreateBenutzerRequest request = CreateBenutzerRequest.builder()
                .benutzername("new.user")
                .email("existing@example.com")
                .passwort("test")
                .build();

            when(benutzerRepository.existsByBenutzername("new.user")).thenReturn(false);
            when(benutzerRepository.existsByEmail("existing@example.com")).thenReturn(true);

            // When / Then
            assertThatThrownBy(() -> benutzerService.create(request, 1L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("E-Mail existiert bereits");
        }
    }

    @Nested
    @DisplayName("update")
    class Update {

        @Test
        @DisplayName("Aktualisiert Benutzer ohne Passwort")
        void aktualisiertBenutzerOhnePasswort() {
            // Given
            Benutzer bestehend = Benutzer.builder()
                .id(42L)
                .benutzername("old.name")
                .email("old@example.com")
                .passwortHash("$old$")
                .vorname("Alt")
                .nachname("Benutzer")
                .rollen(new HashSet<>())
                .build();

            UpdateBenutzerRequest request = UpdateBenutzerRequest.builder()
                .benutzername("new.name")
                .email("new@example.com")
                .vorname("Neu")
                .nachname("Benutzer")
                .build();

            when(benutzerRepository.findById(42L)).thenReturn(Optional.of(bestehend));
            when(benutzerRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            // When
            Optional<BenutzerDto> result = benutzerService.update(42L, request);

            // Then
            assertThat(result).isPresent();
            assertThat(result.get().getBenutzername()).isEqualTo("new.name");
            
            // Passwort sollte nicht geändert worden sein
            verify(passwordEncoder, never()).encode(anyString());
        }

        @Test
        @DisplayName("Aktualisiert Passwort wenn angegeben")
        void aktualisiertPasswortWennAngegeben() {
            // Given
            Benutzer bestehend = Benutzer.builder()
                .id(42L)
                .benutzername("user")
                .email("user@example.com")
                .passwortHash("$old$")
                .rollen(new HashSet<>())
                .build();

            UpdateBenutzerRequest request = UpdateBenutzerRequest.builder()
                .benutzername("user")
                .email("user@example.com")
                .passwort("neuesPasswort")
                .build();

            when(benutzerRepository.findById(42L)).thenReturn(Optional.of(bestehend));
            when(passwordEncoder.encode("neuesPasswort")).thenReturn("$new$");
            when(benutzerRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            // When
            benutzerService.update(42L, request);

            // Then
            verify(benutzerRepository).save(benutzerCaptor.capture());
            assertThat(benutzerCaptor.getValue().getPasswortHash()).isEqualTo("$new$");
        }
    }

    @Nested
    @DisplayName("delete")
    class Delete {

        @Test
        @DisplayName("Löscht Benutzer und erstellt Audit-Log")
        void loeschtBenutzerMitAuditLog() {
            // Given
            Benutzer benutzer = Benutzer.builder()
                .id(42L)
                .benutzername("zu.loeschen")
                .vorname("Test")
                .nachname("Benutzer")
                .build();

            when(benutzerRepository.findById(42L)).thenReturn(Optional.of(benutzer));

            // When
            boolean result = benutzerService.delete(42L, 99L);

            // Then
            assertThat(result).isTrue();
            verify(benutzerRepository).deleteById(42L);
            
            verify(benutzerHistorieRepository).save(historieCaptor.capture());
            BenutzerHistorie historie = historieCaptor.getValue();
            assertThat(historie.getAenderungsTyp()).isEqualTo(BenutzerHistorie.AenderungsTyp.GELOESCHT);
            assertThat(historie.getGeaendertVon()).isEqualTo(99L);
        }

        @Test
        @DisplayName("Gibt false zurück wenn Benutzer nicht existiert")
        void gibtFalseZurueckWennNichtExistiert() {
            // Given
            when(benutzerRepository.findById(999L)).thenReturn(Optional.empty());

            // When
            boolean result = benutzerService.delete(999L, 1L);

            // Then
            assertThat(result).isFalse();
            verify(benutzerRepository, never()).deleteById(anyLong());
        }
    }

    @Nested
    @DisplayName("assignRole / removeRole")
    class RoleManagement {

        @Test
        @DisplayName("Weist Rolle erfolgreich zu")
        void weistRolleZu() {
            // Given
            Benutzer benutzer = Benutzer.builder()
                .id(42L)
                .rollen(new HashSet<>())
                .build();

            when(benutzerRepository.findById(42L)).thenReturn(Optional.of(benutzer));
            when(rolleRepository.findById(2L)).thenReturn(Optional.of(rolleLehrender));
            when(benutzerRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            // When
            boolean result = benutzerService.assignRole(42L, 2L);

            // Then
            assertThat(result).isTrue();
            verify(benutzerRepository).save(benutzerCaptor.capture());
            assertThat(benutzerCaptor.getValue().getRollen()).contains(rolleLehrender);
        }

        @Test
        @DisplayName("Entfernt Rolle erfolgreich")
        void entferntRolle() {
            // Given
            Set<Rolle> rollen = new HashSet<>();
            rollen.add(rolleStudent);
            rollen.add(rolleLehrender);
            
            Benutzer benutzer = Benutzer.builder()
                .id(42L)
                .rollen(rollen)
                .build();

            when(benutzerRepository.findById(42L)).thenReturn(Optional.of(benutzer));
            when(benutzerRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            // When
            boolean result = benutzerService.removeRole(42L, 1L);

            // Then
            assertThat(result).isTrue();
            verify(benutzerRepository).save(benutzerCaptor.capture());
            assertThat(benutzerCaptor.getValue().getRollen()).doesNotContain(rolleStudent);
            assertThat(benutzerCaptor.getValue().getRollen()).contains(rolleLehrender);
        }
    }

    @Nested
    @DisplayName("findBy...")
    class FindMethods {

        @Test
        @DisplayName("Findet alle Benutzer")
        void findetAlleBenutzer() {
            // Given
            Benutzer b1 = Benutzer.builder().id(1L).benutzername("user1").rollen(new HashSet<>()).build();
            Benutzer b2 = Benutzer.builder().id(2L).benutzername("user2").rollen(new HashSet<>()).build();
            
            when(benutzerRepository.findAll()).thenReturn(List.of(b1, b2));

            // When
            List<BenutzerDto> result = benutzerService.findAll();

            // Then
            assertThat(result).hasSize(2);
        }

        @Test
        @DisplayName("Findet Benutzer nach Mandant")
        void findetNachMandant() {
            // Given
            when(benutzerRepository.findByMandantId(1L)).thenReturn(List.of());

            // When
            benutzerService.findByMandantId(1L);

            // Then
            verify(benutzerRepository).findByMandantId(1L);
        }

        @Test
        @DisplayName("Findet Benutzer nach Benutzername")
        void findetNachBenutzername() {
            // Given
            Benutzer b = Benutzer.builder().id(1L).benutzername("test").rollen(new HashSet<>()).build();
            when(benutzerRepository.findByBenutzername("test")).thenReturn(Optional.of(b));

            // When
            Optional<BenutzerDto> result = benutzerService.findByBenutzername("test");

            // Then
            assertThat(result).isPresent();
            assertThat(result.get().getBenutzername()).isEqualTo("test");
        }
    }
}
