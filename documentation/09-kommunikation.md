# Kommunikationskonzept

## 1. Übersicht

Die Microservices des Gradify-Systems kommunizieren über drei verschiedene Protokolle sowie eine Message Queue. Die Wahl des Protokolls richtet sich nach dem jeweiligen Anwendungsfall.

| Protokoll | Einsatzbereich | Stärke |
|-----------|---------------|--------|
| REST | CRUD-Operationen, Frontend → Backend | Einfachheit, breite Unterstützung |
| GraphQL | Flexible Abfragen, Dashboard-Ansichten | Datenflexibilität, weniger Requests |
| gRPC | Service-zu-Service-Kommunikation | Geschwindigkeit, Typsicherheit |
| RabbitMQ | Asynchrone Events | Entkopplung, Fehlertoleranz |

---

## 2. Kommunikationsübersicht

```
┌──────────────────┐
│  Angular Frontend │
└────────┬─────────┘
         │ REST + GraphQL
         ▼
┌──────────────────┐
│   API-Gateway    │
│     (8080)       │
└────────┬─────────┘
         │ REST
    ┌────┴────┬──────────┬──────────┬──────────┐
    ▼         ▼          ▼          ▼          ▼
┌───────┐ ┌───────┐ ┌─────────┐ ┌───────┐ ┌──────────┐
│ Auth  │ │ User  │ │Studien- │ │ Noten │ │Berechnung│
│(8081) │ │(8082) │ │gang     │ │(8084) │ │  (8085)  │
└───┬───┘ └───────┘ │(8083)   │ └───┬───┘ └────┬─────┘
    │         ▲     └────┬────┘     │           │
    └──gRPC───┘          │          │           │
              ▲──gRPC────┘     RabbitMQ ──────▶ │
              │                     │           │
              └─────────gRPC────────┴───────────┘
```

**Frontend → Backend:** REST und GraphQL (über API-Gateway)
**Backend → Backend:** gRPC (synchron) und RabbitMQ (asynchron)

---

## 3. REST

REST wird für alle einfachen, klar definierten Operationen eingesetzt, bei denen ein Request einer einzelnen Aktion entspricht. Die Implementierung erfolgt über Spring Web MVC.

### Typische Anwendungsfälle

| Kategorie | Beispiele |
|-----------|----------|
| Authentifizierung | Login, Logout, Token-Refresh |
| CRUD-Operationen | Benutzer anlegen, Note erfassen, Studiengang erstellen, Mandant anlegen |
| Statusänderungen | Note validieren, Note freigeben, Note ablehnen, Einschreibung abschließen |
| Datenexport/-import | CSV-Export von Noten und Benutzern, CSV-Import von Studiengängen |

### Begründung

REST eignet sich für diese Operationen, da jeder Request genau eine Aktion ausführt, die HTTP-Semantik (GET, POST, PUT, DELETE) intuitiv abbildbar ist und die Implementierung standardisiert erfolgt.

---

## 4. GraphQL

GraphQL wird für flexible Abfragen eingesetzt, bei denen das Frontend die Struktur und Tiefe der Antwortdaten bestimmt. Drei Services stellen GraphQL-Endpunkte bereit, die über den Gateway erreichbar sind.

### Typische Anwendungsfälle

| Anwendungsfall | Service | Beschreibung |
|---------------|---------|-------------|
| Studentenübersicht | User-Service | Studierende mit Benutzerdaten und Rollen |
| Dozentenmodule | Studiengang-Service | Module eines Dozenten mit Studiengangdaten |
| Notenübersicht | Noten-Service | Noten einer Einschreibung mit Durchschnitt |
| Studiengangstruktur | Studiengang-Service | Studiengang mit PO, Modulen und Gewichtungen |
| Einschreibungen | Studiengang-Service | Einschreibungen mit Student- und Studiengangdaten |
| Wahlpflichtfachwahlen | Studiengang-Service | Gewählte Wahlpflichtfächer pro Einschreibung |

### Begründung

Ohne GraphQL wären für eine Dashboard-Ansicht mehrere sequenzielle REST-Aufrufe notwendig. GraphQL ermöglicht es, alle benötigten Daten in einer einzigen Anfrage abzurufen.

### GraphQL-Endpunkte

| Gateway-Pfad | Ziel-Service |
|-------------|-------------|
| `/graphql/user` | User-Service (8082) |
| `/graphql/studiengang` | Studiengang-Service (8083) |
| `/graphql/noten` | Noten-Service (8084) |

---

