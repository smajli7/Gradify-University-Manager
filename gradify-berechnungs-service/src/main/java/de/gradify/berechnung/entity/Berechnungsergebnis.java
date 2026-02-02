package de.gradify.berechnung.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "berechnungsergebnisse")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(of = "id")
public class Berechnungsergebnis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private Long einschreibungId;

    @Column(precision = 2, scale = 1)
    private BigDecimal gesamtnote;

    @Column(precision = 4, scale = 3)
    private BigDecimal gesamtnoteRoh;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private BerechnungsStatus status = BerechnungsStatus.VORLAEUFIG;

    @Column(nullable = false)
    private int moduleBestanden;

    @Column(nullable = false)
    private int moduleGesamt;

    @Column(nullable = false)
    private int ectsErreicht;

    @Column(nullable = false)
    private int ectsGesamt;

    @CreationTimestamp
    private LocalDateTime erstelltAm;

    @UpdateTimestamp
    private LocalDateTime berechnetAm;

    public enum BerechnungsStatus {
        VORLAEUFIG,
        ENDGUELTIG
    }
}




