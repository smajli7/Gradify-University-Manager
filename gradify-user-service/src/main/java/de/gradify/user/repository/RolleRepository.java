package de.gradify.user.repository;

import de.gradify.user.entity.Rolle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RolleRepository extends JpaRepository<Rolle, Long> {

    Optional<Rolle> findByName(String name);

    boolean existsByName(String name);
}



