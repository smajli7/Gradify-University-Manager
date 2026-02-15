# Schnittstellendokumentation

Abkürzungen in Berechtigungsspalten: `PA` = `PRUEFUNGSAMT`, `HV` = `HOCHSCHUL_VERWALTER`.

## 1. REST-Endpunkte

### 1.1 Auth-Service (Port 8081)

| Methode | Endpunkt | Beschreibung | Auth |
|---------|----------|-------------|------|
| POST | `/api/auth/login` | Benutzer anmelden | Öffentlich |
| POST | `/api/auth/refresh` | Access-Token erneuern | Öffentlich |
| GET | `/api/auth/validate` | Token validieren | JWT |
| GET | `/api/auth/me` | Aktuellen Benutzer aus Token | JWT |
| POST | `/api/auth/logout` | Refresh-Tokens widerrufen | JWT |
| GET | `/api/auth/grpc-status` | gRPC-Verbindungsstatus | Öffentlich |

### 1.2 User-Service (Port 8082)

| Methode | Endpunkt | Beschreibung | Berechtigung |
|---------|----------|-------------|-------------|
| GET | `/api/users` | Alle Benutzer (opt: `mandantId`) | ADMIN |
| GET | `/api/users/{id}` | Einzelner Benutzer | ADMIN |
| GET | `/api/users/username/{benutzername}` | Benutzer nach Benutzername | ADMIN |
| POST | `/api/users` | Benutzer anlegen | ADMIN |
| PUT | `/api/users/{id}` | Benutzer bearbeiten | ADMIN |
| DELETE | `/api/users/{id}` | Benutzer deaktivieren | ADMIN |
| POST | `/api/users/{id}/roles/{roleId}` | Rolle zuweisen | ADMIN |
| DELETE | `/api/users/{id}/roles/{roleId}` | Rolle entziehen | ADMIN |
| GET | `/api/users/roles` | Alle Rollen | ADMIN |
| GET | `/api/users/audit` | Benutzer-Audit-Log | ADMIN |
| GET | `/api/users/export` | CSV-Export | ADMIN |
| GET | `/api/users/import/template` | Import-Vorlage | ADMIN |
| POST | `/api/users/import` | CSV-Import | ADMIN |
| GET | `/api/students` | Alle Studierenden (opt: `mandantId`) | ADMIN, PA, HV |
| GET | `/api/students/{id}` | Einzelner Student | ADMIN, PA, HV |
| GET | `/api/students/matrikel/{nr}` | Student nach Matrikelnummer | ADMIN, PA, HV |
| GET | `/api/students/{id}/exists` | Existenzprüfung | ADMIN, PA, HV |
| POST | `/api/students` | Student anlegen | ADMIN |
| PUT | `/api/students/{id}` | Student bearbeiten | ADMIN |
| DELETE | `/api/students/{id}` | Student exmatrikulieren | ADMIN |

### 1.3 Studiengang-Service (Port 8083)

| Methode | Endpunkt | Beschreibung | Auth |
|---------|----------|-------------|------|
| GET | `/api/mandanten` | Alle aktiven Mandanten | JWT |
| GET | `/api/mandanten/{id}` | Einzelner Mandant | JWT |
| GET | `/api/mandanten/{id}/kuerzel` | Mandant-Kürzel | JWT |
| POST | `/api/mandanten` | Mandant anlegen | JWT |
| GET | `/api/studiengaenge` | Alle Studiengänge (opt: `mandantId`) | JWT |
| GET | `/api/studiengaenge/{id}` | Einzelner Studiengang | JWT |
| GET | `/api/studiengaenge/kuerzel/{k}` | Nach Kürzel | JWT |
| POST | `/api/studiengaenge` | Studiengang anlegen | JWT |
| GET | `/api/studiengaenge/{id}/module` | Module eines Studiengangs | JWT |
| GET | `/api/studiengaenge/{id}/pruefungsordnungen` | POs eines Studiengangs | JWT |
| GET | `/api/studiengaenge/module/{modulId}` | Einzelnes Modul | JWT |
| GET | `/api/studiengaenge/po/{poId}/module` | Module einer PO | JWT |
| GET | `/api/einschreibungen` | Einschreibungen (opt: `studentId`, `studiengangId`) | JWT |
| GET | `/api/einschreibungen/{id}` | Einzelne Einschreibung | JWT |
| POST | `/api/einschreibungen` | Student einschreiben | JWT |
| POST | `/api/einschreibungen/{id}/abschliessen` | Abschließen | JWT |
| POST | `/api/einschreibungen/{id}/abbrechen` | Abbrechen | JWT |
| POST | `/api/einschreibungen/{id}/semester` | Semester erhöhen | JWT |
| POST | `/api/module-zuweisungen` | Dozent → Modul zuweisen | JWT |
| DELETE | `/api/module-zuweisungen` | Zuweisung entfernen | JWT |
| GET | `/api/module-zuweisungen/audit` | Zuweisungs-Audit | JWT |
| POST | `/api/import/studiengaenge` | CSV-Import | JWT |
| GET | `/api/import/template` | Import-Vorlage | JWT |
| GET | `/api/import/export/studiengaenge` | CSV-Export | JWT |

### 1.4 Noten-Service (Port 8084)

