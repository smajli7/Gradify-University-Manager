package de.gradify.berechnung.grpc;

import de.gradify.berechnung.dto.BerechnungDto;
import de.gradify.berechnung.service.BerechnungsService;
import de.gradify.shared.grpc.berechnung.*;
import io.grpc.stub.StreamObserver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.devh.boot.grpc.server.service.GrpcService;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * gRPC Server für Berechnungs-Service.
 * Wird vom Noten-Service aufgerufen um Neuberechnungen zu triggern.
 */
@GrpcService
@RequiredArgsConstructor
@Slf4j
@Transactional
public class BerechnungsServiceGrpcImpl extends BerechnungsServiceGrpc.BerechnungsServiceImplBase {

    private final BerechnungsService berechnungsService;
    private final StudiengangGrpcClient studiengangGrpcClient;

    /**
     * Triggert eine Neuberechnung der Gesamtnote.
     * Holt automatisch die PO-ID aus der Einschreibung via gRPC.
     */
    @Override
    public void triggerNeuberechnung(NeuberechnungRequest request, 
                                      StreamObserver<NeuberechnungResponse> responseObserver) {
        log.info("gRPC: TriggerNeuberechnung called for einschreibung: {}", request.getEinschreibungId());

        try {
            Long einschreibungId = request.getEinschreibungId();
            
            // 1. Einschreibungsdetails (PO-ID, ECTS) via gRPC holen
            var detailsResult = studiengangGrpcClient.getEinschreibungDetails(einschreibungId);
            
            if (!detailsResult.status().available()) {
                log.error("gRPC: Studiengang-Service nicht erreichbar: {}", detailsResult.status().message());
                responseObserver.onNext(NeuberechnungResponse.newBuilder()
                        .setSuccess(false)
                        .setStatus("FEHLER")
                        .setMessage("Studiengang-Service nicht erreichbar: " + detailsResult.status().message())
                        .build());
                responseObserver.onCompleted();
                return;
            }
            
            if (detailsResult.info().isEmpty()) {
                log.warn("gRPC: Einschreibung nicht gefunden: {}", einschreibungId);
                responseObserver.onNext(NeuberechnungResponse.newBuilder()
                        .setSuccess(false)
                        .setStatus("NICHT_GEFUNDEN")
                        .setMessage("Einschreibung nicht gefunden: " + einschreibungId)
                        .build());
                responseObserver.onCompleted();
                return;
            }
            
            var einschreibungInfo = detailsResult.info().get();
            Long poId = einschreibungInfo.poId();
            int ectsGesamt = einschreibungInfo.ectsGesamt();
            
            log.info("gRPC: Starte Neuberechnung mit PO: {}, ECTS: {}", poId, ectsGesamt);
            
            // 2. Berechnung durchführen
            BerechnungDto result = berechnungsService.berechneGesamtnote(einschreibungId, poId, ectsGesamt);
            
            // 3. Response bauen
            double gesamtnoteValue = result.getGesamtnote() != null 
                    ? result.getGesamtnote().doubleValue() 
                    : 0.0;
            
            NeuberechnungResponse response = NeuberechnungResponse.newBuilder()
                    .setSuccess(true)
                    .setGesamtnote(gesamtnoteValue)
                    .setStatus(result.getStatus())
                    .setMessage("Neuberechnung erfolgreich - " + result.getModuleBestanden() + 
                            " von " + result.getModuleGesamt() + " Module bestanden")
                    .build();

            log.info("gRPC: Neuberechnung abgeschlossen - Gesamtnote: {}", gesamtnoteValue);
            responseObserver.onNext(response);
            responseObserver.onCompleted();

        } catch (Exception e) {
            log.error("gRPC Error in TriggerNeuberechnung: {}", e.getMessage(), e);
            responseObserver.onNext(NeuberechnungResponse.newBuilder()
                    .setSuccess(false)
                    .setStatus("FEHLER")
                    .setMessage("Fehler bei Neuberechnung: " + e.getMessage())
                    .build());
            responseObserver.onCompleted();
        }
    }

    /**
     * Holt die berechnete Gesamtnote einer Einschreibung.
     */
    @Override
    public void getGesamtnote(GesamtnoteRequest request, 
                              StreamObserver<GesamtnoteResponse> responseObserver) {
        log.info("gRPC: GetGesamtnote called for einschreibung: {}", request.getEinschreibungId());

        try {
            Long einschreibungId = request.getEinschreibungId();
            
            Optional<BerechnungDto> resultOpt = berechnungsService.getGesamtnote(einschreibungId);
            
            if (resultOpt.isEmpty()) {
                log.warn("gRPC: Keine Berechnung gefunden für: {}", einschreibungId);
                responseObserver.onNext(GesamtnoteResponse.newBuilder()
                        .setEinschreibungId(einschreibungId)
                        .setStatus("NICHT_GEFUNDEN")
                        .build());
                responseObserver.onCompleted();
                return;
            }
            
            BerechnungDto result = resultOpt.get();
            
            GesamtnoteResponse response = GesamtnoteResponse.newBuilder()
                    .setEinschreibungId(einschreibungId)
                    .setGesamtnote(result.getGesamtnote() != null ? result.getGesamtnote().doubleValue() : 0.0)
                    .setGesamtnoteRoh(result.getGesamtnoteRoh() != null ? result.getGesamtnoteRoh().doubleValue() : 0.0)
                    .setStatus(result.getStatus())
                    .setBerechnetAm(result.getBerechnetAm() != null ? result.getBerechnetAm().toString() : "")
                    .setModuleBestanden(result.getModuleBestanden())
                    .setModuleGesamt(result.getModuleGesamt())
                    .build();

            log.info("gRPC: Returning Gesamtnote: {}", result.getGesamtnote());
            responseObserver.onNext(response);
            responseObserver.onCompleted();

        } catch (Exception e) {
            log.error("gRPC Error in GetGesamtnote: {}", e.getMessage(), e);
            responseObserver.onError(io.grpc.Status.INTERNAL
                    .withDescription("Fehler beim Abrufen der Gesamtnote: " + e.getMessage())
                    .asRuntimeException());
        }
    }
}
