# Audit-Log (Protokoll) – Konzept

## 1. Ziel

Nachvollziehbarkeit aller relevanten Aktionen an Noten: **Wer hat wann was geändert (vorher/nachher)?**  
Nur lesender Zugriff; Filter nach Zeitraum, Modul, Student, Aktionstyp; Export (CSV) für Prüfungsamt.

---

## 2. Welche Einträge werden protokolliert?

Alle schreibenden Aktionen im Noten-Service:

| Aktion | AenderungsTyp | Inhalt |
|--------|----------------|--------|
| Note erstellt | `ERSTELLT` | noteId, geaendertVon = erfasstVon, neuerWert = noteWert, geaendertAm |
| Note bearbeitet | `NOTE_GEAENDERT` | alterWert, neuerWert, ggf. kommentar, geaendertVon |
| Note validiert | `VALIDIERT` | geaendertVon = validiertVon, kommentar (Validierungskommentar), geaendertAm |
| Note freigegeben | `FREIGEGEBEN` | geaendertVon = freigegebenVon, geaendertAm |
| Note gelöscht | `STORNIERT` | noteId, geaendertVon, geaendertAm |

**Technisch:** Entity `NotenHistorie` (noteId, einschreibungId, modulId, geaendertVon, aenderungsTyp, alterWert, neuerWert, kommentar, geaendertAm) wird bei jeder Aktion befüllt.

---

## 3. Wer sieht was? (Rollen & Scoping)

| Rolle | Sichtbarkeit | Mechanismus |
|-------|--------------|-------------|
| **Prüfungsamt** | Alle Einträge der eigenen Hochschule | Tenant-DB-Isolation (TenantContextFilter → eigene DB pro Hochschule) |
| **Admin** | Alle Einträge der eigenen Hochschule | Tenant-DB-Isolation |
| **Hochschulverwalter** | Alle Einträge der eigenen Hochschule | Tenant-DB-Isolation |
| **Dozent (LEHRENDER)** | Nur Einträge zu **eigenen zugewiesenen Modulen** | Frontend sendet `modulIds` (aus GraphQL `dozentenModule`), Backend filtert `WHERE modul_id IN (...)` |
| **Student** | **Kein Zugriff** auf Audit-Log | SecurityConfig → 403 |

**Sicherheit:**
- PA/ADMIN/HV sehen automatisch nur Daten ihrer Hochschule (Tenant-DB-Isolation, keine zusätzliche Filterung nötig).
- Dozent MUSS `modulIds` Parameter senden; ohne → leere Antwort. Das Frontend lädt die zugewiesenen Module per GraphQL `dozentenModule(dozentId)`.

---

## 4. Filter & API

**Endpoint:** `GET /api/noten/audit`

**Query-Parameter:**

| Parameter | Typ | Für wen | Bedeutung |
|-----------|-----|---------|-----------|
| `modulIds` | String (komma-sep.) | Dozent (Pflicht) | Einträge zu diesen Modul-IDs |
| `modulId` | Long | PA/ADMIN/HV (optional) | Einzelnes Modul filtern |
| `noteId` | Long | alle (optional) | Nur Einträge zu dieser Note |
| `einschreibungId` | Long | alle (optional) | Nur Einträge zu dieser Einschreibung |
| `vonDatum` | ISO-Datum | alle (optional) | Ab diesem Datum |
| `bisDatum` | ISO-Datum | alle (optional) | Bis zu diesem Datum |
| `aenderungsTyp` | String | alle (optional) | ERSTELLT, NOTE_GEAENDERT, VALIDIERT, FREIGEGEBEN, STORNIERT |
| `benutzerId` | Long | PA/ADMIN/HV (optional) | Nur Einträge von diesem Benutzer |
| `limit` | Integer | alle (optional) | Max. Einträge (Default 500, Max 1000) |

**Antwort:** Liste von `AuditEintragDto` (id, noteId, einschreibungId, modulId, geaendertVon, aenderungsTyp, alterWert, neuerWert, kommentar, geaendertAm).

---

## 5. Frontend (Seite „Protokoll")

- **Route:** `/grades/audit`
- **Sichtbar für:** Prüfungsamt, Admin, Hochschulverwalter, Dozent (Sidebar + SecurityConfig)
- **Inhalt:**
  - Filterleiste: Zeitraum (von/bis), Modul (Dropdown aus zugewiesenen/allen Modulen), Aktionstyp
  - Tabelle: Zeit, Aktion (Badge), Note-ID, Modul (Name), Wer, Vorher/Nachher, Kommentar
  - Export: Button „CSV exportieren"
  - Dozent-Hinweis: „Anzeige beschränkt auf deine zugewiesenen Module"
- **Module-Lookup:** Frontend lädt Module per GraphQL (Dozent: `dozentenModule`, PA/ADMIN/HV: alle `module`) und reichert die Tabelle mit Modulnamen an

---

## 6. Architektur-Entscheidungen

1. **Tenant-Isolation statt Backend-Filter für PA/HV:** Jede Hochschule hat eine eigene Noten-DB (`gradify_noten_thm`, `gradify_noten_gu`). Dadurch sieht PA/HV automatisch nur die eigene Hochschule – kein zusätzlicher Filter nötig.
2. **Dozent-Modulfilter im Frontend statt Backend-Lookup:** Der Noten-Service kennt keine Modul-Zuweisungen (die liegen im Studiengang-Service). Das Frontend hat das Pattern bereits (Dashboard, GradeEntry, Stats nutzen `dozentenModule`-Query). Konsistent damit sendet das Frontend die zugewiesenen modulIds.
3. **Historie direkt im Service geschrieben (kein Event-basiertes Audit):** Einfachste Lösung im gleichen Transaktionskontext. Garantiert, dass kein Audit-Eintrag verloren geht.
