# Schnittstellenentwürfe

Dieses Dokument beschreibt die APIs aller Services: REST-Endpunkte, GraphQL-Schema und gRPC-Methoden.

---

## 1. Auth-Service (REST)

### Endpunkte

| Methode | Endpoint | Beschreibung |
|---------|----------|--------------|
| POST | `/api/auth/login` | Benutzer anmelden |
| POST | `/api/auth/logout` | Session beenden |
| POST | `/api/auth/refresh` | Access-Token erneuern |
| POST | `/api/auth/password-reset` | Passwort-Reset anfordern |
| PUT | `/api/auth/password` | Neues Passwort setzen |

### Login

**Request:**
| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|--------------|
| benutzername | String | Ja | Login-Name oder E-Mail |
| passwort | String | Ja | Passwort im Klartext |

**Response (Erfolg):**
| Feld | Typ | Beschreibung |
|------|-----|--------------|
| accessToken | String | JWT für API-Zugriff (15 Min gültig) |
| refreshToken | String | Token zum Erneuern (7 Tage gültig) |
| expiresIn | Integer | Sekunden bis Ablauf |
| benutzer | Object | Basis-Infos (id, name, rollen) |

**Response (Fehler):**
| HTTP-Code | Bedeutung |
|-----------|-----------|
| 401 | Falsche Zugangsdaten |
| 423 | Account gesperrt |

### Token Refresh

**Request:**
| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|--------------|
| refreshToken | String | Ja | Gültiger Refresh-Token |

**Response:**
| Feld | Typ | Beschreibung |
|------|-----|--------------|
| accessToken | String | Neuer JWT |
| expiresIn | Integer | Sekunden bis Ablauf |

---

## 2. User-Service (REST + GraphQL)

### REST-Endpunkte

| Methode | Endpoint | Beschreibung | Berechtigung |
|---------|----------|--------------|--------------|
| GET | `/api/users` | Alle Benutzer (paginiert) | ADMIN, PRUEFUNGSAMT |
| GET | `/api/users/{id}` | Einzelner Benutzer | ADMIN, selbst |
| POST | `/api/users` | Benutzer anlegen | ADMIN |
| PUT | `/api/users/{id}` | Benutzer bearbeiten | ADMIN, selbst |
| DELETE | `/api/users/{id}` | Benutzer löschen | ADMIN |
| GET | `/api/users/{id}/roles` | Rollen eines Benutzers | ADMIN |
| POST | `/api/users/{id}/roles` | Rolle zuweisen | ADMIN |
| DELETE | `/api/users/{id}/roles/{roleId}` | Rolle entziehen | ADMIN |
| GET | `/api/students` | Alle Studenten | ADMIN, PRUEFUNGSAMT |
| GET | `/api/students/{id}` | Einzelner Student | ADMIN, LEHRENDER, selbst |
| POST | `/api/students` | Student anlegen | ADMIN |
| PUT | `/api/students/{id}` | Student bearbeiten | ADMIN |

### Benutzer anlegen (POST /api/users)

**Request:**
| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|--------------|
| benutzername | String | Ja | Eindeutiger Login-Name |
| email | String | Ja | E-Mail-Adresse |
| passwort | String | Ja | Initiales Passwort |
| vorname | String | Ja | Vorname |
| nachname | String | Ja | Nachname |
| mandantId | UUID | Ja | Zugehöriger Mandant |
| rollen | Array[UUID] | Nein | Rollen-IDs |

**Response:**
| Feld | Typ | Beschreibung |
|------|-----|--------------|
| id | UUID | ID des neuen Benutzers |
| benutzername | String | Login-Name |
| email | String | E-Mail |
| vorname | String | Vorname |
| nachname | String | Nachname |
| aktiv | Boolean | Account-Status |
| erstelltAm | DateTime | Erstellungszeitpunkt |

### Student anlegen (POST /api/students)

**Request:**
| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|--------------|
| benutzerId | UUID | Ja | Verknüpfter Benutzer-Account |
| matrikelnummer | String | Ja | Eindeutige Matrikelnummer |
| geburtsdatum | Date | Ja | Geburtsdatum |

