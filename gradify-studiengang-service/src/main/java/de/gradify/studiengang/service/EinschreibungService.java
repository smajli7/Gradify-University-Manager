package de.gradify.studiengang.service;

import de.gradify.studiengang.dto.CreateEinschreibungRequest;
import de.gradify.studiengang.dto.EinschreibungDto;
import de.gradify.studiengang.entity.Einschreibung;
import de.gradify.studiengang.entity.Pruefungsordnung;
import de.gradify.studiengang.entity.Studiengang;
import de.gradify.studiengang.grpc.StudentGrpcClient;
import de.gradify.studiengang.repository.EinschreibungRepository;
import de.gradify.studiengang.repository.PruefungsordnungRepository;
import de.gradify.studiengang.repository.StudiengangRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Slf4j
public class EinschreibungService {

    private final EinschreibungRepository einschreibungRepository;
    private final StudiengangRepository studiengangRepository;
    private final PruefungsordnungRepository pruefungsordnungRepository;
    private final StudentGrpcClient studentGrpcClient;
    
    @Autowired
    public EinschreibungService(
            EinschreibungRepository einschreibungRepository,
            StudiengangRepository studiengangRepository,
            PruefungsordnungRepository pruefungsordnungRepository,
            @Lazy StudentGrpcClient studentGrpcClient) {
        this.einschreibungRepository = einschreibungRepository;
        this.studiengangRepository = studiengangRepository;
        this.pruefungsordnungRepository = pruefungsordnungRepository;
        this.studentGrpcClient = studentGrpcClient;
    }

