package de.gradify.studiengang.repository;

import de.gradify.studiengang.entity.Einschreibung;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EinschreibungRepository extends JpaRepository<Einschreibung, UUID> {

    List<Einschreibung> findByStudentId(UUID studentId);

    Optional<Einschreibung> findByStudentIdAndStudiengangId(UUID studentId, UUID studiengangId);

    List<Einschreibung> findByStudiengangId(UUID studiengangId);

    List<Einschreibung> findByPruefungsordnungId(UUID poId);

    List<Einschreibung> findByStatus(Einschreibung.EinschreibungStatus status);

    @Query("SELECT e FROM Einschreibung e WHERE e.studentId = :studentId AND e.status = 'AKTIV'")
    List<Einschreibung> findAktiveByStudentId(@Param("studentId") UUID studentId);

    @Query("SELECT e FROM Einschreibung e WHERE e.studiengang.id = :studiengangId AND e.status = 'AKTIV'")
    List<Einschreibung> findAktiveByStudiengangId(@Param("studiengangId") UUID studiengangId);

    @Query("SELECT COUNT(e) FROM Einschreibung e WHERE e.studiengang.id = :studiengangId AND e.status = 'AKTIV'")
    Long countAktiveByStudiengangId(@Param("studiengangId") UUID studiengangId);

    boolean existsByStudentIdAndStudiengangIdAndStatus(UUID studentId, UUID studiengangId, Einschreibung.EinschreibungStatus status);
}


