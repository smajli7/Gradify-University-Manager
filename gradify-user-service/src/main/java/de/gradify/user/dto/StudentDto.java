package de.gradify.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentDto {
    
    private Long id;
    private Long benutzerId;
    private String matrikelnummer;
    private String vorname;
    private String nachname;
    private String email;
    private LocalDate geburtsdatum;
    private String status;
}




