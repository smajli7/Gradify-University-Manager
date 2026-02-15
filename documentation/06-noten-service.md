# Noten-Service

## 1. Zweck und Funktion

Der Noten-Service ist für die Erfassung, Validierung, Freigabe und Verwaltung aller Modulnoten zuständig. Er implementiert den vollständigen Notenlebenszyklus, führt ein lückenloses Audit-Log über alle Notenänderungen und veröffentlicht Notenänderungs-Events über RabbitMQ.

**Technologie:** Spring Boot 3.3.7, Spring Data JPA, Spring for GraphQL, gRPC, RabbitMQ (Producer)
**Ports:** 8084 (HTTP), 9084 (gRPC)

---

## 2. Notenlebenszyklus

```
           ERFASST ──────▶ VALIDIERT ──────▶ FREIGEGEBEN
          (Lehrender)     (Prüfungsamt)     (Prüfungsamt)
               │                │
               ▼                ▼
         Bearbeitung      Ablehnung möglich
         möglich          (zurück zu ERFASST)
```

| Status | Beschreibung | Berechtigter Akteur |
|--------|-------------|---------------------|
| ERFASST | Note wurde eingegeben, kann bearbeitet werden | LEHRENDER |
| VALIDIERT | Note wurde vom Prüfungsamt geprüft | PRUEFUNGSAMT |
| FREIGEGEBEN | Note ist für Studierende sichtbar | PRUEFUNGSAMT |

---

## 3. Datenhoheit

| Entität | Tabelle | Attribute |
|---------|---------|-----------|
| Note | `noten` | id (Long), einschreibungId, modulId, erfasstVon, noteWert (Decimal 2,1), bestanden (Boolean), versuch (int), pruefungsdatum, status (ERFASST/VALIDIERT/FREIGEGEBEN), kommentar, erfasstAm, validiertAm, validiertVon |
| NotenHistorie | `noten_historie` | id (Long), noteId, einschreibungId, modulId, geaendertVon, aenderungsTyp, alterWert (Decimal), neuerWert (Decimal), kommentar, geaendertAm |

### Audit-Änderungstypen

| Typ | Beschreibung |
|-----|-------------|
| ERSTELLT | Note wurde neu erfasst |
| NOTE_GEAENDERT | Notenwert wurde korrigiert |
| VALIDIERT | Note wurde vom Prüfungsamt validiert |
| FREIGEGEBEN | Note wurde für Studierende freigegeben |
| FREIGABE_ZURUECKGENOMMEN | Validierung wurde zurückgenommen (Ablehnung) |
| STORNIERT | Note wurde gelöscht |

---

## 4. REST-Endpunkte (`/api/noten`)

| Methode | Endpunkt | Beschreibung |
|---------|----------|-------------|
| GET | `/api/noten` | Noten (Filter: `einschreibungId`, `modulId`, `status`) |
| GET | `/api/noten/{id}` | Einzelne Note |
| GET | `/api/noten/einschreibung/{einschreibungId}` | Noten einer Einschreibung |
| GET | `/api/noten/modul/{modulId}` | Noten eines Moduls |
| GET | `/api/noten/stats` | Notenstatistiken (Filter: `modulIds`) |
| GET | `/api/noten/gueltige-noten` | Gültige Notenwerte (1.0, 1.3, ... 5.0) |
| POST | `/api/noten` | Note erfassen (LEHRENDER) |
| PUT | `/api/noten/{id}` | Note korrigieren (LEHRENDER, PRUEFUNGSAMT) |
| POST | `/api/noten/{id}/validate` | Note validieren (PRUEFUNGSAMT; optional: `kommentar`) |
| POST | `/api/noten/{id}/release` | Note freigeben (PRUEFUNGSAMT) |
| POST | `/api/noten/{id}/reject` | Note ablehnen/zurückweisen (PRUEFUNGSAMT; optional: `kommentar`) |
| DELETE | `/api/noten/{id}` | Note stornieren (PRUEFUNGSAMT) |
| GET | `/api/noten/audit` | Audit-Log (Filter: `noteId`, `einschreibungId`, `modulId`, `modulIds`, `vonDatum`, `bisDatum`, `aenderungsTyp`, `benutzerId`, `limit`) |
| GET | `/api/noten/export/{einschreibungId}` | CSV-Export der Noten |

---

## 5. GraphQL-Schema (`/graphql`)

### Queries

| Query | Beschreibung |
|-------|-------------|
| `noten(einschreibungId: ID, modulId: ID): [Note!]!` | Noten (filterbar) |
| `note(id: ID!): Note` | Einzelne Note |
| `notenByStudent(einschreibungId: ID!): [Note!]!` | Noten einer Einschreibung |
| `notenByModul(modulId: ID!): [Note!]!` | Noten eines Moduls |
| `durchschnittsnote(einschreibungId: ID!): Float` | Durchschnittsnote |
| `bestandeneModule(einschreibungId: ID!): Int` | Anzahl bestandener Module |

### Mutations

| Mutation | Beschreibung |
|----------|-------------|
| `createNote(input: CreateNoteInput!): Note!` | Note erfassen |
| `updateNote(id: ID!, input: UpdateNoteInput!): Note!` | Note bearbeiten |
| `validateNote(id: ID!, validatorId: ID!): Note!` | Note validieren |
| `releaseNote(id: ID!): Note!` | Note freigeben |
| `deleteNote(id: ID!): Boolean!` | Note löschen |

---

## 6. gRPC-Schnittstelle (eingehend, Port 9084)

### NotenDataService

| Methode | Request | Response | Aufrufer |
|---------|---------|----------|----------|
| `GetNotenFuerBerechnung` | einschreibungId | Liste von Noten (modulId, noteWert, bestanden, status) | Berechnungs-Service |

---

## 7. RabbitMQ (Producer)

Der Noten-Service veröffentlicht Events über den Topic Exchange `gradify.events` bei jeder Notenänderung:

| Routing-Key | Beschreibung |
|-------------|-------------|
| `note.created` | Neue Note erfasst |
| `note.updated` | Notenwert korrigiert |
| `note.validated` | Note validiert |
| `note.released` | Note freigegeben |
| `note.deleted` | Note storniert |

**Event-Struktur (NoteEvent):** eventType, noteId, einschreibungId, modulId, noteWert, bestanden, timestamp, ausgeloestVon, mandantId

Die Events werden an die Queue `queue.berechnung.neuberechnung` geleitet, wo der Berechnungs-Service sie empfängt.

---

## 8. Multi-Tenancy

Mandantenspezifisches Datenbank-Routing über `DynamicTenantRoutingDataSource`. Konfigurierte Mandanten: `1:thm, 2:gu`. Tenant-Kontext wird aus dem JWT-Token extrahiert.
