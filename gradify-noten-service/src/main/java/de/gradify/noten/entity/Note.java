package de.gradify.noten.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "noten")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(of = "id")
public class Note {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID einschreibungId;

    @Column(nullable = false)
    private UUID modulId;

    @Column(nullable = false)
    private UUID erfasstVon;

    @Column(precision = 2, scale = 1)
    private BigDecimal noteWert;

    private Boolean bestanden;

    @Column(nullable = false)
    @Builder.Default
    private int versuch = 1;

    @Column(nullable = false)
    private LocalDate pruefungsdatum;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private NoteStatus status = NoteStatus.ERFASST;

    @Column(length = 500)
    private String kommentar;

    @CreationTimestamp
    private LocalDateTime erfasstAm;

    private LocalDateTime validiertAm;

    private UUID validiertVon;

    public enum NoteStatus {
        ERFASST,
        VALIDIERT,
        FREIGEGEBEN
    }
}



