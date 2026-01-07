package de.gradify.studiengang.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "studiengaenge")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(of = "id")
public class Studiengang {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mandant_id", nullable = false)
    private Mandant mandant;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(nullable = false, unique = true, length = 20)
    private String kuerzel;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Abschlussart abschlussart;

    @Column(nullable = false)
    private int regelstudienzeit;

    @Column(nullable = false)
    private int gesamtEcts;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Studienvariante studienvariante = Studienvariante.ALLGEMEIN;

    @Column(nullable = false)
    @Builder.Default
    private boolean aktiv = true;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "aktuelle_po_id")
    private Pruefungsordnung aktuellePo;

    @CreationTimestamp
    private LocalDateTime erstelltAm;

    @UpdateTimestamp
    private LocalDateTime aktualisiertAm;

    public enum Abschlussart {
        BACHELOR,
        MASTER
    }

    public enum Studienvariante {
        ALLGEMEIN,
        DUAL
    }
}



