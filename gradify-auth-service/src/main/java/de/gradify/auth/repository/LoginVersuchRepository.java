package de.gradify.auth.repository;

import de.gradify.auth.entity.LoginVersuch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface LoginVersuchRepository extends JpaRepository<LoginVersuch, UUID> {

    @Query("SELECT COUNT(l) FROM LoginVersuch l WHERE l.benutzername = :benutzername AND l.erfolgreich = false AND l.zeitpunkt > :seit")
    long countFehlgeschlageneVersucheSeit(@Param("benutzername") String benutzername, @Param("seit") LocalDateTime seit);

    @Query("SELECT COUNT(l) FROM LoginVersuch l WHERE l.ipAdresse = :ip AND l.erfolgreich = false AND l.zeitpunkt > :seit")
    long countFehlgeschlageneVersucheVonIpSeit(@Param("ip") String ip, @Param("seit") LocalDateTime seit);

    List<LoginVersuch> findTop10ByBenutzernameOrderByZeitpunktDesc(String benutzername);

    @Query("SELECT l FROM LoginVersuch l WHERE l.erfolgreich = false AND l.zeitpunkt > :seit ORDER BY l.zeitpunkt DESC")
    List<LoginVersuch> findFehlgeschlageneSeit(@Param("seit") LocalDateTime seit);
}


