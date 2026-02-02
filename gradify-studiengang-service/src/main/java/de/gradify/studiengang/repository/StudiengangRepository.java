package de.gradify.studiengang.repository;

import de.gradify.studiengang.entity.Studiengang;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudiengangRepository extends JpaRepository<Studiengang, Long> {

    Optional<Studiengang> findByKuerzel(String kuerzel);

    boolean existsByKuerzel(String kuerzel);

    List<Studiengang> findByMandantId(Long mandantId);

    List<Studiengang> findByAktivTrue();

    List<Studiengang> findByMandantIdAndAktivTrue(Long mandantId);

    List<Studiengang> findByAbschlussart(Studiengang.Abschlussart abschlussart);

    @Query("SELECT s FROM Studiengang s WHERE s.mandant.id = :mandantId AND s.abschlussart = :abschlussart")
    List<Studiengang> findByMandantIdAndAbschlussart(@Param("mandantId") Long mandantId, @Param("abschlussart") Studiengang.Abschlussart abschlussart);
}



