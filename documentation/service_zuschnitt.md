# Service-Zuschnitt – Finales Architekturkonzept

Dieses Dokument definiert den finalen Zuschnitt der Microservices für das Notenmanagement-System. Jeder Service ist klar abgegrenzt und für spezifische Teilaufgaben verantwortlich.

---

## Übersicht der Services

| Nr. | Service                     | Verantwortlichkeit                                    | Port  |
|-----|-----------------------------|-------------------------------------------------------|-------|
| 1   | **API-Gateway**             | Zentraler Einstiegspunkt, Routing, Rate-Limiting      | 8080  |
| 2   | **Auth-Service**            | Authentifizierung, Token-Management, Sessions         | 8081  |
| 3   | **User-Service**            | Benutzerverwaltung, Rollen, Berechtigungen            | 8082  |
| 4   | **Studiengang-Service**     | Studiengänge, Mandanten, Prüfungsordnungen, Module    | 8083  |
| 5   | **Noten-Service**           | Notenerfassung, -validierung, -verwaltung             | 8084  |
| 6   | **Berechnungs-Service**     | Durchschnitts- und Gesamtnotenberechnung              | 8085  |
| 7   | **Frontend (Angular SPA)**  | Grafische Benutzeroberfläche                          | 4200  |

---

## Architekturdiagramm

```
                                    ┌─────────────────────┐
                                    │   Angular Frontend  │
                                    │     (Port 4200)     │
                                    └──────────┬──────────┘
                                               │
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
         │  Auth-Service   │        │  User-Service   │        │Studiengang-Serv.│
         │   (Port 8081)   │        │   (Port 8082)   │        │   (Port 8083)   │
         └────────┬────────┘        └────────┬────────┘        └────────┬────────┘
                  │                          │                          │
                  │                          │                          │
                  ▼                          ▼                          ▼
         ┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐
         │   Auth-DB       │        │   User-DB       │        │ Studiengang-DB  │
         │  (PostgreSQL)   │        │  (PostgreSQL)   │        │  (PostgreSQL)   │
         └─────────────────┘        └─────────────────┘        └─────────────────┘

                    ┌──────────────────────────┴──────────────────────────┐
                    │                                                      │
                    ▼                                                      ▼
         ┌─────────────────┐                                    ┌─────────────────┐
         │  Noten-Service  │◄───────── gRPC ──────────────────► │Berechnungs-Serv.│
         │   (Port 8084)   │                                    │   (Port 8085)   │
         └────────┬────────┘                                    └────────┬────────┘
                  │                                                      │
                  ▼                                                      ▼
         ┌─────────────────┐                                    ┌─────────────────┐
         │   Noten-DB      │                                    │ Berechnungs-DB  │
         │  (PostgreSQL)   │                                    │  (PostgreSQL)   │
         └─────────────────┘                                    └─────────────────┘
```

---

## 1. API-Gateway

### Verantwortlichkeit
Der API-Gateway ist der zentrale Einstiegspunkt für alle Client-Anfragen. Er leitet Anfragen an die entsprechenden Backend-Services weiter und übernimmt Querschnittsfunktionen.

### Aufgaben
| Aufgabe                    | Beschreibung                                                |
|----------------------------|-------------------------------------------------------------|
| **Request-Routing**        | Weiterleitung an zuständigen Service basierend auf URL-Pfad |
| **Authentifizierungsprüfung** | Validierung des JWT-Tokens bei jedem Request             |
| **Rate-Limiting**          | Begrenzung der Anfragen pro Zeiteinheit (Schutz vor DDoS)   |
| **CORS-Handling**          | Cross-Origin Resource Sharing für Frontend-Zugriff         |
| **Load-Balancing**         | Verteilung der Last auf mehrere Service-Instanzen          |
| **Request-Logging**        | Protokollierung aller eingehenden Anfragen                 |

### Routing-Übersicht
| Pfad-Präfix         | Ziel-Service        |
|---------------------|---------------------|
| `/api/auth/**`      | Auth-Service        |
| `/api/users/**`     | User-Service        |
| `/api/studiengaenge/**` | Studiengang-Service |
| `/api/noten/**`     | Noten-Service       |
| `/api/berechnungen/**` | Berechnungs-Service |
| `/graphql`          | GraphQL-Endpoint    |

### Technologie
- Spring Cloud Gateway
- JWT-Validierung via Auth-Service

---

## 2. Auth-Service

### Verantwortlichkeit
Der Auth-Service ist ausschließlich für die Authentifizierung zuständig. Er verwaltet Login-Prozesse, Token-Generierung und Session-Management.

