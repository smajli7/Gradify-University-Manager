# User-Service

## 1. Zweck und Funktion

Der User-Service ist die zentrale Verwaltungseinheit für alle Benutzerdaten, Rollen und Studierenden-Stammdaten. Er stellt die einzige Quelle für Benutzerinformationen im gesamten System dar und wird von anderen Services ausschließlich über gRPC abgefragt.

**Technologie:** Spring Boot 3.3.7, Spring Data JPA, Spring for GraphQL, gRPC
**Ports:** 8082 (HTTP), 9082 (gRPC)

---

## 2. Aufgaben

| Aufgabe | Beschreibung |
|---------|-------------|
| Benutzerverwaltung | CRUD-Operationen für Benutzerkonten (Anlegen, Bearbeiten, Soft-Delete) |
| Rollenverwaltung | Zuweisung und Entzug von Rollen an Benutzer |
| Studentenverwaltung | Verwaltung studierendenspezifischer Stammdaten (Matrikelnummer, Status) |
| Mandantenzuordnung | Jeder Benutzer ist einem Mandanten (mandantId) zugeordnet |
| CSV-Import/Export | Massenimport und -export von Benutzerdaten |
| Audit-Log | Protokollierung von Benutzeränderungen (BenutzerHistorie) |

---

## 3. Datenhoheit

| Entität | Tabelle | Attribute |
|---------|---------|-----------|
| Benutzer | `benutzer` | id (Long), benutzername, email, passwortHash, vorname, nachname, mandantId (Long), aktiv, letzterLogin, erstelltAm, aktualisiertAm |
| Student | `studenten` | id (Long), benutzerId (FK → Benutzer, 1:1), matrikelnummer, geburtsdatum, status (AKTIV/BEURLAUBT/EXMATRIKULIERT), erstelltAm |
| Rolle | `rollen` | id (Long), name, beschreibung |
| BenutzerHistorie | `benutzer_historie` | id (Long), benutzerId, benutzername, aenderungsTyp (ERSTELLT/GELOESCHT), geaendertVon, geaendertAm, details |

### Vordefinierte Rollen

| ID | Name | Beschreibung |
|----|------|-------------|
| 1 | ROLE_STUDENT | Studierende |
| 2 | ROLE_LEHRENDER | Lehrende/Dozenten |
| 3 | ROLE_PRUEFUNGSAMT | Prüfungsamt-Mitarbeiter |
| 4 | ROLE_STUDIENGANGLEITUNG | Studiengangsleitung (im Datenmodell vorhanden, derzeit nicht aktiv in Navigation/Guards genutzt) |
| 5 | ROLE_ADMIN | System-Administratoren |
| 6 | ROLE_HOCHSCHUL_VERWALTER | Hochschul-Verwalter (1:1 pro Mandant) |

---

## 4. REST-Endpunkte

### Benutzerverwaltung (`/api/users`)

| Methode | Endpunkt | Beschreibung | Berechtigung |
|---------|----------|-------------|-------------|
| GET | `/api/users` | Alle Benutzer (optional: `mandantId`) | ADMIN |
| GET | `/api/users/{id}` | Einzelner Benutzer | ADMIN |
| GET | `/api/users/username/{benutzername}` | Benutzer nach Benutzername | ADMIN |
| POST | `/api/users` | Benutzer anlegen | ADMIN |
| PUT | `/api/users/{id}` | Benutzer bearbeiten | ADMIN |
| DELETE | `/api/users/{id}` | Benutzer deaktivieren (Soft-Delete) | ADMIN |
| POST | `/api/users/{id}/roles/{roleId}` | Rolle zuweisen | ADMIN |
| DELETE | `/api/users/{id}/roles/{roleId}` | Rolle entziehen | ADMIN |
| GET | `/api/users/roles` | Alle verfügbaren Rollen | ADMIN |
| GET | `/api/users/audit` | Benutzer-Audit-Log (Filter: benutzerId, aenderungsTyp, vonDatum, bisDatum) | ADMIN |
| GET | `/api/users/export` | CSV-Export aller Benutzer | ADMIN |
| GET | `/api/users/import/template` | CSV-Import-Vorlage herunterladen | ADMIN |
| POST | `/api/users/import` | CSV-Import von Benutzern (Multipart-Upload) | ADMIN |

