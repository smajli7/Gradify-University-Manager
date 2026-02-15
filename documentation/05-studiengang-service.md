# Studiengang-Service

## 1. Zweck und Funktion

Der Studiengang-Service verwaltet die fachlichen Stammdaten des Systems: Mandanten (Hochschulen), Studiengänge, Prüfungsordnungen mit ihren Berechnungsregelwerken, Module mit Gewichtungen, Einschreibungen von Studierenden, Dozenten-Modul-Zuweisungen sowie Wahlpflichtfachwahlen.

**Technologie:** Spring Boot 3.3.7, Spring Data JPA, Spring for GraphQL, gRPC
**Ports:** 8083 (HTTP), 9083 (gRPC)

---

## 2. Aufgaben

| Aufgabe | Beschreibung |
|---------|-------------|
| Mandantenverwaltung | Anlegen und Abfragen von Hochschulen/Fakultäten als Mandanten |
| Studiengangsverwaltung | Anlegen und Pflegen von Studiengängen mit Abschlussart, ECTS und Studienvariante |
| Prüfungsordnungsverwaltung | Verwaltung von PO-Versionen mit Berechnungsregelwerken (JSON) |
| Modulverwaltung | Pflege von Modulen mit ECTS, Gewichtung, Prüfungsform und Bewertungsart |
| Einschreibungsverwaltung | Zuordnung von Studierenden zu Studiengängen und PO-Versionen |
| Dozenten-Modul-Zuweisungen | Zuordnung von Lehrenden zu Modulen mit Audit-Protokollierung |
| Wahlpflichtfachwahl | Verwaltung der Wahlpflichtfachentscheidungen je Einschreibung |
| CSV-Import/Export | Massenimport und -export von Studiengängen und Modulen |

---

## 3. Datenhoheit

| Entität | Tabelle | Wichtigste Attribute |
|---------|---------|---------------------|
| Mandant | `mandanten` | id (Long), name, kuerzel, aktiv |
| Studiengang | `studiengaenge` | id (Long), mandant (FK), name, kuerzel, abschlussart (BACHELOR/MASTER), regelstudienzeit, gesamtEcts, studienvariante (ALLGEMEIN/DUAL), aktiv |
| Prüfungsordnung | `pruefungsordnungen` | id (Long), studiengang (FK), version, gueltigAb, gueltigBis, berechnungsart (GEWICHTET/ARITHMETISCH_GEMISCHT) |
| Modul | `module` | id (Long), pruefungsordnung (FK), modulNr, name, nameEn, ects, semester, pruefungsform, bewertungsart (NOTE/BESTANDEN_NICHT_BESTANDEN), gewichtung (Decimal), inGesamtnote, modultyp (PFLICHT/WAHLPFLICHT/ZUSATZ), wahlpflichtGruppe |
| PoRegelwerk | `po_regelwerke` | id (Long), pruefungsordnung (FK), regelName, beschreibung, formel, parameterJson (TEXT) |
| Einschreibung | `einschreibungen` | id (Long), studentId, studiengang (FK), pruefungsordnung (FK), studienvariante, immatrikuliertAm, aktuellesSemester, status (AKTIV/ABGESCHLOSSEN/ABGEBROCHEN) |
| ModulZuweisung | `modul_zuweisungen` | id (Long), dozentId, modulId, bemerkung |
| ModulZuweisungHistorie | `modul_zuweisung_historie` | id (Long), dozentId, modulId, geaendertVon, aenderungsTyp, kommentar, geaendertAm |
| WahlpflichtWahl | `wahlpflicht_wahlen` | id (Long), einschreibungId, wahlpflichtGruppe, modulId, erstelltAm |

---

## 4. REST-Endpunkte

### Studiengänge (`/api/studiengaenge`)

| Methode | Endpunkt | Beschreibung |
|---------|----------|-------------|
| GET | `/api/studiengaenge` | Alle Studiengänge (optional: `mandantId`) |
| GET | `/api/studiengaenge/{id}` | Einzelner Studiengang |
| GET | `/api/studiengaenge/kuerzel/{kuerzel}` | Studiengang nach Kürzel |
| POST | `/api/studiengaenge` | Studiengang anlegen |
| GET | `/api/studiengaenge/{id}/module` | Module eines Studiengangs |
| GET | `/api/studiengaenge/{id}/pruefungsordnungen` | Prüfungsordnungen eines Studiengangs |
| GET | `/api/studiengaenge/module/{modulId}` | Einzelnes Modul nach ID |
| GET | `/api/studiengaenge/po/{poId}/module` | Module einer Prüfungsordnung |

### Mandanten (`/api/mandanten`)

