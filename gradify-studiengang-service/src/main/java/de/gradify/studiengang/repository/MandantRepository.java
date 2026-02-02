package de.gradify.studiengang.repository;

import de.gradify.studiengang.entity.Mandant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MandantRepository extends JpaRepository<Mandant, Long> {

    Optional<Mandant> findByKuerzel(String kuerzel);

    boolean existsByKuerzel(String kuerzel);

    List<Mandant> findByAktivTrue();
}



