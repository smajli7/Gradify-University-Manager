package de.gradify.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateBenutzerRequest {

    @NotBlank(message = "Benutzername darf nicht leer sein")
    @Size(min = 3, max = 50, message = "Benutzername muss zwischen 3 und 50 Zeichen lang sein")
    private String benutzername;

    @NotBlank(message = "E-Mail darf nicht leer sein")
    @Email(message = "Ungültige E-Mail-Adresse")
    private String email;

    /** Optional – nur setzen wenn Passwort geändert werden soll */
    @Size(min = 8, message = "Passwort muss mindestens 8 Zeichen lang sein (wenn angegeben)")
    private String passwort;

    @NotBlank(message = "Vorname darf nicht leer sein")
    private String vorname;

    @NotBlank(message = "Nachname darf nicht leer sein")
    private String nachname;

    private Set<Long> rollenIds;
}