| Methode | Endpunkt | Beschreibung |
|---------|----------|-------------|
| GET | `/api/mandanten` | Alle aktiven Mandanten |
| GET | `/api/mandanten/{id}` | Einzelner Mandant |
| GET | `/api/mandanten/{id}/kuerzel` | Kürzel eines Mandanten |
| POST | `/api/mandanten` | Mandant anlegen (löst Tenant-Provisioning aus) |

### Einschreibungen (`/api/einschreibungen`)

| Methode | Endpunkt | Beschreibung |
|---------|----------|-------------|
| GET | `/api/einschreibungen` | Alle Einschreibungen (optional: `studentId`, `studiengangId`) |
| GET | `/api/einschreibungen/{id}` | Einzelne Einschreibung |
| POST | `/api/einschreibungen` | Student einschreiben |
| POST | `/api/einschreibungen/{id}/abschliessen` | Einschreibung abschließen |
| POST | `/api/einschreibungen/{id}/abbrechen` | Einschreibung abbrechen |
| POST | `/api/einschreibungen/{id}/semester` | Fachsemester erhöhen |

### Modul-Zuweisungen (`/api/module-zuweisungen`)

| Methode | Endpunkt | Beschreibung |
|---------|----------|-------------|
| POST | `/api/module-zuweisungen` | Dozent einem Modul zuweisen |
| DELETE | `/api/module-zuweisungen` | Zuweisung entfernen (Parameter: `dozentId`, `modulId`) |
| GET | `/api/module-zuweisungen/audit` | Audit-Log der Zuweisungen |

### Import/Export (`/api/import`)

| Methode | Endpunkt | Beschreibung |
|---------|----------|-------------|
| POST | `/api/import/studiengaenge` | CSV-Import (Multipart mit `mandantId`) |
| GET | `/api/import/template` | CSV-Vorlage herunterladen |
| GET | `/api/import/export/studiengaenge` | CSV-Export (Parameter: `mandantId`) |

---

## 5. GraphQL-Schema (`/graphql`)

### Queries

| Query | Beschreibung |
|-------|-------------|
| `mandanten: [Mandant!]!` | Alle Mandanten |
| `mandant(id: ID!): Mandant` | Einzelner Mandant |
| `studiengaenge(mandantId: ID): [Studiengang!]!` | Studiengänge (optional nach Mandant) |
| `studiengang(id: ID!): Studiengang` | Einzelner Studiengang mit Modulen |
| `studiengangByKuerzel(kuerzel: String!): Studiengang` | Studiengang nach Kürzel |
| `module(studiengangId: ID, poId: ID): [Modul!]!` | Module (filterbar) |
| `modul(id: ID!): Modul` | Einzelnes Modul |
| `dozentenModule(dozentId: ID!): [Modul!]!` | Module eines Dozenten |
| `einschreibungen(studentId: ID, studiengangId: ID): [Einschreibung!]!` | Einschreibungen (filterbar) |
| `einschreibung(id: ID!): Einschreibung` | Einzelne Einschreibung |
| `wahlpflichtWahlen(einschreibungId: ID!): [WahlpflichtWahl!]!` | Wahlpflichtfachwahlen |

### Mutations

| Mutation | Beschreibung |
|----------|-------------|
| `setWahlpflichtWahl(einschreibungId: ID!, wahlpflichtGruppe: String!, modulId: ID!): WahlpflichtWahl!` | Wahlpflichtfach wählen |

---

## 6. gRPC-Schnittstellen

### Eingehend (RegelwerkService, Port 9083)

| Methode | Request | Response | Aufrufer |
|---------|---------|----------|----------|
| `GetRegelwerk` | poId | berechnungsart, formel, parameter (JSON) | Berechnungs-Service |
| `GetModulGewichtungen` | poId | Liste von Modulen (modulId, name, gewichtung, inGesamtnote) | Berechnungs-Service |
| `GetEinschreibungDetails` | einschreibungId | poId, studiengangKuerzel, berechnungsart, ectsGesamt | Berechnungs-Service |

### Ausgehend (StudentDataService zum User-Service, Port 9082)

| Methode | Beschreibung |
|---------|-------------|
| `StudentExists` | Prüft ob ein Student existiert |
| `GetStudent` | Lädt Studentendaten |
| `GetStudentsByIds` | Lädt mehrere Studenten anhand ihrer IDs |

---

## 7. Multi-Tenancy

Der Service implementiert mandantenspezifisches Datenbank-Routing über `DynamicTenantRoutingDataSource`. Der Tenant-Kontext wird aus dem JWT-Token extrahiert (`TenantContextFilter`). Konfigurierte Mandanten: `1:thm, 2:gu`. Neue Mandanten können zur Laufzeit über die zentrale Tenant-Registry hinzugefügt werden, ohne Neustart.
