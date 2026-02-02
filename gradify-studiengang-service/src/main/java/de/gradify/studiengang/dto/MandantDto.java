package de.gradify.studiengang.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MandantDto {
    
    private Long id;
    private String name;
    private String kuerzel;
    private boolean aktiv;
}