## 5. gRPC

gRPC wird für die synchrone Kommunikation zwischen Backend-Services eingesetzt. Die Schnittstellen werden über Protocol Buffer-Dateien (`.proto`) im Shared-Modul (`gradify-shared`) definiert.

### Alle gRPC-Verbindungen

| Von | Nach | Port | Methode | Beschreibung |
|-----|------|------|---------|-------------|
| Auth-Service | User-Service | 9082 | `ValidateCredentials` | Benutzername/Passwort prüfen |
| Auth-Service | User-Service | 9082 | `GetUserById` | Benutzerdaten für Token laden |
| Auth-Service | User-Service | 9082 | `GetUserByUsername` | Benutzer nach Name laden |
| Studiengang-Service | User-Service | 9082 | `StudentExists` | Studentenexistenz prüfen |
| Studiengang-Service | User-Service | 9082 | `GetStudent` | Studentendaten laden |
| Studiengang-Service | User-Service | 9082 | `GetStudentsByIds` | Mehrere Studenten laden |
| Studiengang-Service | User-Service | 9082 | `GetStudentsByStudiengang` | Studentenliste je Studiengang laden |
| Berechnungs-Service | Studiengang-Service | 9083 | `GetRegelwerk` | PO-Berechnungsformel laden |
| Berechnungs-Service | Studiengang-Service | 9083 | `GetModulGewichtungen` | Modulgewichtungen laden |
| Berechnungs-Service | Studiengang-Service | 9083 | `GetEinschreibungDetails` | Einschreibungsdetails laden |
| Berechnungs-Service | Noten-Service | 9084 | `GetNotenFuerBerechnung` | Noten einer Einschreibung laden |

### Begründung

gRPC bietet gegenüber REST für Service-zu-Service-Kommunikation: binäres Protokoll (Protocol Buffers) statt JSON-Serialisierung, Typsicherheit durch `.proto`-Definitionen zur Compile-Zeit, und Unterstützung von Streaming.

### Proto-Dateien

| Datei | Definierte Services |
|-------|-------------------|
| `user.proto` | UserValidationService, StudentDataService |
| `berechnung.proto` | BerechnungsService (Berechnungs-Service), NotenDataService (Noten-Service), RegelwerkService (Studiengang-Service) |

---

## 6. Message Queue (RabbitMQ)

RabbitMQ wird für die asynchrone, ereignisgesteuerte Kommunikation zwischen Noten-Service (Producer) und Berechnungs-Service (Consumer) eingesetzt.

### Architektur

```
Noten-Service (Producer)
         │
    publish NoteEvent
         │
         ▼
Exchange: gradify.events (Topic)
         │
         ├── note.created
         ├── note.updated
         ├── note.validated
         ├── note.released
         └── note.deleted
                │
                ▼
Queue: queue.berechnung.neuberechnung
                │
                ▼
Berechnungs-Service (Consumer)
    → berechneGesamtnote(einschreibungId)
```

### Begründung

| Vorteil | Beschreibung |
|---------|-------------|
| Entkopplung | Der Noten-Service muss nicht wissen, welcher Service die Berechnung durchführt |
| Fehlertoleranz | Events werden in der Queue gepuffert, falls der Consumer temporär nicht verfügbar ist |
| Skalierbarkeit | Mehrere Consumer-Instanzen können Events parallel verarbeiten |
| Erweiterbarkeit | Zusätzliche Consumer können ohne Änderung am Producer hinzugefügt werden |

### Technische Details

| Eigenschaft | Wert |
|-------------|------|
| Broker | RabbitMQ 3.x (Management-Alpine) |
| Exchange-Typ | Topic |
| Serialisierung | JSON (Jackson) |
| Queues | Durable (überleben Broker-Neustart) |
| Mandantenfähigkeit | Event enthält `mandantId` für Tenant-Kontext |

---

## 7. Zusammenfassung pro Service

| Service | Eingehend | Ausgehend |
|---------|-----------|-----------|
| API-Gateway | REST, GraphQL (vom Frontend) | REST (an Backend-Services) |
| Auth-Service | REST | gRPC (zum User-Service) |
| User-Service | REST, GraphQL, gRPC | – |
| Studiengang-Service | REST, GraphQL, gRPC | gRPC (zum User-Service) |
| Noten-Service | REST, GraphQL, gRPC | RabbitMQ (Events publizieren) |
| Berechnungs-Service | REST, RabbitMQ, gRPC | gRPC (zum Noten- und Studiengang-Service) |
