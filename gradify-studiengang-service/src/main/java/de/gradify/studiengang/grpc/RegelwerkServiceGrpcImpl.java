package de.gradify.studiengang.grpc;

import de.gradify.shared.grpc.berechnung.*;
import de.gradify.studiengang.entity.Einschreibung;
import org.springframework.transaction.annotation.Transactional;
import de.gradify.studiengang.entity.Modul;
import de.gradify.studiengang.entity.PoRegelwerk;
import de.gradify.studiengang.entity.Pruefungsordnung;
import de.gradify.studiengang.repository.EinschreibungRepository;
import de.gradify.studiengang.repository.ModulRepository;
import de.gradify.studiengang.repository.PoRegelwerkRepository;
import de.gradify.studiengang.repository.PruefungsordnungRepository;
import io.grpc.stub.StreamObserver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.devh.boot.grpc.server.service.GrpcService;

import java.util.List;
import java.util.Optional;

/**
 * gRPC Server für Regelwerk und Modul-Gewichtungen.
 */
@GrpcService
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class RegelwerkServiceGrpcImpl extends RegelwerkServiceGrpc.RegelwerkServiceImplBase {

    private final PruefungsordnungRepository pruefungsordnungRepository;
    private final ModulRepository modulRepository;
    private final PoRegelwerkRepository poRegelwerkRepository;
    private final EinschreibungRepository einschreibungRepository;

    @Override
    public void getRegelwerk(RegelwerkRequest request, StreamObserver<RegelwerkResponse> responseObserver) {
        Long poId = request.getPoId();
        log.info("gRPC: Getting Regelwerk for PO: {}", poId);

        try {
            Optional<Pruefungsordnung> poOpt = pruefungsordnungRepository.findById(poId);
            if (poOpt.isEmpty()) {
                log.warn("gRPC: Pruefungsordnung nicht gefunden: {}", poId);
                responseObserver.onError(io.grpc.Status.NOT_FOUND
                        .withDescription("Prüfungsordnung nicht gefunden: " + poId)
                        .asRuntimeException());
                return;
            }

            Pruefungsordnung po = poOpt.get();
            log.info("gRPC: Gefunden PO: {} - Berechnungsart: {}", po.getVersion(), 
                    po.getBerechnungsart() != null ? po.getBerechnungsart().name() : "NULL");
            
            // Regelwerk für PO laden
            Optional<PoRegelwerk> regelwerkOpt = poRegelwerkRepository.findByPruefungsordnungId(poId);
            String formel = "";
            String parameter = "";
            
            if (regelwerkOpt.isPresent()) {
                PoRegelwerk regelwerk = regelwerkOpt.get();
                formel = regelwerk.getFormel() != null ? regelwerk.getFormel() : "";
                parameter = regelwerk.getBeschreibung() != null ? regelwerk.getBeschreibung() : "";
            }

            // Null-Check für berechnungsart
            String berechnungsartStr = po.getBerechnungsart() != null 
                    ? po.getBerechnungsart().name() 
                    : "GEWICHTET";

            RegelwerkResponse response = RegelwerkResponse.newBuilder()
                    .setPoId(poId)
                    .setBerechnungsart(berechnungsartStr)
                    .setFormel(formel)
                    .setParameterJson(parameter)
                    .build();

            log.info("gRPC: Sending Regelwerk response for PO: {}", poId);
            responseObserver.onNext(response);
            responseObserver.onCompleted();

        } catch (Exception e) {
            log.error("gRPC Error getting Regelwerk: {} - Stacktrace:", e.getMessage(), e);
            responseObserver.onError(io.grpc.Status.INTERNAL
                    .withDescription("Fehler beim Abrufen des Regelwerks: " + e.getMessage())
                    .asRuntimeException());
        }
    }

    @Override
    public void getModulGewichtungen(ModulGewichtungRequest request, 
                                      StreamObserver<ModulGewichtungListResponse> responseObserver) {
        Long poId = request.getPoId();
        log.info("gRPC: Getting Modul-Gewichtungen for PO: {}", poId);

        try {
            List<Modul> module = modulRepository.findByPruefungsordnungId(poId);
            log.info("gRPC: Found {} Module in DB for PO: {}", module.size(), poId);

            ModulGewichtungListResponse.Builder responseBuilder = ModulGewichtungListResponse.newBuilder();

            for (Modul modul : module) {
                String modulNr = modul.getModulNr() != null ? modul.getModulNr() : "?";
                String modulName = modul.getName() != null ? modul.getName() : "Unbekannt";
                double gewichtungWert = modul.getGewichtung() != null ? modul.getGewichtung().doubleValue() : 1.0;
                int ectsWert = modul.getEcts();
                
                ModulGewichtung gewichtung = ModulGewichtung.newBuilder()
                        .setModulId(modul.getId())
                        .setModulNr(modulNr)
                        .setGewichtung(gewichtungWert)
                        .setInGesamtnote(modul.isInGesamtnote())
                        .setEcts(ectsWert)
                        .setModulName(modulName)
                        .build();
                
                responseBuilder.addModule(gewichtung);
            }

            log.info("gRPC: Returning {} Module for PO: {}", module.size(), poId);
            responseObserver.onNext(responseBuilder.build());
            responseObserver.onCompleted();

        } catch (Exception e) {
            log.error("gRPC Error getting Modul-Gewichtungen: {} - Stacktrace:", e.getMessage(), e);
            responseObserver.onError(io.grpc.Status.INTERNAL
                    .withDescription("Fehler beim Abrufen der Gewichtungen: " + e.getMessage())
                    .asRuntimeException());
        }
    }

    /**
     * Holt Einschreibungsdetails (PO-ID, ECTS) für Berechnungs-Service.
     */
    @Override
    public void getEinschreibungDetails(EinschreibungDetailsRequest request,
                                        StreamObserver<EinschreibungDetailsResponse> responseObserver) {
        Long einschreibungId = request.getEinschreibungId();
        log.info("gRPC: Getting Einschreibung details for: {}", einschreibungId);

        try {
            Optional<Einschreibung> einschreibungOpt = einschreibungRepository.findByIdWithDetails(einschreibungId);
            
            if (einschreibungOpt.isEmpty()) {
                log.warn("gRPC: Einschreibung nicht gefunden: {}", einschreibungId);
                responseObserver.onNext(EinschreibungDetailsResponse.newBuilder()
                        .setEinschreibungId(einschreibungId)
                        .setFound(false)
                        .build());
                responseObserver.onCompleted();
                return;
            }

            Einschreibung einschreibung = einschreibungOpt.get();
            Pruefungsordnung po = einschreibung.getPruefungsordnung();
            
            // ECTS-Gesamt aus Studiengang ermitteln
            int ectsGesamt = einschreibung.getStudiengang().getGesamtEcts();
            String studiengangName = einschreibung.getStudiengang().getName();

            EinschreibungDetailsResponse response = EinschreibungDetailsResponse.newBuilder()
                    .setEinschreibungId(einschreibungId)
                    .setPoId(po.getId())
                    .setEctsGesamt(ectsGesamt)
                    .setStudiengangName(studiengangName)
                    .setFound(true)
                    .build();

            log.info("gRPC: Returning Einschreibung details - PO: {}, ECTS: {}", po.getId(), ectsGesamt);
            responseObserver.onNext(response);
            responseObserver.onCompleted();

        } catch (Exception e) {
            log.error("gRPC Error getting Einschreibung details: {} - Stacktrace:", e.getMessage(), e);
            responseObserver.onError(io.grpc.Status.INTERNAL
                    .withDescription("Fehler beim Abrufen der Einschreibung: " + e.getMessage())
                    .asRuntimeException());
        }
    }
}

