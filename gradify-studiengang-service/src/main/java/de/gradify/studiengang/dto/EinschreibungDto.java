package de.gradify.studiengang.dto;

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
public class EinschreibungDto {
    
    private UUID id;
    private UUID studentId;
    private String matrikelnummer;
    private String studentName;
    private UUID studiengangId;
    private String studiengangName;
    private UUID pruefungsordnungId;
    private String pruefungsordnungVersion;
    private String studienvariante;
    private LocalDate immatrikuliertAm;
    private LocalDate exmatrikuliertAm;
    private int aktuellesSemester;
    private String status;
}



