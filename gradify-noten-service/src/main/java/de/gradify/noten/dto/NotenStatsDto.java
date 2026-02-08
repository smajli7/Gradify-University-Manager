package de.gradify.noten.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Aggregierte Statistik für Noten (z. B. für Dozenten-Dashboard).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotenStatsDto {
    private long total;
    private long erfasst;
    private long validiert;
    private long freigegeben;
}
