package de.gradify.studiengang.repository;

import de.gradify.studiengang.entity.Pruefungsordnung;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PruefungsordnungRepository extends JpaRepository<Pruefungsordnung, UUID> {

    List<Pruefungsordnung> findByStudiengangId(UUID studiengangId);

    Optional<Pruefungsordnung> findByStudiengangIdAndVersion(UUID studiengangId, String version);

    @Query("SELECT p FROM Pruefungsordnung p WHERE p.studiengang.id = :studiengangId AND p.gueltigAb <= :datum AND (p.gueltigBis IS NULL OR p.gueltigBis >= :datum)")
    Optional<Pruefungsordnung> findAktuelleByStudiengangId(@Param("studiengangId") UUID studiengangId, @Param("datum") LocalDate datum);

    @Query("SELECT p FROM Pruefungsordnung p WHERE p.studiengang.id = :studiengangId ORDER BY p.gueltigAb DESC")
    List<Pruefungsordnung> findByStudiengangIdOrderByGueltigAbDesc(@Param("studiengangId") UUID studiengangId);
}

