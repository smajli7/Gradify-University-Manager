package de.gradify.user.dto;

import jakarta.validation.constraints.NotBlank;
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
public class CreateStudentRequest {
    
    @NotNull(message = "Benutzer-ID darf nicht leer sein")
    private UUID benutzerId;
    
    @NotBlank(message = "Matrikelnummer darf nicht leer sein")
    private String matrikelnummer;
    
    private LocalDate geburtsdatum;
}


