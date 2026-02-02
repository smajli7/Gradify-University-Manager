package de.gradify.studiengang.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudiengangDto {
    
    private Long id;
    private String name;
    private String kuerzel;
    private String abschlussart;
    private int regelstudienzeit;
    private int gesamtEcts;
    private String studienvariante;
    private boolean aktiv;
    private Long mandantId;
    private String mandantName;
    private Long aktuellePoId;
    private String aktuellePoVersion;
    private LocalDateTime erstelltAm;
}
