package de.gradify.user.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "studenten")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(of = "id")
public class Student {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "benutzer_id", nullable = false)
    private Benutzer benutzer;

    @Column(nullable = false, unique = true, length = 20)
    private String matrikelnummer;

    private LocalDate geburtsdatum;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private StudentStatus status = StudentStatus.AKTIV;

    @CreationTimestamp
    private LocalDateTime erstelltAm;

    public enum StudentStatus {
        AKTIV,
        BEURLAUBT,
        EXMATRIKULIERT
    }
}