**Response:**
| Feld | Typ | Beschreibung |
|------|-----|--------------|
| id | UUID | Student-ID |
| benutzerId | UUID | Verknüpfter Benutzer |
| matrikelnummer | String | Matrikelnummer |
| vorname | String | Vorname (aus Benutzer) |
| nachname | String | Nachname (aus Benutzer) |
| status | String | AKTIV, BEURLAUBT, EXMATRIKULIERT |

---

## 3. Studiengang-Service (REST + GraphQL)

### REST-Endpunkte

| Methode | Endpoint | Beschreibung | Berechtigung |
|---------|----------|--------------|--------------|
| GET | `/api/mandanten` | Alle Mandanten | Alle |
| POST | `/api/mandanten` | Mandant anlegen | ADMIN |
| GET | `/api/studiengaenge` | Alle Studiengänge | Alle |
| GET | `/api/studiengaenge/{id}` | Einzelner Studiengang | Alle |
| POST | `/api/studiengaenge` | Studiengang anlegen | ADMIN |
| PUT | `/api/studiengaenge/{id}` | Studiengang bearbeiten | ADMIN |
| GET | `/api/studiengaenge/{id}/module` | Module eines Studiengangs | Alle |
| GET | `/api/module` | Alle Module (filterbar) | Alle |
| GET | `/api/module/{id}` | Einzelnes Modul | Alle |
| POST | `/api/module` | Modul anlegen | ADMIN |
| PUT | `/api/module/{id}` | Modul bearbeiten | ADMIN |
| GET | `/api/pruefungsordnungen` | Alle POs | Alle |
| GET | `/api/pruefungsordnungen/{id}` | Einzelne PO mit Regelwerk | Alle |
| POST | `/api/einschreibungen` | Student einschreiben | ADMIN, PRUEFUNGSAMT |
| GET | `/api/einschreibungen` | Einschreibungen (filterbar) | ADMIN, PRUEFUNGSAMT |
| GET | `/api/einschreibungen/{id}` | Einzelne Einschreibung | ADMIN, PRUEFUNGSAMT, selbst |

### Studiengang anlegen (POST /api/studiengaenge)

**Request:**
| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|--------------|
| mandantId | UUID | Ja | Zugehöriger Mandant |
| name | String | Ja | Vollständiger Name |
| kuerzel | String | Ja | Kurzbezeichnung (z.B. "BVT") |
| abschlussart | String | Ja | BACHELOR oder MASTER |
| regelstudienzeit | Integer | Ja | Semester |
| gesamtEcts | Integer | Ja | ECTS-Punkte gesamt |

### Modul anlegen (POST /api/module)

**Request:**
| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|--------------|
| poId | UUID | Ja | Zugehörige Prüfungsordnung |
| modulNr | String | Ja | Modulnummer (z.B. "1", "5.1") |
| name | String | Ja | Modulname |
| ects | Integer | Ja | ECTS-Punkte |
| semester | String | Ja | Fachsemester (z.B. "1", "3-4") |
| pruefungsform | String | Ja | KLAUSUR, HAUSARBEIT, MUENDLICH, PROJEKT |
| bewertungsart | String | Ja | NOTE oder BESTANDEN_NICHT_BESTANDEN |
| gewichtung | Decimal | Ja | Gewichtungsfaktor (0 = nicht in Gesamtnote) |
| modultyp | String | Ja | PFLICHT, WAHLPFLICHT |

### Einschreibung anlegen (POST /api/einschreibungen)

**Request:**
| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|--------------|
| studentId | UUID | Ja | Student-ID |
| studiengangId | UUID | Ja | Studiengang-ID |
| poId | UUID | Ja | Anzuwendende PO-Version |
| studienvariante | String | Nein | ALLGEMEIN (default) oder DUAL |
| immatrikuliertAm | Date | Ja | Immatrikulationsdatum |

