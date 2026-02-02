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
public class FortschrittDto {
    
    private Long einschreibungId;
    private int ectsErreicht;
    private int ectsGesamt;
    private BigDecimal fortschrittProzent;
    private int moduleBestanden;
    private int moduleOffen;
    private int moduleNichtBestanden;
    private List<OffeneModulInfo> offeneModule;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OffeneModulInfo {
        private Long modulId;
        private String modulName;
        private String modulNr;
        private int ects;
        private String semester;
    }
}