### Studentenverwaltung (`/api/students`)

| Methode | Endpunkt | Beschreibung | Berechtigung |
|---------|----------|-------------|-------------|
| GET | `/api/students` | Alle Studierenden (optional: `mandantId`) | ADMIN, PRUEFUNGSAMT, HOCHSCHUL_VERWALTER |
| GET | `/api/students/{id}` | Einzelner Student | ADMIN, PRUEFUNGSAMT, HOCHSCHUL_VERWALTER |
| GET | `/api/students/matrikel/{matrikelnummer}` | Student nach Matrikelnummer | ADMIN, PRUEFUNGSAMT, HOCHSCHUL_VERWALTER |
| GET | `/api/students/{id}/exists` | Existenzprüfung eines Studenten | ADMIN, PRUEFUNGSAMT, HOCHSCHUL_VERWALTER |
| POST | `/api/students` | Student anlegen (mit `mandantKuerzel`-Parameter) | ADMIN |
| PUT | `/api/students/{id}` | Student bearbeiten | ADMIN |
| DELETE | `/api/students/{id}` | Student exmatrikulieren | ADMIN |

---

## 5. GraphQL-Schema (`/graphql`)

### Queries

| Query | Beschreibung |
|-------|-------------|
| `users: [User!]!` | Alle Benutzer |
| `user(id: ID!): User` | Einzelner Benutzer |
| `students: [Student!]!` | Alle Studierenden |
| `student(id: ID!): Student` | Einzelner Studierender |
| `studentByMatrikel(matrikelnummer: String!): Student` | Student nach Matrikelnummer |

### Mutations

| Mutation | Beschreibung |
|----------|-------------|
| `createUser(input: CreateUserInput!): User!` | Benutzer anlegen |
| `updateUser(id: ID!, input: UpdateUserInput!): User!` | Benutzer bearbeiten |
| `deleteUser(id: ID!): Boolean!` | Benutzer löschen |
| `assignRole(userId: ID!, roleId: ID!): User!` | Rolle zuweisen |
| `removeRole(userId: ID!, roleId: ID!): User!` | Rolle entziehen |
| `createStudent(input: CreateStudentInput!): Student!` | Student anlegen |
| `updateStudent(id: ID!, input: UpdateStudentInput!): Student!` | Student bearbeiten |

### Typen

| Typ | Felder |
|-----|--------|
| User | id, benutzername, email, vorname, nachname, mandantId, aktiv, rollen, student, letzterLogin, erstelltAm |
| Student | id, benutzer, matrikelnummer, vorname, nachname, email, geburtsdatum, status |
| Role | id, name, beschreibung |

---

## 6. gRPC-Schnittstelle (eingehend, Port 9082)

### UserValidationService

| Methode | Request | Response | Aufrufer |
|---------|---------|----------|----------|
| `ValidateCredentials` | benutzername, passwort (Klartext; serverseitiger BCrypt-Vergleich) | valid, userId, roles[], mandantId, vorname, nachname, studentId | Auth-Service |
| `GetUserById` | userId | id, username, email, vorname, nachname, roles[], mandantId, active | Auth-Service |
| `GetUserByUsername` | benutzername | (wie GetUserById) | Auth-Service |

### StudentDataService

| Methode | Request | Response | Aufrufer |
|---------|---------|----------|----------|
| `StudentExists` | studentId | exists, studentId, matrikelnummer | Studiengang-Service |
| `GetStudent` | studentId | id, userId, matrikelnummer, vorname, nachname, status | Studiengang-Service |
| `GetStudentsByIds` | studentIds[] | Liste von StudentResponse | Studiengang-Service |
| `GetStudentsByStudiengang` | studiengangId | Liste von StudentResponse | Studiengang-Service |

---

## 7. Abgrenzung

Der User-Service enthält keine Authentifizierungslogik (Login/Logout), keine Notendaten, keine Studiengangsinformationen und keine Mandantenverwaltung. Er reagiert auf eingehende Anfragen und stellt Benutzerdaten bereit.
