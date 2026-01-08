package de.gradify.noten.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
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
public class UpdateNoteRequest {
    
    @DecimalMin(value = "1.0", message = "Note muss mindestens 1.0 sein")
    @DecimalMax(value = "5.0", message = "Note darf maximal 5.0 sein")
    private BigDecimal noteWert;
    
    private Boolean bestanden;
    
    private LocalDate pruefungsdatum;
    
    private String kommentar;
}



