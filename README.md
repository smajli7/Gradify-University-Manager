# Gradify - Notenmanagement System

Web-basiertes Notenmanagement-System für Hochschulen, entwickelt mit Spring Boot und Angular.

## Projektübersicht

| Service | Port | Beschreibung |
|---------|------|--------------|
| API-Gateway | 8080 | Zentraler Einstiegspunkt, Routing |
| Auth-Service | 8081 | Authentifizierung, JWT |
| User-Service | 8082 | Benutzerverwaltung, Rollen |
| Studiengang-Service | 8083 | Studiengänge, Module, PO |
| Noten-Service | 8084 | Notenerfassung, -validierung |
| Berechnungs-Service | 8085 | Gesamtnotenberechnung |
| Frontend | 4200 | Angular SPA |

## API-Dokumentation

### Swagger UI (REST)

Jeder Service bietet eine interaktive API-Dokumentation via Swagger UI:

| Service | Swagger UI URL |
|---------|----------------|
| Auth-Service | http://localhost:8081/swagger-ui.html |
| User-Service | http://localhost:8082/swagger-ui.html |
| Studiengang-Service | http://localhost:8083/swagger-ui.html |
| Noten-Service | http://localhost:8084/swagger-ui.html |
| Berechnungs-Service | http://localhost:8085/swagger-ui.html |

OpenAPI JSON: `http://localhost:{port}/v3/api-docs`

### GraphiQL (GraphQL)

Fuer flexible Datenabfragen bieten folgende Services GraphQL:

| Service | GraphiQL URL | Beschreibung |
|---------|--------------|--------------|
| User-Service | http://localhost:8082/graphiql | Benutzer, Studenten, Rollen |
| Studiengang-Service | http://localhost:8083/graphiql | Studiengaenge, Module, Einschreibungen |
| Noten-Service | http://localhost:8084/graphiql | Noten, Durchschnitte |

**Beispiel-Queries:**

```graphql
# Alle Studenten mit Matrikelnummer
query {
  students {
    id
    matrikelnummer
    vorname
    nachname
  }
}

# Studiengang mit allen Modulen
query {
  studiengangByKuerzel(kuerzel: "BVT") {
    name
    abschlussart
    module {
      name
      ects
      gewichtung
    }
  }
}

# Noten eines Studenten mit Durchschnitt
query {
  notenByStudent(einschreibungId: "...") {
    noteWert
    bestanden
    status
  }
  durchschnittsnote(einschreibungId: "...")
}
```

## Rollen und Berechtigungen

| Rolle | Beschreibung | Berechtigungen |
|-------|--------------|----------------|
| ADMIN | Administrator | Voller Zugriff auf alle Funktionen |
| DOZENT | Dozent/Prüfer | Noten erfassen, validieren |
| PRUEFUNGSAMT | Prüfungsamt | Noten validieren, freigeben, Einschreibungen |
| STUDENT | Student | Nur Lesezugriff auf eigene Daten |

## Voraussetzungen

- **Java 17** (JDK)
- **Maven 3.8+**
- **Node.js 20+** (für Frontend)
- **Docker** (für PostgreSQL)

## Schnellstart

### 1. Repository klonen

```bash
git clone <repository-url>
cd webapp-http-200
```

### 2. Datenbank starten

```bash
docker-compose up -d
```

Dies startet PostgreSQL auf Port 5432 mit allen benötigten Datenbanken.

**Zugangsdaten:**
- Host: `localhost:5432`
- User: `gradify`
- Password: `gradify123`
- Datenbanken: `gradify_auth`, `gradify_user`, `gradify_studiengang`, `gradify_noten`, `gradify_berechnung`

Optional: pgAdmin auf http://localhost:5050 (admin@gradify.de / admin123)

### 3. Backend bauen

```bash
mvn clean install
```

### 4. Services starten

**Option A: Alle Services einzeln starten**

Öffne für jeden Service ein neues Terminal:

```bash
# Terminal 1 - API Gateway
cd gradify-api-gateway
mvn spring-boot:run

# Terminal 2 - Auth Service
cd gradify-auth-service
mvn spring-boot:run

# Terminal 3 - User Service
cd gradify-user-service
mvn spring-boot:run

# Terminal 4 - Studiengang Service
cd gradify-studiengang-service
mvn spring-boot:run

# Terminal 5 - Noten Service
cd gradify-noten-service
mvn spring-boot:run

# Terminal 6 - Berechnungs Service
cd gradify-berechnungs-service
mvn spring-boot:run
```

