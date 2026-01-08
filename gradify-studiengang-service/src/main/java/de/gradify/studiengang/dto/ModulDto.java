package de.gradify.studiengang.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ModulDto {
    
    private UUID id;
    private String modulNr;
    private String name;
    private int ects;
    private String semester;
    private String modultyp;
    private String pruefungsform;
    private String bewertungsart;
    private BigDecimal gewichtung;
    private boolean inGesamtnote;
    private String wahlpflichtGruppe;
    private UUID pruefungsordnungId;
}
