# Auth-Service

## 1. Zweck und Funktion

Der Auth-Service ist ausschließlich für die Authentifizierung zuständig. Er verwaltet den Login-Prozess, die JWT-Token-Generierung und -Validierung sowie das Refresh-Token-Management. Die Autorisierung (Rollenprüfung) erfolgt dezentral in den einzelnen Services über Spring Security.

**Technologie:** Spring Boot 3.3.7, Spring Security, jjwt (HMAC-SHA256)
**Port:** 8081

---

## 2. Authentifizierungsablauf

```
┌──────────┐     POST /api/auth/login     ┌──────────────┐    gRPC     ┌──────────────┐
│  Client  │ ──────────────────────────▶  │ Auth-Service │ ─────────▶ │ User-Service │
│(Frontend)│                               │   (8081)     │            │   (9082)     │
│          │ ◀────── JWT + Refresh ──────  │              │ ◀───────── │ (Validierung)│
└──────────┘                               └──────────────┘            └──────────────┘
```

1. Der Client sendet Benutzername und Passwort an den Auth-Service.
2. Der Auth-Service fragt den User-Service per gRPC (`ValidateCredentials`) ab, ob die Zugangsdaten korrekt sind.
3. Bei erfolgreicher Validierung generiert der Auth-Service einen JWT Access-Token und einen Refresh-Token.
4. Der Refresh-Token wird in der Datenbank persistiert. Der Login-Versuch wird protokolliert.
5. Access-Token und Refresh-Token werden an den Client zurückgegeben.

---

## 3. JWT-Konfiguration

| Parameter | Wert |
|-----------|------|
| Signaturalgorithmus | HMAC-SHA256 |
| Access-Token-Gültigkeit | 10.800.000 ms (3 Stunden) |
| Refresh-Token-Gültigkeit | 604.800.000 ms (7 Tage) |

### Access-Token-Claims

| Claim | Beschreibung |
|-------|-------------|
| `sub` | Benutzer-ID (Long) |
| `name` | Vollständiger Name |
| `roles` | Array der zugewiesenen Rollen |
| `mandantId` | Mandanten-ID für Multi-Tenancy |
| `exp` | Ablaufzeitpunkt (Unix-Timestamp) |

---

## 4. REST-Endpunkte

| Methode | Endpunkt | Beschreibung | Authentifizierung |
|---------|----------|-------------|-------------------|
| POST | `/api/auth/login` | Benutzer anmelden (gibt Access-Token, Refresh-Token, Benutzerinfo zurück) | Öffentlich |
| POST | `/api/auth/refresh` | Access-Token erneuern (erwartet Refresh-Token im Body) | Öffentlich |
| GET | `/api/auth/validate` | Token-Gültigkeit prüfen | Authentifiziert |
| GET | `/api/auth/me` | Aktuellen Benutzer aus Token auslesen | Authentifiziert |
| POST | `/api/auth/logout` | Alle Refresh-Tokens des Benutzers widerrufen | Authentifiziert |
| GET | `/api/auth/grpc-status` | gRPC-Verbindungsstatus zum User-Service | Öffentlich |

### Login-Response

Die Login-Response enthält: `accessToken`, `refreshToken`, `expiresIn` (Sekunden) sowie ein `user`-Objekt mit `id`, `username`, `vorname`, `nachname`, `roles[]`, `studentId` und `mandantId`.

---

## 5. Datenhoheit

| Entität | Tabelle | Attribute |
|---------|---------|-----------|
| RefreshToken | `refresh_tokens` | id (Long), benutzerId, token, gueltigBis, widerrufen, ipAdresse, userAgent, erstelltAm, widerrufenAm |
| LoginVersuch | `login_versuche` | id (Long), benutzername, ipAdresse, erfolgreich, fehlergrund, zeitpunkt |
| TenantRegistry | `tenant_registry` | Zentrale Verwaltung registrierter Mandanten |

---

## 6. gRPC-Client (ausgehend zum User-Service, Port 9082)

| Methode | Beschreibung |
|---------|-------------|
| `ValidateCredentials` | Prüft Benutzername und Passwort; gibt userId, Rollen, mandantId, studentId zurück |
| `GetUserById` | Lädt Benutzerdaten anhand der ID |
| `GetUserByUsername` | Lädt Benutzerdaten anhand des Benutzernamens |

---

## 7. Security-Konfiguration

Alle Endpunkte unter `/api/auth/**` sind öffentlich zugänglich. Swagger-UI (`/swagger-ui/**`) und Actuator (`/actuator/**`) sind ebenfalls ohne Authentifizierung erreichbar. Alle sonstigen Pfade erfordern einen gültigen JWT-Token.

---

## 8. Abgrenzung

Der Auth-Service führt keine Benutzerverwaltung durch (kein Anlegen, Löschen oder Bearbeiten von Benutzerkonten). Er enthält keine Rollendefinitionen – er liest die Rollen des Benutzers per gRPC aus dem User-Service aus und kodiert sie in den JWT.
