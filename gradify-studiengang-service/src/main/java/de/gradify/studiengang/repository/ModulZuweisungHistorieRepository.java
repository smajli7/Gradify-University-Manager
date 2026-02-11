package de.gradify.studiengang.repository;

import de.gradify.studiengang.entity.ModulZuweisungHistorie;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface ModulZuweisungHistorieRepository extends JpaRepository<ModulZuweisungHistorie, Long> {

    @Query("SELECT h FROM ModulZuweisungHistorie h WHERE " +
            "(:vonDatum IS NULL OR h.geaendertAm >= :vonDatum) AND " +
            "(:bisDatum IS NULL OR h.geaendertAm <= :bisDatum) AND " +
            "(:aenderungsTyp IS NULL OR h.aenderungsTyp = :aenderungsTyp) " +
            "ORDER BY h.geaendertAm DESC")
    List<ModulZuweisungHistorie> findFiltered(
            @Param("vonDatum") LocalDateTime vonDatum,
            @Param("bisDatum") LocalDateTime bisDatum,
            @Param("aenderungsTyp") ModulZuweisungHistorie.AenderungsTyp aenderungsTyp);
}
