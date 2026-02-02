package de.gradify.berechnung.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "modul_berechnungen")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(of = "id")
public class ModulBerechnung {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "berechnungsergebnis_id", nullable = false)
    private Berechnungsergebnis berechnungsergebnis;

    @Column(nullable = false)
    private Long modulId;

    @Column(nullable = false, length = 10)
    private String modulNr;

    @Column(nullable = false, length = 200)
    private String modulName;

    @Column(precision = 2, scale = 1)
    private BigDecimal note;

    @Column(nullable = false, precision = 3, scale = 1)
    private BigDecimal gewichtung;

    @Column(nullable = false)
    private boolean inGesamtnote;

    @Column(nullable = false)
    private boolean bestanden;

    @Column(nullable = false)
    private int ects;

    @Column(precision = 4, scale = 3)
    private BigDecimal gewichteterBeitrag;
}



