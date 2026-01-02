package de.gradify.studiengang.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "po_regelwerke")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(of = "id")
public class PoRegelwerk {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "po_id", nullable = false)
    private Pruefungsordnung pruefungsordnung;

    @Column(nullable = false, length = 100)
    private String regelName;

    @Column(columnDefinition = "TEXT")
    private String beschreibung;

    @Column(nullable = false, length = 500)
    private String formel;

    @Column(columnDefinition = "TEXT")
    private String parameterJson;
}


