package de.gradify.studiengang.controller;

import de.gradify.shared.dto.ApiResponse;
import de.gradify.shared.tenant.TenantContext;
import de.gradify.shared.tenant.TenantSuffixResolver;
import de.gradify.studiengang.config.AuthPrincipal;
import de.gradify.studiengang.config.SecurityUtils;
import de.gradify.studiengang.dto.CreateStudiengangRequest;
import de.gradify.studiengang.dto.ModulDto;
import de.gradify.studiengang.dto.PruefungsordnungDto;
import de.gradify.studiengang.dto.StudiengangDto;
import de.gradify.studiengang.entity.Mandant;
import de.gradify.studiengang.entity.Modul;
import de.gradify.studiengang.entity.Pruefungsordnung;
import de.gradify.studiengang.entity.Studiengang;
import de.gradify.studiengang.repository.MandantRepository;
import de.gradify.studiengang.service.StudiengangService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/studiengaenge")
@RequiredArgsConstructor
@Slf4j
public class StudiengangController {

    private final StudiengangService studiengangService;
    private final MandantRepository mandantRepository;
    @Autowired(required = false)
    private TenantSuffixResolver tenantSuffixResolver;

    @GetMapping
    public ResponseEntity<ApiResponse<List<StudiengangDto>>> getAllStudiengaenge(
            @RequestParam(value = "mandantId", required = false) Long mandantId) {
        log.info("Getting all Studiengaenge, mandantId={}", mandantId);
        AuthPrincipal ap = SecurityUtils.getAuthPrincipal();
        if (ap != null && ap.isHochschulVerwalter() && ap.getMandantId() != null) {
            mandantId = ap.getMandantId();
        }
        List<Studiengang> studiengaenge;
        if (mandantId != null) {
            studiengaenge = studiengangService.findByMandantId(mandantId);
        } else {
            studiengaenge = studiengangService.findAll();
        }
        
        List<StudiengangDto> dtos = studiengaenge.stream()
            .map(this::toDto)
            .collect(Collectors.toList());
        
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<StudiengangDto>> getStudiengangById(
            @PathVariable(value = "id") Long id) {
        log.info("Getting Studiengang by id: {}", id);
        
        return studiengangService.findById(id)
            .map(studiengang -> ResponseEntity.ok(ApiResponse.success(toDto(studiengang))))
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<ApiResponse<StudiengangDto>> createStudiengang(
            @Valid @RequestBody CreateStudiengangRequest request) {
        log.info("Creating Studiengang: {} ({})", request.getName(), request.getKuerzel());
        if (!SecurityUtils.ensureMandantAccess(request.getMandantId())) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN)
                .body(ApiResponse.error("Kein Zugriff auf diese Hochschule"));
        }
        // TenantContext aus Mandant-ID setzen, damit Mandant und Studiengang in der richtigen DB landen
        String suffix = tenantSuffixResolver != null ? tenantSuffixResolver.resolve(request.getMandantId()) : null;
        if (suffix != null) {
            TenantContext.setTenantSuffix(suffix);
        }
        try {
            Mandant mandant = mandantRepository.findById(request.getMandantId())
                .orElse(null);
            
            if (mandant == null) {
                return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Mandant nicht gefunden: " + request.getMandantId()));
            }

            // Studiengang erstellen
            Studiengang studiengang = Studiengang.builder()
            .mandant(mandant)
            .name(request.getName())
            .kuerzel(request.getKuerzel())
            .abschlussart(Studiengang.Abschlussart.valueOf(request.getAbschlussart()))
            .regelstudienzeit(request.getRegelstudienzeit())
            .gesamtEcts(request.getGesamtEcts())
            .studienvariante(request.getStudienvariante() != null 
                ? Studiengang.Studienvariante.valueOf(request.getStudienvariante()) 
                : Studiengang.Studienvariante.ALLGEMEIN)
            .aktiv(request.isAktiv())
            .build();

            Studiengang saved = studiengangService.save(studiengang);
            log.info("Created Studiengang with id: {}", saved.getId());

            return ResponseEntity.ok(ApiResponse.success(toDto(saved), "Studiengang erfolgreich erstellt"));
        } finally {
            if (suffix != null) {
                TenantContext.clear();
            }
        }
    }

