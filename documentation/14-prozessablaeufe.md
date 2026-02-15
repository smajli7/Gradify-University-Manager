# Prozessabläufe (Sequenzdarstellungen)

## 1. Ziel

Dieses Dokument beschreibt die zentralen End-to-End-Prozessabläufe des Systems in sequenzieller Form. Dadurch werden Service-Interaktionen, Zustandsübergänge und technische Verantwortlichkeiten nachvollziehbar dokumentiert.

---

## 2. Login und Token-Ausgabe

```text
Client -> API-Gateway: POST /api/auth/login
API-Gateway -> Auth-Service: /api/auth/login
Auth-Service -> User-Service (gRPC): ValidateCredentials
User-Service --> Auth-Service: valid, userId, roles, mandantId
Auth-Service --> API-Gateway: accessToken + refreshToken
API-Gateway --> Client: 200 OK (JWT-Daten)
```

### Fachliche Einordnung

- Das Gateway ist der einzige externe Eintrittspunkt.
- Die Zugangsdatenprüfung erfolgt ausschließlich im User-Service über gRPC.
- Der Auth-Service kapselt Token-Ausgabe, Ablaufzeiten und Refresh-Token-Verwaltung.

---

## 3. Notenänderung mit automatischer Neuberechnung

```text
Lehrender -> Frontend: Note erfassen/ändern
Frontend -> API-Gateway: POST/PUT /api/noten
API-Gateway -> Noten-Service: Request weiterleiten
Noten-Service -> RabbitMQ: note.created/note.updated Event
RabbitMQ -> Berechnungs-Service: Event zustellen
Berechnungs-Service -> Studiengang-Service (gRPC): GetRegelwerk/GetEinschreibungDetails
Berechnungs-Service -> Noten-Service (gRPC): GetNotenFuerBerechnung
Berechnungs-Service -> DB: Berechnungsergebnis + ModulBerechnung speichern
```

### Fachliche Einordnung

- Notenverwaltung und Berechnungslogik bleiben technisch entkoppelt.
- Die Gesamtnote wird ereignisgesteuert aktualisiert, ohne manuelle Folgeschritte.
- Die Berechnungsgrundlage (Regelwerk/Gewichtungen) wird zur Laufzeit über gRPC geladen.

---

## 4. Notenvalidierung und Freigabe

```text
Prüfungsamt -> Frontend: Validierung/Freigabe auslösen
Frontend -> API-Gateway: POST /api/noten/{id}/validate|release|reject
API-Gateway -> Noten-Service: Request weiterleiten
Noten-Service -> DB: Statuswechsel + Historieneintrag
Noten-Service -> RabbitMQ: note.validated / note.released Event
RabbitMQ -> Berechnungs-Service: Neuberechnung bei relevanten Events
```

### Fachliche Einordnung

- Der Notenstatus wird als fachlicher Workflow geführt (ERFASST, VALIDIERT, FREIGEGEBEN).
- Jede Statusänderung wird revisionssicher in der Notenhistorie protokolliert.
- Rechenstände bleiben konsistent, weil Freigabe- und Änderungsereignisse nachgelagert verarbeitet werden.
