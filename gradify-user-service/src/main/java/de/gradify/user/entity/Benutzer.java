package de.gradify.user.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "benutzer")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(of = "id")
public class Benutzer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String benutzername;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column(nullable = false)
    private String passwortHash;

    @Column(nullable = false, length = 50)
    private String vorname;

    @Column(nullable = false, length = 50)
    private String nachname;

    @Column(nullable = false)
    private Long mandantId;

    @Column(nullable = false)
    @Builder.Default
    private boolean aktiv = true;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "benutzer_rolle",
        joinColumns = @JoinColumn(name = "benutzer_id"),
        inverseJoinColumns = @JoinColumn(name = "rolle_id")
    )
    @Builder.Default
    private Set<Rolle> rollen = new HashSet<>();

    @OneToOne(mappedBy = "benutzer", cascade = CascadeType.ALL)
    private Student student;

    private LocalDateTime letzterLogin;

    @CreationTimestamp
    private LocalDateTime erstelltAm;

    @UpdateTimestamp
    private LocalDateTime aktualisiertAm;
}




