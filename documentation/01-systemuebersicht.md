# Systemübersicht – Gradify Notenmanagement

## 1. Projektbeschreibung

Gradify ist ein web-basiertes Notenmanagement-System für Hochschulen. Das System ermöglicht die Verwaltung von Studierenden, die Erfassung und Validierung von Modulnoten sowie die automatisierte Berechnung von Gesamt- und Durchschnittsnoten gemäß hochschulspezifischer Prüfungsordnungen. Verschiedene Nutzerrollen (Studierende, Lehrende, Prüfungsamt, Hochschulverwalter, Administration) verfügen über differenzierte Berechtigungen. Das System ist mandantenfähig konzipiert, sodass mehrere Hochschulen unabhängig voneinander arbeiten können.

### Unterstützte Studiengänge

| Studiengang | Abschluss | Regelstudienzeit | ECTS |
|-------------|-----------|------------------|------|
| Bioverfahrenstechnik | Bachelor of Engineering | 7 Semester | 210 |
| Forschung in der Sozialen Arbeit | Master of Arts | 4 Semester | 120 |

---

## 2. Architektur

Das Anwendungssystem folgt einer Microservice-Architektur. Jeder Service ist für eine klar abgegrenzte Teilaufgabe verantwortlich, besitzt eine eigene PostgreSQL-Datenbank und kommuniziert über definierte Schnittstellen mit den übrigen Services.

### Serviceübersicht

| Nr. | Service | Verantwortlichkeit | HTTP-Port | gRPC-Port |
|-----|---------|--------------------|-----------|-----------|
| 1 | API-Gateway | Zentraler Einstiegspunkt, Routing, CORS | 8080 | – |
| 2 | Auth-Service | Authentifizierung, JWT-Token-Management | 8081 | – |
| 3 | User-Service | Benutzerverwaltung, Rollen, Studentendaten | 8082 | 9082 |
| 4 | Studiengang-Service | Studiengänge, Module, Prüfungsordnungen, Einschreibungen | 8083 | 9083 |
| 5 | Noten-Service | Notenerfassung, -validierung, -freigabe | 8084 | 9084 |
| 6 | Berechnungs-Service | Gesamt- und Durchschnittsnoten-Berechnung | 8085 | 9085 |
| 7 | Frontend (Angular SPA + PWA) | Grafische Benutzeroberfläche | 4200 | – |

### Architekturdiagramm

```
                                ┌─────────────────────┐
                                │   Angular Frontend  │
                                │     (Port 4200)     │
                                └──────────┬──────────┘
                                           │ REST + GraphQL
                                           ▼
                                ┌─────────────────────┐
                                │     API-Gateway     │
                                │     (Port 8080)     │
                                └──────────┬──────────┘
                                           │
                ┌──────────────────────────┼──────────────────────────┐
                │                          │                          │
                ▼                          ▼                          ▼
     ┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐
     │  Auth-Service   │        │  User-Service   │        │Studiengang-Svc. │
     │   (Port 8081)   │        │   (Port 8082)   │        │   (Port 8083)   │
     └────────┬────────┘        └────────┬────────┘        └────────┬────────┘
              │ gRPC                     │                          │
              └──────────────────────────┘                          │
                                                                    │
                ┌───────────────────────────────────────────────────┘
                │
                ▼
     ┌─────────────────┐   RabbitMQ    ┌─────────────────┐
     │  Noten-Service  │─────────────▶│Berechnungs-Svc. │
     │   (Port 8084)   │◄───gRPC─────▶│   (Port 8085)   │
     └────────┬────────┘               └────────┬────────┘
              │                                  │
              ▼                                  ▼
     ┌─────────────────┐               ┌─────────────────┐
     │   PostgreSQL    │               │   PostgreSQL    │
     │ (je eigene DB)  │               │ (je eigene DB)  │
     └─────────────────┘               └─────────────────┘
```

Jeder Service besitzt eine eigene PostgreSQL-Datenbank. Der Datenaustausch zwischen Services erfolgt ausschließlich über REST-, GraphQL- und gRPC-Schnittstellen sowie über eine Message Queue (RabbitMQ) für asynchrone Kommunikation.

---

## 3. Technologie-Stack

