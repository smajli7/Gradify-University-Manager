package de.gradify.berechnung.repository;

import de.gradify.berechnung.entity.ModulBerechnung;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ModulBerechnungRepository extends JpaRepository<ModulBerechnung, Long> {

    List<ModulBerechnung> findByBerechnungsergebnisId(Long berechnungsergebnisId);

    @Query("SELECT m FROM ModulBerechnung m WHERE m.berechnungsergebnis.id = :berechnungsergebnisId AND m.inGesamtnote = true")
    List<ModulBerechnung> findByBerechnungsergebnisIdAndInGesamtnoteTrue(@Param("berechnungsergebnisId") Long berechnungsergebnisId);

    @Query("SELECT SUM(m.ects) FROM ModulBerechnung m WHERE m.berechnungsergebnis.id = :berechnungsergebnisId AND m.bestanden = true")
    Integer sumEctsBestandenByBerechnungsergebnisId(@Param("berechnungsergebnisId") Long berechnungsergebnisId);

    void deleteByBerechnungsergebnisId(Long berechnungsergebnisId);
}