    /**
     * Holt alle Einschreibungen.
     */
    @Transactional(readOnly = true)
    public List<EinschreibungDto> getAllEinschreibungen() {
        return einschreibungRepository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Holt Einschreibungen eines Studenten.
     */
    @Transactional(readOnly = true)
    public List<EinschreibungDto> getEinschreibungenByStudent(Long studentId) {
        return einschreibungRepository.findByStudentId(studentId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Holt Einschreibungen eines Studiengangs.
     */
    @Transactional(readOnly = true)
    public List<EinschreibungDto> getEinschreibungenByStudiengang(Long studiengangId) {
        return einschreibungRepository.findByStudiengangId(studiengangId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Holt eine Einschreibung nach ID.
     */
    @Transactional(readOnly = true)
    public Optional<EinschreibungDto> getEinschreibungById(Long id) {
        return einschreibungRepository.findById(id).map(this::toDto);
    }

    /**
     * Erstellt eine neue Einschreibung.
     * Validiert dass der Student existiert (via gRPC).
     */
    @Transactional
    public EinschreibungDto createEinschreibung(CreateEinschreibungRequest request) {
        log.info("Creating Einschreibung for student: {} in studiengang: {}", 
                request.getStudentId(), request.getStudiengangId());

        // 1. Lade Studiengang (für mandantId bei gRPC)
        Studiengang studiengang = studiengangRepository.findById(request.getStudiengangId())
                .orElseThrow(() -> new IllegalArgumentException("Studiengang nicht gefunden: " + request.getStudiengangId()));
        Long mandantId = studiengang.getMandant() != null ? studiengang.getMandant().getId() : null;

        // 2. Validiere dass Student existiert (via gRPC) - mandantId für DB-per-Tenant
        var validationResult = studentGrpcClient.studentExists(request.getStudentId(), mandantId);
        if (!validationResult.grpcAvailable()) {
            log.error("gRPC nicht verfügbar: {}", validationResult.statusMessage());
            throw new IllegalStateException("User-Service nicht erreichbar: " + validationResult.statusMessage());
        }
        if (!validationResult.exists()) {
            throw new IllegalArgumentException("Student nicht gefunden: " + request.getStudentId());
        }

        // 4. Lade Prüfungsordnung
        Pruefungsordnung pruefungsordnung = pruefungsordnungRepository.findById(request.getPruefungsordnungId())
                .orElseThrow(() -> new IllegalArgumentException("Prüfungsordnung nicht gefunden: " + request.getPruefungsordnungId()));

        // 5. Prüfe ob Student bereits eingeschrieben
        if (einschreibungRepository.existsByStudentIdAndStudiengangIdAndStatus(
                request.getStudentId(), request.getStudiengangId(), Einschreibung.EinschreibungStatus.AKTIV)) {
            throw new IllegalArgumentException("Student ist bereits in diesem Studiengang eingeschrieben");
        }

        // 6. Studienvariante bestimmen
        Studiengang.Studienvariante studienvariante = Studiengang.Studienvariante.ALLGEMEIN;
        if (request.getStudienvariante() != null) {
            try {
                studienvariante = Studiengang.Studienvariante.valueOf(request.getStudienvariante());
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Ungültige Studienvariante: " + request.getStudienvariante());
            }
        }

        // 6. Einschreibung erstellen
        Einschreibung einschreibung = Einschreibung.builder()
                .studentId(request.getStudentId())
                .studiengang(studiengang)
                .pruefungsordnung(pruefungsordnung)
                .studienvariante(studienvariante)
                .immatrikuliertAm(request.getImmatrikuliertAm() != null ? request.getImmatrikuliertAm() : LocalDate.now())
                .aktuellesSemester(1)
                .status(Einschreibung.EinschreibungStatus.AKTIV)
                .build();

        einschreibung = einschreibungRepository.save(einschreibung);
        log.info("Einschreibung created with id: {}", einschreibung.getId());

        return toDto(einschreibung);
    }

    /**
     * Beendet eine Einschreibung.
     */
    @Transactional
    public Optional<EinschreibungDto> beendeEinschreibung(Long id, Einschreibung.EinschreibungStatus status) {
        return einschreibungRepository.findById(id).map(einschreibung -> {
            einschreibung.setStatus(status);
            einschreibung.setExmatrikuliertAm(LocalDate.now());
            einschreibung = einschreibungRepository.save(einschreibung);
            log.info("Einschreibung {} beendet mit Status: {}", id, status);
            return toDto(einschreibung);
        });
    }

    /**
     * Erhöht das Semester eines Studenten.
     */
    @Transactional
    public Optional<EinschreibungDto> erhoheSemester(Long id) {
        return einschreibungRepository.findById(id).map(einschreibung -> {
            einschreibung.setAktuellesSemester(einschreibung.getAktuellesSemester() + 1);
            einschreibung = einschreibungRepository.save(einschreibung);
            log.info("Semester erhöht für Einschreibung {}: {}", id, einschreibung.getAktuellesSemester());
            return toDto(einschreibung);
        });
    }

    /**
     * Konvertiert Einschreibung Entity zu DTO.
     */
    private EinschreibungDto toDto(Einschreibung einschreibung) {
        Studiengang studiengang = einschreibung.getStudiengang();
        Pruefungsordnung po = einschreibung.getPruefungsordnung();
        
        // Studentendaten via gRPC holen
        String studentName = "";
        String matrikelnummer = "";
        Long mandantId = studiengang != null && studiengang.getMandant() != null ? studiengang.getMandant().getId() : null;
        Optional<StudentGrpcClient.StudentInfo> studentInfo = 
                studentGrpcClient.getStudent(einschreibung.getStudentId(), mandantId);
        if (studentInfo.isPresent()) {
            studentName = studentInfo.get().getFullName();
            matrikelnummer = studentInfo.get().matrikelnummer();
        }

        return EinschreibungDto.builder()
                .id(einschreibung.getId())
                .studentId(einschreibung.getStudentId())
                .matrikelnummer(matrikelnummer)
                .studentName(studentName)
                .studiengangId(studiengang.getId())
                .studiengangName(studiengang.getName())
                .pruefungsordnungId(po.getId())
                .pruefungsordnungVersion(po.getVersion())
                .studienvariante(einschreibung.getStudienvariante().name())
                .immatrikuliertAm(einschreibung.getImmatrikuliertAm())
                .exmatrikuliertAm(einschreibung.getExmatrikuliertAm())
                .aktuellesSemester(einschreibung.getAktuellesSemester())
                .status(einschreibung.getStatus().name())
                .build();
    }
}