    @GetMapping("/kuerzel/{kuerzel}")
    public ResponseEntity<ApiResponse<StudiengangDto>> getStudiengangByKuerzel(
            @PathVariable(value = "kuerzel") String kuerzel) {
        log.info("Getting Studiengang by kuerzel: {}", kuerzel);
        
        return studiengangService.findByKuerzel(kuerzel)
            .map(studiengang -> ResponseEntity.ok(ApiResponse.success(toDto(studiengang))))
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/module")
    public ResponseEntity<ApiResponse<List<ModulDto>>> getModuleByStudiengang(
            @PathVariable(value = "id") Long id) {
        log.info("Getting Module for Studiengang: {}", id);
        
        List<Modul> module = studiengangService.findModuleByStudiengangId(id);
        List<ModulDto> dtos = module.stream()
            .map(this::toModulDto)
            .collect(Collectors.toList());
        
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    /**
     * Prüfungsordnungen eines Studiengangs (z. B. für Einschreibung anlegen).
     */
    @GetMapping("/{id}/pruefungsordnungen")
    public ResponseEntity<ApiResponse<List<PruefungsordnungDto>>> getPruefungsordnungenByStudiengang(
            @PathVariable(value = "id") Long id) {
        log.info("Getting Pruefungsordnungen for Studiengang: {}", id);

        if (studiengangService.findById(id).isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        List<Pruefungsordnung> pos = studiengangService.findPruefungsordnungenByStudiengangId(id);
        List<PruefungsordnungDto> dtos = pos.stream()
            .map(this::toPoDto)
            .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @GetMapping("/module/{modulId}")
    public ResponseEntity<ApiResponse<ModulDto>> getModulById(
            @PathVariable(value = "modulId") Long modulId) {
        log.info("Getting Modul by id: {}", modulId);
        
        return studiengangService.findModulById(modulId)
            .map(modul -> ResponseEntity.ok(ApiResponse.success(toModulDto(modul))))
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/po/{poId}/module")
    public ResponseEntity<ApiResponse<List<ModulDto>>> getModuleByPo(
            @PathVariable(value = "poId") Long poId) {
        log.info("Getting Module for PO: {}", poId);
        
        List<Modul> module = studiengangService.findModuleByPoId(poId);
        List<ModulDto> dtos = module.stream()
            .map(this::toModulDto)
            .collect(Collectors.toList());
        
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    private StudiengangDto toDto(Studiengang studiengang) {
        return StudiengangDto.builder()
            .id(studiengang.getId())
            .name(studiengang.getName())
            .kuerzel(studiengang.getKuerzel())
            .abschlussart(studiengang.getAbschlussart().name())
            .regelstudienzeit(studiengang.getRegelstudienzeit())
            .gesamtEcts(studiengang.getGesamtEcts())
            .studienvariante(studiengang.getStudienvariante().name())
            .aktiv(studiengang.isAktiv())
            .mandantId(studiengang.getMandant() != null ? studiengang.getMandant().getId() : null)
            .mandantName(studiengang.getMandant() != null ? studiengang.getMandant().getName() : null)
            .aktuellePoId(studiengang.getAktuellePo() != null ? studiengang.getAktuellePo().getId() : null)
            .aktuellePoVersion(studiengang.getAktuellePo() != null ? studiengang.getAktuellePo().getVersion() : null)
            .erstelltAm(studiengang.getErstelltAm())
            .build();
    }

    private ModulDto toModulDto(Modul modul) {
        return ModulDto.builder()
            .id(modul.getId())
            .modulNr(modul.getModulNr())
            .name(modul.getName())
            .ects(modul.getEcts())
            .semester(modul.getSemester())
            .modultyp(modul.getModultyp().name())
            .pruefungsform(modul.getPruefungsform().name())
            .bewertungsart(modul.getBewertungsart().name())
            .gewichtung(modul.getGewichtung())
            .inGesamtnote(modul.isInGesamtnote())
            .wahlpflichtGruppe(modul.getWahlpflichtGruppe())
            .pruefungsordnungId(modul.getPruefungsordnung() != null ? modul.getPruefungsordnung().getId() : null)
            .build();
    }

    private PruefungsordnungDto toPoDto(Pruefungsordnung po) {
        return PruefungsordnungDto.builder()
            .id(po.getId())
            .version(po.getVersion())
            .gueltigAb(po.getGueltigAb())
            .gueltigBis(po.getGueltigBis())
            .build();
    }
}
