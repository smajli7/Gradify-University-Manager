package de.gradify.noten.grpc;

import de.gradify.shared.grpc.berechnung.*;
import io.grpc.StatusRuntimeException;
import lombok.extern.slf4j.Slf4j;
import net.devh.boot.grpc.client.inject.GrpcClient;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * gRPC Client für Berechnungs-Service.
 * Wird verwendet um Neuberechnungen zu triggern wenn Noten geändert werden.
 */
@Service
@Slf4j
public class BerechnungsGrpcClient {

    @GrpcClient("berechnungs-service")
    private BerechnungsServiceGrpc.BerechnungsServiceBlockingStub berechnungsStub;
    
    private volatile GrpcStatus lastStatus = new GrpcStatus(false, "Nicht initialisiert");

    /**
     * Triggert eine Neuberechnung der Gesamtnote.
     * Sollte aufgerufen werden wenn eine Note hinzugefügt/geändert/validiert wird.
     * 
     * @param einschreibungId Die Einschreibungs-ID
     * @return NeuberechnungResult mit Status und optionaler neuer Gesamtnote
     */
    public NeuberechnungResult triggerNeuberechnung(Long einschreibungId) {
        log.info("gRPC: Triggering Neuberechnung for einschreibung: {}", einschreibungId);

        if (berechnungsStub == null) {
            log.error("gRPC: BerechnungsStub not initialized!");
            lastStatus = new GrpcStatus(false, "Stub nicht initialisiert");
            return new NeuberechnungResult(false, null, "gRPC nicht verfügbar", lastStatus);
        }

        try {
            NeuberechnungRequest request = NeuberechnungRequest.newBuilder()
                    .setEinschreibungId(einschreibungId)
                    .build();

            NeuberechnungResponse response = berechnungsStub.triggerNeuberechnung(request);
            
            lastStatus = new GrpcStatus(true, response.getSuccess() ? "OK" : response.getMessage());
            
            Double gesamtnote = response.getGesamtnote() > 0 ? response.getGesamtnote() : null;
            
            log.info("gRPC: Neuberechnung result - success: {}, note: {}", 
                    response.getSuccess(), gesamtnote);
            
            return new NeuberechnungResult(
                    response.getSuccess(),
                    gesamtnote,
                    response.getMessage(),
                    lastStatus
            );

        } catch (StatusRuntimeException e) {
            log.error("gRPC Error triggering Neuberechnung: {} - {}", e.getStatus().getCode(), e.getMessage());
            lastStatus = new GrpcStatus(false, "Fehler: " + e.getStatus().getCode());
            return new NeuberechnungResult(false, null, "gRPC Fehler: " + e.getMessage(), lastStatus);
        } catch (Exception e) {
            log.error("Error triggering Neuberechnung: {}", e.getMessage(), e);
            lastStatus = new GrpcStatus(false, "Fehler: " + e.getMessage());
            return new NeuberechnungResult(false, null, "Fehler: " + e.getMessage(), lastStatus);
        }
    }

    /**
     * Holt die berechnete Gesamtnote für eine Einschreibung.
     * 
     * @param einschreibungId Die Einschreibungs-ID
     * @return GesamtnoteResult mit Notendaten oder leer wenn nicht gefunden
     */
    public GesamtnoteResult getGesamtnote(Long einschreibungId) {
        log.info("gRPC: Getting Gesamtnote for einschreibung: {}", einschreibungId);

        if (berechnungsStub == null) {
            log.error("gRPC: BerechnungsStub not initialized!");
            lastStatus = new GrpcStatus(false, "Stub nicht initialisiert");
            return new GesamtnoteResult(Optional.empty(), lastStatus);
        }

        try {
            GesamtnoteRequest request = GesamtnoteRequest.newBuilder()
                    .setEinschreibungId(einschreibungId)
                    .build();

            GesamtnoteResponse response = berechnungsStub.getGesamtnote(request);
            
            if ("NICHT_GEFUNDEN".equals(response.getStatus())) {
                lastStatus = new GrpcStatus(true, "Keine Berechnung gefunden");
                return new GesamtnoteResult(Optional.empty(), lastStatus);
            }
            
            lastStatus = new GrpcStatus(true, "OK");
            
            GesamtnoteInfo info = new GesamtnoteInfo(
                    response.getGesamtnote(),
                    response.getGesamtnoteRoh(),
                    response.getStatus(),
                    response.getModuleBestanden(),
                    response.getModuleGesamt()
            );
            
            log.info("gRPC: Received Gesamtnote: {}", info.gesamtnote());
            return new GesamtnoteResult(Optional.of(info), lastStatus);

        } catch (StatusRuntimeException e) {
            log.error("gRPC Error getting Gesamtnote: {} - {}", e.getStatus().getCode(), e.getMessage());
            lastStatus = new GrpcStatus(false, "Fehler: " + e.getStatus().getCode());
            return new GesamtnoteResult(Optional.empty(), lastStatus);
        } catch (Exception e) {
            log.error("Error getting Gesamtnote: {}", e.getMessage(), e);
            lastStatus = new GrpcStatus(false, "Fehler: " + e.getMessage());
            return new GesamtnoteResult(Optional.empty(), lastStatus);
        }
    }
    
    public GrpcStatus getLastStatus() {
        return lastStatus;
    }
    
    // Records für Ergebnisse
    public record GrpcStatus(boolean available, String message) {}
    
    public record NeuberechnungResult(
            boolean success,
            Double gesamtnote,
            String message,
            GrpcStatus status
    ) {}
    
    public record GesamtnoteInfo(
            double gesamtnote,
            double gesamtnoteRoh,
            String status,
            int moduleBestanden,
            int moduleGesamt
    ) {}
    
    public record GesamtnoteResult(
            Optional<GesamtnoteInfo> info,
            GrpcStatus status
    ) {}
}
