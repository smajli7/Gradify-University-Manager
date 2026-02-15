# Deployment

## 1. Übersicht

Gradify unterstützt zwei Deployment-Varianten: Docker Compose für die lokale Entwicklung und Kubernetes für produktionsnahe Umgebungen. Beide Varianten sind Multi-Tenant-fähig.

---

## 2. Docker

### Container-Aufbau

Jeder Spring Boot Service wird in einem eigenen Docker-Container ausgeliefert. Die Container basieren auf `eclipse-temurin:17-jre-alpine` und enthalten ausschließlich die kompilierte JAR-Datei. Das Angular-Frontend wird in einem Multi-Stage-Build kompiliert (Node 20) und über nginx ausgeliefert.

### Service-Container

| Container | Basis-Image | Port(s) |
|-----------|------------|---------|
| api-gateway | eclipse-temurin:17-jre-alpine | 8080 |
| auth-service | eclipse-temurin:17-jre-alpine | 8081 |
| user-service | eclipse-temurin:17-jre-alpine | 8082, 9082 (gRPC) |
| studiengang-service | eclipse-temurin:17-jre-alpine | 8083, 9083 (gRPC) |
| noten-service | eclipse-temurin:17-jre-alpine | 8084, 9084 (gRPC) |
| berechnungs-service | eclipse-temurin:17-jre-alpine | 8085, 9085 (gRPC) |
| frontend | nginx:alpine | 80 |
| postgres | postgres:16-alpine | 5432 |
| rabbitmq | rabbitmq:3-management-alpine | 5672, 15672 |

### Docker Compose

Die Datei `docker-compose.yml` orchestriert alle Container mit korrekten Abhängigkeiten. PostgreSQL und RabbitMQ werden vor den Applikationsservices gestartet. Health-Checks stellen sicher, dass abhängige Services erst starten, wenn die Infrastruktur bereit ist.

---

## 3. Kubernetes

### Architektur

```
┌─────────────────────────────────────────────────────────┐
│                   Kubernetes Cluster                     │
│  ┌─────────────────────────────────────────────────────┐│
│  │                  Ingress Controller                  ││
│  │        gradify.local → /api/* → Gateway              ││
│  │                        /*    → Frontend              ││
│  └─────────────────────────────────────────────────────┘│
│                                                          │
│  ┌────────────────── Namespace: gradify ───────────────┐│
│  │                                                      ││
│  │  Deployments (je 2 Replicas):                        ││
│  │  ┌─────────┐ ┌──────┐ ┌──────┐ ┌──────────┐        ││
│  │  │Frontend │ │Auth  │ │User  │ │Studiengang│        ││
│  │  └─────────┘ └──────┘ └──────┘ └──────────┘        ││
│  │  ┌──────┐ ┌──────────┐ ┌──────────┐                ││
│  │  │Noten │ │Berechnung│ │ Gateway  │                ││
│  │  └──────┘ └──────────┘ └──────────┘                ││
│  │                                                      ││
│  │  StatefulSet:              Deployment:               ││
│  │  ┌──────────┐             ┌──────────┐              ││
│  │  │PostgreSQL│             │ RabbitMQ │              ││
│  │  │  + PVC   │             └──────────┘              ││
│  │  └──────────┘                                       ││
│  └──────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────┘
```

### Kubernetes-Ressourcen

