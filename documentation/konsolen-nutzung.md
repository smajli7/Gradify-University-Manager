# Konsolen-Nutzung – System ohne Grafische Oberfläche

Das Gradify-System kann vollständig über die Konsole (PowerShell, curl, grpcurl, GraphiQL) genutzt werden. Angular ist optional.

---

## Übersicht: Was ist eingebaut?

| Schnittstelle | Protokoll | Nutzung | Authentifizierung |
|---------------|-----------|---------|-------------------|
| **REST API** | HTTP/JSON | curl, wget, Postman | Bearer Token (JWT) |
| **GraphQL** | HTTP/JSON | curl, GraphiQL UI, Postman | Bearer Token |
| **Swagger UI** | Web | Browser (interaktiv) | Optional Token |
| **gRPC** | HTTP/2 | grpcurl (Service-zu-Service) | Keine (intern) |
| **Actuator** | HTTP | curl | Keine (Health) |
| **CSV Import/Export** | HTTP | curl, Datei-Upload | Bearer Token |

---

## 1. REST API (curl)

**Basis-URL über API-Gateway:** `http://localhost:8080`  
(Direkt bei Services: 8081 Auth, 8082 User, 8083 Studiengang, 8084 Noten, 8085 Berechnung)

### Login und Token

```powershell
# Login (Credentials: admin/admin123 oder aus data.sql)
$login = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" `
  -Method POST -ContentType "application/json" `
  -Body '{"username":"admin","password":"admin123"}'

$token = $login.data.accessToken
Write-Host "Token: $token"
```

### Beispiele mit Token

```powershell
$headers = @{ "Authorization" = "Bearer $token" }

# Mandanten
Invoke-RestMethod -Uri "http://localhost:8080/api/mandanten" -Headers $headers

# Studiengänge
Invoke-RestMethod -Uri "http://localhost:8080/api/studiengaenge" -Headers $headers

# Einschreibungen
Invoke-RestMethod -Uri "http://localhost:8080/api/einschreibungen" -Headers $headers

# Noten einer Einschreibung
Invoke-RestMethod -Uri "http://localhost:8080/api/noten/einschreibung/1" -Headers $headers

# Gesamtnote berechnen
Invoke-RestMethod -Uri "http://localhost:8080/api/berechnungen/einschreibung/1/berechnen" `
  -Method POST -Headers $headers

# Berechnung abrufen
Invoke-RestMethod -Uri "http://localhost:8080/api/berechnungen/einschreibung/1" -Headers $headers

# Benutzer (Admin)
Invoke-RestMethod -Uri "http://localhost:8080/api/users" -Headers $headers

# Studenten
Invoke-RestMethod -Uri "http://localhost:8080/api/students" -Headers $headers
```

### curl (Bash/Linux)

```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.data.accessToken')

# Mandanten
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/mandanten | jq

# Studiengänge
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/studiengaenge | jq
```

---

## 2. GraphQL

**Endpunkte über Gateway:**
- User: `http://localhost:8080/graphql/user`
- Studiengang: `http://localhost:8080/graphql/studiengang`
- Noten: `http://localhost:8080/graphql/noten`

### GraphiQL (Browser – keine Konsole, aber kein Angular)

Öffne im Browser:
- http://localhost:8082/graphiql (User, direkt)
- http://localhost:8083/graphiql (Studiengang)
- http://localhost:8084/graphiql (Noten)

### GraphQL per curl

```powershell
$headers = @{
  "Authorization" = "Bearer $token"
  "Content-Type"  = "application/json"
}

# Studenten
$query = '{"query":"{ students { id matrikelnummer vorname nachname } }"}'
Invoke-RestMethod -Uri "http://localhost:8080/graphql/user" -Method POST -Headers $headers -Body $query

# Einschreibungen
$query = '{"query":"{ einschreibungen { id status student { vorname nachname } studiengang { name } } }"}'
Invoke-RestMethod -Uri "http://localhost:8080/graphql/studiengang" -Method POST -Headers $headers -Body $query

# Noten
$query = '{"query":"{ notenByEinschreibung(einschreibungId: 1) { noteWert bestanden modul { name } } }"}'
Invoke-RestMethod -Uri "http://localhost:8080/graphql/noten" -Method POST -Headers $headers -Body $query
```

