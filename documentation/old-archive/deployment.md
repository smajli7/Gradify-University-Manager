# Deployment-Konzept

Dieses Dokument beschreibt das Deployment von Gradify mit Docker und Kubernetes.

---

## Übersicht

Gradify besteht aus 6 Microservices + Frontend + Datenbank:

```
┌─────────────────────────────────────────────────────────────┐
│                        Kubernetes Cluster                    │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                      Ingress Controller                  ││
│  │                    (nginx / traefik)                     ││
│  └─────────────────────────────────────────────────────────┘│
│                              │                               │
│  ┌───────────────────────────┼───────────────────────────┐  │
│  │                           ▼                           │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  │  │
│  │  │Frontend │  │API-Gate │  │Auth-Svc │  │User-Svc │  │  │
│  │  │ (nginx) │  │ (8080)  │  │ (8081)  │  │ (8082)  │  │  │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘  │  │
│  │                                                       │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐               │  │
│  │  │Studien- │  │Noten-Svc│  │Berechn. │               │  │
│  │  │gang-Svc │  │ (8084)  │  │  (8085) │               │  │
│  │  │ (8083)  │  └─────────┘  └─────────┘               │  │
│  │  └─────────┘                                         │  │
│  │                        Services                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                              │                               │
│  ┌───────────────────────────┼───────────────────────────┐  │
│  │                           ▼                           │  │
│  │            ┌─────────────────────────────┐            │  │
│  │            │       PostgreSQL            │            │  │
│  │            │   (StatefulSet + PVC)       │            │  │
│  │            └─────────────────────────────┘            │  │
│  │                       Datenbank                       │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Docker

### Dockerfile für Java-Services

Alle Spring Boot Services verwenden dasselbe Dockerfile-Template:

```dockerfile
# Dockerfile für Spring Boot Services
FROM eclipse-temurin:21-jre-alpine

# Arbeitsverzeichnis
WORKDIR /app

