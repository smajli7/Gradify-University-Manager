package de.gradify.noten.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "noten_historie")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(of = "id")
public class NotenHistorie {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long noteId;

    private Long einschreibungId;

    private Long modulId;

    @Column(nullable = false)
    private Long geaendertVon;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AenderungsTyp aenderungsTyp;

    @Column(precision = 2, scale = 1)
    private BigDecimal alterWert;

    @Column(precision = 2, scale = 1)
    private BigDecimal neuerWert;

    @Column(length = 500)
    private String kommentar;

    @CreationTimestamp
    private LocalDateTime geaendertAm;

    public enum AenderungsTyp {
        ERSTELLT,
        NOTE_GEAENDERT,
        VALIDIERT,
        FREIGEGEBEN,
        FREIGABE_ZURUECKGENOMMEN,
        STORNIERT
    }
}




