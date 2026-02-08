package de.gradify.studiengang.repository;

import de.gradify.studiengang.entity.WahlpflichtWahl;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WahlpflichtWahlRepository extends JpaRepository<WahlpflichtWahl, Long> {

    /** Alle Wahlen einer Einschreibung */
    List<WahlpflichtWahl> findByEinschreibungId(Long einschreibungId);

    /** Einzelne Wahl für Einschreibung + Gruppe */
    Optional<WahlpflichtWahl> findByEinschreibungIdAndWahlpflichtGruppe(Long einschreibungId, String wahlpflichtGruppe);
}
