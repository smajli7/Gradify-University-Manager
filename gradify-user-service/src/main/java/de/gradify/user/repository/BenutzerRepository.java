package de.gradify.user.repository;

import de.gradify.user.entity.Benutzer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BenutzerRepository extends JpaRepository<Benutzer, UUID> {

    Optional<Benutzer> findByBenutzername(String benutzername);

    Optional<Benutzer> findByEmail(String email);

    boolean existsByBenutzername(String benutzername);

    boolean existsByEmail(String email);

    List<Benutzer> findByMandantId(UUID mandantId);

    List<Benutzer> findByAktivTrue();

    @Query("SELECT b FROM Benutzer b JOIN b.rollen r WHERE r.name = :rollenName")
    List<Benutzer> findByRollenName(@Param("rollenName") String rollenName);

    @Query("SELECT b FROM Benutzer b JOIN b.rollen r WHERE r.name = :rollenName AND b.mandantId = :mandantId")
    List<Benutzer> findByRollenNameAndMandantId(@Param("rollenName") String rollenName, @Param("mandantId") UUID mandantId);
}