**Response:**
| Feld | Typ | Beschreibung |
|------|-----|--------------|
| id | UUID | Einschreibungs-ID |
| student | Object | Student-Kurzinfo |
| studiengang | Object | Studiengang-Kurzinfo |
| poVersion | String | PO-Version |
| aktuellesSemester | Integer | Fachsemester |
| status | String | AKTIV |

---

## 4. Noten-Service (REST + GraphQL)

### REST-Endpunkte

| Methode | Endpoint | Beschreibung | Berechtigung |
|---------|----------|--------------|--------------|
| GET | `/api/noten` | Noten (filterbar) | Je nach Filter |
| GET | `/api/noten/{id}` | Einzelne Note | Betroffene Parteien |
| POST | `/api/noten` | Note erfassen | LEHRENDER |
| PUT | `/api/noten/{id}` | Note korrigieren | LEHRENDER, PRUEFUNGSAMT |
| POST | `/api/noten/{id}/validate` | Note validieren | PRUEFUNGSAMT |
| POST | `/api/noten/{id}/release` | Note freigeben | PRUEFUNGSAMT |
| GET | `/api/noten/student/{studentId}` | Noten eines Studenten | Student selbst, LEHRENDER, PRUEFUNGSAMT |
| GET | `/api/noten/modul/{modulId}` | Noten eines Moduls | LEHRENDER des Moduls, PRUEFUNGSAMT |

### Note erfassen (POST /api/noten)

**Request:**
| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|--------------|
| einschreibungId | UUID | Ja | Einschreibung des Studenten |
| modulId | UUID | Ja | Modul-ID |
| noteWert | Decimal | Bedingt | Notenwert (1.0-5.0), bei benotet |
| bestanden | Boolean | Bedingt | Bei bestanden/nicht bestanden |
| pruefungsdatum | Date | Ja | Prüfungsdatum |
| versuch | Integer | Ja | Prüfungsversuch (1, 2, 3...) |
| kommentar | String | Nein | Optionaler Kommentar |

**Response:**
| Feld | Typ | Beschreibung |
|------|-----|--------------|
| id | UUID | Noten-ID |
| einschreibungId | UUID | Einschreibung |
| modulId | UUID | Modul |
| noteWert | Decimal | Notenwert |
| bestanden | Boolean | Bestanden-Status |
| versuch | Integer | Versuch |
| status | String | ERFASST |
| erfasstVon | UUID | Erfasser-ID |
| erfasstAm | DateTime | Zeitstempel |

### Note validieren (POST /api/noten/{id}/validate)

**Request:**
| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|--------------|
| kommentar | String | Nein | Validierungskommentar |

**Response:**
| Feld | Typ | Beschreibung |
|------|-----|--------------|
| id | UUID | Noten-ID |
| status | String | VALIDIERT |
| validiertVon | UUID | Prüfer-ID |
| validiertAm | DateTime | Zeitstempel |

### Filterparameter für GET /api/noten

| Parameter | Typ | Beschreibung |
|-----------|-----|--------------|
| studentId | UUID | Noten eines bestimmten Studenten |
| modulId | UUID | Noten eines bestimmten Moduls |
| studiengangId | UUID | Noten eines Studiengangs |
| status | String | ERFASST, VALIDIERT, FREIGEGEBEN |
| semester | String | Prüfungssemester (z.B. "WiSe2025") |

---

## 5. Berechnungs-Service (REST + gRPC)

### REST-Endpunkte

| Methode | Endpoint | Beschreibung | Berechtigung |
|---------|----------|--------------|--------------|
| GET | `/api/berechnungen/student/{id}` | Gesamtnote eines Studenten | Student selbst, PRUEFUNGSAMT |
| GET | `/api/berechnungen/student/{id}/details` | Detailaufschlüsselung | Student selbst, PRUEFUNGSAMT |
| GET | `/api/berechnungen/student/{id}/fortschritt` | Studienfortschritt | Student selbst, PRUEFUNGSAMT |
| POST | `/api/berechnungen/student/{id}/refresh` | Neuberechnung erzwingen | PRUEFUNGSAMT |

### Gesamtnote abrufen (GET /api/berechnungen/student/{id})

