package de.gradify.noten.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "noten_historie")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(of = "id")
public class NotenHistorie {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID noteId;

    @Column(nullable = false)
    private UUID geaendertVon;

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
        STORNIERT
    }
}


