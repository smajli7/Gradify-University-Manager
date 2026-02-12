package de.gradify.user.repository;

import de.gradify.user.entity.BenutzerHistorie;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface BenutzerHistorieRepository extends JpaRepository<BenutzerHistorie, Long> {

    List<BenutzerHistorie> findByBenutzerIdOrderByGeaendertAmDesc(Long benutzerId);

    @Query("SELECT h FROM BenutzerHistorie h WHERE " +
           "(:benutzerId IS NULL OR h.benutzerId = :benutzerId) AND " +
           "(:aenderungsTyp IS NULL OR h.aenderungsTyp = :aenderungsTyp) AND " +
           "(:vonDatum IS NULL OR h.geaendertAm >= :vonDatum) AND " +
           "(:bisDatum IS NULL OR h.geaendertAm <= :bisDatum) " +
           "ORDER BY h.geaendertAm DESC")
    List<BenutzerHistorie> findAuditEintraege(
            @Param("benutzerId") Long benutzerId,
            @Param("aenderungsTyp") BenutzerHistorie.AenderungsTyp aenderungsTyp,
            @Param("vonDatum") LocalDateTime vonDatum,
            @Param("bisDatum") LocalDateTime bisDatum
    );

    @Query("SELECT h FROM BenutzerHistorie h ORDER BY h.geaendertAm DESC")
    List<BenutzerHistorie> findAllOrderByGeaendertAmDesc();
}
