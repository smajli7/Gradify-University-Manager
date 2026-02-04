package de.gradify.studiengang.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateMandantRequest {

    @NotBlank(message = "Name ist erforderlich")
    @Size(max = 100)
    private String name;

    @NotBlank(message = "Kürzel ist erforderlich")
    @Size(max = 10)
    private String kuerzel;
}
