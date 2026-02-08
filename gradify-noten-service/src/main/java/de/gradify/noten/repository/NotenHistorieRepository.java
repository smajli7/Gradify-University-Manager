package de.gradify.noten.repository;

import de.gradify.noten.entity.NotenHistorie;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface NotenHistorieRepository extends JpaRepository<NotenHistorie, Long> {

    List<NotenHistorie> findByNoteIdOrderByGeaendertAmDesc(Long noteId);

    @Query("SELECT h FROM NotenHistorie h WHERE h.noteId = :noteId AND h.aenderungsTyp = :typ ORDER BY h.geaendertAm DESC")
    List<NotenHistorie> findByNoteIdAndAenderungsTyp(@Param("noteId") Long noteId, @Param("typ") NotenHistorie.AenderungsTyp typ);

    @Query("SELECT h FROM NotenHistorie h WHERE h.geaendertVon = :benutzerId ORDER BY h.geaendertAm DESC")
    List<NotenHistorie> findByGeaendertVonOrderByGeaendertAmDesc(@Param("benutzerId") Long benutzerId);

    /**
     * Flexible Audit-Abfrage: alle optionalen Filter, einzelne modulId.
     * Für PA/ADMIN/HV (sehen alles im Tenant).
     * Native Query weil PostgreSQL bei null-Parametern den Datentyp nicht inferieren kann.
     */
    @Query(value = "SELECT * FROM noten_historie h "
            + "WHERE (CAST(:noteId AS BIGINT) IS NULL OR h.note_id = CAST(:noteId AS BIGINT)) "
            + "AND (CAST(:einschreibungId AS BIGINT) IS NULL OR h.einschreibung_id = CAST(:einschreibungId AS BIGINT)) "
            + "AND (CAST(:modulId AS BIGINT) IS NULL OR h.modul_id = CAST(:modulId AS BIGINT)) "
            + "AND (CAST(:vonDatum AS TIMESTAMP) IS NULL OR h.geaendert_am >= CAST(:vonDatum AS TIMESTAMP)) "
            + "AND (CAST(:bisDatum AS TIMESTAMP) IS NULL OR h.geaendert_am <= CAST(:bisDatum AS TIMESTAMP)) "
            + "AND (CAST(:aenderungsTyp AS VARCHAR) IS NULL OR h.aenderungs_typ = CAST(:aenderungsTyp AS VARCHAR)) "
            + "AND (CAST(:benutzerId AS BIGINT) IS NULL OR h.geaendert_von = CAST(:benutzerId AS BIGINT)) "
            + "ORDER BY h.geaendert_am DESC "
            + "LIMIT :limit",
            nativeQuery = true)
    List<NotenHistorie> findAuditEintraege(@Param("noteId") Long noteId,
                                           @Param("einschreibungId") Long einschreibungId,
                                           @Param("modulId") Long modulId,
                                           @Param("vonDatum") LocalDateTime vonDatum,
                                           @Param("bisDatum") LocalDateTime bisDatum,
                                           @Param("aenderungsTyp") String aenderungsTyp,
                                           @Param("benutzerId") Long benutzerId,
                                           @Param("limit") int limit);

    /**
     * Audit-Abfrage eingeschränkt auf bestimmte Modul-IDs (z. B. zugewiesene Module eines Dozenten).
     */
    @Query(value = "SELECT * FROM noten_historie h "
            + "WHERE h.modul_id IN (:modulIds) "
            + "AND (CAST(:noteId AS BIGINT) IS NULL OR h.note_id = CAST(:noteId AS BIGINT)) "
            + "AND (CAST(:einschreibungId AS BIGINT) IS NULL OR h.einschreibung_id = CAST(:einschreibungId AS BIGINT)) "
            + "AND (CAST(:vonDatum AS TIMESTAMP) IS NULL OR h.geaendert_am >= CAST(:vonDatum AS TIMESTAMP)) "
            + "AND (CAST(:bisDatum AS TIMESTAMP) IS NULL OR h.geaendert_am <= CAST(:bisDatum AS TIMESTAMP)) "
            + "AND (CAST(:aenderungsTyp AS VARCHAR) IS NULL OR h.aenderungs_typ = CAST(:aenderungsTyp AS VARCHAR)) "
            + "ORDER BY h.geaendert_am DESC "
            + "LIMIT :limit",
            nativeQuery = true)
    List<NotenHistorie> findAuditEintraegeByModulIds(@Param("modulIds") List<Long> modulIds,
                                                     @Param("noteId") Long noteId,
                                                     @Param("einschreibungId") Long einschreibungId,
                                                     @Param("vonDatum") LocalDateTime vonDatum,
                                                     @Param("bisDatum") LocalDateTime bisDatum,
                                                     @Param("aenderungsTyp") String aenderungsTyp,
                                                     @Param("limit") int limit);
}