---

## 3. Swagger UI (interaktive REST-Doku)

Jeder Service hat Swagger UI – im Browser, ohne Angular:

| Service | URL |
|---------|-----|
| Auth | http://localhost:8081/swagger-ui.html |
| User | http://localhost:8082/swagger-ui.html |
| Studiengang | http://localhost:8083/swagger-ui.html |
| Noten | http://localhost:8084/swagger-ui.html |
| Berechnung | http://localhost:8085/swagger-ui.html |

- Endpoints durchklicken
- "Try it out" → Parameter eintragen → Execute
- Für geschützte Endpoints: "Authorize" → `Bearer <token>`

---

## 4. gRPC (grpcurl)

**Hinweis:** gRPC läuft Service-zu-Service (Berechnung ↔ Noten, Berechnung ↔ Studiengang, Auth ↔ User). Für Konsolen-Debug:

```bash
# grpcurl installieren: https://github.com/fullstorydev/grpcurl

# Noten-Service (Port 9084)
grpcurl -plaintext localhost:9084 list

# Regelwerk abrufen (Studiengang-Service Port 9083)
grpcurl -plaintext -d '{"poId": 1}' localhost:9083 berechnung.RegelwerkService/GetRegelwerk

# Modul-Gewichtungen
grpcurl -plaintext -d '{"poId": 1}' localhost:9083 berechnung.RegelwerkService/GetModulGewichtungen
```

gRPC-Ports: User 9082, Studiengang 9083, Noten 9084, Berechnung 9085.

---

## 5. Actuator / Health

```powershell
# Health aller Services
Invoke-RestMethod http://localhost:8080/actuator/health
Invoke-RestMethod http://localhost:8081/actuator/health
Invoke-RestMethod http://localhost:8082/actuator/health
# ...
```

---

## 6. CSV Import/Export

### Export

```powershell
# Benutzer export
Invoke-WebRequest -Uri "http://localhost:8080/api/users/export" -Headers $headers -OutFile users.csv

# Noten einer Einschreibung
Invoke-WebRequest -Uri "http://localhost:8080/api/noten/export/1" -Headers $headers -OutFile noten.csv

# Studiengänge (Import-Template)
Invoke-WebRequest -Uri "http://localhost:8080/api/import/template" -Headers $headers -OutFile studiengaenge_template.csv
```

### Import

```powershell
# Benutzer import
$form = @{ file = Get-Item users.csv }
Invoke-RestMethod -Uri "http://localhost:8080/api/users/import" -Method POST -Headers $headers -Form $form

# Studiengänge import
$form = @{ file = Get-Item studiengaenge.csv }
Invoke-RestMethod -Uri "http://localhost:8080/api/import/studiengaenge" -Method POST -Headers $headers -Form $form
```

---

## 7. Ablauf: Typischer Workflow nur Konsole

1. **Login:** `POST /api/auth/login` → Token
2. **Mandanten/Studiengänge anzeigen:** `GET /api/mandanten`, `GET /api/studiengaenge`
3. **Einschreibungen:** `GET /api/einschreibungen`
4. **Noten:** `GET /api/noten/einschreibung/{id}`, `POST /api/noten` (erfassen)
5. **Berechnung:** `POST /api/berechnungen/einschreibung/{id}/berechnen`, `GET /api/berechnungen/einschreibung/{id}`
6. **Export:** `GET /api/noten/export/{id}` oder `GET /api/users/export`

---

## Zusammenfassung

| Aktion | Methode |
|--------|---------|
| Alles über REST | curl / Invoke-RestMethod + Token |
| Flexible Abfragen | GraphQL per curl oder GraphiQL |
| Interaktive API-Doku | Swagger UI im Browser |
| Service-zu-Service | gRPC (intern, grpcurl zum Testen) |
| Stammdaten massenweise | CSV Import/Export |
| Systemstatus | Actuator /health |

**Angular wird nicht benötigt** – alle Funktionen sind über REST, GraphQL und gRPC verfügbar.
