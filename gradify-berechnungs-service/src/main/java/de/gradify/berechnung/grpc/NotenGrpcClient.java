package de.gradify.berechnung.grpc;

import de.gradify.shared.grpc.berechnung.*;
import io.grpc.StatusRuntimeException;
import lombok.extern.slf4j.Slf4j;
import net.devh.boot.grpc.client.inject.GrpcClient;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * gRPC Client für Noten-Service.
 */
@Service
@Slf4j
public class NotenGrpcClient {

    @GrpcClient("noten-service")
    private NotenDataServiceGrpc.NotenDataServiceBlockingStub notenStub;

    /**
     * Holt alle freigegebenen Noten einer Einschreibung für Berechnung.
     */
    public List<NoteData> getNotenFuerBerechnung(UUID einschreibungId) {
        log.info("gRPC: Requesting Noten for einschreibung: {}", einschreibungId);

        if (notenStub == null) {
            log.warn("gRPC: NotenStub not initialized");
            return Collections.emptyList();
        }

        try {
            NotenRequest request = NotenRequest.newBuilder()
                    .setEinschreibungId(einschreibungId.toString())
                    .build();

            NotenListResponse response = notenStub.getNotenFuerBerechnung(request);
            
            log.info("gRPC: Received {} Noten", response.getNotenCount());
            return response.getNotenList();

        } catch (StatusRuntimeException e) {
            log.error("gRPC Error getting Noten: {} - {}", e.getStatus().getCode(), e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * Konvertiert NoteData zu einer einfachen DTO-Map.
     */
    public static NotenInfo toNotenInfo(NoteData data) {
        return new NotenInfo(
                UUID.fromString(data.getModulId()),
                data.getNoteWert(),
                data.getBestanden(),
                data.getInGesamtnote()
        );
    }

    /**
     * Einfache DTO Klasse für Noten-Daten.
     */
    public record NotenInfo(UUID modulId, double noteWert, boolean bestanden, boolean inGesamtnote) {}
}



