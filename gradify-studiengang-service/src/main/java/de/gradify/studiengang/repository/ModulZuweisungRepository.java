package de.gradify.studiengang.repository;

import de.gradify.studiengang.entity.ModulZuweisung;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ModulZuweisungRepository extends JpaRepository<ModulZuweisung, UUID> {
    
    /**
     * Findet alle Module, die einem Dozenten zugewiesen sind.
     */
    List<ModulZuweisung> findByDozentId(UUID dozentId);
    
    /**
     * Findet alle Dozenten, die ein Modul unterrichten.
     */
    List<ModulZuweisung> findByModulId(UUID modulId);
    
    /**
     * Zählt die Module eines Dozenten.
     */
    long countByDozentId(UUID dozentId);
}
