package de.gradify.user.repository;

import de.gradify.user.entity.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudentRepository extends JpaRepository<Student, Long> {

    Optional<Student> findByMatrikelnummer(String matrikelnummer);

    boolean existsByMatrikelnummer(String matrikelnummer);

    Optional<Student> findByBenutzerId(Long benutzerId);

    @Query("SELECT s FROM Student s WHERE s.benutzer.mandantId = :mandantId")
    List<Student> findByMandantId(@Param("mandantId") Long mandantId);

    List<Student> findByStatus(Student.StudentStatus status);

    @Query("SELECT s FROM Student s WHERE s.status = :status AND s.benutzer.mandantId = :mandantId")
    List<Student> findByStatusAndMandantId(@Param("status") Student.StudentStatus status, @Param("mandantId") Long mandantId);

    @Query("SELECT s FROM Student s WHERE s.benutzer.aktiv = true")
    List<Student> findAllAktive();
}



