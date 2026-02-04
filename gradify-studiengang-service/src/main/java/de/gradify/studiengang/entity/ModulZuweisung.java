package de.gradify.studiengang.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Zuordnung: Welcher Dozent unterrichtet welches Modul.
 */
@Entity
@Table(name = "modul_zuweisungen")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ModulZuweisung {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * ID des Dozenten (aus User-Service)
     */
    @Column(nullable = false)
    private Long dozentId;

    /**
     * ID des Moduls
     */
    @Column(nullable = false)
    private Long modulId;

    /**
     * Optionale Beschreibung der Zuweisung
     */
    private String bemerkung;
}
