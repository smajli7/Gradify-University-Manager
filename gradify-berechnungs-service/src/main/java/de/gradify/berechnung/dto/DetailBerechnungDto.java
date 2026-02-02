package de.gradify.berechnung.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DetailBerechnungDto {
    
    private Long einschreibungId;
    private BigDecimal gesamtnote;
    private String berechnungsart;
    private List<ModulBeitrag> module;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ModulBeitrag {
        private Long modulId;
        private String modulName;
        private String modulNr;
        private BigDecimal note;
        private BigDecimal gewichtung;
        private BigDecimal beitragZurGesamtnote;
        private boolean inBerechnung;
    }
}




