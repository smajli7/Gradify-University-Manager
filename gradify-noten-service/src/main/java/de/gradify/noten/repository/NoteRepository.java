package de.gradify.noten.repository;

import de.gradify.noten.entity.Note;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface NoteRepository extends JpaRepository<Note, UUID> {

    List<Note> findByEinschreibungId(UUID einschreibungId);

    List<Note> findByModulId(UUID modulId);

    Optional<Note> findByEinschreibungIdAndModulIdAndVersuch(UUID einschreibungId, UUID modulId, int versuch);

    @Query("SELECT n FROM Note n WHERE n.einschreibungId = :einschreibungId AND n.modulId = :modulId ORDER BY n.versuch DESC")
    List<Note> findByEinschreibungIdAndModulIdOrderByVersuchDesc(@Param("einschreibungId") UUID einschreibungId, @Param("modulId") UUID modulId);

    @Query("SELECT n FROM Note n WHERE n.einschreibungId = :einschreibungId AND n.status = 'FREIGEGEBEN'")
    List<Note> findFreigegebeneByEinschreibungId(@Param("einschreibungId") UUID einschreibungId);

    @Query("SELECT n FROM Note n WHERE n.einschreibungId = :einschreibungId AND n.bestanden = true")
    List<Note> findBestandeneByEinschreibungId(@Param("einschreibungId") UUID einschreibungId);

    List<Note> findByStatus(Note.NoteStatus status);

    @Query("SELECT MAX(n.versuch) FROM Note n WHERE n.einschreibungId = :einschreibungId AND n.modulId = :modulId")
    Integer findMaxVersuch(@Param("einschreibungId") UUID einschreibungId, @Param("modulId") UUID modulId);

    @Query("SELECT COUNT(n) FROM Note n WHERE n.einschreibungId = :einschreibungId AND n.bestanden = true")
    Long countBestandeneByEinschreibungId(@Param("einschreibungId") UUID einschreibungId);

    @Query("SELECT n FROM Note n WHERE n.erfasstVon = :benutzerId")
    List<Note> findByErfasstVon(@Param("benutzerId") UUID benutzerId);

    boolean existsByEinschreibungIdAndModulId(UUID einschreibungId, UUID modulId);
}

