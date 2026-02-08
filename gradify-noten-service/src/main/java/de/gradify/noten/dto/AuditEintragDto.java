package de.gradify.noten.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class AuditEintragDto {

    private Long id;
    private Long noteId;
    private Long einschreibungId;
    private Long modulId;
    private Long geaendertVon;
    private String geaendertVonName;  // optional, z. B. aus User-Service
    private String aenderungsTyp;
    private BigDecimal alterWert;
    private BigDecimal neuerWert;
    private String kommentar;
    private LocalDateTime geaendertAm;
}
