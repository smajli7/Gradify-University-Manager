package de.gradify.studiengang.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Speichert die Wahlpflicht-Auswahl eines Studenten pro Einschreibung und Gruppe.
 * Beispiel: Einschreibung 21, Gruppe "FP" → Modul 5.1 (qualitativ-rekonstruktiv)
 */
@Entity
@Table(name = "wahlpflicht_wahlen",
       uniqueConstraints = @UniqueConstraint(columnNames = {"einschreibung_id", "wahlpflicht_gruppe"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WahlpflichtWahl {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "einschreibung_id", nullable = false)
    private Long einschreibungId;

    @Column(name = "wahlpflicht_gruppe", nullable = false, length = 20)
    private String wahlpflichtGruppe;

    @Column(name = "modul_id", nullable = false)
    private Long modulId;

    @CreationTimestamp
    @Column(name = "erstellt_am")
    private LocalDateTime erstelltAm;
}
