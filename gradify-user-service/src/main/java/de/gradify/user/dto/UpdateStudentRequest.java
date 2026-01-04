package de.gradify.user.dto;

import jakarta.validation.constraints.Email;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateStudentRequest {
    
    private String vorname;
    
    private String nachname;
    
    @Email(message = "Ungültiges Email-Format")
    private String email;
    
    private LocalDate geburtsdatum;
    
    private String status; // AKTIV, BEURLAUBT, EXMATRIKULIERT
}

