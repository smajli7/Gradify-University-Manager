# Message Queue Implementierung

Dieses Dokument beschreibt die Message Queue Implementierung mit RabbitMQ für asynchrone Kommunikation zwischen Services.

> **Status: IMPLEMENTIERT** - Die Message Queue ist vollständig integriert.

---

## Motivation

Aktuell kommunizieren die Gradify-Services **synchron**:
- REST für Frontend → Backend
- GraphQL für komplexe Abfragen
- gRPC für Service-zu-Service

Eine **Message Queue** (z.B. RabbitMQ, Apache Kafka) würde zusätzliche Vorteile bieten:

| Aspekt | Synchron (aktuell) | Asynchron (mit MQ) |
|--------|-------------------|-------------------|
| Kopplung | Eng | Lose |
| Fehlertoleranz | Service muss erreichbar sein | Events werden gepuffert |
| Skalierung | Begrenzt durch langsamsten Service | Unabhängig skalierbar |
| Komplexität | Einfacher | Komplexer |

---

## Use Cases für Message Queue

### 1. Notenänderung → Automatische Neuberechnung

**Aktuell (synchron):**
```
Frontend → POST /api/noten → Noten-Service → return
                 ↓
         (manuell) Berechnung starten
```

**Mit Message Queue:**
```
Frontend → POST /api/noten → Noten-Service
                                    ↓
                          publish: "note.created"
                                    ↓
                            Message Queue
                                    ↓
                    Berechnungs-Service (Consumer)
                                    ↓
                         Automatische Neuberechnung
```

### 2. Notenvalidierung → Benachrichtigung

**Ereignis-Flow:**
```
Prüfungsamt validiert Note
         ↓
 publish: "note.validated"
         ↓
    Message Queue
         ↓
   ┌─────┴─────┐
   ↓           ↓
Email-Service  Berechnungs-Service
(benachrichtigt  (berechnet neu)
 Student)
```

### 3. Batch-Import von Noten

**Szenario:** 100 Noten aus CSV importieren

```
Admin lädt CSV hoch
         ↓
 publish: 100x "note.import"
         ↓
    Message Queue (puffert)
         ↓
 Noten-Service verarbeitet
 mit Rate-Limiting (10/Sek)
```

---

## Technologie-Empfehlung: RabbitMQ

### Warum RabbitMQ?

| Kriterium | RabbitMQ | Apache Kafka |
|-----------|----------|--------------|
| Komplexität | Einfach | Komplex |
| Use Case | Aufgaben-Queue | Event-Streaming |
| Nachrichtengarantie | At-least-once | Exactly-once |
| Lernkurve | Niedrig | Hoch |
| Spring-Integration | Exzellent | Gut |

Für Gradify ist **RabbitMQ** besser geeignet, da:
- Einfachere Konfiguration
- Perfekt für Task-Queues
- Gute Spring Boot Integration

---

## Architektur mit RabbitMQ

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌─────────────┐         ┌─────────────┐                   │
│  │ Noten-Svc   │──pub──▶│  RabbitMQ   │◀──sub──┬──────────│
│  │ (Producer)  │         │   Broker    │        │          │
│  └─────────────┘         └─────────────┘        │          │
│                                                  │          │
│                          ┌───────────────────────┘          │
│                          ▼                                  │
│                   ┌─────────────┐                          │
│                   │ Berechnung  │                          │
│                   │ (Consumer)  │                          │
│                   └─────────────┘                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Exchanges und Queues

```
Exchange: gradify.events (topic)
    │
    ├── note.created    → queue.berechnung.neuberechnung
    ├── note.validated  → queue.berechnung.neuberechnung
    │                   → queue.notification.student
    └── note.deleted    → queue.berechnung.neuberechnung
```

---

## Implementierung (Konzept)

### 1. RabbitMQ in Docker Compose

```yaml
services:
  rabbitmq:
    image: rabbitmq:3-management-alpine
    container_name: gradify-rabbitmq
    ports:
      - "5672:5672"   # AMQP
      - "15672:15672" # Management UI
    environment:
      RABBITMQ_DEFAULT_USER: gradify
      RABBITMQ_DEFAULT_PASS: gradify123
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
```

