package de.gradify.berechnung.integration;

import de.gradify.berechnung.entity.Berechnungsergebnis;
import de.gradify.berechnung.entity.ModulBerechnung;
import de.gradify.berechnung.grpc.NotenGrpcClient;
import de.gradify.berechnung.grpc.StudiengangGrpcClient;
import de.gradify.berechnung.repository.BerechnungsergebnisRepository;
import de.gradify.berechnung.repository.ModulBerechnungRepository;
import de.gradify.berechnung.service.BerechnungsService;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integrationstests fuer Berechnungs-Service.
 * Testet Gesamtnote-Berechnung und Persistenz gegen echtes Postgres.
 * gRPC-Clients werden gemockt (getestet in E2E).
 */
@DisplayName("Berechnungs-Service Integration Tests")
class BerechnungsIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private BerechnungsergebnisRepository berechnungsergebnisRepository;

    @Autowired
    private ModulBerechnungRepository modulBerechnungRepository;

    @Autowired
    private BerechnungsService berechnungsService;

    @MockBean
    private NotenGrpcClient notenGrpcClient;

    @MockBean
    private StudiengangGrpcClient studiengangGrpcClient;

    @BeforeEach
    void setup() {
        modulBerechnungRepository.deleteAll();
        berechnungsergebnisRepository.deleteAll();
    }

    @Nested
    @DisplayName("aktualisiereBerechnung - Persistenz in Postgres")
    class BerechnungPersistenzTests {

        @Test
        @DisplayName("Bachelor GEWICHTET: Gesamtnote korrekt berechnet und gespeichert")
        void bachelorGewichtetWirdGespeichert() {
            // Given
            List<ModulBerechnung> module = new ArrayList<>(List.of(
                    createModul("1", "Mathematik I", "2.0", "2.0", true, true, 10),
                    createModul("2", "Physik", "1.5", "1.0", true, true, 5),
                    createModul("3", "Informatik", "2.5", "1.0", true, true, 5)
            ));
            // Erwartung: (2.0*2.0 + 1.5*1.0 + 2.5*1.0) / (2.0+1.0+1.0) = 8.0/4.0 = 2.0

            // When
            berechnungsService.aktualisiereBerechnung(1L, module, "GEWICHTET", 210);

            // Then: In Postgres pruefen
            assertThat(berechnungsergebnisRepository.count()).isEqualTo(1);
            Berechnungsergebnis ergebnis = berechnungsergebnisRepository.findByEinschreibungId(1L)
                    .orElseThrow();

            assertThat(ergebnis.getGesamtnote()).isEqualByComparingTo("2.0");
            assertThat(ergebnis.getModuleBestanden()).isEqualTo(3);
            assertThat(ergebnis.getEctsErreicht()).isEqualTo(20);
            assertThat(ergebnis.getEctsGesamt()).isEqualTo(210);
            assertThat(ergebnis.getStatus()).isEqualTo(Berechnungsergebnis.BerechnungsStatus.VORLAEUFIG);

            // ModulBerechnungen auch gespeichert
            assertThat(modulBerechnungRepository.findByBerechnungsergebnisId(ergebnis.getId()))
                    .hasSize(3);
        }

        @Test
        @DisplayName("Master ARITHMETISCH_GEMISCHT: Thesis-Formel korrekt")
        void masterArithmetischGemischtWirdGespeichert() {
            // Given: Master-Module nach PO FSA
            List<ModulBerechnung> module = new ArrayList<>(List.of(
                    createModul("1", "Paradigmatische Grundlegung", "1.7", "1.0", true, true, 10),
                    createModul("2", "Quantitative Forschungsmethoden", "2.0", "1.0", true, true, 10),
                    createModul("3", "Statistik I", "2.3", "1.0", true, true, 5),
                    createModul("12", "Master-Thesis mit Kolloquium", "1.3", "2.0", true, true, 30)
            ));
            // Modulmittel: (1.7 + 2.0 + 2.3) / 3 = 2.0
            // Gesamtnote: (2 * 1.3 + 2.0) / 3 = 1.533... => 1.5

            // When
            berechnungsService.aktualisiereBerechnung(1L, module, "ARITHMETISCH_GEMISCHT", 120);

            // Then
            Berechnungsergebnis ergebnis = berechnungsergebnisRepository.findByEinschreibungId(1L)
                    .orElseThrow();
            assertThat(ergebnis.getGesamtnote()).isEqualByComparingTo("1.5");
        }

        @Test
        @DisplayName("Status ENDGUELTIG wenn alle ECTS erreicht")
        void statusEndgueltigBeiAllenEcts() {
            // Given: Alle Module bestanden, genug ECTS
            List<ModulBerechnung> module = new ArrayList<>(List.of(
                    createModul("1", "Modul A", "2.0", "1.0", true, true, 100),
                    createModul("2", "Modul B", "2.0", "1.0", true, true, 110)
            ));

            // When
            berechnungsService.aktualisiereBerechnung(1L, module, "GEWICHTET", 210);

            // Then
            Berechnungsergebnis ergebnis = berechnungsergebnisRepository.findByEinschreibungId(1L)
                    .orElseThrow();
            assertThat(ergebnis.getStatus()).isEqualTo(Berechnungsergebnis.BerechnungsStatus.ENDGUELTIG);
        }

        @Test
        @DisplayName("Aktualisierung ueberschreibt vorhandene Berechnung")
        void aktualisierungUeberschreibtVorhandene() {
            // Given: Erste Berechnung
            List<ModulBerechnung> module1 = new ArrayList<>(List.of(
                    createModul("1", "Modul A", "3.0", "1.0", true, true, 5)
            ));
            berechnungsService.aktualisiereBerechnung(1L, module1, "GEWICHTET", 210);

            // When: Zweite Berechnung mit besserer Note
            List<ModulBerechnung> module2 = new ArrayList<>(List.of(
                    createModul("1", "Modul A", "2.0", "1.0", true, true, 5),
                    createModul("2", "Modul B", "1.0", "1.0", true, true, 5)
            ));
            berechnungsService.aktualisiereBerechnung(1L, module2, "GEWICHTET", 210);

            // Then: Nur eine Berechnung in DB (aktualisiert)
            assertThat(berechnungsergebnisRepository.count()).isEqualTo(1);
            Berechnungsergebnis ergebnis = berechnungsergebnisRepository.findByEinschreibungId(1L)
                    .orElseThrow();
            assertThat(ergebnis.getGesamtnote()).isEqualByComparingTo("1.5");
            assertThat(ergebnis.getModuleBestanden()).isEqualTo(2);
        }
    }

    @Nested
    @DisplayName("REST-API - GET /api/berechnungen/einschreibung/{id}")
    class RestApiTests {

        @Test
        @DisplayName("Gespeicherte Berechnung ueber REST abrufbar")
        void gespeicherteberechnungUeberRestAbrufbar() {
            // Given: Berechnung erstellen
            List<ModulBerechnung> module = new ArrayList<>(List.of(
                    createModul("1", "Modul A", "2.3", "1.0", true, true, 5)
            ));
            berechnungsService.aktualisiereBerechnung(42L, module, "GEWICHTET", 210);

            // When
            ResponseEntity<Map> response = restTemplate.exchange(
                    "/api/berechnungen/einschreibung/42", HttpMethod.GET,
                    new HttpEntity<>(authHeaders("ROLE_STUDENT")), Map.class);

            // Then
            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(response.getBody().get("success")).isEqualTo(true);

            Map<String, Object> data = (Map<String, Object>) response.getBody().get("data");
            assertThat(data.get("einschreibungId")).isEqualTo(42);
        }

        @Test
        @DisplayName("Nicht vorhandene Berechnung gibt 404")
        void nichtVorhandeneGibt404() {
            // When
            ResponseEntity<Map> response = restTemplate.exchange(
                    "/api/berechnungen/einschreibung/999", HttpMethod.GET,
                    new HttpEntity<>(authHeaders("ROLE_STUDENT")), Map.class);

            // Then
            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        }
    }

    private ModulBerechnung createModul(String modulNr, String name, String note,
                                         String gewichtung, boolean bestanden,
                                         boolean inGesamtnote, int ects) {
        return ModulBerechnung.builder()
                .modulId(Long.parseLong(modulNr.replaceAll("[^0-9]", "1")))
                .modulNr(modulNr)
                .modulName(name)
                .note(new BigDecimal(note))
                .gewichtung(new BigDecimal(gewichtung))
                .bestanden(bestanden)
                .inGesamtnote(inGesamtnote)
                .ects(ects)
                .build();
    }
}
