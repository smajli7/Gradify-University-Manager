package de.gradify.noten.repository;

import de.gradify.noten.entity.NotenHistorie;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotenHistorieRepository extends JpaRepository<NotenHistorie, Long> {

    List<NotenHistorie> findByNoteIdOrderByGeaendertAmDesc(Long noteId);

    @Query("SELECT h FROM NotenHistorie h WHERE h.noteId = :noteId AND h.aenderungsTyp = :typ ORDER BY h.geaendertAm DESC")
    List<NotenHistorie> findByNoteIdAndAenderungsTyp(@Param("noteId") Long noteId, @Param("typ") NotenHistorie.AenderungsTyp typ);

    @Query("SELECT h FROM NotenHistorie h WHERE h.geaendertVon = :benutzerId ORDER BY h.geaendertAm DESC")
    List<NotenHistorie> findByGeaendertVonOrderByGeaendertAmDesc(@Param("benutzerId") Long benutzerId);
}



