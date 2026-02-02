package de.gradify.studiengang.service;

import de.gradify.studiengang.entity.Modul;
import de.gradify.studiengang.entity.Pruefungsordnung;
import de.gradify.studiengang.entity.Studiengang;
import de.gradify.studiengang.repository.ModulRepository;
import de.gradify.studiengang.repository.PruefungsordnungRepository;
import de.gradify.studiengang.repository.StudiengangRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class StudiengangService {

    private final StudiengangRepository studiengangRepository;
    private final ModulRepository modulRepository;
    private final PruefungsordnungRepository pruefungsordnungRepository;

    public List<Studiengang> findAll() {
        return studiengangRepository.findAll();
    }

    public List<Studiengang> findByMandantId(Long mandantId) {
        return studiengangRepository.findByMandantId(mandantId);
    }

    public List<Studiengang> findAktive() {
        return studiengangRepository.findByAktivTrue();
    }

    public Optional<Studiengang> findById(Long id) {
        return studiengangRepository.findById(id);
    }

    public Optional<Studiengang> findByKuerzel(String kuerzel) {
        return studiengangRepository.findByKuerzel(kuerzel);
    }

    public List<Modul> findModuleByStudiengangId(Long studiengangId) {
        return studiengangRepository.findById(studiengangId)
            .map(studiengang -> {
                if (studiengang.getAktuellePo() != null) {
                    return modulRepository.findByPruefungsordnungId(studiengang.getAktuellePo().getId());
                }
                return List.<Modul>of();
            })
            .orElse(List.of());
    }

    public List<Modul> findModuleByPoId(Long poId) {
        return modulRepository.findByPruefungsordnungId(poId);
    }

    public Optional<Modul> findModulById(Long modulId) {
        return modulRepository.findById(modulId);
    }

    public List<Pruefungsordnung> findPruefungsordnungenByStudiengangId(Long studiengangId) {
        return pruefungsordnungRepository.findByStudiengangId(studiengangId);
    }

    public Optional<Pruefungsordnung> findPruefungsordnungById(Long poId) {
        return pruefungsordnungRepository.findById(poId);
    }

    @Transactional
    public Studiengang save(Studiengang studiengang) {
        return studiengangRepository.save(studiengang);
    }

    @Transactional
    public void deleteById(Long id) {
        studiengangRepository.deleteById(id);
    }
}
