package de.gradify.berechnung.repository;

import de.gradify.berechnung.entity.Berechnungsergebnis;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BerechnungsergebnisRepository extends JpaRepository<Berechnungsergebnis, Long> {

    Optional<Berechnungsergebnis> findByEinschreibungId(Long einschreibungId);

    boolean existsByEinschreibungId(Long einschreibungId);

    List<Berechnungsergebnis> findByStatus(Berechnungsergebnis.BerechnungsStatus status);

    @Query("SELECT b FROM Berechnungsergebnis b WHERE b.gesamtnote IS NOT NULL ORDER BY b.gesamtnote ASC")
    List<Berechnungsergebnis> findAllWithGesamtnoteOrderByGesamtnote();

    @Query("SELECT b FROM Berechnungsergebnis b WHERE b.status = 'ENDGUELTIG' AND b.gesamtnote <= :note")
    List<Berechnungsergebnis> findEndgueltigeWithGesamtnoteLessThanEqual(@Param("note") java.math.BigDecimal note);

    @Query("SELECT AVG(b.gesamtnote) FROM Berechnungsergebnis b WHERE b.status = 'ENDGUELTIG' AND b.gesamtnote IS NOT NULL")
    java.math.BigDecimal calculateDurchschnittsnote();
}



