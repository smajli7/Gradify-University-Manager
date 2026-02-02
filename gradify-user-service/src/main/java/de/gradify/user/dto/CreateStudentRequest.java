package de.gradify.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
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
public class CreateStudentRequest {
    
    // Benutzer-Daten (werden mit erstellt wenn benutzerId null)
    private Long benutzerId;
    
    @NotBlank(message = "Vorname darf nicht leer sein")
    private String vorname;
    
    @NotBlank(message = "Nachname darf nicht leer sein")
    private String nachname;
    
    @NotBlank(message = "Email darf nicht leer sein")
    @Email(message = "Ungültiges Email-Format")
    private String email;
    
    // MandantId ist optional - wird über mandantKuerzel Query-Parameter ermittelt
    private Long mandantId;
    
    private LocalDate geburtsdatum;
    
    // Optionales Passwort (wird generiert wenn leer)
    private String passwort;
}
