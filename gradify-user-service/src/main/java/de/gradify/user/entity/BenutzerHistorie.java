package de.gradify.user.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "benutzer_historie")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BenutzerHistorie {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "benutzer_id")
    private Long benutzerId;

    @Column(name = "benutzername")
    private String benutzername;

    @Column(name = "aenderungs_typ")
    @Enumerated(EnumType.STRING)
    private AenderungsTyp aenderungsTyp;

    @Column(name = "geaendert_von")
    private Long geaendertVon;

    @Column(name = "geaendert_am")
    private LocalDateTime geaendertAm;

    @Column(name = "details", length = 1000)
    private String details;

    public enum AenderungsTyp {
        ERSTELLT,
        GELOESCHT
    }
}
