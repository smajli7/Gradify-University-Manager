package de.gradify.berechnung.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BerechnungDto {
    
    private Long einschreibungId;
    private String studiengang;
    private BigDecimal gesamtnote;
    private BigDecimal gesamtnoteRoh;
    private String status;
    private LocalDateTime berechnetAm;
    private int moduleBestanden;
    private int moduleGesamt;
}