### Aufgaben
| Aufgabe                    | Beschreibung                                                |
|----------------------------|-------------------------------------------------------------|
| **Login**                  | Validierung von Benutzername/Passwort                       |
| **Token-Generierung**      | Erstellung von JWT Access- und Refresh-Tokens               |
| **Token-Validierung**      | Prüfung der Gültigkeit und Signatur von Tokens              |
| **Token-Refresh**          | Erneuerung abgelaufener Access-Tokens                       |
| **Logout**                 | Invalidierung aktiver Sessions/Tokens                       |
| **Passwort-Reset**         | Zurücksetzen von Passwörtern via E-Mail-Link                |

### Datenhoheit
| Entität              | Attribute                                              |
|----------------------|--------------------------------------------------------|
| **Session**          | session_id, benutzer_id, erstellt_am, gueltig_bis      |
| **Refresh-Token**    | token_hash, benutzer_id, erstellt_am, widerrufen       |

### Schnittstellen
- **Eingehend:** REST (Login, Logout, Token-Refresh)
- **Ausgehend:** gRPC zum User-Service (Benutzer-Validierung)

### Abgrenzung
- Keine Benutzerverwaltung (Anlegen, Löschen von Accounts)
- Keine Rollenverwaltung
- Nur Authentifizierung und Token-Management

---

## 3. User-Service

### Verantwortlichkeit
Der User-Service verwaltet alle Benutzerdaten, Rollen und Berechtigungen. Er ist die zentrale Quelle für Benutzerinformationen im System.

### Aufgaben
| Aufgabe                    | Beschreibung                                                |
|----------------------------|-------------------------------------------------------------|
| **Benutzerverwaltung**     | CRUD-Operationen für Benutzerkonten                         |
| **Rollenverwaltung**       | Definition und Zuweisung von Rollen                         |
| **Berechtigungsprüfung**   | Ermittlung der Rechte eines Benutzers                       |
| **Studentenverwaltung**    | Spezifische Stammdaten für Studierende                      |
| **Mandantenzuordnung**     | Zuordnung von Benutzern zu Mandanten/Fakultäten             |
| **Profilpflege**           | Aktualisierung persönlicher Daten durch Benutzer            |

### Datenhoheit
| Entität              | Verantwortung                                          |
|----------------------|--------------------------------------------------------|
| **Benutzer**         | Vollständig (id, name, email, passwort_hash, etc.)     |
| **Student**          | Vollständig (matrikelnummer, geburtsdatum, etc.)       |
| **Rolle**            | Vollständig (name, beschreibung, berechtigungen)       |
| **Benutzer_Rolle**   | Vollständig (Zuordnung Benutzer ↔ Rolle)               |

### Schnittstellen
- **Eingehend:** REST, GraphQL
- **Ausgehend:** Keine (reagiert nur auf Anfragen)

### Abgrenzung
- Keine Authentifizierung (Login/Logout)
- Keine Noten- oder Studiengangdaten
- Nur Benutzer, Studenten, Rollen, Berechtigungen

---

## 4. Studiengang-Service (Multi-Tenancy-Service)

### Verantwortlichkeit
Der Studiengang-Service verwaltet die fachlichen Stammdaten: Mandanten, Studiengänge, Prüfungsordnungen und Module mit ihren Gewichtungen.

### Aufgaben
| Aufgabe                    | Beschreibung                                                |
|----------------------------|-------------------------------------------------------------|
| **Mandantenverwaltung**    | CRUD für Fakultäten/Organisationseinheiten                  |
| **Studiengangsverwaltung** | CRUD für Studiengänge (BVT, FSA, etc.)                      |
| **PO-Verwaltung**          | Prüfungsordnungen mit Versionen verwalten                   |
| **Modulverwaltung**        | Module mit ECTS, Gewichtung, Prüfungsform                   |
| **PO-Regelwerk**           | Berechnungsregeln für Gesamtnoten (JSON-Konfiguration)      |
| **Einschreibung**          | Zuordnung Student ↔ Studiengang ↔ PO-Version                |

### Datenhoheit
| Entität              | Verantwortung                                          |
|----------------------|--------------------------------------------------------|
| **Mandant**          | Vollständig                                            |
| **Studiengang**      | Vollständig                                            |
| **Prüfungsordnung**  | Vollständig                                            |
| **Modul**            | Vollständig (inkl. Gewichtung, ECTS)                   |
| **PO_Regelwerk**     | Vollständig (Berechnungsformeln)                       |
| **Einschreibung**    | Vollständig (Student-Studiengang-Zuordnung)            |

### Schnittstellen
- **Eingehend:** REST, GraphQL
- **Ausgehend:** gRPC zum User-Service (Studentendaten bei Einschreibung)

### Abgrenzung
- Keine Noten (nur Modulstruktur)
- Keine Berechnungen (nur Regelwerk-Definition)
- Nur Strukturdaten (Was gibt es? Wie ist es aufgebaut?)

