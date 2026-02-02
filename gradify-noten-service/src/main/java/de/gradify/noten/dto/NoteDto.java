package de.gradify.noten.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NoteDto {
    
    private Long id;
    private Long einschreibungId;
    private Long modulId;
    private BigDecimal noteWert;
    private Boolean bestanden;
    private int versuch;
    private LocalDate pruefungsdatum;
    private String status;
    private String kommentar;
    private Long erfasstVon;
    private LocalDateTime erfasstAm;
    private Long validiertVon;
    private LocalDateTime validiertAm;
}




