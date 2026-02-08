package de.gradify.noten.repository;

import de.gradify.noten.entity.Note;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NoteRepository extends JpaRepository<Note, Long> {

    List<Note> findByEinschreibungId(Long einschreibungId);

    List<Note> findByModulId(Long modulId);

    List<Note> findByModulIdIn(List<Long> modulIds);

    Optional<Note> findByEinschreibungIdAndModulIdAndVersuch(Long einschreibungId, Long modulId, int versuch);

    @Query("SELECT n FROM Note n WHERE n.einschreibungId = :einschreibungId AND n.modulId = :modulId ORDER BY n.versuch DESC")
    List<Note> findByEinschreibungIdAndModulIdOrderByVersuchDesc(@Param("einschreibungId") Long einschreibungId, @Param("modulId") Long modulId);

    @Query("SELECT n FROM Note n WHERE n.einschreibungId = :einschreibungId AND n.status = 'FREIGEGEBEN'")
    List<Note> findFreigegebeneByEinschreibungId(@Param("einschreibungId") Long einschreibungId);

    @Query("SELECT n FROM Note n WHERE n.einschreibungId = :einschreibungId AND n.bestanden = true")
    List<Note> findBestandeneByEinschreibungId(@Param("einschreibungId") Long einschreibungId);

    List<Note> findByStatus(Note.NoteStatus status);

    @Query("SELECT MAX(n.versuch) FROM Note n WHERE n.einschreibungId = :einschreibungId AND n.modulId = :modulId")
    Integer findMaxVersuch(@Param("einschreibungId") Long einschreibungId, @Param("modulId") Long modulId);

    @Query("SELECT COUNT(n) FROM Note n WHERE n.einschreibungId = :einschreibungId AND n.bestanden = true")
    Long countBestandeneByEinschreibungId(@Param("einschreibungId") Long einschreibungId);

    @Query("SELECT n FROM Note n WHERE n.erfasstVon = :benutzerId")
    List<Note> findByErfasstVon(@Param("benutzerId") Long benutzerId);

    boolean existsByEinschreibungIdAndModulId(Long einschreibungId, Long modulId);

    List<Note> findByEinschreibungIdAndStatus(Long einschreibungId, Note.NoteStatus status);
}

