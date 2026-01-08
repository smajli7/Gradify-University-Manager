package de.gradify.noten.grpc;

import de.gradify.noten.entity.Note;
import de.gradify.noten.repository.NoteRepository;
import de.gradify.shared.grpc.berechnung.*;
import io.grpc.stub.StreamObserver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.devh.boot.grpc.server.service.GrpcService;

import java.util.List;
import java.util.UUID;

/**
 * gRPC Server für Noten-Abruf durch Berechnungs-Service.
 */
@GrpcService
@RequiredArgsConstructor
@Slf4j
public class NotenDataServiceGrpcImpl extends NotenDataServiceGrpc.NotenDataServiceImplBase {

    private final NoteRepository noteRepository;

    @Override
    public void getNotenFuerBerechnung(NotenRequest request, StreamObserver<NotenListResponse> responseObserver) {
        log.info("gRPC: Getting Noten for Berechnung, einschreibungId: {}", request.getEinschreibungId());

        try {
            UUID einschreibungId = UUID.fromString(request.getEinschreibungId());
            
            // Nur freigegebene Noten für Berechnung verwenden
            List<Note> noten = noteRepository.findByEinschreibungIdAndStatus(
                    einschreibungId, Note.NoteStatus.FREIGEGEBEN);

            NotenListResponse.Builder responseBuilder = NotenListResponse.newBuilder();

            for (Note note : noten) {
                NoteData noteData = NoteData.newBuilder()
                        .setModulId(note.getModulId().toString())
                        .setNoteWert(note.getNoteWert() != null ? note.getNoteWert().doubleValue() : 0.0)
                        .setBestanden(note.getBestanden() != null && note.getBestanden())
                        .setInGesamtnote(true) // Standard: alle Noten in Gesamtnote
                        .build();
                
                responseBuilder.addNoten(noteData);
            }

            log.info("gRPC: Returning {} Noten for einschreibung: {}", noten.size(), einschreibungId);
            responseObserver.onNext(responseBuilder.build());
            responseObserver.onCompleted();

        } catch (Exception e) {
            log.error("gRPC Error getting Noten: {}", e.getMessage());
            responseObserver.onError(io.grpc.Status.INTERNAL
                    .withDescription("Fehler beim Abrufen der Noten: " + e.getMessage())
                    .asRuntimeException());
        }
    }
}



