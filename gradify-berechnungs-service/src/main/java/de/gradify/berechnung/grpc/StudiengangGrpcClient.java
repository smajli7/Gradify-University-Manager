package de.gradify.berechnung.grpc;

import de.gradify.shared.grpc.berechnung.*;
import io.grpc.StatusRuntimeException;
import lombok.extern.slf4j.Slf4j;
import net.devh.boot.grpc.client.inject.GrpcClient;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

/**
 * gRPC Client für Studiengang-Service (Regelwerk & Gewichtungen).
 */
@Service
@Slf4j
public class StudiengangGrpcClient {

    @GrpcClient("studiengang-service")
    private RegelwerkServiceGrpc.RegelwerkServiceBlockingStub regelwerkStub;
    
    private volatile GrpcStatus lastStatus = new GrpcStatus(false, "Nicht initialisiert");

    /**
     * Holt das Regelwerk für eine Prüfungsordnung.
     */
    public RegelwerkResult getRegelwerk(Long poId) {
        log.info("gRPC: Requesting Regelwerk for PO: {}", poId);

        if (regelwerkStub == null) {
            log.error("gRPC: RegelwerkStub not initialized!");
            lastStatus = new GrpcStatus(false, "Stub nicht initialisiert");
            return new RegelwerkResult(Optional.empty(), lastStatus);
        }

        try {
            RegelwerkRequest request = RegelwerkRequest.newBuilder()
                    .setPoId(poId)
                    .build();

            RegelwerkResponse response = regelwerkStub.getRegelwerk(request);
            
            log.info("gRPC: Received Regelwerk - Berechnungsart: {}", response.getBerechnungsart());
            lastStatus = new GrpcStatus(true, "OK");
            return new RegelwerkResult(Optional.of(new RegelwerkInfo(
                    response.getBerechnungsart(),
                    response.getFormel(),
                    response.getParameterJson()
            )), lastStatus);

        } catch (StatusRuntimeException e) {
            log.error("gRPC Error getting Regelwerk: {} - {}", e.getStatus().getCode(), e.getMessage());
            lastStatus = new GrpcStatus(false, "Fehler: " + e.getStatus().getCode());
            return new RegelwerkResult(Optional.empty(), lastStatus);
        }
    }

    /**
     * Holt die Modul-Gewichtungen für eine Prüfungsordnung.
     */
    public GewichtungenResult getModulGewichtungen(Long poId) {
        log.info("gRPC: Requesting Modul-Gewichtungen for PO: {}", poId);

        if (regelwerkStub == null) {
            log.error("gRPC: RegelwerkStub not initialized!");
            lastStatus = new GrpcStatus(false, "Stub nicht initialisiert");
            return new GewichtungenResult(Collections.emptyList(), lastStatus);
        }

        try {
            ModulGewichtungRequest request = ModulGewichtungRequest.newBuilder()
                    .setPoId(poId)
                    .build();

            ModulGewichtungListResponse response = regelwerkStub.getModulGewichtungen(request);
            
            log.info("gRPC: Received {} Modul-Gewichtungen", response.getModuleCount());
            lastStatus = new GrpcStatus(true, "OK - " + response.getModuleCount() + " Module");
            return new GewichtungenResult(response.getModuleList(), lastStatus);

        } catch (StatusRuntimeException e) {
            log.error("gRPC Error getting Modul-Gewichtungen: {} - {}", e.getStatus().getCode(), e.getMessage());
            lastStatus = new GrpcStatus(false, "Fehler: " + e.getStatus().getCode());
            return new GewichtungenResult(Collections.emptyList(), lastStatus);
        }
    }
    
    /**
     * Holt Einschreibungsdetails (PO-ID, ECTS) für Neuberechnung.
     */
    public EinschreibungDetailsResult getEinschreibungDetails(Long einschreibungId) {
        log.info("gRPC: Requesting Einschreibung details for: {}", einschreibungId);

        if (regelwerkStub == null) {
            log.error("gRPC: RegelwerkStub not initialized!");
            lastStatus = new GrpcStatus(false, "Stub nicht initialisiert");
            return new EinschreibungDetailsResult(Optional.empty(), lastStatus);
        }

        try {
            EinschreibungDetailsRequest request = EinschreibungDetailsRequest.newBuilder()
                    .setEinschreibungId(einschreibungId)
                    .build();

            EinschreibungDetailsResponse response = regelwerkStub.getEinschreibungDetails(request);
            
            if (!response.getFound()) {
                log.warn("gRPC: Einschreibung nicht gefunden: {}", einschreibungId);
                lastStatus = new GrpcStatus(true, "Einschreibung nicht gefunden");
                return new EinschreibungDetailsResult(Optional.empty(), lastStatus);
            }

            log.info("gRPC: Received Einschreibung details - PO: {}, ECTS: {}", 
                    response.getPoId(), response.getEctsGesamt());
            lastStatus = new GrpcStatus(true, "OK");
            return new EinschreibungDetailsResult(Optional.of(new EinschreibungInfo(
                    response.getPoId(),
                    response.getEctsGesamt(),
                    response.getStudiengangName()
            )), lastStatus);

        } catch (StatusRuntimeException e) {
            log.error("gRPC Error getting Einschreibung details: {} - {}", e.getStatus().getCode(), e.getMessage());
            lastStatus = new GrpcStatus(false, "Fehler: " + e.getStatus().getCode());
            return new EinschreibungDetailsResult(Optional.empty(), lastStatus);
        }
    }
    
    public GrpcStatus getLastStatus() {
        return lastStatus;
    }

    public record GrpcStatus(boolean available, String message) {}
    public record RegelwerkInfo(String berechnungsart, String formel, String parameter) {}
    public record RegelwerkResult(Optional<RegelwerkInfo> regelwerk, GrpcStatus status) {}
    public record GewichtungenResult(List<ModulGewichtung> gewichtungen, GrpcStatus status) {}
    public record EinschreibungInfo(Long poId, int ectsGesamt, String studiengangName) {}
    public record EinschreibungDetailsResult(Optional<EinschreibungInfo> info, GrpcStatus status) {}
}



