package de.gradify.noten.dto;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateNoteRequest {
    
    @NotNull(message = "Einschreibungs-ID darf nicht leer sein")
    private Long einschreibungId;
    
    @NotNull(message = "Modul-ID darf nicht leer sein")
    private Long modulId;
    
    @DecimalMin(value = "1.0", message = "Note muss mindestens 1.0 sein")
    @DecimalMax(value = "5.0", message = "Note darf maximal 5.0 sein")
    private BigDecimal noteWert;
    
    private Boolean bestanden;
    
    @NotNull(message = "Prüfungsdatum darf nicht leer sein")
    private LocalDate pruefungsdatum;
    
    @Min(value = 0, message = "Versuch muss mindestens 0 sein (0 = automatisch)")
    @Max(value = 4, message = "Versuch darf maximal 4 sein")
    private int versuch;
    
    private String kommentar;
}




