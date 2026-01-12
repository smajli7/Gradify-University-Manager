package de.gradify.studiengang.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "einschreibungen")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(of = "id")
public class Einschreibung {

    @Id
    private UUID id;
    
    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
    }

    @Column(nullable = false)
    private UUID studentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "studiengang_id", nullable = false)
    private Studiengang studiengang;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "po_id", nullable = false)
    private Pruefungsordnung pruefungsordnung;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Studiengang.Studienvariante studienvariante = Studiengang.Studienvariante.ALLGEMEIN;

    @Column(nullable = false)
    private LocalDate immatrikuliertAm;

    private LocalDate exmatrikuliertAm;

    @Column(nullable = false)
    @Builder.Default
    private int aktuellesSemester = 1;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private EinschreibungStatus status = EinschreibungStatus.AKTIV;

    @CreationTimestamp
    private LocalDateTime erstelltAm;

    public enum EinschreibungStatus {
        AKTIV,
        ABGESCHLOSSEN,
        ABGEBROCHEN
    }
}




