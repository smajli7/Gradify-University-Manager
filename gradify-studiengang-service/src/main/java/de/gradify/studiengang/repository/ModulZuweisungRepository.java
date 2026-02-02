package de.gradify.studiengang.repository;

import de.gradify.studiengang.entity.ModulZuweisung;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ModulZuweisungRepository extends JpaRepository<ModulZuweisung, Long> {
    
    /**
     * Findet alle Module, die einem Dozenten zugewiesen sind.
     */
    List<ModulZuweisung> findByDozentId(Long dozentId);
    
    /**
     * Findet alle Dozenten, die ein Modul unterrichten.
     */
    List<ModulZuweisung> findByModulId(Long modulId);
    
    /**
     * Zählt die Module eines Dozenten.
     */
    long countByDozentId(Long dozentId);
}
