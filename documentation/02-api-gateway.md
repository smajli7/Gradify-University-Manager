# API-Gateway

## 1. Zweck und Funktion

Der API-Gateway bildet den zentralen Einstiegspunkt für alle eingehenden Client-Anfragen. Er leitet Requests pfadbasiert an die zuständigen Backend-Services weiter und übernimmt dabei übergreifende Aufgaben wie die Weiterleitung des Authentifizierungs-Headers und das CORS-Handling.

**Technologie:** Spring Cloud Gateway (reaktiv, Netty-basiert)
**Port:** 8080

---

## 2. Aufgaben

| Aufgabe | Beschreibung |
|---------|-------------|
| Request-Routing | Pfadbasierte Weiterleitung an den zuständigen Microservice |
| Authentifizierungsweiterleitung | Weiterleitung des JWT-Authorization-Headers über einen globalen Filter |
| CORS-Handling | Cross-Origin Resource Sharing für den Frontend-Zugriff (Port 4200) |
| GraphQL-Routing | Routing und Path-Rewriting der GraphQL-Endpunkte an die jeweiligen Services |

---

## 3. REST-Routing

| Pfad-Präfix | Ziel-Service | Ziel-Port |
|-------------|-------------|-----------|
| `/api/auth/**` | Auth-Service | 8081 |
| `/api/users/**`, `/api/students/**` | User-Service | 8082 |
| `/api/mandanten/**`, `/api/studiengaenge/**`, `/api/module/**`, `/api/module-zuweisungen/**`, `/api/pruefungsordnungen/**`, `/api/einschreibungen/**`, `/api/import/**` | Studiengang-Service | 8083 |
| `/api/noten/**` | Noten-Service | 8084 |
| `/api/berechnungen/**` | Berechnungs-Service | 8085 |

Hinweis: Die fachlichen Modul- und Prüfungsordnungsoperationen werden im Studiengang-Service primär unter dem Präfix `/api/studiengaenge/` bereitgestellt (z. B. `/api/studiengaenge/{id}/module`, `/api/studiengaenge/{id}/pruefungsordnungen`). Die zusätzlichen Gateway-Präfixe `/api/module/**` und `/api/pruefungsordnungen/**` sind für Kompatibilität und Security-Matching konfiguriert.

---

## 4. GraphQL-Routing

| Gateway-Pfad | Ziel-Service | Rewriting |
|-------------|-------------|-----------|
| `/graphql/user` | User-Service (8082) | Rewrite auf `/graphql` |
| `/graphql/studiengang` | Studiengang-Service (8083) | Rewrite auf `/graphql` |
| `/graphql/noten` | Noten-Service (8084) | Rewrite auf `/graphql` |

Das Gateway leitet GraphQL-Anfragen unter servicespezifischen Pfaden per `RewritePath`-Filter an den jeweiligen `/graphql`-Endpunkt des Zielservices weiter.

---

## 5. Globaler Filter: ForwardAuthorizationFilter

Die Klasse `ForwardAuthorizationFilter` implementiert `GlobalFilter` mit höchster Priorität (`HIGHEST_PRECEDENCE`). Sie extrahiert den `Authorization`-Header aus eingehenden Requests und setzt ihn explizit auf den weitergeleiteten Request, sodass die Backend-Services den JWT-Token empfangen.

---

## 6. CORS-Konfiguration

| Parameter | Wert |
|-----------|------|
| Erlaubte Origins | `http://localhost:4200`, `http://127.0.0.1:4200` |
| Erlaubte Methoden | GET, POST, PUT, DELETE, OPTIONS |
| Erlaubte Header | alle (`*`) |
| Credentials | erlaubt |
| Max Age | 3600 Sekunden |

Im Docker-Profil werden zusätzlich `http://localhost` und `http://localhost:80` als Origins zugelassen.

---

## 7. Deployment-Profile

| Profil | Beschreibung | Service-URLs |
|--------|-------------|--------------|
| default | Lokale Entwicklung | `localhost:808x` |
| docker | Docker Compose / Kubernetes | Service-Namen als Hostnamen (z. B. `http://auth-service:8081`) |

Die Datei `application-docker.yml` ersetzt die lokalen Host-Adressen durch Docker/Kubernetes-Servicenamen. Alle Routen und Filter bleiben identisch.
