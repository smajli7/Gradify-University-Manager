package de.gradify.user.dto;

import jakarta.validation.constraints.Email;
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
    
    // Benutzer-Daten (werden mit erstellt wenn benutzerId null)
    private UUID benutzerId;
    
    @NotBlank(message = "Vorname darf nicht leer sein")
    private String vorname;
    
    @NotBlank(message = "Nachname darf nicht leer sein")
    private String nachname;
    
    @NotBlank(message = "Email darf nicht leer sein")
    @Email(message = "Ungültiges Email-Format")
    private String email;
    
    @NotNull(message = "Mandant-ID darf nicht leer sein")
    private UUID mandantId;
    
    private LocalDate geburtsdatum;
    
    // Optionales Passwort (wird generiert wenn leer)
    private String passwort;
}
