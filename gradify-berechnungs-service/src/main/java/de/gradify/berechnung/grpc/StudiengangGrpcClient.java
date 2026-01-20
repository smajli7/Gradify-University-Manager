package de.gradify.berechnung.grpc;

import de.gradify.shared.grpc.berechnung.*;
import io.grpc.StatusRuntimeException;
import lombok.extern.slf4j.Slf4j;
import net.devh.boot.grpc.client.inject.GrpcClient;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * gRPC Client für Studiengang-Service (Regelwerk & Gewichtungen).
 */
@Service
@Slf4j
public class StudiengangGrpcClient {

    @GrpcClient("studiengang-service")
    private RegelwerkServiceGrpc.RegelwerkServiceBlockingStub regelwerkStub;

    /**
     * Holt das Regelwerk für eine Prüfungsordnung.
     */
    public Optional<RegelwerkInfo> getRegelwerk(UUID poId) {
        log.info("gRPC: Requesting Regelwerk for PO: {}", poId);

        if (regelwerkStub == null) {
            log.warn("gRPC: RegelwerkStub not initialized");
            return Optional.empty();
        }

        try {
            RegelwerkRequest request = RegelwerkRequest.newBuilder()
                    .setPoId(poId.toString())
                    .build();

            RegelwerkResponse response = regelwerkStub.getRegelwerk(request);
            
            log.info("gRPC: Received Regelwerk - Berechnungsart: {}", response.getBerechnungsart());
            return Optional.of(new RegelwerkInfo(
                    response.getBerechnungsart(),
                    response.getFormel(),
                    response.getParameterJson()
            ));

        } catch (StatusRuntimeException e) {
            log.error("gRPC Error getting Regelwerk: {} - {}", e.getStatus().getCode(), e.getMessage());
            return Optional.empty();
        }
    }

    /**
     * Holt die Modul-Gewichtungen für eine Prüfungsordnung.
     */
    public List<ModulGewichtung> getModulGewichtungen(UUID poId) {
        log.info("gRPC: Requesting Modul-Gewichtungen for PO: {}", poId);

        if (regelwerkStub == null) {
            log.warn("gRPC: RegelwerkStub not initialized");
            return Collections.emptyList();
        }

        try {
            ModulGewichtungRequest request = ModulGewichtungRequest.newBuilder()
                    .setPoId(poId.toString())
                    .build();

            ModulGewichtungListResponse response = regelwerkStub.getModulGewichtungen(request);
            
            log.info("gRPC: Received {} Modul-Gewichtungen", response.getModuleCount());
            return response.getModuleList();

        } catch (StatusRuntimeException e) {
            log.error("gRPC Error getting Modul-Gewichtungen: {} - {}", e.getStatus().getCode(), e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * DTO für Regelwerk-Daten.
     */
    public record RegelwerkInfo(String berechnungsart, String formel, String parameter) {}
}