**Option B: Mit IDE (IntelliJ/VS Code)**

- Öffne das Projekt als Maven-Projekt
- Starte jede `*Application.java` als Spring Boot Application

### 5. Frontend starten

```bash
cd gradify-frontend
npm install
npm start
```

Frontend läuft auf http://localhost:4200

## Projektstruktur

```
webapp-http-200/
├── pom.xml                         # Parent POM
├── docker-compose.yml              # PostgreSQL
├── docker/
│   └── init-databases.sql          # DB-Initialisierung
│
├── gradify-shared/                 # Geteilte Klassen
│   └── src/main/proto/             # gRPC Proto-Dateien
│
├── gradify-api-gateway/            # API Gateway (Port 8080)
├── gradify-auth-service/           # Auth Service (Port 8081)
├── gradify-user-service/           # User Service (Port 8082)
├── gradify-studiengang-service/    # Studiengang Service (Port 8083)
├── gradify-noten-service/          # Noten Service (Port 8084)
├── gradify-berechnungs-service/    # Berechnungs Service (Port 8085)
│
├── gradify-frontend/               # Angular Frontend (Port 4200)
│
└── documentation/                  # Projektdokumentation
    ├── datenmodell.md
    ├── berechnungslogik.md
    ├── service_zuschnitt.md
    ├── kommunikationskonzept.md
    └── schnittstellenentwuerfe.md
```

## API-Dokumentation

### REST-Endpunkte

Alle Endpunkte sind über das API-Gateway erreichbar:

| Pfad | Service |
|------|---------|
| `/api/auth/**` | Auth-Service |
| `/api/users/**` | User-Service |
| `/api/students/**` | User-Service |
| `/api/studiengaenge/**` | Studiengang-Service |
| `/api/module/**` | Studiengang-Service |
| `/api/einschreibungen/**` | Studiengang-Service |
| `/api/noten/**` | Noten-Service |
| `/api/berechnungen/**` | Berechnungs-Service |

### Health Checks

Jeder Service bietet Actuator-Endpunkte:

```
GET http://localhost:{port}/actuator/health
```

## Entwicklung

### Neuen Service bauen

```bash
cd <service-name>
mvn clean package
```

### Tests ausführen

```bash
mvn test
```

### gRPC Proto-Dateien kompilieren

```bash
cd gradify-shared
mvn clean compile
```

## Konfiguration

### Lokale Entwicklung (Default)

Die Services sind für lokale Entwicklung vorkonfiguriert mit:
- PostgreSQL auf `localhost:5432`
- Feste Service-URLs

### Produktion (Supabase)

Für Produktion das Profil `prod` aktivieren und Umgebungsvariablen setzen:

```bash
# Umgebungsvariablen
export SUPABASE_DB_URL=jdbc:postgresql://<host>:<port>/<db>
export SUPABASE_DB_USER=<user>
export SUPABASE_DB_PASSWORD=<password>
export JWT_SECRET=<secret-min-256-bit>

# Service starten
mvn spring-boot:run -Dspring.profiles.active=prod
```

## Technologie-Stack

### Backend
- Java 17
- Spring Boot 3.3.7
- Spring Cloud Gateway
- Spring Data JPA
- Spring Security + JWT
- Spring for GraphQL
- gRPC

### Frontend
- Angular 18
- Angular Material
- Apollo Client (GraphQL)

### Datenbank
- PostgreSQL 16

### DevOps
- Docker / Docker Compose
- Maven Multi-Module

## Dokumentation

Die vollständige Projektdokumentation befindet sich im Ordner `/documentation`:

| Dokument | Beschreibung |
|----------|--------------|
| [Datenmodell](documentation/datenmodell.md) | ER-Diagramm und Entitäten |
| [Berechnungslogik](documentation/berechnungslogik.md) | Notenberechnung nach PO |
| [Service-Zuschnitt](documentation/service_zuschnitt.md) | Microservice-Architektur |
| [Kommunikationskonzept](documentation/kommunikationskonzept.md) | REST/GraphQL/gRPC |
| [Schnittstellenentwürfe](documentation/schnittstellenentwuerfe.md) | API-Spezifikationen |

## Contributing

Siehe [CONTRIBUTING.md](CONTRIBUTING.md) für Entwicklungsrichtlinien.

## Team

Projekt für Web-basierte Anwendungssysteme - WiSe 25/26

## Lizenz

Dieses Projekt ist Teil einer Hochschul-Lehrveranstaltung.

## Deadline

**23.02.2026 - 23:59**

Aktualisiert: 08.01.2026