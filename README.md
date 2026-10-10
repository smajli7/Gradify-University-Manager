<div align="center">

![2026-02-1913-42-02-ezgif com-video-to-gif-converter](https://github.com/user-attachments/assets/4488f58c-3a60-4bc8-83f9-e5819ebebfe3)


[![Java](https://img.shields.io/badge/Java-17-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)](https://openjdk.org/)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.3.7-6DB33F?style=for-the-badge&logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![Angular](https://img.shields.io/badge/Angular-18-DD0031?style=for-the-badge&logo=angular&logoColor=white)](https://angular.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-24+-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-1.28+-326CE5?style=for-the-badge&logo=kubernetes&logoColor=white)](https://kubernetes.io/)

[![REST](https://img.shields.io/badge/REST-009688?style=flat-square&logo=fastapi&logoColor=white)](#)
[![GraphQL](https://img.shields.io/badge/GraphQL-E10098?style=flat-square&logo=graphql&logoColor=white)](#)
[![gRPC](https://img.shields.io/badge/gRPC-244c5a?style=flat-square&logo=google&logoColor=white)](#)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-FF6600?style=flat-square&logo=rabbitmq&logoColor=white)](#)
[![JWT](https://img.shields.io/badge/JWT-000000?style=flat-square&logo=jsonwebtokens&logoColor=white)](#)
[![PWA](https://img.shields.io/badge/PWA-5A0FC8?style=flat-square&logo=pwa&logoColor=white)](#)
[![Maven](https://img.shields.io/badge/Maven-C71A36?style=flat-square&logo=apachemaven&logoColor=white)](#)

---

**Contributors** · **Jakub Naruszko** (1511408) · **Louisa Kristin Bahr** (1508628)

---

Entwickelt im Rahmen des Moduls *Web-basierte Anwendungssysteme* (WiSe 2025/26)<br/>
**Frankfurt University of Applied Sciences** · **Abgabe:** 23.02.2026

<!-- <img src="documentation/gifs/demo.gif" alt="Gradify Demo" width="80%" /> -->

</div>

---

<sub>[Video Demo](VIDEO_DEMO.md) · [Kurzbeschreibung](#kurzbeschreibung) · [Architektur](#architektur) · [Tech-Stack](#technologie-stack) · [Schnellstart](#schnellstart) · [API-Docs](#api-dokumentation) · [Tests](#tests) · [Deployment](#deployment) · [Dokumentation](#projektdokumentation) · [Struktur](#projektstruktur)</sub>

---

## Video Demo

Alle Demo-GIFs und Screenshots findest du auf der Seite **[Video Demo](VIDEO_DEMO.md)**.

---

## Kurzbeschreibung

Gradify ermöglicht die Verwaltung von Prüfungsleistungen an Hochschulen:

| Funktion | Beschreibung |
| :------- | :----------- |
| **Benutzerverwaltung** | Studierende, Lehrende und weitere Rollen mit rollenbasierter Zugriffskontrolle |
| **Notenworkflow** | Erfassung, Validierung und Freigabe über einen Drei-Stufen-Prozess |
| **Notenberechnung** | Automatische Gesamtnotenberechnung gemäß Prüfungsordnung |
| **Multi-Tenancy** | Mehrere Hochschulen mit getrennten Datenbanken |
| **PWA** | Installierbar, offline-fähige App-Shell |
| **Responsive** | Nutzbar auf Desktop und mobilen Geräten |

**Unterstützte Studiengänge**

| Studiengang | Abschluss | ECTS | Berechnungsart |
| :---------- | :-------- | --: | :------------- |
| Bioverfahrenstechnik | Bachelor of Engineering | 210 | Gewichteter Durchschnitt (PO 2023) |
| Forschung in der Sozialen Arbeit | Master of Arts | 120 | Arithmetisch gemischt (PO 2022) |
| Bioinformatik | Bachelor of Science | 180 | Gewichteter Durchschnitt (PO 2024) |

---

## Architektur

Das System folgt einer **Microservice-Architektur** mit sechs Backend-Services, einem API-Gateway und einem Angular-Frontend.

```
                            ┌───────────────────────┐
                            │    Angular Frontend   │
                            │       (Port 4200)     │
                            └───────────┬───────────┘
                                        │
                                  REST + GraphQL
                                        │
                            ┌───────────▼───────────┐
                            │      API-Gateway      │
                            │       (Port 8080)     │
                            └───────────┬───────────┘
                                        │
           ┌────────────────────────────┼────────────────────────────┐
           │                            │                            │
   ┌───────▼───────┐           ┌────────▼────────┐           ┌───────▼───────┐
   │ Auth-Service  │           │ Studiengang-Svc │           │ Noten-Svc     │
   │   (8081)      │           │  (8083 / 9083)  │           │ (8084 / 9084) │
   └───────┬───────┘           └─────────────────┘           └─────────┬─────┘
           │                                                           │
           │ gRPC                                                      │ RabbitMQ
           │                                                           │
   ┌───────▼───────┐                                                   │
   │ User-Svc      │                                                   │
   │ (8082 / 9082) │                                                   │
   └───────────────┘                                                   │
                                                                       │
                     ┌─────────────────────────────────────────────────▼───────┐
                     │                Berechnungs-Service (8085 / 9085)        │
                     │          gRPC (Regelwerk) + Events (Neuberechnung)      │
                     └─────────────────────────────────────────────────────────┘
```

<details>
<summary><b>Serviceübersicht</b></summary>

| Service | HTTP | gRPC | Aufgabe |
| :------ | --: | --: | :------ |
| API-Gateway | `8080` | — | Routing, CORS, Auth-Header-Weiterleitung |
| Auth-Service | `8081` | — | Login, JWT-Ausgabe (Access + Refresh) |
| User-Service | `8082` | `9082` | Benutzer, Rollen, Studierende, CSV-Import/Export |
| Studiengang-Service | `8083` | `9083` | Mandanten, Studiengänge, Module, POs, Einschreibungen |
| Noten-Service | `8084` | `9084` | Notenerfassung, Validierung, Freigabe, Audit-Log |
| Berechnungs-Service | `8085` | `9085` | Gesamtnoten-Berechnung nach PO-Regelwerk |
| Frontend | `4200` | — | Angular SPA + PWA |

</details>

<details>
<summary><b>Kommunikationsprotokolle</b></summary>

| Protokoll | Einsatz |
| :-------- | :------ |
| **REST** | CRUD-Operationen, Login, Statusänderungen |
| **GraphQL** | Flexible Leseabfragen (Dashboards, verschachtelte Daten) |
| **gRPC** | Service-zu-Service (Login-Validierung, Regelwerk-Abfrage, Notenabruf) |
| **RabbitMQ** | Asynchrone Events (Notenänderung löst Neuberechnung aus) |

</details>

---

## Technologie-Stack

<div align="center">

**Backend**

<img src="https://skillicons.dev/icons?i=java,spring,postgresql,rabbitmq,graphql,maven&theme=dark" alt="Backend" />

| Technologie | Version | Technologie | Version |
| :---------- | :----: | :---------- | :----: |
| Java | `17` | Spring for GraphQL | `1.3.x` |
| Spring Boot | `3.3.7` | gRPC | `3.1.x` |
| Spring Cloud Gateway | `2023.0.x` | RabbitMQ | `3.x` |
| Spring Security + JWT | — | PostgreSQL | `16` |

**Frontend**

<img src="https://skillicons.dev/icons?i=angular,ts,sass,materialui&theme=dark" alt="Frontend" />

| Technologie | Version | Technologie | Version |
| :---------- | :----: | :---------- | :----: |
| Angular | `18.2` | Chart.js | `4.x` |
| Angular Material | `18.x` | jsPDF | `4.x` |
| Apollo Angular | `7.0` | PWA (Service Worker) | — |

**DevOps**

<img src="https://skillicons.dev/icons?i=docker,kubernetes,nginx&theme=dark" alt="DevOps" />

</div>

---

## Schnellstart

```powershell
git clone <repository-url>
cd webapp-http-200
```

<table>
<tr>
<td width="33%" valign="top">

<h3 align="center">Lokal (Konsole)</h3>
<p align="center"><sub>Empfohlen für Entwicklung</sub></p>

> Java 17 · Maven 3.8+ · Node.js 20+ · Docker

```powershell
.\start-all.ps1
```

Startet Infrastruktur (PostgreSQL, RabbitMQ), baut gRPC-Klassen und startet alle 6 Backend-Services.

```powershell
cd gradify-frontend
npm install && npm start
```

```powershell
.\stop-all.ps1
```

</td>
<td width="33%" valign="top">

<h3 align="center">Docker</h3>
<p align="center"><sub>Vollständig containerisiert</sub></p>

> Docker & Docker Compose

```powershell
.\build-docker.ps1
.\docker-up.ps1
```

Baut alle Maven-JARs und Docker-Images, startet die gesamte Umgebung als Container.

```powershell
.\docker-down.ps1
```

</td>
<td width="33%" valign="top">

<h3 align="center">Kubernetes</h3>
<p align="center"><sub>Cluster-Deployment</sub></p>

> Docker Desktop mit K8s · kubectl

```powershell
.\k8s\deploy.ps1
```

Build + Deploy aller Services in den K8s-Cluster.

```powershell
.\k8s\deploy.ps1 -Status
.\k8s\deploy.ps1 -Delete
```

</td>
</tr>
</table>

> **Nicht-grafisches UI:** `.\gradify-cli.ps1` — menügeführte Konsolenanwendung als Alternative zum Angular-Frontend.

<details>
<summary><b>Demo-Zugangsdaten</b></summary>

> Passwort für alle Nutzer: **`web00100113!`**

**Mandant 1 — THM** (Technische Hochschule Mittelhessen)

| Benutzername | Rolle | Kontext |
| :----------- | :---- | :------ |
| `admin` | System-Administrator | Mandantenübergreifend |
| `hochschulverwalter` | Hochschul-Verwalter | THM-Verwaltung |
| `pruefungsamt` | Prüfungsamt | Notenfreigabe |
| `prof.mueller` | Dozent | BVT-Module |
| `prof.klein` | Dozent | FSA-Module |
| `max.mustermann` | Student | BVT, 6. Semester |
| `sophie.braun` | Student | FSA Master, 4. Semester |

**Mandant 2 — GU** (Goethe Universität Frankfurt)

| Benutzername | Rolle | Kontext |
| :----------- | :---- | :------ |
| `s.cremm` | Hochschul-Verwalter | GU-Verwaltung |
| `pruefungsamt.gu` | Prüfungsamt | Notenfreigabe |
| `prof.meyer.gu` | Dozent | Bioinformatik-Module |
| `lisa.bio` | Student | Bioinformatik, 3. Semester |

Vollständige Liste: [`demo-zugaenge.csv`](demo-zugaenge.csv)

</details>

---

## API-Dokumentation

### Swagger UI (REST)

| Service | Swagger UI | OpenAPI |
| :------ | :--------- | :------ |
| Auth | [8081/swagger-ui.html](http://localhost:8081/swagger-ui.html) | `/v3/api-docs` |
| User | [8082/swagger-ui.html](http://localhost:8082/swagger-ui.html) | `/v3/api-docs` |
| Studiengang | [8083/swagger-ui.html](http://localhost:8083/swagger-ui.html) | `/v3/api-docs` |
| Noten | [8084/swagger-ui.html](http://localhost:8084/swagger-ui.html) | `/v3/api-docs` |
| Berechnung | [8085/swagger-ui.html](http://localhost:8085/swagger-ui.html) | `/v3/api-docs` |

### GraphiQL (GraphQL)

| Service | Direkt | Über Gateway |
| :------ | :----- | :----------- |
| User | [8082/graphiql](http://localhost:8082/graphiql) | `/graphql/user` |
| Studiengang | [8083/graphiql](http://localhost:8083/graphiql) | `/graphql/studiengang` |
| Noten | [8084/graphiql](http://localhost:8084/graphiql) | `/graphql/noten` |

<details>
<summary><b>Gateway-Routing (REST)</b></summary>

Alle REST-Anfragen laufen über das Gateway auf Port `8080`:

| Pfad-Muster | Ziel-Service |
| :---------- | :----------- |
| `/api/auth/**` | Auth-Service |
| `/api/users/**`, `/api/students/**` | User-Service |
| `/api/mandanten/**`, `/api/studiengaenge/**`, `/api/einschreibungen/**` | Studiengang-Service |
| `/api/module/**`, `/api/module-zuweisungen/**`, `/api/pruefungsordnungen/**`, `/api/import/**` | Studiengang-Service |
| `/api/noten/**` | Noten-Service |
| `/api/berechnungen/**` | Berechnungs-Service |

</details>

<details>
<summary><b>Nicht-grafisches UI</b></summary>

Gemäß Projektanforderung ist das System vollständig ohne Angular-Frontend nutzbar:

| Werkzeug | Beschreibung |
| :------- | :----------- |
| `gradify-cli.ps1` | Menügeführte PowerShell-Konsolenanwendung |
| `curl` / `Invoke-RestMethod` | Direkte REST- und GraphQL-Aufrufe |
| Swagger UI | Interaktive API-Dokumentation |
| GraphiQL | GraphQL-Schema-Inspektion und Query-Ausführung |
| `grpcurl` | Inspektion der gRPC-Schnittstellen |

</details>

---

## Tests

| Art | Technik | Beschreibung |
| :-- | :------ | :---------- |
| Unit-Tests | JUnit 5, Mockito | Isolierte Tests einzelner Klassen |
| Integrationstests | Testcontainers | Tests mit echten Abhängigkeiten (PostgreSQL, RabbitMQ) |
| End-to-End-Tests | Docker Compose | Vollständiger Workflow über alle Services |

```powershell
.\test\run-unit.ps1              # Schnell, keine Infrastruktur nötig
.\test\run-integration-all.ps1   # Testcontainers starten automatisch
.\test\run-e2e.ps1               # Benötigt Docker

.\run-tests.ps1 -All             # Alles auf einmal
```

<details>
<summary><b>Einzelne Integrationstests</b></summary>

| Skript | Service |
| :----- | :------ |
| `run-integration-auth.ps1` | Auth-Service |
| `run-integration-user.ps1` | User-Service |
| `run-integration-studiengang.ps1` | Studiengang-Service |
| `run-integration-noten.ps1` | Noten-Service |
| `run-integration-berechnung.ps1` | Berechnungs-Service |

</details>

---

## Deployment

| Szenario | Befehl | Beschreibung |
| :------- | :----- | :----------- |
| **Lokale Entwicklung** | `.\start-all.ps1` | Infrastruktur + Build + alle Services |
| **Docker** | `.\build-docker.ps1` → `.\docker-up.ps1` | Maven Build, Docker Images, Container starten |
| **Kubernetes** | `.\k8s\deploy.ps1` | Build + Deploy in K8s-Cluster |

---

## Projektdokumentation

Die vollständige Dokumentation liegt im Ordner `documentation/`.

<details open>
<summary><b>Service-Dokumentation</b></summary>

| Nr. | Dokument | Inhalt |
| --: | :------- | :----- |
| 01 | [Systemübersicht](documentation/01-systemuebersicht.md) | Architektur, Services, Rollen, Datenhoheit |
| 02 | [API-Gateway](documentation/02-api-gateway.md) | Routing, CORS, Header-Weiterleitung |
| 03 | [Auth-Service](documentation/03-auth-service.md) | Login, JWT, Refresh, gRPC-Anbindung |
| 04 | [User-Service](documentation/04-user-service.md) | Benutzer, Rollen, Studierende, Audit, CSV |
| 05 | [Studiengang-Service](documentation/05-studiengang-service.md) | Mandanten, Studiengänge, POs, Module |
| 06 | [Noten-Service](documentation/06-noten-service.md) | Notenworkflow, Validierung, Freigabe, Audit |
| 07 | [Berechnungs-Service](documentation/07-berechnungs-service.md) | Berechnungslogik, gRPC-Clients, Ergebnis |

</details>

<details>
<summary><b>Querschnittsthemen</b></summary>

| Nr. | Dokument | Inhalt |
| --: | :------- | :----- |
| 08 | [Frontend](documentation/08-frontend.md) | SPA/PWA, Routing, Guards, Design |
| 09 | [Kommunikation](documentation/09-kommunikation.md) | REST, GraphQL, gRPC, RabbitMQ |
| 10 | [Deployment](documentation/10-deployment.md) | Docker, Kubernetes, Multi-Tenancy |
| 11 | [Schnittstellen](documentation/11-schnittstellen.md) | Konsolidierte API- und gRPC-Übersicht |
| 12 | [Datenmodell](documentation/12-datenmodell.md) | Entitäten, Relationen, Notenskala |

</details>

<details>
<summary><b>Fachliche Grundlagen</b></summary>

| Nr. | Dokument | Inhalt |
| --: | :------- | :----- |
| 13 | [Berechnungslogik](documentation/13-berechnungslogik.md) | Formeln, Regeln, Sonderfälle |
| — | [Bioverfahrenstechnik](documentation/bioverfahrenstechnik.md) | PO Bachelor — Module und Gewichtungen |
| — | [Forschung Soziale Arbeit](documentation/forschungsozialearbeit.md) | PO Master — Module und Gewichtungen |

</details>

<details>
<summary><b>Ergänzende Dokumente</b></summary>

| Nr. | Dokument | Inhalt |
| --: | :------- | :----- |
| 00 | [Repository-Struktur](documentation/00-repository-struktur.md) | Aufbau des Repositories |
| 14 | [Prozessabläufe](documentation/14-prozessablaeufe.md) | Sequenzdarstellungen zentraler Flows |
| 15 | [User Stories](documentation/15-user-stories.md) | Rollenorientierte fachliche Anforderungen |

LaTeX-Abgabedokument: [Gradify-Dokumentation.tex](documentation/Gradify-Dokumentation.tex)

</details>

---

## Projektstruktur

```
webapp-http-200/
│
├── gradify-api-gateway/            API-Gateway (Spring Cloud Gateway)
├── gradify-auth-service/           Authentifizierung, JWT, Refresh-Tokens
├── gradify-user-service/           Benutzer, Rollen, Studierende
├── gradify-studiengang-service/    Studiengänge, Module, POs, Einschreibungen
├── gradify-noten-service/          Notenworkflow, Validierung, Audit
├── gradify-berechnungs-service/    Gesamtnoten-Berechnung
├── gradify-shared/                 Gemeinsame Proto-Dateien, DTOs
├── gradify-frontend/               Angular 18 SPA + PWA
├── gradify-e2e-tests/              End-to-End-Testfälle
│
├── test/                           Automatisierte Testskripte (PowerShell)
├── k8s/                            Kubernetes-Manifeste + Deploy-Skript
├── docker/                         Init-SQL, Docker-Konfiguration
├── documentation/                  Projektdokumentation (Markdown + LaTeX)
│
├── gradify-cli.ps1                 Interaktives Konsolen-UI
├── docker-compose.yml              Vollständige Umgebung (alle Services)
├── docker-compose.dev.yml          Nur Infrastruktur (Postgres, RabbitMQ)
├── pom.xml                         Parent-POM (Maven Multi-Module)
├── start-all.ps1                   Alle Services starten (inkl. gRPC-Build)
├── start-simple.ps1                Services starten (ohne Rebuild)
└── stop-all.ps1                    Alle Services stoppen
```

<img src="https://capsule-render.vercel.app/api?type=soft&color=0:4c1d95,50:1a1b27,100:0d1117&height=110&section=footer&animation=fadeIn&stroke=1a1b27" width="100%" />

<div align="center">

> **Frankfurt University of Applied Sciences** · Web-basierte Anwendungssysteme · WiSe 2025/26 <

</div>
