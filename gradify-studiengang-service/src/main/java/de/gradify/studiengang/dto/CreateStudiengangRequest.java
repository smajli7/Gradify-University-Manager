package de.gradify.studiengang.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Request-DTO zum Erstellen eines neuen Studiengangs.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateStudiengangRequest {

    @NotNull(message = "Mandant-ID ist erforderlich")
    private UUID mandantId;

    @NotBlank(message = "Name ist erforderlich")
    @Size(max = 150, message = "Name darf maximal 150 Zeichen haben")
    private String name;

    @NotBlank(message = "Kürzel ist erforderlich")
    @Size(max = 20, message = "Kürzel darf maximal 20 Zeichen haben")
    private String kuerzel;

    @NotBlank(message = "Abschlussart ist erforderlich")
    private String abschlussart; // BACHELOR, MASTER

    @Min(value = 1, message = "Regelstudienzeit muss mindestens 1 sein")
    private int regelstudienzeit;

    @Min(value = 1, message = "Gesamt-ECTS muss mindestens 1 sein")
    private int gesamtEcts;

    private String studienvariante; // ALLGEMEIN, DUAL (default: ALLGEMEIN)

    @Builder.Default
    private boolean aktiv = true;
}
