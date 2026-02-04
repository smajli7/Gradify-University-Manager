package de.gradify.user.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "rollen")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(of = "id")
public class Rolle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String name;

    @Column(length = 200)
    private String beschreibung;

    // Vordefinierte Rollen-Namen
    public static final String ROLE_STUDENT = "STUDENT";
    public static final String ROLE_LEHRENDER = "LEHRENDER";
    public static final String ROLE_PRUEFUNGSAMT = "PRUEFUNGSAMT";
    public static final String ROLE_STUDIENGANGLEITUNG = "STUDIENGANGLEITUNG";
    public static final String ROLE_HOCHSCHUL_VERWALTER = "HOCHSCHUL_VERWALTER";
    public static final String ROLE_ADMIN = "ADMIN";
}




