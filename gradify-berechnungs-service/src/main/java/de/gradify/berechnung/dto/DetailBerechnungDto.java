package de.gradify.berechnung.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DetailBerechnungDto {
    
    private UUID einschreibungId;
    private BigDecimal gesamtnote;
    private String berechnungsart;
    private List<ModulBeitrag> module;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ModulBeitrag {
        private UUID modulId;
        private String modulName;
        private String modulNr;
        private BigDecimal note;
        private BigDecimal gewichtung;
        private BigDecimal beitragZurGesamtnote;
        private boolean inBerechnung;
    }
}


