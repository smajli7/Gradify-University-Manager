# Datenmodell – Notenmanagement-System

Dieses Dokument definiert das grobe Datenmodell für das web-basierte Notenmanagement-System. Es umfasst die wichtigsten Entitäten, ihre Attribute, Beziehungen und die Berechnungslogik gemäß der jeweiligen Prüfungsordnung (PO).

---

## Übersicht der Entitäten

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     Mandant     │◄──────│   Studiengang   │───────│       PO        │
│   (Fakultät)    │  1:n  │                 │  1:1  │ (Prüfungsordnung│
└─────────────────┘       └────────┬────────┘       └────────┬────────┘
                                   │                         │
                                   │ n:m                     │ 1:n
                                   │                         │
                          ┌────────▼────────┐       ┌────────▼────────┐
                          │     Student     │       │   PO_Regelwerk  │
                          │                 │       │                 │
                          └────────┬────────┘       └─────────────────┘
                                   │
                                   │ 1:n
                                   │
                          ┌────────▼────────┐       ┌─────────────────┐
                          │   Einschreibung │───────│      Modul      │
                          │   (Enrollment)  │  n:1  │                 │
                          └────────┬────────┘       └────────┬────────┘
                                   │                         │
                                   │ 1:n                     │ 1:n
                                   │                         │
                          ┌────────▼────────┐       ┌────────▼────────┐
                          │      Note       │───────│   Modulinstanz  │
                          │                 │  n:1  │  (im Semester)  │
                          └─────────────────┘       └─────────────────┘

┌─────────────────┐       ┌─────────────────┐
│    Benutzer     │───────│      Rolle      │
│     (User)      │  n:m  │                 │
└─────────────────┘       └─────────────────┘
```

---

## 1. Entität: Mandant (Tenant)

Multi-Tenancy-Unterstützung für verschiedene Fakultäten/Organisationseinheiten.

| Attribut       | Typ          | Beschreibung                              |
|----------------|--------------|-------------------------------------------|
| `id`           | UUID         | Primärschlüssel                           |
| `name`         | String(100)  | Name des Mandanten (z.B. "Fakultät Technik") |
| `kuerzel`      | String(10)   | Kurzbezeichnung (z.B. "FT")               |
| `aktiv`        | Boolean      | Mandant aktiv/inaktiv                     |
| `erstellt_am`  | DateTime     | Erstellungsdatum                          |
| `aktualisiert_am` | DateTime  | Letzte Aktualisierung                     |

**Beziehungen:**
- Ein Mandant hat n Studiengänge (1:n)

---

## 2. Entität: Studiengang

| Attribut           | Typ          | Beschreibung                                   |
|--------------------|--------------|------------------------------------------------|
| `id`               | UUID         | Primärschlüssel                                |
| `mandant_id`       | UUID (FK)    | Fremdschlüssel zu Mandant                      |
| `po_id`            | UUID (FK)    | Fremdschlüssel zur aktuellen Prüfungsordnung   |
| `name`             | String(150)  | Vollständiger Name                             |
| `kuerzel`          | String(20)   | Kurzbezeichnung (z.B. "BVT", "FSA")            |
| `abschlussart`     | Enum         | `BACHELOR`, `MASTER`                           |
| `regelstudienzeit` | Integer      | Regelstudienzeit in Semestern                  |
| `gesamt_ects`      | Integer      | Gesamtzahl ECTS (z.B. 210, 120)                |
| `studienvariante`  | Enum         | `ALLGEMEIN`, `DUAL`                            |
| `aktiv`            | Boolean      | Studiengang aktiv/inaktiv                      |

**Beziehungen:**
- Ein Studiengang gehört zu einem Mandanten (n:1)
- Ein Studiengang hat eine aktive Prüfungsordnung (1:1)
- Ein Studiengang hat n Module (1:n)
- Ein Studiengang hat n eingeschriebene Studenten (n:m über Einschreibung)

### Beispieldaten

| Studiengang                      | Kürzel | Abschluss | Regelstudienzeit | ECTS |
|----------------------------------|--------|-----------|------------------|------|
| Bioverfahrenstechnik             | BVT    | Bachelor  | 7 Semester       | 210  |
| Forschung in der Sozialen Arbeit | FSA    | Master    | 4 Semester       | 120  |

---

## 3. Entität: Prüfungsordnung (PO)

| Attribut              | Typ          | Beschreibung                              |
|-----------------------|--------------|-------------------------------------------|
| `id`                  | UUID         | Primärschlüssel                           |
| `studiengang_id`      | UUID (FK)    | Fremdschlüssel zu Studiengang             |
| `version`             | String(20)   | Versionsnummer (z.B. "2023", "2022")      |
| `gueltig_ab`          | Date         | Gültigkeitsbeginn                         |
| `gueltig_bis`         | Date         | Gültigkeitsende (null = aktuell gültig)   |
| `berechnungsart`      | Enum         | `GEWICHTET`, `ARITHMETISCH_GEMISCHT`      |
| `dokument_referenz`   | String(255)  | Pfad/Link zum PO-Dokument                 |

**Beziehungen:**
- Eine PO gehört zu einem Studiengang (n:1)
- Eine PO hat n PO_Regelwerke (1:n)
- Eine PO hat n Module (1:n)

---

## 4. Entität: Modul

| Attribut               | Typ          | Beschreibung                                        |
|------------------------|--------------|-----------------------------------------------------|
| `id`                   | UUID         | Primärschlüssel                                     |
| `po_id`                | UUID (FK)    | Fremdschlüssel zur Prüfungsordnung                  |
| `modul_nr`             | String(10)   | Modulnummer (z.B. "1", "5.1", "32-1")               |
| `name`                 | String(200)  | Modulname                                           |
| `name_en`              | String(200)  | Modulname (Englisch, optional)                      |
| `ects`                 | Integer      | ECTS-Punkte des Moduls                              |
| `semester`             | String(10)   | Fachsemester (z.B. "1", "1-2", "6-7")               |
| `dauer_semester`       | Integer      | Dauer in Semestern                                  |
| `pruefungsform`        | Enum         | `KLAUSUR`, `HAUSARBEIT`, `PROJEKT`, etc.            |
| `pruefungsdauer`       | String(50)   | Dauer/Bearbeitungszeit (z.B. "90 Min.", "4 Wochen") |
| `sprache`              | Enum         | `DEUTSCH`, `ENGLISCH`                               |
| `modultyp`             | Enum         | `PFLICHT`, `WAHLPFLICHT`, `ZUSATZ`                  |
| `bewertungsart`        | Enum         | `NOTE`, `BESTANDEN_NICHT_BESTANDEN`                 |
| `gewichtung`           | Decimal(3,1) | Gewichtungsfaktor für Gesamtnote (0 = keine)        |
| `in_gesamtnote`        | Boolean      | Geht in Gesamtnote ein (true/false)                 |
| `vorleistung`          | String(500)  | Beschreibung der Vorleistungen                      |
| `wahlpflicht_gruppe`   | String(20)   | Gruppe bei Wahlpflicht (z.B. "5", "8")              |

**Beziehungen:**
- Ein Modul gehört zu einer PO (n:1)
- Ein Modul hat n Noten (1:n)
- Ein Modul kann Teilmodule haben (1:n, self-referencing)

---

## 5. Entität: Student

| Attribut           | Typ          | Beschreibung                              |
|--------------------|--------------|-------------------------------------------|
| `id`               | UUID         | Primärschlüssel                           |
| `benutzer_id`      | UUID (FK)    | Fremdschlüssel zu Benutzer                |
| `matrikelnummer`   | String(20)   | Eindeutige Matrikelnummer                 |
| `vorname`          | String(50)   | Vorname                                   |
| `nachname`         | String(50)   | Nachname                                  |
| `email`            | String(100)  | E-Mail-Adresse (Hochschul-Mail)           |
| `geburtsdatum`     | Date         | Geburtsdatum                              |
| `status`           | Enum         | `AKTIV`, `BEURLAUBT`, `EXMATRIKULIERT`    |
| `erstellt_am`      | DateTime     | Erstellungsdatum                          |

**Beziehungen:**
- Ein Student hat n Einschreibungen (1:n)
- Ein Student ist mit einem Benutzer verknüpft (1:1)

---

## 6. Entität: Einschreibung (Enrollment)

Verknüpft Studenten mit Studiengängen (n:m Auflösung).

| Attribut              | Typ          | Beschreibung                                   |
|-----------------------|--------------|------------------------------------------------|
| `id`                  | UUID         | Primärschlüssel                                |
| `student_id`          | UUID (FK)    | Fremdschlüssel zu Student                      |
| `studiengang_id`      | UUID (FK)    | Fremdschlüssel zu Studiengang                  |
| `po_id`               | UUID (FK)    | Angewandte Prüfungsordnung bei Einschreibung   |
| `studienvariante`     | Enum         | `ALLGEMEIN`, `DUAL`                            |
| `immatrikuliert_am`   | Date         | Immatrikulationsdatum                          |
| `exmatrikuliert_am`   | Date         | Exmatrikulationsdatum (null = aktiv)           |
| `aktuelles_semester`  | Integer      | Aktuelles Fachsemester                         |
| `status`              | Enum         | `AKTIV`, `ABGESCHLOSSEN`, `ABGEBROCHEN`        |

**Beziehungen:**
- Eine Einschreibung verbindet einen Studenten mit einem Studiengang
- Eine Einschreibung hat n Noten (1:n)

---

## 7. Entität: Note

| Attribut               | Typ           | Beschreibung                                    |
|------------------------|---------------|-------------------------------------------------|
| `id`                   | UUID          | Primärschlüssel                                 |
| `einschreibung_id`     | UUID (FK)     | Fremdschlüssel zu Einschreibung                 |
| `modul_id`             | UUID (FK)     | Fremdschlüssel zu Modul                         |
| `erfasst_von`          | UUID (FK)     | Fremdschlüssel zu Benutzer (Erfasser)           |
| `note_wert`            | Decimal(2,1)  | Notenwert (1.0 - 5.0) oder NULL bei bestanden   |
| `bestanden`            | Boolean       | Bei "bestanden/nicht bestanden" Modulen         |
| `versuch`              | Integer       | Prüfungsversuch (1, 2, 3, ggf. 4)               |
| `pruefungsdatum`       | Date          | Datum der Prüfung                               |
| `status`               | Enum          | `ERFASST`, `VALIDIERT`, `FREIGEGEBEN`           |
| `kommentar`            | String(500)   | Optionaler Kommentar                            |
| `erfasst_am`           | DateTime      | Erfassungszeitpunkt                             |
| `validiert_am`         | DateTime      | Validierungszeitpunkt                           |
| `validiert_von`        | UUID (FK)     | Benutzer der validiert hat                      |

**Beziehungen:**
- Eine Note gehört zu einer Einschreibung (n:1)
- Eine Note gehört zu einem Modul (n:1)
- Eine Note wurde von einem Benutzer erfasst (n:1)

### Notenvalidierung

| Note | Beschreibung   |
|------|----------------|
| 1.0  | sehr gut       |
| 1.3  | sehr gut       |
| 1.7  | gut            |
| 2.0  | gut            |
| 2.3  | gut            |
| 2.7  | befriedigend   |
| 3.0  | befriedigend   |
| 3.3  | befriedigend   |
| 3.7  | ausreichend    |
| 4.0  | ausreichend    |
| 5.0  | nicht bestanden|

---

## 8. Entität: Benutzer (User)

| Attribut           | Typ          | Beschreibung                              |
|--------------------|--------------|-------------------------------------------|
| `id`               | UUID         | Primärschlüssel                           |
| `mandant_id`       | UUID (FK)    | Fremdschlüssel zu Mandant                 |
| `benutzername`     | String(50)   | Login-Name (eindeutig)                    |
| `email`            | String(100)  | E-Mail-Adresse                            |
| `passwort_hash`    | String(255)  | Gehashtes Passwort                        |
| `vorname`          | String(50)   | Vorname                                   |
| `nachname`         | String(50)   | Nachname                                  |
| `aktiv`            | Boolean      | Account aktiv/inaktiv                     |
| `letzter_login`    | DateTime     | Letzter Login-Zeitpunkt                   |
| `erstellt_am`      | DateTime     | Erstellungsdatum                          |

**Beziehungen:**
- Ein Benutzer gehört zu einem Mandanten (n:1)
- Ein Benutzer hat n Rollen (n:m)
- Ein Benutzer kann ein Student sein (1:1, optional)

---

## 9. Entität: Rolle

| Attribut           | Typ          | Beschreibung                              |
|--------------------|--------------|-------------------------------------------|
| `id`               | UUID         | Primärschlüssel                           |
| `name`             | String(50)   | Rollenname                                |
| `beschreibung`     | String(200)  | Beschreibung der Rolle                    |
| `berechtigungen`   | JSON/Array   | Liste der Berechtigungen                  |

### Vordefinierte Rollen

| Rolle              | Beschreibung                                         | Berechtigungen                                        |
|--------------------|------------------------------------------------------|-------------------------------------------------------|
| `STUDENT`          | Studierende                                          | Eigene Noten einsehen                                 |
| `LEHRENDER`        | Dozenten/Professoren                                 | Noten erfassen für zugewiesene Module                 |
| `PRUEFUNGSAMT`     | Mitarbeiter Prüfungsamt                              | Alle Noten einsehen, validieren, Berichte erstellen   |
| `STUDIENGANGLEITUNG`| Studiengangsleitung                                 | Noten validieren, Studierende verwalten               |
| `ADMIN`            | Systemadministrator                                  | Vollzugriff, Benutzer-/Rollenverwaltung               |

---

## 10. Entität: Benutzer_Rolle (Zuordnungstabelle)

| Attribut           | Typ          | Beschreibung                              |
|--------------------|--------------|-------------------------------------------|
| `benutzer_id`      | UUID (FK)    | Fremdschlüssel zu Benutzer                |
| `rolle_id`         | UUID (FK)    | Fremdschlüssel zu Rolle                   |
| `studiengang_id`   | UUID (FK)    | Optional: Einschränkung auf Studiengang   |
| `zugewiesen_am`    | DateTime     | Zuweisungsdatum                           |

---

## 11. Entität: PO_Regelwerk

Speichert die Berechnungsregeln der Prüfungsordnung.

| Attribut               | Typ          | Beschreibung                                        |
|------------------------|--------------|-----------------------------------------------------|
| `id`                   | UUID         | Primärschlüssel                                     |
| `po_id`                | UUID (FK)    | Fremdschlüssel zur Prüfungsordnung                  |
| `regel_typ`            | Enum         | `GESAMTNOTE`, `BESTEHENSGRENZE`, `WIEDERHOLUNG`     |
| `regel_name`           | String(100)  | Name der Regel (z.B. "§11 Bildung der Gesamtnote")  |
| `beschreibung`         | Text         | Beschreibung der Regel                              |
| `formel`               | String(500)  | Berechnungsformel (als String/Expression)           |
| `parameter`            | JSON         | Parameter für die Berechnung                        |

---

## Berechnungslogik nach Prüfungsordnung

### Bioverfahrenstechnik (Bachelor) – Gewichtete Berechnung

**Grundlage:** § 11 Bildung der Gesamtnote

```
Gesamtnote = Σ(Modul_Note × Gewichtungsfaktor) / Σ(Gewichtungsfaktoren)
```

**Besonderheiten:**
- Module mit `bewertungsart = BESTANDEN_NICHT_BESTANDEN` (Gewichtung 0) werden **nicht** in die Berechnung einbezogen
- Beispiel: Modul 1 "Einführung in die Bioverfahrenstechnik" mit Gewichtung 0

**Gewichtungsfaktoren (Allgemeine Studienvariante):**

| Modul                                      | ECTS | Gewichtung |
|--------------------------------------------|------|------------|
| Einführung in die Bioverfahrenstechnik (1) | 5    | 0          |
| Technische Mechanik (2)                    | 5    | 1          |
| Konstruktion (3)                           | 5    | 1          |
| Mathematik 1 (4)                           | 10   | 2          |
| Physik (5)                                 | 5    | 1          |
| ...                                        | ...  | ...        |
| Teamprojekt (31)                           | 10   | 2          |
| Praxisphase (32)                           | 30   | 5          |
| Bachelor-Arbeit mit Kolloquium (33)        | 15   | 9          |

**Gesamtgewicht (Allg. Variante):** ca. 37 (Summe aller Gewichtungsfaktoren ohne 0)

### JSON-Repräsentation der Regel (BVT):

```json
{
  "regel_typ": "GESAMTNOTE",
  "berechnungsart": "GEWICHTET",
  "formel": "SUM(note * gewichtung) / SUM(gewichtung)",
  "filter": {
    "in_gesamtnote": true,
    "bewertungsart": "NOTE"
  },
  "rundung": {
    "dezimalstellen": 1,
    "methode": "KAUFMAENNISCH"
  }
}
```

---

### Forschung in der Sozialen Arbeit (Master) – Gemischte Berechnung

**Grundlage:** § 9 Bildung der Gesamtnote

```
Gesamtnote = (2 × Note_Thesis + 1 × Modulmittel) / 3
```

**Wobei Modulmittel:**
```
Modulmittel = Arithmetisches Mittel der Module 1, 2, 3, 4, 5, 7, 8
```

**Besonderheiten:**
- Module 6, 9, 10, 11 werden mit "bestanden/nicht bestanden" bewertet und gehen **nicht** in die Berechnung ein
- Master-Thesis (Modul 12) hat Gewichtung 2
- Alle anderen benoteten Module haben gemeinsam Gewichtung 1

**Modulübersicht:**

| Modul | Name                                            | ECTS | In Gesamtnote |
|-------|-------------------------------------------------|------|---------------|
| 1     | Paradigmatische, theoretische... Grundlegung    | 10   | Ja (Mittel)   |
| 2     | Quantitative Forschungsmethoden                 | 10   | Ja (Mittel)   |
| 3     | Statistik I                                     | 5    | Ja (Mittel)   |
| 4     | Qualitativ-rekonstruktive Forschungsmethoden    | 10   | Ja (Mittel)   |
| 5     | Forschungsprojekt (5.1 oder 5.2)                | 30   | Ja (Mittel)   |
| 6     | Aktuelle Forschungen in der Sozialen Arbeit     | 5    | Nein          |
| 7     | Statistik II                                    | 5    | Ja (Mittel)   |
| 8     | Forschungsfelder (8.1, 8.2 oder 8.3)            | 5    | Ja (Mittel)   |
| 9     | Empirische Vertiefung                           | 5    | Nein          |
| 10    | Forschungswerkstatt                             | 5    | Nein          |
| 11    | Forschung beantragen, planen und verwalten      | 5    | Nein          |
| 12    | Master-Thesis mit Kolloquium                    | 25   | Ja (×2)       |

### JSON-Repräsentation der Regel (FSA):

```json
{
  "regel_typ": "GESAMTNOTE",
  "berechnungsart": "ARITHMETISCH_GEMISCHT",
  "formel": "(2 * thesis_note + 1 * modulmittel) / 3",
  "komponenten": {
    "thesis": {
      "modul_nummern": ["12"],
      "gewichtung": 2
    },
    "modulmittel": {
      "modul_nummern": ["1", "2", "3", "4", "5", "7", "8"],
      "berechnung": "ARITHMETISCH",
      "gewichtung": 1
    }
  },
  "ausgeschlossen": {
    "modul_nummern": ["6", "9", "10", "11"],
    "grund": "BESTANDEN_NICHT_BESTANDEN"
  },
  "rundung": {
    "dezimalstellen": 1,
    "methode": "KAUFMAENNISCH"
  }
}
```

---

## Wiederholungsregeln (beide Studiengänge)

| Regel                         | BVT (Bachelor)                       | FSA (Master)                         |
|-------------------------------|--------------------------------------|--------------------------------------|
| Max. Wiederholungen           | 2 (+ 1 Antrag möglich)               | 2 (+ 1 Antrag möglich)               |
| Abschlussarbeit Wiederholung  | 1× (Bachelor-Arbeit)                 | 1× (Master-Thesis)                   |
| Antrag dritte Wiederholung    | Einmalig pro Studiengang beim PA     | Einmalig pro Studiengang beim PA     |

---



*Zuletzt aktualisiert: 31.12.2025*

