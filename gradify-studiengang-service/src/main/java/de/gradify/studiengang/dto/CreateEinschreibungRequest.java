package de.gradify.studiengang.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateEinschreibungRequest {
    
    @NotNull(message = "Student-ID darf nicht leer sein")
    private UUID studentId;
    
    @NotNull(message = "Studiengang-ID darf nicht leer sein")
    private UUID studiengangId;
    
    @NotNull(message = "Prüfungsordnung-ID darf nicht leer sein")
    private UUID pruefungsordnungId;
    
    private String studienvariante; // Optional, Default: ALLGEMEIN
    
    private LocalDate immatrikuliertAm; // Optional, Default: heute
}



