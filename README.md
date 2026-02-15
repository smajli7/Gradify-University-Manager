# Gradify -- Notenmanagement-System

**Web-basiertes Notenmanagement-System für Hochschulen**
Entwickelt mit Spring Boot, Angular und PostgreSQL im Rahmen des Moduls *Web-basierte Anwendungssysteme* (WiSe 2025/26) an der Frankfurt University of Applied Sciences.

**Team:** Jakub Naruszko (1511408) und Louisa Kristin Bahr (1508628)
**Abgabe:** 23.02.2026

---

## Inhalt

1. [Kurzbeschreibung](#kurzbeschreibung)
2. [Architektur](#architektur)
3. [Technologie-Stack](#technologie-stack)
4. [Voraussetzungen](#voraussetzungen)
5. [Schnellstart](#schnellstart)
6. [API-Dokumentation](#api-dokumentation)
7. [Nicht-grafisches UI](#nicht-grafisches-ui)
8. [Tests](#tests)
9. [Deployment](#deployment)
10. [Projektdokumentation](#projektdokumentation)
11. [Projektstruktur](#projektstruktur)

---

## Kurzbeschreibung

Gradify ermöglicht die Verwaltung von Prüfungsleistungen an Hochschulen:

- Verwaltung von Studierenden, Lehrenden und weiteren Nutzerrollen
- Erfassung, Validierung und Freigabe von Modulnoten über einen Drei-Stufen-Workflow
- Automatische Berechnung von Gesamt- und Durchschnittsnoten gemäß Prüfungsordnung
- Multi-Tenancy -- mehrere Hochschulen arbeiten mit getrennten Datenbanken
- Progressive Web App (PWA) -- installierbar, mit offline-fähiger App-Shell
- Responsive Design -- nutzbar auf Desktop und mobilen Geräten

**Unterstützte Studiengänge:**

| Studiengang | Abschluss | ECTS |
|-------------|-----------|------|
| Bioverfahrenstechnik | Bachelor of Engineering | 210 |
| Forschung in der Sozialen Arbeit | Master of Arts | 120 |

---

## Architektur

Das System folgt einer Microservice-Architektur mit sechs Backend-Services, einem API-Gateway als zentralem Einstiegspunkt und einem Angular-Frontend:

```
                    +--------------------+
                    |  Angular Frontend  |
                    |    (Port 4200)     |
                    +---------+----------+
                              | REST + GraphQL
                              v
                    +--------------------+
                    |    API-Gateway     |
                    |    (Port 8080)     |
                    +---------+----------+
                              |
      +-----------------------+-----------------------+
      |                       |                       |
      v                       v                       v
+-------------+     +-------------+     +------------------+
|Auth-Service |     |User-Service |     |Studiengang-Svc   |
| (8081)      |     | (8082/9082) |     | (8083/9083)      |
+------+------+     +------+------+     +--------+---------+
       | gRPC              |                     |
       +-------------------+                     |
                          +----------------------+
                          |
                          v
              +-------------------+  RabbitMQ  +-------------------+
              |   Noten-Service   | ---------> | Berechnungs-Svc   |
              |  (8084/9084)      | <-- gRPC ->|  (8085/9085)      |
              +--------+----------+            +--------+----------+
                       |                                |
                       v                                v
              +-------------------+            +-------------------+
              |    PostgreSQL     |            |    PostgreSQL     |
              |  (je eigene DB)   |            |  (je eigene DB)   |
              +-------------------+            +-------------------+
```

Jeder Service besitzt eine eigene PostgreSQL-Datenbank (Database-per-Service). Die Ports hinter dem Schrägstrich sind die gRPC-Ports (z.B. 9082).

### Serviceübersicht

| Service | HTTP | gRPC | Aufgabe |
|---------|------|------|---------|
| API-Gateway | 8080 | -- | Routing, CORS, Auth-Header-Weiterleitung |
| Auth-Service | 8081 | -- | Login, JWT-Ausgabe (Access + Refresh) |
| User-Service | 8082 | 9082 | Benutzer, Rollen, Studierende, CSV-Import/Export |
| Studiengang-Service | 8083 | 9083 | Mandanten, Studiengänge, Module, POs, Einschreibungen |
| Noten-Service | 8084 | 9084 | Notenerfassung, Validierung, Freigabe, Audit-Log |
| Berechnungs-Service | 8085 | 9085 | Gesamtnoten-Berechnung nach PO-Regelwerk |
| Frontend | 4200 | -- | Angular SPA + PWA |

### Kommunikationsprotokolle

| Protokoll | Einsatz |
|-----------|---------|
| REST | CRUD-Operationen, Login, Statusänderungen |
| GraphQL | Flexible Leseabfragen (Dashboards, verschachtelte Daten) |
| gRPC | Service-zu-Service (Login-Validierung, Regelwerk-Abfrage, Notenabruf) |
| RabbitMQ | Asynchrone Events (Notenänderung löst Neuberechnung aus) |

---

## Technologie-Stack

### Backend

| Technologie | Version | Zweck |
|-------------|---------|-------|
| Java | 17 | Programmiersprache |
| Spring Boot | 3.3.7 | Application Framework |
| Spring Cloud Gateway | 2023.0.x | API-Gateway, Routing |
| Spring Security + JWT | -- | Authentifizierung, Autorisierung |
| Spring Data JPA | -- | Datenbankzugriff |
| Spring for GraphQL | 1.3.x | GraphQL-Schnittstellen |
| gRPC (grpc-spring-boot-starter) | 3.1.x | Service-zu-Service-Kommunikation |
| RabbitMQ | 3.x | Asynchrone Event-Verarbeitung |
| PostgreSQL | 16 | Relationale Datenbank |

### Frontend

| Technologie | Version | Zweck |
|-------------|---------|-------|
| Angular | 18.2 | SPA-Framework |
| Angular Material | 18.x | UI-Komponentenbibliothek |
| Apollo Angular | 7.0 | GraphQL-Client |
| Chart.js | -- | Diagramme und Visualisierungen |
| jsPDF | -- | PDF-Export |
| PWA (Service Worker) | -- | Installierbarkeit, Offline-Shell |

### DevOps

| Technologie | Zweck |
|-------------|-------|
| Docker / Docker Compose | Containerisierung, lokale Entwicklung |
| Kubernetes | Container-Orchestrierung |
| Maven (Multi-Module) | Build-Automatisierung |

---

## Voraussetzungen

| Werkzeug | Version | Hinweis |
|----------|---------|---------|
| Java (JDK) | 17 | Pflicht |
| Maven | 3.8+ | Pflicht |
| Node.js + npm | 20+ | Für das Frontend |
| Docker + Docker Compose | 24+ | Für PostgreSQL, RabbitMQ |
| kubectl + Minikube | 1.28+ | Optional, für Kubernetes-Deployment |

---

## Schnellstart

### 1. Repository klonen

```bash
git clone <repository-url>
cd webapp-http-200
```

### 2. Infrastruktur starten

PostgreSQL und RabbitMQ als Container:

```bash
docker-compose up -d
```

### 3. Backend bauen

```bash
mvn clean install -DskipTests
```

### 4. Services starten

Jeden Service in einem eigenen Terminal starten:

```bash
cd gradify-api-gateway         && mvn spring-boot:run
cd gradify-auth-service        && mvn spring-boot:run
cd gradify-user-service        && mvn spring-boot:run
cd gradify-studiengang-service && mvn spring-boot:run
cd gradify-noten-service       && mvn spring-boot:run
cd gradify-berechnungs-service && mvn spring-boot:run
```

Alternativ: In IntelliJ oder VS Code jede `*Application.java` als Spring-Boot-Anwendung starten.

### 5. Frontend starten

```bash
cd gradify-frontend
npm install
npm start
```

Anwendung öffnen: http://localhost:4200

### 6. CLI starten (nicht-grafisches UI)

```powershell
.\gradify-cli.ps1
```

Interaktive Konsolenanwendung mit Menüführung für alle Systemfunktionen.

---

## API-Dokumentation

### Swagger UI (REST)

Jeder Backend-Service stellt eine interaktive REST-Dokumentation bereit:

| Service | URL |
|---------|-----|
| Auth-Service | http://localhost:8081/swagger-ui.html |
| User-Service | http://localhost:8082/swagger-ui.html |
| Studiengang-Service | http://localhost:8083/swagger-ui.html |
| Noten-Service | http://localhost:8084/swagger-ui.html |
| Berechnungs-Service | http://localhost:8085/swagger-ui.html |

OpenAPI-Spezifikation (JSON): `http://localhost:{port}/v3/api-docs`

### GraphiQL (GraphQL)

Drei Services bieten eine interaktive GraphQL-Oberfläche im Browser:

| Service | Direkt | Über Gateway |
|---------|--------|--------------|
| User-Service | http://localhost:8082/graphiql | http://localhost:8080/graphql/user |
| Studiengang-Service | http://localhost:8083/graphiql | http://localhost:8080/graphql/studiengang |
| Noten-Service | http://localhost:8084/graphiql | http://localhost:8080/graphql/noten |

### REST-Routing über das Gateway

Alle REST-Anfragen laufen über das Gateway auf Port 8080:

| Pfad-Muster | Ziel-Service |
|-------------|-------------|
| `/api/auth/**` | Auth-Service |
| `/api/users/**`, `/api/students/**` | User-Service |
| `/api/mandanten/**`, `/api/studiengaenge/**`, `/api/einschreibungen/**` | Studiengang-Service |
| `/api/module/**`, `/api/pruefungsordnungen/**` | Studiengang-Service |
| `/api/import/**` | Studiengang-Service |
| `/api/noten/**` | Noten-Service |
| `/api/berechnungen/**` | Berechnungs-Service |

### Health Checks (Actuator)

Jeder Service stellt einen Health-Endpunkt bereit:

```
GET http://localhost:{port}/actuator/health
```

---

## Nicht-grafisches UI

Gemäß Projektanforderung ist das System vollständig ohne Angular-Frontend nutzbar:

| Werkzeug | Art | Beschreibung |
|----------|-----|-------------|
| `gradify-cli.ps1` | PowerShell-Konsole | Menügeführte Anwendung mit allen Systemfunktionen |
| `curl` / `Invoke-RestMethod` | Kommandozeile | Direkte REST- und GraphQL-Aufrufe |
| Swagger UI | Webbrowser | Interaktive API-Dokumentation (kein Angular nötig) |
| GraphiQL | Webbrowser | GraphQL-Schema-Inspektion und Query-Ausführung |
| grpcurl | Kommandozeile | Inspektion der gRPC-Schnittstellen |

---

## Tests

### Testarten

| Art | Technik | Beschreibung |
|-----|---------|-------------|
| Unit-Tests | JUnit 5, Mockito | Isolierte Tests einzelner Klassen |
| Integrationstests | Testcontainers | Tests mit echten Abhängigkeiten (PostgreSQL, RabbitMQ) |
| End-to-End-Tests | Docker Compose | Vollständiger Workflow über alle Services |

### Testskripte

Alle Skripte befinden sich im Ordner `test/`:

| Skript | Beschreibung |
|--------|-------------|
| `run-unit.ps1` | Unit-Tests aller Services |
| `run-integration-auth.ps1` | Integrationstests Auth-Service |
| `run-integration-user.ps1` | Integrationstests User-Service |
| `run-integration-studiengang.ps1` | Integrationstests Studiengang-Service |
| `run-integration-noten.ps1` | Integrationstests Noten-Service |
| `run-integration-berechnung.ps1` | Integrationstests Berechnungs-Service |
| `run-integration-all.ps1` | Alle Integrationstests zusammen |
| `run-e2e.ps1` | End-to-End-Tests (fährt Docker Compose hoch) |

```powershell
cd test
.\run-unit.ps1            # Schnell, keine Infrastruktur nötig
.\run-integration-all.ps1 # Testcontainers starten automatisch
.\run-e2e.ps1             # Benötigt Docker
```

---

## Deployment

### Lokale Entwicklung (Docker Compose)

Nur Infrastruktur (PostgreSQL + RabbitMQ), Services laufen lokal:

```bash
docker-compose up -d
```

### Vollständig containerisiert (Docker Compose)

Alle Services als Container:

```bash
docker-compose -f docker-compose.yml up --build -d
```

### Kubernetes

Das Verzeichnis `k8s/` enthält alle Manifeste (Deployments, Services, StatefulSets, Ingress, Secrets, ConfigMaps). Das Deploy-Skript automatisiert den gesamten Ablauf:

```powershell
cd k8s
.\deploy.ps1 -Action deploy    # Baut Images und deployt alles
.\deploy.ps1 -Action teardown  # Entfernt alle Ressourcen
```

Voraussetzung: Minikube oder ein lokaler Kubernetes-Cluster.

---

## Projektdokumentation

Die vollständige Dokumentation liegt im Ordner `documentation/`. Zusätzlich existiert ein konsolidiertes LaTeX-Dokument für die Abgabe.

### Service-Dokumentation

| Nr. | Dokument | Inhalt |
|-----|----------|--------|
| 01 | [Systemübersicht](documentation/01-systemuebersicht.md) | Architektur, Services, Rollen, Datenhoheit |
| 02 | [API-Gateway](documentation/02-api-gateway.md) | Routing, CORS, Header-Weiterleitung |
| 03 | [Auth-Service](documentation/03-auth-service.md) | Login, JWT, Refresh, gRPC-Anbindung |
| 04 | [User-Service](documentation/04-user-service.md) | Benutzer, Rollen, Studierende, Audit, CSV |
| 05 | [Studiengang-Service](documentation/05-studiengang-service.md) | Mandanten, Studiengänge, POs, Module |
| 06 | [Noten-Service](documentation/06-noten-service.md) | Notenworkflow, Validierung, Freigabe, Audit |
| 07 | [Berechnungs-Service](documentation/07-berechnungs-service.md) | Berechnungslogik, gRPC-Clients, Ergebnis |

### Querschnittsthemen

| Nr. | Dokument | Inhalt |
|-----|----------|--------|
| 08 | [Frontend](documentation/08-frontend.md) | SPA/PWA, Routing, Guards, Design, Responsive UI |
| 09 | [Kommunikation](documentation/09-kommunikation.md) | REST, GraphQL, gRPC, RabbitMQ |
| 10 | [Deployment](documentation/10-deployment.md) | Docker, Kubernetes, Multi-Tenancy |
| 11 | [Schnittstellen](documentation/11-schnittstellen.md) | Konsolidierte API- und gRPC-Übersicht |
| 12 | [Datenmodell](documentation/12-datenmodell.md) | Entitäten, Relationen, Notenskala |

### Fachliche Grundlagen

| Nr. | Dokument | Inhalt |
|-----|----------|--------|
| 13 | [Berechnungslogik](documentation/13-berechnungslogik.md) | Formeln, Regeln, Sonderfälle |
| -- | [Bioverfahrenstechnik](documentation/bioverfahrenstechnik.md) | PO Bachelor -- Modulliste und Gewichtungen |
| -- | [Forschung Soziale Arbeit](documentation/forschungsozialearbeit.md) | PO Master -- Modulliste und Gewichtungen |

### Ergänzende Dokumente

| Nr. | Dokument | Inhalt |
|-----|----------|--------|
| 00 | [Repository-Struktur](documentation/00-repository-struktur.md) | Aufbau des Repositories |
| 14 | [Prozessabläufe](documentation/14-prozessablaeufe.md) | Sequenzdarstellungen zentraler Flows |
| 15 | [User Stories](documentation/15-user-stories.md) | Rollenorientierte fachliche Anforderungen |

### Abgabedokument (LaTeX)

Die Datei [Gradify-Dokumentation.tex](documentation/Gradify-Dokumentation.tex) fasst alle oben genannten Inhalte in einem druckfertigen Dokument zusammen.

*Hinweis: Der Unterordner `documentation/old-archive/` enthält historische Zwischenstände und ist nicht Teil der finalen Abgabe.*

---

## Projektstruktur

```
webapp-http-200/
  gradify-api-gateway/           API-Gateway (Spring Cloud Gateway)
  gradify-auth-service/          Authentifizierung, JWT, Refresh-Tokens
  gradify-user-service/          Benutzer, Rollen, Studierende
  gradify-studiengang-service/   Studiengänge, Module, POs, Einschreibungen
  gradify-noten-service/         Notenworkflow, Validierung, Audit
  gradify-berechnungs-service/   Gesamtnoten-Berechnung
  gradify-shared/                Gemeinsame Proto-Dateien, DTOs
  gradify-frontend/              Angular 18 SPA + PWA
  gradify-e2e-tests/             End-to-End-Testfälle
  test/                          Automatisierte Testskripte (PowerShell)
  k8s/                           Kubernetes-Manifeste + Deploy-Skript
  docker/                        Init-SQL, Docker-Konfiguration
  documentation/                 Projektdokumentation (Markdown + LaTeX)
  gradify-cli.ps1                Interaktives Konsolen-UI
  docker-compose.yml             Infrastruktur (PostgreSQL, RabbitMQ)
  pom.xml                        Parent-POM (Maven Multi-Module)
```

---

**Frankfurt University of Applied Sciences -- Web-basierte Anwendungssysteme -- WiSe 2025/26**
