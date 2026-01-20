package de.gradify.studiengang.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

/**
 * Zuordnung: Welcher Dozent unterrichtet welches Modul.
 * Ein Dozent kann max. 3 Module unterrichten.
 */
@Entity
@Table(name = "modul_zuweisungen")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ModulZuweisung {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /**
     * ID des Dozenten (aus User-Service)
     */
    @Column(nullable = false)
    private UUID dozentId;

    /**
     * ID des Moduls
     */
    @Column(nullable = false)
    private UUID modulId;

    /**
     * Optionale Beschreibung der Zuweisung
     */
    private String bemerkung;
}
