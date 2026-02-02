package de.gradify.studiengang.service;

import de.gradify.studiengang.dto.MandantDto;
import de.gradify.studiengang.entity.Mandant;
import de.gradify.studiengang.repository.MandantRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MandantService {

    private final MandantRepository mandantRepository;

    /**
     * Holt alle aktiven Mandanten.
     */
    @Transactional(readOnly = true)
    public List<MandantDto> getAktiveMandanten() {
        return mandantRepository.findByAktivTrue().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Holt einen Mandanten nach ID.
     */
    @Transactional(readOnly = true)
    public Optional<MandantDto> getMandantById(Long id) {
        return mandantRepository.findById(id).map(this::toDto);
    }

    /**
     * Holt das Kürzel eines Mandanten.
     */
    @Transactional(readOnly = true)
    public Optional<String> getMandantKuerzel(Long mandantId) {
        return mandantRepository.findById(mandantId).map(Mandant::getKuerzel);
    }

    /**
     * Konvertiert Mandant Entity zu DTO.
     */
    private MandantDto toDto(Mandant mandant) {
        return MandantDto.builder()
                .id(mandant.getId())
                .name(mandant.getName())
                .kuerzel(mandant.getKuerzel())
                .aktiv(mandant.isAktiv())
                .build();
    }
}