---

## 5. Noten-Service

### Verantwortlichkeit
Der Noten-Service ist für die Erfassung, Validierung und Verwaltung aller Noten zuständig.

### Aufgaben
| Aufgabe                    | Beschreibung                                                |
|----------------------------|-------------------------------------------------------------|
| **Notenerfassung**         | Eingabe von Noten durch Lehrende                            |
| **Notenvalidierung**       | Prüfung der Noten durch Prüfungsamt                         |
| **Notenfreigabe**          | Sichtbarmachung für Studierende                             |
| **Versuchsverwaltung**     | Tracking von Prüfungsversuchen (1., 2., 3. Versuch)         |
| **Notenhistorie**          | Protokollierung aller Änderungen (Audit-Log)                |
| **Notenabfrage**           | Bereitstellung der Noten für andere Services                |

### Datenhoheit
| Entität              | Verantwortung                                          |
|----------------------|--------------------------------------------------------|
| **Note**             | Vollständig (Wert, Status, Versuch, Datum)             |
| **Notenhistorie**    | Vollständig (Änderungsprotokoll)                       |

### Schnittstellen
- **Eingehend:** REST (CRUD-Operationen), GraphQL (Abfragen)
- **Ausgehend:** 
  - gRPC zum Berechnungs-Service (Triggert Neuberechnung)
  - REST zum Studiengang-Service (Modulinformationen abrufen)

### Abgrenzung
- Keine Durchschnittsberechnung (nur Rohdaten)
- Keine Moduldefinitionen
- Nur Notenerfassung, -validierung und -speicherung

---

## 6. Berechnungs-Service

### Verantwortlichkeit
Der Berechnungs-Service führt alle Notenberechnungen durch: Durchschnitte, gewichtete Gesamtnoten und Abschlussnoten gemäß PO.

### Aufgaben
| Aufgabe                    | Beschreibung                                                |
|----------------------------|-------------------------------------------------------------|
| **Durchschnittsberechnung**| Einfacher Notendurchschnitt                                 |
| **Gewichtete Gesamtnote**  | Berechnung nach PO-Formel (BVT: gewichtet, FSA: gemischt)   |
| **Zwischenstände**         | Aktueller Stand bei noch nicht vollständigen Noten          |
| **Fortschrittsberechnung** | Anteil bestandener Module, erreichte ECTS                   |
| **Regelwerk-Auswertung**   | Interpretation der PO-Regelwerke aus Studiengang-Service    |
| **Ergebnis-Caching**       | Zwischenspeicherung berechneter Ergebnisse                  |

### Datenhoheit
| Entität              | Verantwortung                                          |
|----------------------|--------------------------------------------------------|
| **Berechnungsergebnis** | Vollständig (gecachte Gesamtnoten, Zeitstempel)     |

### Schnittstellen
- **Eingehend:** gRPC (vom Noten-Service), REST (vom Frontend)
- **Ausgehend:** 
  - gRPC zum Noten-Service (Noten abrufen)
  - REST zum Studiengang-Service (Regelwerk abrufen)

### Abgrenzung
- Keine Notenänderung (nur Lesen)
- Keine Regelwerk-Definition (nur Interpretation)
- Nur Berechnung und Caching der Ergebnisse

---

## 7. Angular Frontend (SPA)

### Verantwortlichkeit
Das Angular Frontend ist die grafische Benutzeroberfläche für alle Nutzergruppen.

### Aufgaben
| Aufgabe                    | Beschreibung                                                |
|----------------------------|-------------------------------------------------------------|
| **Authentifizierung**      | Login-Formular, Token-Speicherung, Auto-Refresh             |
| **Rollenbezogene Ansichten**| Unterschiedliche UI je nach Rolle (Student, Lehrender, etc.)|
| **Notenübersicht**         | Darstellung der eigenen Noten (für Studierende)             |
| **Notenerfassung**         | Eingabeformulare (für Lehrende)                             |
| **Notenvalidierung**       | Validierungs-Workflows (für Prüfungsamt)                    |
| **Verwaltungsoberfläche**  | Administration von Benutzern, Studiengängen (für Admins)    |
| **Berichte/Export**        | Notenübersichten als PDF/Excel                              |

### Views nach Rolle
| Rolle              | Hauptfunktionen                                            |
|--------------------|-------------------------------------------------------------|
| **Student**        | Eigene Noten einsehen, Fortschritt, Gesamtnote              |
| **Lehrender**      | Noten erfassen für zugewiesene Module                       |
| **Prüfungsamt**    | Noten validieren, Übersichten, Berichte                     |
| **Studiengangsleitung** | Noten validieren, Studierende verwalten               |
| **Admin**          | Benutzer, Rollen, Studiengänge, System-Konfiguration        |

