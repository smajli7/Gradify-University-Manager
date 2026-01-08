package de.gradify.studiengang.repository;

import de.gradify.studiengang.entity.Modul;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ModulRepository extends JpaRepository<Modul, UUID> {

    List<Modul> findByPruefungsordnungId(UUID poId);

    Optional<Modul> findByPruefungsordnungIdAndModulNr(UUID poId, String modulNr);

    @Query("SELECT m FROM Modul m WHERE m.pruefungsordnung.id = :poId AND m.inGesamtnote = true")
    List<Modul> findByPoIdAndInGesamtnoteTrue(@Param("poId") UUID poId);

    @Query("SELECT m FROM Modul m WHERE m.pruefungsordnung.id = :poId AND m.modultyp = :modultyp")
    List<Modul> findByPoIdAndModultyp(@Param("poId") UUID poId, @Param("modultyp") Modul.Modultyp modultyp);

    @Query("SELECT m FROM Modul m WHERE m.pruefungsordnung.id = :poId AND m.semester = :semester")
    List<Modul> findByPoIdAndSemester(@Param("poId") UUID poId, @Param("semester") String semester);

    @Query("SELECT m FROM Modul m WHERE m.pruefungsordnung.id = :poId AND m.wahlpflichtGruppe = :gruppe")
    List<Modul> findByPoIdAndWahlpflichtGruppe(@Param("poId") UUID poId, @Param("gruppe") String gruppe);

    @Query("SELECT SUM(m.ects) FROM Modul m WHERE m.pruefungsordnung.id = :poId")
    Integer sumEctsByPoId(@Param("poId") UUID poId);
}



