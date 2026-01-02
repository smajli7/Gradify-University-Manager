package de.gradify.noten.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NoteDto {
    
    private UUID id;
    private UUID einschreibungId;
    private UUID modulId;
    private BigDecimal noteWert;
    private Boolean bestanden;
    private int versuch;
    private LocalDate pruefungsdatum;
    private String status;
    private String kommentar;
    private UUID erfasstVon;
    private LocalDateTime erfasstAm;
    private UUID validiertVon;
    private LocalDateTime validiertAm;
}


