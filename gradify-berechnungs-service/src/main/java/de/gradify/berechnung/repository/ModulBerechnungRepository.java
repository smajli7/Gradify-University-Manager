package de.gradify.berechnung.repository;

import de.gradify.berechnung.entity.ModulBerechnung;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ModulBerechnungRepository extends JpaRepository<ModulBerechnung, UUID> {

    List<ModulBerechnung> findByBerechnungsergebnisId(UUID berechnungsergebnisId);

    @Query("SELECT m FROM ModulBerechnung m WHERE m.berechnungsergebnis.id = :berechnungsergebnisId AND m.inGesamtnote = true")
    List<ModulBerechnung> findByBerechnungsergebnisIdAndInGesamtnoteTrue(@Param("berechnungsergebnisId") UUID berechnungsergebnisId);

    @Query("SELECT SUM(m.ects) FROM ModulBerechnung m WHERE m.berechnungsergebnis.id = :berechnungsergebnisId AND m.bestanden = true")
    Integer sumEctsBestandenByBerechnungsergebnisId(@Param("berechnungsergebnisId") UUID berechnungsergebnisId);

    void deleteByBerechnungsergebnisId(UUID berechnungsergebnisId);
}

