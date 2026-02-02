package de.gradify.studiengang.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "pruefungsordnungen")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(of = "id")
public class Pruefungsordnung {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "studiengang_id", nullable = false)
    private Studiengang studiengang;

    @Column(nullable = false, length = 20)
    private String version;

    @Column(nullable = false)
    private LocalDate gueltigAb;

    private LocalDate gueltigBis;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Berechnungsart berechnungsart;

    @Column(length = 255)
    private String dokumentReferenz;

    @OneToMany(mappedBy = "pruefungsordnung", cascade = CascadeType.ALL)
    @Builder.Default
    private List<Modul> module = new ArrayList<>();

    @OneToOne(mappedBy = "pruefungsordnung", cascade = CascadeType.ALL)
    private PoRegelwerk regelwerk;

    @CreationTimestamp
    private LocalDateTime erstelltAm;

    public enum Berechnungsart {
        GEWICHTET,
        ARITHMETISCH_GEMISCHT
    }
}




