package de.gradify.user.service;

import de.gradify.user.dto.BenutzerDto;
import de.gradify.user.dto.CreateBenutzerRequest;
import de.gradify.user.dto.UpdateBenutzerRequest;
import de.gradify.user.entity.Benutzer;
import de.gradify.user.entity.BenutzerHistorie;
import de.gradify.user.entity.Rolle;
import de.gradify.user.repository.BenutzerHistorieRepository;
import de.gradify.user.repository.BenutzerRepository;
import de.gradify.user.repository.RolleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class BenutzerService {

    private final BenutzerRepository benutzerRepository;
    private final BenutzerHistorieRepository benutzerHistorieRepository;
    private final RolleRepository rolleRepository;
    private final PasswordEncoder passwordEncoder;

    public List<BenutzerDto> findAll() {
        return benutzerRepository.findAll().stream()
            .map(this::toDto)
            .collect(Collectors.toList());
    }

    public List<BenutzerDto> findByMandantId(Long mandantId) {
        return benutzerRepository.findByMandantId(mandantId).stream()
            .map(this::toDto)
            .collect(Collectors.toList());
    }

    public Optional<BenutzerDto> findById(Long id) {
        return benutzerRepository.findById(id).map(this::toDto);
    }

    public Optional<BenutzerDto> findByBenutzername(String benutzername) {
        return benutzerRepository.findByBenutzername(benutzername).map(this::toDto);
    }

    public Optional<BenutzerDto> findByEmail(String email) {
        return benutzerRepository.findByEmail(email).map(this::toDto);
    }

    @Transactional
    public BenutzerDto create(CreateBenutzerRequest request, Long erstelltVon) {
        log.info("Creating user: {}", request.getBenutzername());
        
        if (benutzerRepository.existsByBenutzername(request.getBenutzername())) {
            throw new IllegalArgumentException("Benutzername existiert bereits: " + request.getBenutzername());
        }
        
        if (benutzerRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("E-Mail existiert bereits: " + request.getEmail());
        }
        
        Set<Rolle> rollen = new HashSet<>();
        if (request.getRollenIds() != null) {
            for (Long rolleId : request.getRollenIds()) {
                rolleRepository.findById(rolleId).ifPresent(rollen::add);
            }
        }
        
        Benutzer benutzer = Benutzer.builder()
            .benutzername(request.getBenutzername())
            .email(request.getEmail())
            .passwortHash(passwordEncoder.encode(request.getPasswort()))
            .vorname(request.getVorname())
            .nachname(request.getNachname())
            .mandantId(request.getMandantId())
            .aktiv(true)
            .rollen(rollen)
            .build();
        
        Benutzer saved = benutzerRepository.save(benutzer);
        
        // Audit-Log erstellen
        String rollenStr = rollen.stream().map(Rolle::getName).collect(Collectors.joining(", "));
        saveHistorie(saved.getId(), saved.getBenutzername(), erstelltVon, 
                BenutzerHistorie.AenderungsTyp.ERSTELLT, 
                "Benutzer erstellt mit Rollen: " + (rollenStr.isEmpty() ? "keine" : rollenStr));
        
        return toDto(saved);
    }

    @Transactional
    public Optional<BenutzerDto> update(Long id, UpdateBenutzerRequest request) {
        log.info("Updating user: {}", id);
        
        return benutzerRepository.findById(id).map(benutzer -> {
            benutzer.setBenutzername(request.getBenutzername());
            benutzer.setVorname(request.getVorname());
            benutzer.setNachname(request.getNachname());
            benutzer.setEmail(request.getEmail());
            
            if (request.getPasswort() != null && !request.getPasswort().isEmpty()) {
                benutzer.setPasswortHash(passwordEncoder.encode(request.getPasswort()));
            }
            
            if (request.getRollenIds() != null) {
                Set<Rolle> rollen = new HashSet<>();
                for (Long rolleId : request.getRollenIds()) {
                    rolleRepository.findById(rolleId).ifPresent(rollen::add);
                }
                benutzer.setRollen(rollen);
            }
            
            return toDto(benutzerRepository.save(benutzer));
        });
    }

    @Transactional
    public boolean delete(Long id, Long geloeschtVon) {
        log.info("Deleting user: {}", id);
        
        Optional<Benutzer> benutzerOpt = benutzerRepository.findById(id);
        if (benutzerOpt.isPresent()) {
            Benutzer benutzer = benutzerOpt.get();
            String benutzername = benutzer.getBenutzername();
            String details = "Benutzer gelöscht: " + benutzer.getVorname() + " " + benutzer.getNachname() + 
                           " (" + benutzername + ")";
            
            benutzerRepository.deleteById(id);
            
            // Audit-Log erstellen
            saveHistorie(id, benutzername, geloeschtVon, 
                    BenutzerHistorie.AenderungsTyp.GELOESCHT, details);
            
            return true;
        }
        return false;
    }

    @Transactional
    public boolean assignRole(Long userId, Long roleId) {
        log.info("Assigning role {} to user {}", roleId, userId);
        
        Optional<Benutzer> benutzerOpt = benutzerRepository.findById(userId);
        Optional<Rolle> rolleOpt = rolleRepository.findById(roleId);
        
        if (benutzerOpt.isPresent() && rolleOpt.isPresent()) {
            Benutzer benutzer = benutzerOpt.get();
            benutzer.getRollen().add(rolleOpt.get());
            benutzerRepository.save(benutzer);
            return true;
        }
        return false;
    }

    @Transactional
    public boolean removeRole(Long userId, Long roleId) {
        log.info("Removing role {} from user {}", roleId, userId);
        
        Optional<Benutzer> benutzerOpt = benutzerRepository.findById(userId);
        
        if (benutzerOpt.isPresent()) {
            Benutzer benutzer = benutzerOpt.get();
            benutzer.getRollen().removeIf(rolle -> rolle.getId().equals(roleId));
            benutzerRepository.save(benutzer);
            return true;
        }
        return false;
    }

    public List<Rolle> findAllRoles() {
        return rolleRepository.findAll();
    }

    private BenutzerDto toDto(Benutzer benutzer) {
        return BenutzerDto.builder()
            .id(benutzer.getId())
            .benutzername(benutzer.getBenutzername())
            .email(benutzer.getEmail())
            .vorname(benutzer.getVorname())
            .nachname(benutzer.getNachname())
            .mandantId(benutzer.getMandantId())
            .aktiv(benutzer.isAktiv())
            .rollen(benutzer.getRollen().stream()
                .map(Rolle::getName)
                .collect(Collectors.toSet()))
            .letzterLogin(benutzer.getLetzterLogin())
            .erstelltAm(benutzer.getErstelltAm())
            .build();
    }

    private void saveHistorie(Long benutzerId, String benutzername, Long geaendertVon,
                              BenutzerHistorie.AenderungsTyp typ, String details) {
        BenutzerHistorie historie = BenutzerHistorie.builder()
                .benutzerId(benutzerId)
                .benutzername(benutzername)
                .aenderungsTyp(typ)
                .geaendertVon(geaendertVon)
                .geaendertAm(LocalDateTime.now())
                .details(details)
                .build();
        benutzerHistorieRepository.save(historie);
        log.debug("Benutzer-Historie gespeichert: {} - {}", typ, benutzername);
    }

    public List<BenutzerHistorie> getAuditLog(Long benutzerId, BenutzerHistorie.AenderungsTyp typ,
                                               LocalDateTime vonDatum, LocalDateTime bisDatum) {
        return benutzerHistorieRepository.findAuditEintraege(benutzerId, typ, vonDatum, bisDatum);
    }

    public List<BenutzerHistorie> getAllAuditLog() {
        return benutzerHistorieRepository.findAllOrderByGeaendertAmDesc();
    }
}
