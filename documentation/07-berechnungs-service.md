# Berechnungs-Service

## 1. Zweck und Funktion

Der Berechnungs-Service führt alle Notenberechnungen durch: gewichtete Gesamtnoten, Durchschnittsnoten und Studienfortschrittsberechnungen gemäß der jeweiligen Prüfungsordnung. Er wird sowohl synchron (REST, gRPC) als auch asynchron (RabbitMQ) angesprochen und speichert Berechnungsergebnisse mit Detailaufschlüsselung pro Modul.

**Technologie:** Spring Boot 3.3.7, Spring Data JPA, gRPC, RabbitMQ (Consumer)
**Ports:** 8085 (HTTP), 9085 (gRPC)

---

## 2. Berechnungsablauf

```
┌──────────────┐  RabbitMQ   ┌──────────────────┐  gRPC   ┌──────────────────┐
│ Noten-Service│ ─────────▶ │Berechnungs-Service│ ──────▶ │ Noten-Service    │
│  (Producer)  │            │   (Consumer)      │         │ (Noten abrufen)  │
└──────────────┘            │                   │         └──────────────────┘
                            │                   │  gRPC   ┌──────────────────┐
                            │                   │ ──────▶ │Studiengang-Svc.  │
                            │                   │         │(Regelwerk/Einschr)│
                            └───────┬───────────┘         └──────────────────┘
                                    │
                                    ▼
                            Berechnungsergebnis
                            + ModulBerechnungen
                            (in DB gespeichert)
```

1. Eine Notenänderung löst ein RabbitMQ-Event aus.
2. Der Berechnungs-Service empfängt das Event.
3. Er ruft per gRPC die Einschreibungsdetails (poId, ectsGesamt, studiengangName) vom Studiengang-Service ab.
4. Er ruft per gRPC die Modulgewichtungen vom Studiengang-Service ab.
5. Er ruft per gRPC die aktuellen Noten vom Noten-Service ab.
6. Die Gesamtnote wird berechnet und zusammen mit der Detailaufschlüsselung pro Modul in der Datenbank gespeichert.

---

## 3. Datenhoheit

| Entität | Tabelle | Attribute |
|---------|---------|-----------|
| Berechnungsergebnis | `berechnungsergebnisse` | id (Long), einschreibungId (unique), gesamtnote (Decimal 2,1), gesamtnoteRoh (Decimal 4,3), status (VORLAEUFIG/ENDGUELTIG), moduleBestanden, moduleGesamt, ectsErreicht, ectsGesamt, erstelltAm, berechnetAm |
| ModulBerechnung | `modul_berechnungen` | id (Long), berechnungsergebnis (FK), modulId, modulNr, modulName, note (Decimal 2,1), gewichtung (Decimal 3,1), inGesamtnote, bestanden, ects, gewichteterBeitrag (Decimal 4,3) |

---

## 4. REST-Endpunkte (`/api/berechnungen`)

| Methode | Endpunkt | Beschreibung |
|---------|----------|-------------|
| GET | `/api/berechnungen/einschreibung/{id}` | Gesamtnote einer Einschreibung |
| GET | `/api/berechnungen/einschreibung/{id}/details` | Detailaufschlüsselung (Beitrag pro Modul) |
| GET | `/api/berechnungen/einschreibung/{id}/fortschritt` | Studienfortschritt (ECTS, Module, Prozent) |
| POST | `/api/berechnungen/einschreibung/{id}/berechnen` | Neuberechnung auslösen (optional: `poId`, `ectsGesamt`) |
| POST | `/api/berechnungen/berechnen` | Vollständige Berechnung (Body: BerechnungRequest) |
| GET | `/api/berechnungen/statistik/durchschnitt` | Durchschnittsnote aller abgeschlossenen Studiengänge |
| GET | `/api/berechnungen/berechnungsarten` | Verfügbare Berechnungsformeln |
| GET | `/api/berechnungen/grpc-status` | gRPC-Verbindungsstatus (optional: `test=true` für Verbindungstest) |

---

## 5. gRPC-Schnittstellen

### Eingehend (BerechnungsService, Port 9085)

| Methode | Request | Response | Aufrufer |
|---------|---------|----------|----------|
| `TriggerNeuberechnung` | einschreibungId | success, gesamtnote | intern (asynchron ausgelöst durch RabbitMQ-Events aus dem Noten-Service) |
| `GetGesamtnote` | einschreibungId | gesamtnote, status | Andere Services |

### Ausgehend (Clients)

| Ziel-Service | Methode | Beschreibung |
|-------------|---------|-------------|
| Noten-Service (9084) | `GetNotenFuerBerechnung` | Alle Noten einer Einschreibung abrufen |
| Studiengang-Service (9083) | `GetRegelwerk` | PO-Berechnungsregelwerk laden |
| Studiengang-Service (9083) | `GetModulGewichtungen` | Modulgewichtungen einer PO laden |
| Studiengang-Service (9083) | `GetEinschreibungDetails` | Einschreibungsdetails (poId, ectsGesamt, studiengangName) laden |

---

## 6. RabbitMQ (Consumer)

| Queue | Exchange | Routing-Key | Aktion |
|-------|----------|-------------|--------|
| `queue.berechnung.neuberechnung` | `gradify.events` (Topic) | `note.*` | Automatische Neuberechnung der Gesamtnote |

Verarbeitete Event-Typen: `NOTE_CREATED`, `NOTE_UPDATED`, `NOTE_VALIDATED`, `NOTE_RELEASED`, `NOTE_DELETED`. Jedes Event löst `berechnungsService.berechneGesamtnote(einschreibungId)` aus.

---

## 7. Unterstützte Berechnungsarten

| Berechnungsart | Studiengang | Formel |
|---------------|------------|--------|
| GEWICHTET | Bioverfahrenstechnik (BA) | Σ(Note × Gewichtung) / Σ(Gewichtung) |
| ARITHMETISCH_GEMISCHT | Forschung Soziale Arbeit (MA) | (2 × Thesis + 1 × Modulmittel) / 3 |

Die Berechnungsformeln werden dynamisch aus dem PO-Regelwerk des Studiengang-Service geladen.

---

## 8. Multi-Tenancy

Mandantenspezifisches Datenbank-Routing über `DynamicTenantRoutingDataSource`. Konfigurierte Mandanten: `1:thm, 2:gu`. Der RabbitMQ-Event enthält die `mandantId`, sodass der korrekte Tenant-Kontext beim Consumer gesetzt wird.
