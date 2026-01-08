package de.gradify.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginRequest {
    
    @NotBlank(message = "Benutzername darf nicht leer sein")
    private String username;
    
    @NotBlank(message = "Passwort darf nicht leer sein")
    private String password;
}