| Ressource | Typ | Beschreibung |
|-----------|-----|-------------|
| `namespace.yml` | Namespace | Isolierter Namespace `gradify` |
| `secrets.yml` | Secret | Datenbank-, RabbitMQ- und JWT-Zugangsdaten (Base64-kodiert) |
| `configmap.yml` | ConfigMap | Nicht-sensitive Konfiguration (DB-Host, gRPC-Adressen, Tenant-Einstellungen) |
| `postgres.yml` | StatefulSet + Service + ConfigMap | PostgreSQL mit PersistentVolumeClaim und Init-Script |
| `rabbitmq.yml` | Deployment + Service | RabbitMQ Message Broker |
| `auth-service.yml` | Deployment + Service | Auth-Service (2 Replicas) |
| `user-service.yml` | Deployment + 2 Services | User-Service mit getrennten HTTP- und gRPC-Services |
| `studiengang-service.yml` | Deployment + 2 Services | Studiengang-Service mit getrennten HTTP- und gRPC-Services |
| `noten-service.yml` | Deployment + 2 Services | Noten-Service mit getrennten HTTP- und gRPC-Services |
| `berechnungs-service.yml` | Deployment + 2 Services | Berechnungs-Service mit getrennten HTTP- und gRPC-Services |
| `api-gateway.yml` | Deployment + Service | API-Gateway (2 Replicas) |
| `frontend.yml` | Deployment + Service | Angular-Frontend (2 Replicas) |
| `ingress.yml` | Ingress | Externer Zugang über `gradify.local` |

### Skalierung

Alle Applikationsservices sind auf je 2 Replicas konfiguriert, um Hochverfügbarkeit zu gewährleisten. PostgreSQL wird als StatefulSet mit einer Replica betrieben, um Datenkonsistenz sicherzustellen.

### Health-Probes

Alle Services sind mit Liveness- und Readiness-Probes konfiguriert, die den Spring Boot Actuator-Endpunkt `/actuator/health` abfragen. Kubernetes verwendet diese Probes, um fehlerhafte Pods automatisch neu zu starten und den Traffic nur an bereite Pods zu leiten.

### Deploy-Script

Das Deployment wird über ein PowerShell-Script (`k8s/deploy.ps1`) automatisiert, das folgende Schritte ausführt:

1. Maven-Build aller Services
2. Docker-Image-Erstellung für alle Container
3. Anwendung aller Kubernetes-Manifeste in korrekter Reihenfolge
4. Überwachung des Rollout-Status aller Deployments

---

## 4. Multi-Tenancy

### Konzept

Gradify implementiert eine DB-per-Tenant-Architektur. Jeder Mandant (Hochschule) erhält eigene Datenbanken für die Services Studiengang, Noten und Berechnung. Die Benutzerdaten werden zentral in einer gemeinsamen Datenbank verwaltet.

### Datenbankstruktur bei zwei Mandanten (THM, GU)

| Service | Zentrale DB | Tenant-DB (THM) | Tenant-DB (GU) |
|---------|------------|-----------------|----------------|
| Auth | gradify_auth | – | – |
| User | gradify_user | – | – |
| Studiengang | – | gradify_studiengang_thm | gradify_studiengang_gu |
| Noten | – | gradify_noten_thm | gradify_noten_gu |
| Berechnung | – | gradify_berechnung_thm | gradify_berechnung_gu |

### Tenant-Routing

Der `TenantContext` wird aus dem JWT-Token extrahiert und über einen `TenantContextFilter` in den Request-Kontext gesetzt. Eine `DynamicTenantRoutingDataSource` leitet Datenbankabfragen anhand des aktiven Tenant-Kontexts an die korrekte Datenbank weiter.

### Zentrale Tenant-Registry

Die Tabelle `tenant_registry` in der Auth-Datenbank enthält alle registrierten Mandanten mit ihrem Datenbank-Suffix. Bei Anlage eines neuen Mandanten werden die zugehörigen Datenbanken automatisch provisioniert (Tenant-Provisioning). Die Registry-Einträge werden serviceintern mit kurzer Cache-Laufzeit (30 Sekunden) gehalten, um Last auf die Auth-Datenbank zu reduzieren und gleichzeitig zeitnahe Aktualisierungen zu ermöglichen.

### Vorteile

| Aspekt | Beschreibung |
|--------|-------------|
| Datenisolation | Vollständige Trennung der Daten zwischen Mandanten auf Datenbankebene |
| Skalierbarkeit | Neue Mandanten ohne Änderung an der Infrastruktur hinzufügbar |
| Compliance | DSGVO-konforme Datentrennung zwischen Organisationen |
| Unabhängigkeit | Mandanten können sich nicht gegenseitig beeinflussen |
