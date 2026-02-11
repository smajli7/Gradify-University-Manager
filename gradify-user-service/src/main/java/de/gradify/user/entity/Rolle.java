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

    // Vordefinierte Rollen-Namen (müssen mit data.sql übereinstimmen!)
    public static final String ROLE_STUDENT = "ROLE_STUDENT";
    public static final String ROLE_LEHRENDER = "ROLE_LEHRENDER";
    public static final String ROLE_PRUEFUNGSAMT = "ROLE_PRUEFUNGSAMT";
    public static final String ROLE_STUDIENGANGLEITUNG = "ROLE_STUDIENGANGLEITUNG";
    public static final String ROLE_HOCHSCHUL_VERWALTER = "ROLE_HOCHSCHUL_VERWALTER";
    public static final String ROLE_ADMIN = "ROLE_ADMIN";
}