| Methode | Endpunkt | Beschreibung | Auth |
|---------|----------|-------------|------|
| GET | `/api/noten` | Noten (opt: `einschreibungId`, `modulId`, `status`) | JWT |
| GET | `/api/noten/{id}` | Einzelne Note | JWT |
| GET | `/api/noten/einschreibung/{id}` | Noten einer Einschreibung | JWT |
| GET | `/api/noten/modul/{modulId}` | Noten eines Moduls | JWT |
| GET | `/api/noten/stats` | Statistiken (opt: `modulIds`) | JWT |
| GET | `/api/noten/gueltige-noten` | Gültige Notenwerte | JWT |
| POST | `/api/noten` | Note erfassen | JWT |
| PUT | `/api/noten/{id}` | Note korrigieren | JWT |
| POST | `/api/noten/{id}/validate` | Note validieren | JWT |
| POST | `/api/noten/{id}/release` | Note freigeben | JWT |
| POST | `/api/noten/{id}/reject` | Note ablehnen | JWT |
| DELETE | `/api/noten/{id}` | Note stornieren | JWT |
| GET | `/api/noten/audit` | Audit-Log (viele Filter) | JWT |
| GET | `/api/noten/export/{id}` | CSV-Export | JWT |

### 1.5 Berechnungs-Service (Port 8085)

| Methode | Endpunkt | Beschreibung | Auth |
|---------|----------|-------------|------|
| GET | `/api/berechnungen/einschreibung/{id}` | Gesamtnote | JWT |
| GET | `/api/berechnungen/einschreibung/{id}/details` | Detailaufschlüsselung | JWT |
| GET | `/api/berechnungen/einschreibung/{id}/fortschritt` | Studienfortschritt | JWT |
| POST | `/api/berechnungen/einschreibung/{id}/berechnen` | Neuberechnung | JWT |
| POST | `/api/berechnungen/berechnen` | Vollständige Berechnung | JWT |
| GET | `/api/berechnungen/statistik/durchschnitt` | Durchschnitt aller Studiengänge | JWT |
| GET | `/api/berechnungen/berechnungsarten` | Verfügbare Formeln | JWT |
| GET | `/api/berechnungen/grpc-status` | gRPC-Status | JWT |

---

## 2. GraphQL-Schema

### 2.1 User-Service (`/graphql/user`)

**Queries:** `users`, `user(id)`, `students`, `student(id)`, `studentByMatrikel(matrikelnummer)`
**Mutations:** `createUser`, `updateUser`, `deleteUser`, `assignRole`, `removeRole`, `createStudent`, `updateStudent`

### 2.2 Studiengang-Service (`/graphql/studiengang`)

**Queries:** `mandanten`, `mandant(id)`, `studiengaenge(mandantId)`, `studiengang(id)`, `studiengangByKuerzel(kuerzel)`, `module(studiengangId, poId)`, `modul(id)`, `dozentenModule(dozentId)`, `einschreibungen(studentId, studiengangId)`, `einschreibung(id)`, `wahlpflichtWahlen(einschreibungId)`
**Mutations:** `setWahlpflichtWahl(einschreibungId, wahlpflichtGruppe, modulId)`

### 2.3 Noten-Service (`/graphql/noten`)

**Queries:** `noten(einschreibungId, modulId)`, `note(id)`, `notenByStudent(einschreibungId)`, `notenByModul(modulId)`, `durchschnittsnote(einschreibungId)`, `bestandeneModule(einschreibungId)`
**Mutations:** `createNote`, `updateNote`, `validateNote`, `releaseNote`, `deleteNote`

---

## 3. gRPC-Schnittstellen

### 3.1 user.proto (User-Service, Port 9082)

| Service | Methode | Aufrufer |
|---------|---------|----------|
| UserValidationService | `ValidateCredentials`, `GetUserById`, `GetUserByUsername` | Auth-Service |
| StudentDataService | `StudentExists`, `GetStudent`, `GetStudentsByIds`, `GetStudentsByStudiengang` | Studiengang-Service |

### 3.2 berechnung.proto (Ports 9083–9085)

| Service | Methode | Implementiert von | Aufrufer |
|---------|---------|------------------|----------|
| RegelwerkService | `GetRegelwerk`, `GetModulGewichtungen`, `GetEinschreibungDetails` | Studiengang-Service | Berechnungs-Service |
| NotenDataService | `GetNotenFuerBerechnung` | Noten-Service | Berechnungs-Service |
| BerechnungsService | `TriggerNeuberechnung`, `GetGesamtnote` | Berechnungs-Service | intern (vom Berechnungs-Service beim Verarbeiten von RabbitMQ-Events genutzt) |

---

## 4. HTTP-Statuscodes

| Code | Bedeutung | Verwendung |
|------|-----------|-----------|
| 200 | OK | Erfolgreiche GET/PUT-Anfrage |
| 201 | Created | Erfolgreiche POST-Anfrage |
| 204 | No Content | Erfolgreiche DELETE-Anfrage |
| 400 | Bad Request | Ungültige Eingabedaten |
| 401 | Unauthorized | Nicht authentifiziert / Token ungültig |
| 403 | Forbidden | Keine Berechtigung |
| 404 | Not Found | Ressource existiert nicht |
| 409 | Conflict | Datenkonflikt (z. B. doppelte Matrikelnummer) |
| 422 | Unprocessable Entity | Validierungsfehler |
| 500 | Internal Server Error | Serverfehler |

---

## 5. Einheitliches Response-Format

Alle Services verwenden `ApiResponse<T>` als Antwortformat:

| Feld | Typ | Beschreibung |
|------|-----|-------------|
| success | boolean | Erfolg der Operation |
| data | T | Nutzdaten |
| message | String | Beschreibung (bei Fehlern) |
| timestamp | DateTime | Zeitpunkt |

