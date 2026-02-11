package de.gradify.studiengang.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Protokoll (Audit-Log) fuer Aenderungen an Modul-Zuweisungen (Dozent-Modul).
 */
@Entity
@Table(name = "modul_zuweisung_historie")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(of = "id")
public class ModulZuweisungHistorie {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long dozentId;

    @Column(nullable = false)
    private Long modulId;

    @Column(nullable = false)
    private Long geaendertVon;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AenderungsTyp aenderungsTyp;

    @Column(length = 500)
    private String kommentar;

    @CreationTimestamp
    private LocalDateTime geaendertAm;

    public enum AenderungsTyp {
        ZUWEISUNG_ERSTELLT,
        ZUWEISUNG_GELOESCHT
    }
}
