package de.gradify.auth.repository;

import de.gradify.auth.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByToken(String token);

    List<RefreshToken> findByBenutzerIdAndWiderrufenFalse(Long benutzerId);

    @Modifying
    @Transactional
    @Query("UPDATE RefreshToken r SET r.widerrufen = true, r.widerrufenAm = :now WHERE r.benutzerId = :benutzerId AND r.widerrufen = false")
    int widerrufeAlleByBenutzerId(@Param("benutzerId") Long benutzerId, @Param("now") LocalDateTime now);

    @Modifying
    @Transactional
    @Query("DELETE FROM RefreshToken r WHERE r.gueltigBis < :now OR r.widerrufen = true")
    int deleteAbgelaufeneUndWiderrufene(@Param("now") LocalDateTime now);

    long countByBenutzerIdAndWiderrufenFalseAndGueltigBisAfter(Long benutzerId, LocalDateTime now);
}



