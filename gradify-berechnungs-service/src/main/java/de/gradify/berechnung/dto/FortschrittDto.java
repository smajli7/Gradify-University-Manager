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
public class FortschrittDto {
    
    private UUID einschreibungId;
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
        private UUID modulId;
        private String modulName;
        private String modulNr;
        private int ects;
        private String semester;
    }
}