# JAR-Datei kopieren
COPY target/*.jar app.jar

# Port exponieren (wird durch ENV überschrieben)
EXPOSE 8080

# Health-Check
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${SERVER_PORT:-8080}/actuator/health || exit 1

# Startbefehl
ENTRYPOINT ["java", "-jar", "app.jar"]
```

### Dockerfile für Frontend (Angular)

```dockerfile
# Build-Stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration=production

# Production-Stage
FROM nginx:alpine
COPY --from=builder /app/dist/gradify-frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### DB-per-Tenant: Neue Hochschule anlegen

Beim Anlegen einer neuen Hochschule (Admin → „Neue Hochschule“) werden **synchrom** drei Tenant-Datenbanken erstellt (User zentral in gradify_user):

- `gradify_studiengang_<kuerzel>`
- `gradify_noten_<kuerzel>`
- `gradify_berechnung_<kuerzel>`

Dafür benötigt der DB-Benutzer `gradify` das Recht `CREATEDB` (wird in `docker/init-databases.sql` gesetzt). Falls PostgreSQL bereits vor dieser Änderung gestartet wurde, einmal Volumes zurücksetzen:

```bash
docker compose down -v
docker compose up -d
```

Oder manuell: `docker exec -it gradify-postgres psql -U postgres -c "ALTER USER gradify CREATEDB;"`

In Produktion (Supabase etc.) ist das Provisioning deaktiviert (`gradify.tenant-provisioning.enabled: false`).

**Zentrale Tenant-Registry (gradify_auth.tenant_registry):**
- Beim Anlegen einer neuen Hochschule werden neben den 3 Datenbanken auch die Tabellen (Schema) automatisch erstellt.
- Der neue Mandant wird in der zentralen Registry eingetragen; alle Services (User, Studiengang, Noten, Berechnung) lesen von dort.
- Kein Neustart nötig: Neue Tenants sind sofort routbar (`gradify.tenant-registry.enabled: true`).
- Der Auth-Service muss vor den anderen Services starten, damit `tenant_registry` existiert.

### Docker Compose (Entwicklung)

```yaml
services:
  # Datenbank
  postgres:
    image: postgres:16-alpine
    container_name: gradify-postgres
    environment:
      POSTGRES_USER: gradify
      POSTGRES_PASSWORD: gradify123
      POSTGRES_DB: gradify_auth
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker/init-databases.sql:/docker-entrypoint-initdb.d/init-databases.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U gradify"]
      interval: 10s
      timeout: 5s
      retries: 5

  # API Gateway
  api-gateway:
    build: ./gradify-api-gateway
    ports:
      - "8080:8080"
    depends_on:
      - auth-service
      - user-service
      - studiengang-service
      - noten-service
      - berechnungs-service
    environment:
      - SPRING_PROFILES_ACTIVE=docker

  # Auth Service
  auth-service:
    build: ./gradify-auth-service
    ports:
      - "8081:8081"
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      - SERVER_PORT=8081
      - SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/gradify_auth

  # User Service
  user-service:
    build: ./gradify-user-service
    ports:
      - "8082:8082"
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      - SERVER_PORT=8082
      - SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/gradify_user

  # Studiengang Service
  studiengang-service:
    build: ./gradify-studiengang-service
    ports:
      - "8083:8083"
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      - SERVER_PORT=8083
      - SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/gradify_studiengang

  # Noten Service
  noten-service:
    build: ./gradify-noten-service
    ports:
      - "8084:8084"
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      - SERVER_PORT=8084
      - SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/gradify_noten

  # Berechnungs Service
  berechnungs-service:
    build: ./gradify-berechnungs-service
    ports:
      - "8085:8085"
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      - SERVER_PORT=8085
      - SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/gradify_berechnung

  # Frontend
  frontend:
    build: ./gradify-frontend
    ports:
      - "4200:80"
    depends_on:
      - api-gateway

volumes:
  postgres_data:
```

---

## Kubernetes

### Deployment-Strategie

Für Kubernetes empfehlen wir folgende Ressourcen:

| Ressource | Typ | Replikas |
|-----------|-----|----------|
| Frontend | Deployment | 2 |
| API-Gateway | Deployment | 2 |
| Auth-Service | Deployment | 2 |
| User-Service | Deployment | 2 |
| Studiengang-Service | Deployment | 2 |
| Noten-Service | Deployment | 2 |
| Berechnungs-Service | Deployment | 2 |
| PostgreSQL | StatefulSet | 1 (oder HA-Setup) |

### Beispiel: Deployment für Auth-Service

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
  labels:
    app: gradify
    component: auth-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: gradify
      component: auth-service
  template:
    metadata:
      labels:
        app: gradify
        component: auth-service
    spec:
      containers:
      - name: auth-service
        image: gradify/auth-service:latest
        ports:
        - containerPort: 8081
        env:
        - name: SERVER_PORT
          value: "8081"
        - name: SPRING_DATASOURCE_URL
          valueFrom:
            secretKeyRef:
              name: postgres-credentials
              key: jdbc-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /actuator/health/liveness
            port: 8081
          initialDelaySeconds: 60
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /actuator/health/readiness
            port: 8081
          initialDelaySeconds: 30
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: auth-service
spec:
  selector:
    app: gradify
    component: auth-service
  ports:
  - port: 8081
    targetPort: 8081
```

### Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: gradify-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  rules:
  - host: gradify.hochschule.de
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: api-gateway
            port:
              number: 8080
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend
            port:
              number: 80
```

---

## Multi-Tenant-Fähigkeit

Gradify ist von Grund auf **multi-tenant-fähig** konzipiert. Jede Hochschule/Universität ist ein eigener **Mandant**.

### Datenmodell

```
┌─────────────────────────────────────────────────────────────┐
│                         Mandant                             │
│  (z.B. "Technische Hochschule Mittelhessen")               │
│  ID: 11111111-1111-1111-1111-111111111111                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Benutzer    │  │ Studiengänge│  │ Studenten   │        │
│  │ mandant_id  │  │ mandant_id  │  │ mandant_id  │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Module      │  │ Noten       │  │ Prüfungs-   │        │
│  │ (via PO)    │  │ (via Einschr│  │ ordnungen   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### Implementierung

#### 1. Mandant-Entity

```java
@Entity
@Table(name = "mandanten")
public class Mandant {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    private String name;        // "Technische Hochschule Mittelhessen"
    private String kuerzel;     // "THM"
    private boolean aktiv;
}
```

#### 2. Mandant-ID in allen Entities

Alle relevanten Entities haben eine `mandantId`:

```java
@Entity
public class Benutzer {
    @Id private UUID id;
    private UUID mandantId;  // Zuordnung zum Mandanten
    private String benutzername;
    // ...
}

@Entity
public class Studiengang {
    @Id private UUID id;
    private UUID mandantId;  // Zuordnung zum Mandanten
    private String name;
    // ...
}
```

#### 3. Mandanten-Filter in Queries

```java
// Repository mit Mandanten-Filter
@Repository
public interface BenutzerRepository extends JpaRepository<Benutzer, UUID> {
    List<Benutzer> findByMandantId(UUID mandantId);
    Optional<Benutzer> findByMandantIdAndBenutzername(UUID mandantId, String benutzername);
}
```

#### 4. Mandanten-Kontext im Request

```java
// Filter setzt Mandanten-Kontext aus JWT
@Component
public class MandantContextFilter implements Filter {
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) {
        String token = extractToken(request);
        UUID mandantId = extractMandantId(token);
        MandantContext.setCurrentMandant(mandantId);
        try {
            chain.doFilter(request, response);
        } finally {
            MandantContext.clear();
        }
    }
}
```

### Vorteile der Multi-Tenant-Architektur

| Aspekt | Vorteil |
|--------|---------|
| **Datenisolation** | Jeder Mandant sieht nur seine eigenen Daten |
| **Kostenteilung** | Eine Installation für viele Hochschulen |
| **Zentrale Updates** | Neue Features für alle gleichzeitig |
| **Skalierbarkeit** | Neue Mandanten ohne neue Infrastruktur |
| **Compliance** | DSGVO-konforme Datentrennung |

### Deployment-Optionen

1. **Shared Database, Shared Schema** (aktuell)
   - Alle Mandanten in einer DB
   - Trennung durch `mandant_id`
   - Einfachste Variante

2. **Shared Database, Separate Schemas** (optional)
   - Jeder Mandant hat eigenes DB-Schema
   - Stärkere Isolation

3. **Separate Databases** (Enterprise)
   - Jeder Mandant hat eigene Datenbank
   - Maximale Isolation und Performance

---

## CI/CD Pipeline (Konzept)

```yaml
# .github/workflows/deploy.yml
name: Build and Deploy

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up JDK 21
        uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'
      
      - name: Build with Maven
        run: mvn -B package --file pom.xml
      
      - name: Build Docker Images
        run: |
          docker build -t gradify/auth-service ./gradify-auth-service
          docker build -t gradify/user-service ./gradify-user-service
          # ... weitere Services
      
      - name: Push to Registry
        run: |
          docker push gradify/auth-service
          docker push gradify/user-service
          # ... weitere Services
      
      - name: Deploy to Kubernetes
        run: |
          kubectl apply -f k8s/
```

---

*Zuletzt aktualisiert: Januar 2026*
