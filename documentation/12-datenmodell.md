# Datenmodell

## 1. Übersicht

Das Datenmodell des Gradify-Systems ist auf die sechs Microservices verteilt. Jeder Service besitzt die alleinige Schreibhoheit über seine Entitäten. Alle Primärschlüssel sind vom Typ `Long` (BIGSERIAL). Die folgende Darstellung zeigt die logischen Beziehungen über Servicegrenzen hinweg.

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     Mandant     │◄──1:n─│   Studiengang   │──1:1──│ Prüfungsordnung │
└─────────────────┘       └────────┬────────┘       └────────┬────────┘
                                   │                         │
                                   │ n:m                     │ 1:n
                                   │                         │
                          ┌────────▼────────┐       ┌────────▼────────┐
                          │     Student     │       │      Modul      │
                          └────────┬────────┘       └────────┬────────┘
                                   │                         │
                                   │ 1:n                     │ 1:n
                                   │                         │
                          ┌────────▼────────┐       ┌────────▼────────┐
                          │  Einschreibung  │       │  PO-Regelwerk   │
                          └────────┬────────┘       └─────────────────┘
                                   │
                                   │ 1:n
                                   │
                          ┌────────▼────────┐
                          │      Note       │
                          └─────────────────┘

┌─────────────────┐       ┌─────────────────┐
│    Benutzer     │──n:m──│      Rolle      │
└─────────────────┘       └─────────────────┘
```

---

## 2. Auth-Service (gradify_auth)

### RefreshToken

| Attribut | Typ | Beschreibung |
|----------|-----|-------------|
| id | Long | Primärschlüssel |
| benutzerId | Long | Benutzer-Referenz |
| token | String(500) | Token-Wert (unique) |
| gueltigBis | LocalDateTime | Ablaufzeitpunkt |
| widerrufen | boolean | Widerrufen-Status |
| ipAdresse | String(45) | IP-Adresse bei Erstellung |
| userAgent | String(200) | Browser-/Client-Information |
| erstelltAm | LocalDateTime | Erstellungszeitpunkt |
| widerrufenAm | LocalDateTime | Zeitpunkt des Widerrufs |

### LoginVersuch

| Attribut | Typ | Beschreibung |
|----------|-----|-------------|
| id | Long | Primärschlüssel |
| benutzername | String(100) | Verwendeter Login-Name |
| ipAdresse | String(45) | IP-Adresse |
| erfolgreich | boolean | Ergebnis des Login-Versuchs |
| fehlergrund | String(200) | Fehlergrund bei Misserfolg |
| zeitpunkt | LocalDateTime | Zeitpunkt |

---

## 3. User-Service (gradify_user)

### Benutzer

| Attribut | Typ | Beschreibung |
|----------|-----|-------------|
| id | Long | Primärschlüssel |
| benutzername | String(50) | Eindeutiger Login-Name |
| email | String(100) | E-Mail-Adresse (unique) |
| passwortHash | String | BCrypt-gehashtes Passwort |
| vorname | String(50) | Vorname |
| nachname | String(50) | Nachname |
| mandantId | Long | Zugehöriger Mandant |
| aktiv | boolean | Account-Status (Soft-Delete) |
| rollen | Set\<Rolle\> | n:m-Beziehung (EAGER) |
| student | Student | 1:1-Beziehung (optional) |
| letzterLogin | LocalDateTime | Letzter Login |
| erstelltAm | LocalDateTime | Erstellungszeitpunkt |

### Student

| Attribut | Typ | Beschreibung |
|----------|-----|-------------|
| id | Long | Primärschlüssel |
| benutzer | Benutzer (FK) | 1:1-Beziehung |
| matrikelnummer | String(20) | Eindeutige Matrikelnummer |
| geburtsdatum | LocalDate | Geburtsdatum |
| status | Enum | AKTIV, BEURLAUBT, EXMATRIKULIERT |

### Rolle

| Attribut | Typ | Beschreibung |
|----------|-----|-------------|
| id | Long | Primärschlüssel |
| name | String(50) | Rollenname (unique) |
| beschreibung | String(200) | Beschreibung |

**Vordefinierte Rollen:**

| ID | Name | Beschreibung |
|----|------|-------------|
| 1 | ROLE_STUDENT | Studierende |
| 2 | ROLE_LEHRENDER | Lehrende/Dozenten |
| 3 | ROLE_PRUEFUNGSAMT | Prüfungsamt-Mitarbeiter |
| 4 | ROLE_STUDIENGANGLEITUNG | Studiengangsleitung (im Datenmodell vorhanden, aktuell nicht aktiv in Navigation/Guards genutzt) |
| 5 | ROLE_ADMIN | System-Administratoren |
| 6 | ROLE_HOCHSCHUL_VERWALTER | Hochschul-Verwalter |

### BenutzerHistorie

| Attribut | Typ | Beschreibung |
|----------|-----|-------------|
| id | Long | Primärschlüssel |
| benutzerId | Long | Betroffener Benutzer |
| benutzername | String | Benutzername zum Zeitpunkt |
| aenderungsTyp | Enum | ERSTELLT, GELOESCHT |
| geaendertVon | Long | Ändernder Benutzer |
| geaendertAm | LocalDateTime | Änderungszeitpunkt |
| details | String(1000) | Zusätzliche Details |

---

## 4. Studiengang-Service (gradify_studiengang)

### Mandant

| Attribut | Typ | Beschreibung |
|----------|-----|-------------|
| id | Long | Primärschlüssel |
| name | String(100) | Name der Hochschule/Fakultät |
| kuerzel | String(10) | Kurzbezeichnung (unique, z. B. „THM") |
| aktiv | boolean | Mandant aktiv/inaktiv |

### Studiengang

| Attribut | Typ | Beschreibung |
|----------|-----|-------------|
| id | Long | Primärschlüssel |
| mandant | Mandant (FK) | Zugehöriger Mandant |
| name | String(150) | Vollständiger Name |
| kuerzel | String(20) | Kurzbezeichnung (unique, z. B. „BVT") |
| abschlussart | Enum | BACHELOR, MASTER |
| regelstudienzeit | int | Semester |
| gesamtEcts | int | ECTS gesamt |
| studienvariante | Enum | ALLGEMEIN, DUAL |
| aktiv | boolean | Studiengang aktiv |
| aktuellePo | Prüfungsordnung (FK) | Aktive PO (1:1) |

### Prüfungsordnung

| Attribut | Typ | Beschreibung |
|----------|-----|-------------|
| id | Long | Primärschlüssel |
| studiengang | Studiengang (FK) | Zugehöriger Studiengang |
| version | String(20) | Versionsnummer |
| gueltigAb | LocalDate | Gültigkeitsbeginn |
| gueltigBis | LocalDate | Gültigkeitsende (null = aktuell) |
| berechnungsart | Enum | GEWICHTET, ARITHMETISCH_GEMISCHT |

### Modul

| Attribut | Typ | Beschreibung |
|----------|-----|-------------|
| id | Long | Primärschlüssel |
| pruefungsordnung | PO (FK) | Zugehörige PO |
| modulNr | String(10) | Modulnummer (z. B. „1", „5.1") |
| name | String(200) | Modulname |
| nameEn | String(200) | Englischer Name (optional) |
| ects | int | ECTS-Punkte |
| semester | String(10) | Fachsemester |
| pruefungsform | Enum | KLAUSUR, HAUSARBEIT, MUENDLICH, PROJEKT, PORTFOLIO, PRAESENTATION, PRAXISBERICHT |
| bewertungsart | Enum | NOTE, BESTANDEN_NICHT_BESTANDEN |
| gewichtung | Decimal(3,1) | Gewichtungsfaktor (0 = nicht in Gesamtnote) |
| inGesamtnote | boolean | In Gesamtnote einbezogen |
| modultyp | Enum | PFLICHT, WAHLPFLICHT, ZUSATZ |
| wahlpflichtGruppe | String(20) | Wahlpflichtgruppe (z. B. „5", „8") |

### Einschreibung

| Attribut | Typ | Beschreibung |
|----------|-----|-------------|
| id | Long | Primärschlüssel |
| studentId | Long | Student-Referenz |
| studiengang | Studiengang (FK) | Zugehöriger Studiengang |
| pruefungsordnung | PO (FK) | Angewandte PO |
| studienvariante | Enum | ALLGEMEIN, DUAL |
| immatrikuliertAm | LocalDate | Immatrikulationsdatum |
| aktuellesSemester | int | Aktuelles Fachsemester |
| status | Enum | AKTIV, ABGESCHLOSSEN, ABGEBROCHEN |

---

## 5. Noten-Service (gradify_noten)

### Note

| Attribut | Typ | Beschreibung |
|----------|-----|-------------|
| id | Long | Primärschlüssel |
| einschreibungId | Long | Einschreibungs-Referenz |
| modulId | Long | Modul-Referenz |
| erfasstVon | Long | Erfassender Benutzer |
| noteWert | Decimal(2,1) | Notenwert (1,0–5,0) oder null |
| bestanden | Boolean | Bei bestanden/nicht bestanden |
| versuch | int | Prüfungsversuch (Standard: 1) |
| pruefungsdatum | LocalDate | Prüfungsdatum |
| status | Enum | ERFASST, VALIDIERT, FREIGEGEBEN |
| kommentar | String(500) | Optionaler Kommentar |
| erfasstAm | LocalDateTime | Erfassungszeitpunkt |
| validiertAm | LocalDateTime | Validierungszeitpunkt |
| validiertVon | Long | Validierender Benutzer |

### NotenHistorie (Audit-Log)

| Attribut | Typ | Beschreibung |
|----------|-----|-------------|
| id | Long | Primärschlüssel |
| noteId | Long | Betroffene Note |
| einschreibungId | Long | Einschreibungs-Referenz |
| modulId | Long | Modul-Referenz |
| geaendertVon | Long | Ändernder Benutzer |
| aenderungsTyp | Enum | ERSTELLT, NOTE_GEAENDERT, VALIDIERT, FREIGEGEBEN, FREIGABE_ZURUECKGENOMMEN, STORNIERT |
| alterWert | Decimal(2,1) | Vorheriger Notenwert |
| neuerWert | Decimal(2,1) | Neuer Notenwert |
| kommentar | String(500) | Kommentar |
| geaendertAm | LocalDateTime | Änderungszeitpunkt |

---

## 6. Berechnungs-Service (gradify_berechnung)

### Berechnungsergebnis

| Attribut | Typ | Beschreibung |
|----------|-----|-------------|
| id | Long | Primärschlüssel |
| einschreibungId | Long | Einschreibungs-Referenz (unique) |
| gesamtnote | Decimal(2,1) | Gerundete Gesamtnote |
| gesamtnoteRoh | Decimal(4,3) | Ungerundeter Wert |
| status | Enum | VORLAEUFIG, ENDGUELTIG |
| moduleBestanden | int | Anzahl bestandener Module |
| moduleGesamt | int | Gesamtzahl Module |
| ectsErreicht | int | Erreichte ECTS |
| ectsGesamt | int | ECTS des Studiengangs |
| erstelltAm | LocalDateTime | Erstellungszeitpunkt |
| berechnetAm | LocalDateTime | Letzte Berechnung |

### ModulBerechnung

| Attribut | Typ | Beschreibung |
|----------|-----|-------------|
| id | Long | Primärschlüssel |
| berechnungsergebnis | FK | Zugehöriges Ergebnis |
| modulId | Long | Modul-Referenz |
| modulNr | String(10) | Modulnummer |
| modulName | String(200) | Modulname |
| note | Decimal(2,1) | Modulnote |
| gewichtung | Decimal(3,1) | Gewichtungsfaktor |
| inGesamtnote | boolean | In Berechnung einbezogen |
| bestanden | boolean | Modul bestanden |
| ects | int | ECTS des Moduls |
| gewichteterBeitrag | Decimal(4,3) | Beitrag zur Gesamtnote |

---

## 7. Notenskala

| Note | Prädikat |
|------|----------|
| 1,0 / 1,3 | sehr gut |
| 1,7 / 2,0 / 2,3 | gut |
| 2,7 / 3,0 / 3,3 | befriedigend |
| 3,7 / 4,0 | ausreichend |
| 5,0 | nicht ausreichend |

Eine Modulprüfung gilt als bestanden bei Note ≤ 4,0.