### 2. Spring Boot Producer (Noten-Service)

```java
@Service
@RequiredArgsConstructor
public class NotenEventPublisher {
    
    private final RabbitTemplate rabbitTemplate;
    
    public void publishNoteCreated(Note note) {
        NoteEvent event = NoteEvent.builder()
            .type("note.created")
            .noteId(note.getId())
            .einschreibungId(note.getEinschreibungId())
            .modulId(note.getModulId())
            .timestamp(Instant.now())
            .build();
        
        rabbitTemplate.convertAndSend(
            "gradify.events",  // Exchange
            "note.created",    // Routing Key
            event
        );
    }
}
```

### 3. Spring Boot Consumer (Berechnungs-Service)

```java
@Component
@RequiredArgsConstructor
@Slf4j
public class BerechnungEventConsumer {
    
    private final BerechnungsService berechnungsService;
    
    @RabbitListener(queues = "queue.berechnung.neuberechnung")
    public void handleNoteEvent(NoteEvent event) {
        log.info("Received event: {} for einschreibung: {}", 
            event.getType(), event.getEinschreibungId());
        
        // Automatische Neuberechnung triggern
        berechnungsService.berechneGesamtnote(event.getEinschreibungId());
    }
}
```

### 4. Konfiguration

```yaml
# application.yml
spring:
  rabbitmq:
    host: localhost
    port: 5672
    username: gradify
    password: gradify123
    
# Queue-Konfiguration
gradify:
  rabbitmq:
    exchange: gradify.events
    queues:
      berechnung: queue.berechnung.neuberechnung
      notification: queue.notification.student
```

---

## Vorteile der Implementierung

| Vorteil | Beschreibung |
|---------|--------------|
| **Entkopplung** | Noten-Service muss nicht wissen, wer Berechnungen macht |
| **Resilienz** | Events gehen nicht verloren bei Service-Ausfall |
| **Skalierbarkeit** | Mehrere Consumer können Events parallel verarbeiten |
| **Nachvollziehbarkeit** | Event-Log für Audit |
| **Erweiterbarkeit** | Neue Consumer ohne Änderung am Producer |

---

## Implementierte Komponenten

| Komponente | Datei | Beschreibung |
|------------|-------|--------------|
| **Docker** | `docker-compose.yml` | RabbitMQ Container (Ports 5672, 15672) |
| **Event-DTO** | `gradify-shared/.../event/NoteEvent.java` | Event-Datenstruktur |
| **Event-Typen** | `gradify-shared/.../event/NoteEventType.java` | Enum für Event-Typen |
| **Producer-Config** | `gradify-noten-service/.../config/RabbitMQConfig.java` | Exchange, Queue, Bindings |
| **Publisher** | `gradify-noten-service/.../messaging/NoteEventPublisher.java` | Sendet Events |
| **Consumer-Config** | `gradify-berechnungs-service/.../config/RabbitMQConfig.java` | Listener-Factory |
| **Consumer** | `gradify-berechnungs-service/.../messaging/NoteEventConsumer.java` | Empfängt Events |

---

## Starten

```bash
# RabbitMQ starten
docker-compose up -d rabbitmq

# Management UI öffnen
# http://localhost:15672
# User: gradify / Password: gradify123
```

---

## Fazit

Die Message Queue ist **vollständig implementiert** und bietet:

- **Automatische Neuberechnung**: Bei jeder Notenänderung wird die Gesamtnote automatisch neu berechnet
- **Entkopplung**: Noten-Service und Berechnungs-Service kommunizieren asynchron
- **Fehlertoleranz**: Events werden gepuffert, falls ein Service temporär nicht verfügbar ist
- **Erweiterbarkeit**: Weitere Consumer können einfach hinzugefügt werden (z.B. Benachrichtigungs-Service)

---

*Zuletzt aktualisiert: Januar 2026*