**Response:**
| Feld | Typ | Beschreibung |
|------|-----|--------------|
| studentId | UUID | Student-ID |
| einschreibungId | UUID | Einschreibung |
| studiengang | String | Studiengangname |
| gesamtnote | Decimal | Berechnete Gesamtnote (gerundet) |
| gesamtnoteRoh | Decimal | Ungerundeter Wert |
| status | String | VORLÄUFIG oder ENDGÜLTIG |
| berechnetAm | DateTime | Zeitpunkt der Berechnung |
| anzahlModuleGesamt | Integer | Module im Studiengang |
| anzahlModuleBestanden | Integer | Bestandene Module |

### Detailaufschlüsselung (GET /api/berechnungen/student/{id}/details)

**Response:**
| Feld | Typ | Beschreibung |
|------|-----|--------------|
| studentId | UUID | Student-ID |
| gesamtnote | Decimal | Gesamtnote |
| berechnungsart | String | GEWICHTET oder ARITHMETISCH_GEMISCHT |
| module | Array | Liste der Module mit Beitrag |

**Module-Element:**
| Feld | Typ | Beschreibung |
|------|-----|--------------|
| modulId | UUID | Modul-ID |
| modulName | String | Modulname |
| note | Decimal | Modulnote |
| gewichtung | Decimal | Gewichtungsfaktor |
| beitragZurGesamtnote | Decimal | Anteil an Gesamtnote |
| inBerechnung | Boolean | In Berechnung einbezogen |

### Studienfortschritt (GET /api/berechnungen/student/{id}/fortschritt)

**Response:**
| Feld | Typ | Beschreibung |
|------|-----|--------------|
| studentId | UUID | Student-ID |
| ectsErreicht | Integer | Erreichte ECTS |
| ectsGesamt | Integer | ECTS im Studiengang |
| fortschrittProzent | Decimal | Fortschritt in % |
| moduleBestanden | Integer | Anzahl bestandener Module |
| moduleOffen | Integer | Noch offene Module |
| moduleNichtBestanden | Integer | Nicht bestandene Module |
| offeneModule | Array | Liste der noch offenen Module |

---

## 6. GraphQL-Schema

### Queries

#### Notenübersicht für Studenten
```
student(id: ID!): Student

type Student {
  id: ID!
  matrikelnummer: String!
  vorname: String!
  nachname: String!
  einschreibungen: [Einschreibung!]!
}

type Einschreibung {
  id: ID!
  studiengang: Studiengang!
  aktuellesSemester: Int!
  status: String!
  noten: [Note!]!
  gesamtnote: Berechnung
}

type Note {
  id: ID!
  modul: Modul!
  noteWert: Float
  bestanden: Boolean
  versuch: Int!
  status: String!
  pruefungsdatum: Date!
}

type Modul {
  id: ID!
  modulNr: String!
  name: String!
  ects: Int!
  gewichtung: Float!
  bewertungsart: String!
}
```

#### Dashboard für Lehrende
```
lehrender(id: ID!): Lehrender

type Lehrender {
  id: ID!
  vorname: String!
  nachname: String!
  zugewieseneModule: [ModulMitNoten!]!
}

type ModulMitNoten {
  modul: Modul!
  studiengang: Studiengang!
  anzahlTeilnehmer: Int!
  notenErfasst: Int!
  notenOffen: Int!
  teilnehmer: [TeilnehmerMitNote!]!
}

type TeilnehmerMitNote {
  student: StudentKurz!
  note: Note
}
```

#### Studiengang mit Modulen
```
studiengang(id: ID!): Studiengang

type Studiengang {
  id: ID!
  name: String!
  kuerzel: String!
  abschlussart: String!
  gesamtEcts: Int!
  regelstudienzeit: Int!
  module: [Modul!]!
  pruefungsordnung: Pruefungsordnung!
}

type Pruefungsordnung {
  id: ID!
  version: String!
  berechnungsart: String!
  regelwerk: JSON
}
```

