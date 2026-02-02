package de.gradify.studiengang.repository;

import de.gradify.studiengang.entity.Einschreibung;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EinschreibungRepository extends JpaRepository<Einschreibung, Long> {

    List<Einschreibung> findByStudentId(Long studentId);

    Optional<Einschreibung> findByStudentIdAndStudiengangId(Long studentId, Long studiengangId);

    List<Einschreibung> findByStudiengangId(Long studiengangId);

    List<Einschreibung> findByPruefungsordnungId(Long poId);

    List<Einschreibung> findByStatus(Einschreibung.EinschreibungStatus status);

    @Query("SELECT e FROM Einschreibung e WHERE e.studentId = :studentId AND e.status = 'AKTIV'")
    List<Einschreibung> findAktiveByStudentId(@Param("studentId") Long studentId);

    @Query("SELECT e FROM Einschreibung e WHERE e.studiengang.id = :studiengangId AND e.status = 'AKTIV'")
    List<Einschreibung> findAktiveByStudiengangId(@Param("studiengangId") Long studiengangId);

    @Query("SELECT COUNT(e) FROM Einschreibung e WHERE e.studiengang.id = :studiengangId AND e.status = 'AKTIV'")
    Long countAktiveByStudiengangId(@Param("studiengangId") Long studiengangId);

    boolean existsByStudentIdAndStudiengangIdAndStatus(Long studentId, Long studiengangId, Einschreibung.EinschreibungStatus status);

    @Query("SELECT e FROM Einschreibung e JOIN FETCH e.studiengang JOIN FETCH e.pruefungsordnung WHERE e.id = :id")
    Optional<Einschreibung> findByIdWithDetails(@Param("id") Long id);
}



