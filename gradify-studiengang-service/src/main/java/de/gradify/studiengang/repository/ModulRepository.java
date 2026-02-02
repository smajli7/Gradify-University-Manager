package de.gradify.studiengang.repository;

import de.gradify.studiengang.entity.Modul;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ModulRepository extends JpaRepository<Modul, Long> {

    List<Modul> findByPruefungsordnungId(Long poId);

    Optional<Modul> findByPruefungsordnungIdAndModulNr(Long poId, String modulNr);

    @Query("SELECT m FROM Modul m WHERE m.pruefungsordnung.id = :poId AND m.inGesamtnote = true")
    List<Modul> findByPoIdAndInGesamtnoteTrue(@Param("poId") Long poId);

    @Query("SELECT m FROM Modul m WHERE m.pruefungsordnung.id = :poId AND m.modultyp = :modultyp")
    List<Modul> findByPoIdAndModultyp(@Param("poId") Long poId, @Param("modultyp") Modul.Modultyp modultyp);

    @Query("SELECT m FROM Modul m WHERE m.pruefungsordnung.id = :poId AND m.semester = :semester")
    List<Modul> findByPoIdAndSemester(@Param("poId") Long poId, @Param("semester") String semester);

    @Query("SELECT m FROM Modul m WHERE m.pruefungsordnung.id = :poId AND m.wahlpflichtGruppe = :gruppe")
    List<Modul> findByPoIdAndWahlpflichtGruppe(@Param("poId") Long poId, @Param("gruppe") String gruppe);

    @Query("SELECT SUM(m.ects) FROM Modul m WHERE m.pruefungsordnung.id = :poId")
    Integer sumEctsByPoId(@Param("poId") Long poId);
}