| Kategorie | Technologie | Version |
|-----------|-------------|---------|
| Backend-Framework | Spring Boot | 3.3.7 |
| Programmiersprache | Java | 17 |
| Build-Tool | Maven | 3.9+ |
| Datenbank | PostgreSQL | 16 |
| Message Broker | RabbitMQ | 3.x |
| API-Gateway | Spring Cloud Gateway | 2023.0.x |
| Authentifizierung | JWT (jjwt, HMAC-SHA256) | 0.12.x |
| gRPC | grpc-spring-boot-starter | 3.1.x |
| GraphQL | Spring for GraphQL | 1.3.x |
| Frontend-Framework | Angular | 18.2 |
| Frontend-UI | Angular Material | 18.2 |
| GraphQL-Client | Apollo Angular | 7.0 |
| Containerisierung | Docker | 24+ |
| Orchestrierung | Kubernetes | 1.28+ |

---

## 4. Nutzerrollen

Das System definiert fünf aktiv genutzte Rollen mit abgestuften Berechtigungen:

| Rolle | Beschreibung | Hauptfunktionen |
|-------|-------------|-----------------|
| ROLE_ADMIN | Systemadministrator | Vollzugriff, Benutzerverwaltung, Mandantenanlage, Rollenzuweisung |
| ROLE_HOCHSCHUL_VERWALTER | Hochschulverwalter | Mandantenverwaltung, Modulzuweisungen, Studierendenverwaltung |
| ROLE_LEHRENDER | Dozent/Professor | Noten erfassen für zugewiesene Module, Kursstatistiken |
| ROLE_PRUEFUNGSAMT | Prüfungsamtsmitarbeiter | Notenvalidierung, Notenfreigabe, Berechnungen, Studierendenverwaltung |
| ROLE_STUDENT | Studierende/r | Eigene Noten einsehen, Studienfortschritt, Studienplan |

Zusätzlich ist im Datenmodell die Rolle `ROLE_STUDIENGANGLEITUNG` vorhanden; sie wird im aktuellen Funktionsumfang jedoch nicht aktiv in Navigation oder Guards verwendet.

---

## 5. Service-Zuständigkeitsmatrix

| Funktion | Gateway | Auth | User | Studiengang | Noten | Berechnung | Frontend |
|----------|:-------:|:----:|:----:|:-----------:|:-----:|:----------:|:--------:|
| Login/Logout | ◐ | ● | ○ | ○ | ○ | ○ | ◐ |
| Token-Validierung | ● | ● | ○ | ○ | ○ | ○ | ○ |
| Benutzerverwaltung | ◐ | ○ | ● | ○ | ○ | ○ | ◐ |
| Rollenzuweisung | ◐ | ○ | ● | ○ | ○ | ○ | ◐ |
| Mandantenverwaltung | ◐ | ○ | ○ | ● | ○ | ○ | ◐ |
| Studiengangsverwaltung | ◐ | ○ | ○ | ● | ○ | ○ | ◐ |
| Modulverwaltung | ◐ | ○ | ○ | ● | ○ | ○ | ◐ |
| Einschreibung | ◐ | ○ | ◐ | ● | ○ | ○ | ◐ |
| Notenerfassung | ◐ | ○ | ○ | ○ | ● | ○ | ◐ |
| Notenvalidierung | ◐ | ○ | ○ | ○ | ● | ○ | ◐ |
| Gesamtnotenberechnung | ◐ | ○ | ○ | ◐ | ◐ | ● | ◐ |

**Legende:** ● Hauptverantwortlich · ◐ Beteiligt · ○ Nicht beteiligt

---

## 6. Datenhoheit (Data Ownership)

Jeder Service verwaltet seine Daten in einer eigenen PostgreSQL-Datenbank. Ein direkter Datenbankzugriff zwischen Services ist ausgeschlossen. Alle Entitäten verwenden `Long` (BIGSERIAL) als Primärschlüssel.

| Service | Datenbank | Entitäten |
|---------|-----------|-----------|
| Auth-Service | gradify_auth (zentral) | RefreshToken, LoginVersuch, TenantRegistry |
| User-Service | gradify_user (zentral) | Benutzer, Student, Rolle, BenutzerHistorie |
| Studiengang-Service | tenant-spezifisch (`gradify_studiengang_<kuerzel>`) | Mandant, Studiengang, Prüfungsordnung, Modul, PoRegelwerk, Einschreibung, ModulZuweisung, WahlpflichtWahl |
| Noten-Service | tenant-spezifisch (`gradify_noten_<kuerzel>`) | Note, NotenHistorie |
| Berechnungs-Service | tenant-spezifisch (`gradify_berechnung_<kuerzel>`) | Berechnungsergebnis, ModulBerechnung |

Bei aktivierter Multi-Tenancy werden pro Mandant (Hochschule) separate Datenbanken erzeugt, z. B. `gradify_noten_thm`, `gradify_noten_gu`.
