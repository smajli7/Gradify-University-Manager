# Kommunikationskonzept

Dieses Dokument legt fest, welches Protokoll (REST, GraphQL, gRPC) für welchen Anwendungsfall verwendet wird.

---

## Warum verschiedene Protokolle?

Laut Projektanforderung müssen wir REST, GraphQL und gRPC einsetzen. Jedes Protokoll hat Stärken:

| Protokoll | Gut für | Weniger gut für |
|-----------|---------|-----------------|
| **REST** | Einfache CRUD-Operationen, Standard-APIs | Komplexe verschachtelte Abfragen |
| **GraphQL** | Flexible Abfragen, Frontend-getriebene Daten | Einfache Schreiboperationen |
| **gRPC** | Schnelle Service-zu-Service Kommunikation | Browser-Zugriff (ohne Proxy) |

---

## Übersicht: Wer spricht wie mit wem?

```
┌──────────────────┐
│  Angular Frontend │
└────────┬─────────┘
         │ REST + GraphQL
         ▼
┌──────────────────┐
│   API-Gateway    │
└────────┬─────────┘
         │
    ┌────┴────┬──────────┬──────────┬──────────┐
    │         │          │          │          │
    ▼         ▼          ▼          ▼          ▼
┌───────┐ ┌───────┐ ┌─────────┐ ┌───────┐ ┌──────────┐
│ Auth  │ │ User  │ │Studien- │ │ Noten │ │Berechnung│
│Service│ │Service│ │gang-Srv │ │Service│ │Service   │
└───┬───┘ └───────┘ └─────────┘ └───┬───┘ └────┬─────┘
    │                               │          │
    └─────────── gRPC ──────────────┴──────────┘
         (Service-zu-Service)
```

**Kurz gesagt:**
- Frontend → Backend: **REST** und **GraphQL**
- Backend → Backend: **gRPC**

---

## REST: Wann und wo?

REST nutzen wir für **einfache, klar definierte Operationen** wo ein Request = eine Aktion.

### Anwendungsfälle REST

| Use-Case | Endpoint | Methode | Beschreibung |
|----------|----------|---------|--------------|
| Login | `/api/auth/login` | POST | Benutzer anmelden |
| Logout | `/api/auth/logout` | POST | Session beenden |
| Token erneuern | `/api/auth/refresh` | POST | Neuen Access-Token holen |
| Passwort ändern | `/api/auth/password` | PUT | Eigenes Passwort ändern |
| Benutzer anlegen | `/api/users` | POST | Neuen Benutzer erstellen |
| Benutzer löschen | `/api/users/{id}` | DELETE | Benutzer entfernen |
| Rolle zuweisen | `/api/users/{id}/roles` | POST | Rolle an Benutzer vergeben |
| Note erfassen | `/api/noten` | POST | Neue Note eintragen |
| Note ändern | `/api/noten/{id}` | PUT | Bestehende Note korrigieren |
| Note validieren | `/api/noten/{id}/validate` | POST | Note durch PA freigeben |
| Studiengang anlegen | `/api/studiengaenge` | POST | Neuen Studiengang erstellen |
| Modul anlegen | `/api/module` | POST | Neues Modul erstellen |
| Student einschreiben | `/api/einschreibungen` | POST | Student in Studiengang eintragen |

**Warum REST hier?**
- Klare Aktionen (erstellen, ändern, löschen)
- Jeder Request macht genau eine Sache
- Einfach zu implementieren und zu testen

---

## GraphQL: Wann und wo?

GraphQL nutzen wir für **flexible Abfragen** wo das Frontend selbst bestimmt, welche Daten es braucht.

### Anwendungsfälle GraphQL

| Use-Case | Query/Mutation | Beschreibung |
|----------|----------------|--------------|
| Notenübersicht Student | Query | Alle Noten eines Studenten mit Modulinfos und Gewichtungen |
| Dashboard Lehrender | Query | Eigene Module mit Teilnehmern und deren Noten |
| Studiengangübersicht | Query | Studiengang mit allen Modulen, ECTS, Gewichtungen |
| Studentenprofil | Query | Student mit Einschreibung, Noten, Fortschritt |
| Gesamtnote mit Details | Query | Berechnete Note + Aufschlüsselung nach Modulen |
| Prüfungsamt Übersicht | Query | Offene Validierungen mit Studenteninfos |

### Beispiel: Notenübersicht für einen Studenten

Das Frontend braucht: Studentenname, alle Noten mit Modulname, ECTS und Gewichtung.

**Ohne GraphQL (mehrere REST-Calls):**
1. `GET /api/students/{id}` → Studentendaten
2. `GET /api/noten?studentId={id}` → Noten
3. `GET /api/module/{id}` → für jedes Modul einzeln

**Mit GraphQL (ein Call):**
```
query {
  student(id: "123") {
    vorname
    nachname
    noten {
      wert
      modul {
        name
        ects
        gewichtung
      }
    }
  }
}
```

**Warum GraphQL hier?**
- Frontend holt genau die Daten die es braucht
- Weniger Requests = schnellere Ladezeit
- Gut für Dashboard-Ansichten mit vielen verknüpften Daten

---

## gRPC: Wann und wo?

gRPC nutzen wir für **schnelle Kommunikation zwischen Backend-Services**.

### Anwendungsfälle gRPC

| Von | Nach | Use-Case | Beschreibung |
|-----|------|----------|--------------|
| Auth-Service | User-Service | Benutzer validieren | Prüfen ob User existiert und Passwort stimmt |
| Noten-Service | Berechnungs-Service | Neuberechnung triggern | Nach Noteneintrag Gesamtnote neu berechnen |
| Berechnungs-Service | Noten-Service | Noten abrufen | Alle Noten eines Studenten für Berechnung holen |
| Berechnungs-Service | Studiengang-Service | Regelwerk abrufen | PO-Formel für Gesamtnote holen |
| Studiengang-Service | User-Service | Studentendaten holen | Bei Einschreibung Studenteninfos abfragen |

**Warum gRPC hier?**
- Schneller als REST (binäres Protokoll)
- Typsicher durch Protocol Buffers
- Gut für häufige Service-zu-Service Aufrufe
- Unterstützt Streaming (z.B. für Batch-Berechnungen)

---

## Zusammenfassung pro Service

| Service | Eingehend | Ausgehend |
|---------|-----------|-----------|
| **API-Gateway** | REST, GraphQL (vom Frontend) | REST (an alle Services) |
| **Auth-Service** | REST | gRPC (zum User-Service) |
| **User-Service** | REST, GraphQL, gRPC | – |
| **Studiengang-Service** | REST, GraphQL, gRPC | gRPC (zum User-Service) |
| **Noten-Service** | REST, GraphQL | gRPC (zum Berechnungs-Service) |
| **Berechnungs-Service** | REST, gRPC | gRPC (zum Noten-Service, Studiengang-Service) |

---

## Entscheidungshilfe

Bei neuen Endpunkten diese Fragen stellen:

1. **Ist es eine einfache CRUD-Operation?** → REST
2. **Braucht das Frontend flexible/verschachtelte Daten?** → GraphQL
3. **Kommunizieren zwei Backend-Services miteinander?** → gRPC
4. **Muss es besonders schnell sein?** → gRPC

---

## Technologien

| Protokoll | Technologie |
|-----------|-------------|
| REST | Spring Web MVC |
| GraphQL | Spring for GraphQL + Apollo Client (Frontend) |
| gRPC | grpc-spring-boot-starter |

---

*Zuletzt aktualisiert: 08.01.2026*




