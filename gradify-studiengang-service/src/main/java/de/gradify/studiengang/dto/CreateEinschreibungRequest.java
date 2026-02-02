package de.gradify.studiengang.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateEinschreibungRequest {
    
    @NotNull(message = "Student-ID darf nicht leer sein")
    private Long studentId;
    
    @NotNull(message = "Studiengang-ID darf nicht leer sein")
    private Long studiengangId;
    
    @NotNull(message = "Prüfungsordnung-ID darf nicht leer sein")
    private Long pruefungsordnungId;
    
    private String studienvariante; // Optional, Default: ALLGEMEIN
    
    private LocalDate immatrikuliertAm; // Optional, Default: heute
}



