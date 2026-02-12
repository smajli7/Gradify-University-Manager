package de.gradify.berechnung.controller;

import de.gradify.berechnung.dto.BerechnungDto;
import de.gradify.berechnung.dto.FortschrittDto;
import de.gradify.berechnung.grpc.NotenGrpcClient;
import de.gradify.berechnung.grpc.StudiengangGrpcClient;
import de.gradify.berechnung.service.BerechnungsService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Controller-Tests fuer BerechnungsController.
 * Testet REST-Endpunkte mit Mock-Service (Security deaktiviert fuer Unit-Tests).
 */
@WebMvcTest(
    controllers = BerechnungsController.class,
    excludeAutoConfiguration = SecurityAutoConfiguration.class,
    excludeFilters = @ComponentScan.Filter(
        type = FilterType.REGEX,
        pattern = "de\\.gradify\\.berechnung\\.config\\..*"
    )
)
@ActiveProfiles("test")
class BerechnungsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private BerechnungsService berechnungsService;

    @MockBean
    private NotenGrpcClient notenGrpcClient;

    @MockBean
    private StudiengangGrpcClient studiengangGrpcClient;

    @Test
    @DisplayName("GET /api/berechnungen/einschreibung/{id} - Gesamtnote gefunden")
    void getGesamtnote_Found() throws Exception {
        // Given
        BerechnungDto dto = BerechnungDto.builder()
            .einschreibungId(42L)
            .gesamtnote(new BigDecimal("2.3"))
            .gesamtnoteRoh(new BigDecimal("2.345"))
            .status("VORLAEUFIG")
            .moduleBestanden(10)
            .moduleGesamt(15)
            .berechnetAm(LocalDateTime.now())
            .build();

        when(berechnungsService.getGesamtnote(42L)).thenReturn(Optional.of(dto));

        // When / Then
        mockMvc.perform(get("/api/berechnungen/einschreibung/42"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.einschreibungId").value(42))
            .andExpect(jsonPath("$.data.gesamtnote").value(2.3))
            .andExpect(jsonPath("$.data.moduleBestanden").value(10));
    }

    @Test
    @DisplayName("GET /api/berechnungen/einschreibung/{id} - Nicht gefunden")
    void getGesamtnote_NotFound() throws Exception {
        // Given
        when(berechnungsService.getGesamtnote(999L)).thenReturn(Optional.empty());

        // When / Then
        mockMvc.perform(get("/api/berechnungen/einschreibung/999"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").value("Keine Berechnung gefunden fuer Einschreibung: 999"));
    }

    @Test
    @DisplayName("GET /api/berechnungen/einschreibung/{id}/fortschritt - Fortschritt gefunden")
    void getFortschritt_Found() throws Exception {
        // Given
        FortschrittDto dto = FortschrittDto.builder()
            .einschreibungId(42L)
            .ectsErreicht(90)
            .ectsGesamt(210)
            .moduleBestanden(15)
            .moduleOffen(20)
            .moduleNichtBestanden(0)
            .fortschrittProzent(new BigDecimal("42.9"))
            .build();

        when(berechnungsService.getFortschritt(42L)).thenReturn(Optional.of(dto));

        // When / Then
        mockMvc.perform(get("/api/berechnungen/einschreibung/42/fortschritt"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.ectsErreicht").value(90))
            .andExpect(jsonPath("$.data.ectsGesamt").value(210))
            .andExpect(jsonPath("$.data.fortschrittProzent").value(42.9));
    }

    @Test
    @DisplayName("GET /api/berechnungen/einschreibung/{id}/fortschritt - Kein Fortschritt (gibt 200 mit data=null)")
    void getFortschritt_NotFound_Returns200() throws Exception {
        // Given
        when(berechnungsService.getFortschritt(999L)).thenReturn(Optional.empty());

        // When / Then (200 statt 404 laut Controller-Logik)
        mockMvc.perform(get("/api/berechnungen/einschreibung/999/fortschritt"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data").isEmpty());
    }

    @Test
    @DisplayName("POST /api/berechnungen/einschreibung/{id}/berechnen - Einfache Berechnung")
    void berechneGesamtnote_Simple() throws Exception {
        // Given
        BerechnungDto dto = BerechnungDto.builder()
            .einschreibungId(42L)
            .gesamtnote(new BigDecimal("2.0"))
            .status("VORLAEUFIG")
            .moduleBestanden(5)
            .moduleGesamt(10)
            .build();

        when(berechnungsService.berechneGesamtnote(42L)).thenReturn(dto);

        // When / Then
        mockMvc.perform(post("/api/berechnungen/einschreibung/42/berechnen"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.gesamtnote").value(2.0))
            .andExpect(jsonPath("$.message").value("Berechnung durchgefuehrt"));
    }

    @Test
    @DisplayName("POST /api/berechnungen/einschreibung/{id}/berechnen - Vollstaendige Berechnung mit PO")
    void berechneGesamtnote_MitPO() throws Exception {
        // Given
        BerechnungDto dto = BerechnungDto.builder()
            .einschreibungId(42L)
            .gesamtnote(new BigDecimal("1.7"))
            .status("ENDGUELTIG")
            .moduleBestanden(35)
            .moduleGesamt(35)
            .build();

        when(berechnungsService.berechneGesamtnote(42L, 1L, 210)).thenReturn(dto);

        // When / Then
        mockMvc.perform(post("/api/berechnungen/einschreibung/42/berechnen")
                .param("poId", "1")
                .param("ectsGesamt", "210"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.gesamtnote").value(1.7));
    }

    @Test
    @DisplayName("POST /api/berechnungen/berechnen - Vollstaendige Berechnung mit Body")
    void berechneGesamtnoteVollstaendig() throws Exception {
        // Given
        BerechnungDto dto = BerechnungDto.builder()
            .einschreibungId(42L)
            .gesamtnote(new BigDecimal("2.3"))
            .status("VORLAEUFIG")
            .moduleBestanden(20)
            .moduleGesamt(35)
            .build();

        when(berechnungsService.berechneGesamtnote(42L, 1L, 210)).thenReturn(dto);

        // When / Then
        mockMvc.perform(post("/api/berechnungen/berechnen")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                        "einschreibungId": 42,
                        "pruefungsordnungId": 1,
                        "ectsGesamt": 210
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.gesamtnote").value(2.3));
    }

    @Test
    @DisplayName("GET /api/berechnungen/statistik/durchschnitt - Durchschnitt vorhanden")
    void getDurchschnittsnote_Found() throws Exception {
        // Given
        when(berechnungsService.getDurchschnittsnote()).thenReturn(new BigDecimal("2.1"));

        // When / Then
        mockMvc.perform(get("/api/berechnungen/statistik/durchschnitt"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data").value(2.1));
    }

    @Test
    @DisplayName("GET /api/berechnungen/berechnungsarten - Zeigt Formeln")
    void getBerechnungsarten() throws Exception {
        // When / Then
        mockMvc.perform(get("/api/berechnungen/berechnungsarten"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.GEWICHTET").exists())
            .andExpect(jsonPath("$.data.ARITHMETISCH_GEMISCHT").exists());
    }
}
