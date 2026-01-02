package de.gradify.user.repository;

import de.gradify.user.entity.Rolle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface RolleRepository extends JpaRepository<Rolle, UUID> {

    Optional<Rolle> findByName(String name);

    boolean existsByName(String name);
}

