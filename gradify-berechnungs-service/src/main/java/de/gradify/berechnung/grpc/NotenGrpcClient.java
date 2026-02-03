package de.gradify.berechnung.grpc;

import de.gradify.shared.grpc.berechnung.*;
import io.grpc.StatusRuntimeException;
import lombok.extern.slf4j.Slf4j;
import net.devh.boot.grpc.client.inject.GrpcClient;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;

/**
 * gRPC Client für Noten-Service.
 */
@Service
@Slf4j
public class NotenGrpcClient {

    @GrpcClient("noten-service")
    private NotenDataServiceGrpc.NotenDataServiceBlockingStub notenStub;
    
    private volatile GrpcStatus lastStatus = new GrpcStatus(false, "Nicht initialisiert");

    /**
     * Holt alle freigegebenen Noten einer Einschreibung für Berechnung.
     */
    public NotenResult getNotenFuerBerechnung(Long einschreibungId) {
        log.info("gRPC: Requesting Noten for einschreibung: {}", einschreibungId);

        if (notenStub == null) {
            log.error("gRPC: NotenStub not initialized!");
            lastStatus = new GrpcStatus(false, "Stub nicht initialisiert");
            return new NotenResult(Collections.emptyList(), lastStatus);
        }

        try {
            NotenRequest request = NotenRequest.newBuilder()
                    .setEinschreibungId(einschreibungId)
                    .build();

            NotenListResponse response = notenStub.getNotenFuerBerechnung(request);
            
            log.info("gRPC: Received {} Noten", response.getNotenCount());
            lastStatus = new GrpcStatus(true, "OK - " + response.getNotenCount() + " Noten");
            return new NotenResult(response.getNotenList(), lastStatus);

        } catch (StatusRuntimeException e) {
            String desc = e.getStatus().getDescription();
            String msg = (desc != null && !desc.isEmpty()) ? desc : ("Fehler: " + e.getStatus().getCode());
            log.error("gRPC Error getting Noten: {} - {}", e.getStatus().getCode(), msg);
            lastStatus = new GrpcStatus(false, msg);
            return new NotenResult(Collections.emptyList(), lastStatus);
        }
    }
    
    public GrpcStatus getLastStatus() {
        return lastStatus;
    }
    
    public record GrpcStatus(boolean available, String message) {}
    public record NotenResult(List<NoteData> noten, GrpcStatus status) {}

    /**
     * Konvertiert NoteData zu einer einfachen DTO-Map.
     */
    public static NotenInfo toNotenInfo(NoteData data) {
        return new NotenInfo(
                data.getModulId(),
                data.getNoteWert(),
                data.getBestanden(),
                data.getInGesamtnote()
        );
    }

    /**
     * Einfache DTO Klasse für Noten-Daten.
     */
    public record NotenInfo(Long modulId, double noteWert, boolean bestanden, boolean inGesamtnote) {}
}