### Technologie
- Angular 17+
- Angular Material (UI-Komponenten)
- NgRx oder Signal Store (State-Management)
- Apollo Client (GraphQL-Integration)

---

## Service-Zuständigkeitsmatrix

Diese Matrix zeigt, welcher Service für welche fachliche Funktion zuständig ist:

| Funktion                          | Gateway | Auth | User | Studiengang | Noten | Berechnung | Frontend |
|-----------------------------------|:-------:|:----:|:----:|:-----------:|:-----:|:----------:|:--------:|
| Login/Logout                      |    ◐    |  ●   |  ○   |      ○      |   ○   |     ○      |    ◐     |
| Token-Validierung                 |    ●    |  ●   |  ○   |      ○      |   ○   |     ○      |    ○     |
| Benutzer anlegen/bearbeiten       |    ◐    |  ○   |  ●   |      ○      |   ○   |     ○      |    ◐     |
| Rollen zuweisen                   |    ◐    |  ○   |  ●   |      ○      |   ○   |     ○      |    ◐     |
| Studiengang verwalten             |    ◐    |  ○   |  ○   |      ●      |   ○   |     ○      |    ◐     |
| Module verwalten                  |    ◐    |  ○   |  ○   |      ●      |   ○   |     ○      |    ◐     |
| PO-Regelwerk definieren           |    ◐    |  ○   |  ○   |      ●      |   ○   |     ○      |    ◐     |
| Student einschreiben              |    ◐    |  ○   |  ◐   |      ●      |   ○   |     ○      |    ◐     |
| Note erfassen                     |    ◐    |  ○   |  ○   |      ○      |   ●   |     ○      |    ◐     |
| Note validieren                   |    ◐    |  ○   |  ○   |      ○      |   ●   |     ○      |    ◐     |
| Noten abrufen                     |    ◐    |  ○   |  ○   |      ○      |   ●   |     ◐      |    ◐     |
| Gesamtnote berechnen              |    ◐    |  ○   |  ○   |      ◐      |   ◐   |     ●      |    ◐     |
| Berichte erstellen                |    ◐    |  ○   |  ○   |      ◐      |   ◐   |     ●      |    ◐     |

**Legende:** ● = Hauptverantwortlich | ◐ = Beteiligt (weiterleiten/konsumieren) | ○ = Nicht beteiligt

---

## Datenhoheit pro Service (Data Ownership)

Jeder Service besitzt seine eigene Datenbank und hat die alleinige Schreibhoheit über seine Daten:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATEN                                          |
├─────────────────┬───────────────────────────────────────────────────────────┤
│ Auth-Service    │ sessions, refresh_tokens                                  │
├─────────────────┼───────────────────────────────────────────────────────────┤
│ User-Service    │ benutzer, studenten, rollen, benutzer_rollen              │
├─────────────────┼───────────────────────────────────────────────────────────┤
│ Studiengang-    │ mandanten, studiengaenge, pruefungsordnungen, module,     │
│ Service         │ po_regelwerke, einschreibungen                            │
├─────────────────┼───────────────────────────────────────────────────────────┤
│ Noten-Service   │ noten, noten_historie                                     │
├─────────────────┼───────────────────────────────────────────────────────────┤
│ Berechnungs-    │ berechnungsergebnisse (Cache)                             │
│ Service         │                                                           │
└─────────────────┴───────────────────────────────────────────────────────────┘
```

### Prinzip: Keine geteilte Datenbank

- Jeder Service hat seine **eigene PostgreSQL-Datenbank**
- Kein direkter Datenbankzugriff zwischen Services
- Datenaustausch **nur über APIs** (REST, GraphQL, gRPC)
- Bei Bedarf: **Datenduplizierung** statt Joins (Eventual Consistency)

---

## Abhängigkeiten beim Entwicklungsstart

Phase 1 (Basis):
├── Auth-Service (grundlegend für alle anderen)
├── User-Service (Benutzerdaten)
└── API-Gateway (Routing-Grundlagen)

Phase 2 (Fachlogik):
├── Studiengang-Service (Stammdaten)
└── Angular Frontend (Grundstruktur mit Login)

Phase 3 (Kernfunktionen):
├── Noten-Service (Hauptfunktion)
└── Angular Frontend (Notenerfassung/-anzeige)

Phase 4 (Berechnung):
├── Berechnungs-Service
└── Angular Frontend (Gesamtnotenanzeige)

Phase 5 (Integration & Polish):
├── Vollständige Integration aller Services
├── E2E-Tests
└── Deployment-Konfiguration

---

*Zuletzt aktualisiert: 31.12.2025*



