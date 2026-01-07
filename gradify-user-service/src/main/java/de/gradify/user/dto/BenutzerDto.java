package de.gradify.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BenutzerDto {
    
    private UUID id;
    private String benutzername;
    private String email;
    private String vorname;
    private String nachname;
    private UUID mandantId;
    private boolean aktiv;
    private Set<String> rollen;
    private LocalDateTime letzterLogin;
    private LocalDateTime erstelltAm;
}



