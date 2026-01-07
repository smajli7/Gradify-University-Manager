package de.gradify.studiengang.repository;

import de.gradify.studiengang.entity.PoRegelwerk;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PoRegelwerkRepository extends JpaRepository<PoRegelwerk, UUID> {

    Optional<PoRegelwerk> findByPruefungsordnungId(UUID poId);
}


