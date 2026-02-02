package de.gradify.studiengang.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EinschreibungDto {
    
    private Long id;
    private Long studentId;
    private String matrikelnummer;
    private String studentName;
    private Long studiengangId;
    private String studiengangName;
    private Long pruefungsordnungId;
    private String pruefungsordnungVersion;
    private String studienvariante;
    private LocalDate immatrikuliertAm;
    private LocalDate exmatrikuliertAm;
    private int aktuellesSemester;
    private String status;
}



