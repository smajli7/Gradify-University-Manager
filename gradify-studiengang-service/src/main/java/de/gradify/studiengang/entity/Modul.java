package de.gradify.studiengang.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "module")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(of = "id")
public class Modul {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "po_id", nullable = false)
    private Pruefungsordnung pruefungsordnung;

    @Column(nullable = false, length = 10)
    private String modulNr;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(length = 200)
    private String nameEn;

    @Column(nullable = false)
    private int ects;

    @Column(nullable = false, length = 10)
    private String semester;

    @Column(nullable = false)
    @Builder.Default
    private int dauerSemester = 1;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Pruefungsform pruefungsform;

    @Column(length = 200)
    private String pruefungsdauer;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Sprache sprache = Sprache.DEUTSCH;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Modultyp modultyp;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Bewertungsart bewertungsart;

    @Column(nullable = false, precision = 3, scale = 1)
    private BigDecimal gewichtung;

    @Column(nullable = false)
    @Builder.Default
    private boolean inGesamtnote = true;

    @Column(length = 500)
    private String vorleistung;

    @Column(length = 20)
    private String wahlpflichtGruppe;

    public enum Pruefungsform {
        KLAUSUR,
        HAUSARBEIT,
        MUENDLICH,
        PROJEKT,
        PORTFOLIO,
        PRAESENTATION,
        PRAXISBERICHT
    }

    public enum Sprache {
        DEUTSCH,
        ENGLISCH
    }

    public enum Modultyp {
        PFLICHT,
        WAHLPFLICHT,
        ZUSATZ
    }

    public enum Bewertungsart {
        NOTE,
        BESTANDEN_NICHT_BESTANDEN
    }
}