#### Prüfungsamt Übersicht
```
offeneValidierungen(studiengangId: ID): [NoteZurValidierung!]!

type NoteZurValidierung {
  note: Note!
  student: StudentKurz!
  modul: Modul!
  erfasstVon: BenutzerKurz!
  erfasstAm: DateTime!
}
```

### Mutations

```
# Note erfassen (für Lehrende)
erfasseNote(input: NoteInput!): Note!

# Note validieren (für Prüfungsamt)
validiereNote(noteId: ID!, kommentar: String): Note!

# Note freigeben (für Prüfungsamt)
gebeNoteFrei(noteId: ID!): Note!

input NoteInput {
  einschreibungId: ID!
  modulId: ID!
  noteWert: Float
  bestanden: Boolean
  pruefungsdatum: Date!
  versuch: Int!
  kommentar: String
}
```

---

## 7. gRPC-Schnittstellen

### Auth ↔ User Service

**Service: UserValidation**

| Methode | Request | Response | Beschreibung |
|---------|---------|----------|--------------|
| ValidateCredentials | benutzername, passwortHash | valid, benutzerId, rollen | Zugangsdaten prüfen |
| GetUserById | benutzerId | benutzer (id, name, email, rollen, mandantId) | Benutzerinfos abrufen |

### Noten ↔ Berechnungs-Service

**Service: NotenBerechnung**

| Methode | Request | Response | Beschreibung |
|---------|---------|----------|--------------|
| TriggerNeuberechnung | einschreibungId | success, gesamtnote | Nach Noteneintrag |
| GetNotenFuerBerechnung | einschreibungId | noten[] (modulId, noteWert, gewichtung) | Alle Noten holen |

### Berechnungs ↔ Studiengang-Service

**Service: Regelwerk**

| Methode | Request | Response | Beschreibung |
|---------|---------|----------|--------------|
| GetRegelwerk | poId | berechnungsart, formel, parameter | PO-Regelwerk abrufen |
| GetModulGewichtungen | poId | module[] (modulId, gewichtung, inGesamtnote) | Gewichtungen aller Module |

### Studiengang ↔ User Service

**Service: StudentDaten**

| Methode | Request | Response | Beschreibung |
|---------|---------|----------|--------------|
| GetStudent | studentId | student (id, matrikelnr, vorname, nachname, status) | Studentendaten abrufen |
| GetStudentenByStudiengang | studiengangId | studenten[] | Alle Studenten eines Studiengangs |

---

## 8. HTTP-Statuscodes

Einheitliche Verwendung über alle Services:

| Code | Bedeutung | Wann |
|------|-----------|------|
| 200 | OK | Erfolgreiche GET/PUT-Anfrage |
| 201 | Created | Erfolgreiche POST-Anfrage (neu erstellt) |
| 204 | No Content | Erfolgreiche DELETE-Anfrage |
| 400 | Bad Request | Ungültige Eingabedaten |
| 401 | Unauthorized | Nicht authentifiziert |
| 403 | Forbidden | Keine Berechtigung |
| 404 | Not Found | Ressource existiert nicht |
| 409 | Conflict | Konflikt (z.B. doppelte Matrikelnummer) |
| 422 | Unprocessable Entity | Validierungsfehler |
| 500 | Internal Server Error | Serverfehler |

---

## 9. Fehler-Response Format

Alle Services verwenden dasselbe Fehlerformat:

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| timestamp | DateTime | Fehlerzeitpunkt |
| status | Integer | HTTP-Statuscode |
| error | String | Fehlerkategorie |
| message | String | Lesbare Fehlerbeschreibung |
| path | String | Aufgerufener Pfad |
| details | Array | Detailfehler (bei Validierung) |

**Beispiel Validierungsfehler:**
```
{
  "timestamp": "2025-12-31T14:30:00",
  "status": 422,
  "error": "Validation Error",
  "message": "Eingabedaten ungültig",
  "path": "/api/noten",
  "details": [
    { "field": "noteWert", "message": "Muss zwischen 1.0 und 5.0 liegen" },
    { "field": "versuch", "message": "Darf nicht leer sein" }
  ]
}
```

---

*Zuletzt aktualisiert: 31.12.2025*

