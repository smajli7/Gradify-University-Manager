package de.gradify.auth.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "refresh_tokens")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(of = "id")
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long benutzerId;

    @Column(nullable = false, unique = true, length = 500)
    private String token;

    @Column(nullable = false)
    private LocalDateTime gueltigBis;

    @Column(nullable = false)
    @Builder.Default
    private boolean widerrufen = false;

    @Column(length = 45)
    private String ipAdresse;

    @Column(length = 200)
    private String userAgent;

    @CreationTimestamp
    private LocalDateTime erstelltAm;

    private LocalDateTime widerrufenAm;

    public boolean isAbgelaufen() {
        return LocalDateTime.now().isAfter(gueltigBis);
    }

    public boolean isGueltig() {
        return !widerrufen && !isAbgelaufen();
    }
}



