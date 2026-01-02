package de.gradify.auth.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "login_versuche")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(of = "id")
public class LoginVersuch {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 100)
    private String benutzername;

    @Column(length = 45)
    private String ipAdresse;

    @Column(nullable = false)
    private boolean erfolgreich;

    @Column(length = 200)
    private String fehlergrund;

    @CreationTimestamp
    private LocalDateTime zeitpunkt;
}

