package de.gradify.studiengang.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudiengangDto {
    
    private UUID id;
    private String name;
    private String kuerzel;
    private String abschlussart;
    private int regelstudienzeit;
    private int gesamtEcts;
    private String studienvariante;
    private boolean aktiv;
    private UUID mandantId;
    private String mandantName;
    private UUID aktuellePoId;
    private String aktuellePoVersion;
    private LocalDateTime erstelltAm;
}
