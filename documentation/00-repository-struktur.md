# Repository-Struktur

## 1. Ziel

Dieses Dokument beschreibt die organisatorische Struktur des Repositories und ordnet die technischen Artefakte den jeweiligen Verantwortungsbereichen zu.

---

## 2. Top-Level-Struktur

| Pfad | Inhalt | Zweck |
|------|--------|-------|
| `gradify-api-gateway/` | Spring Cloud Gateway | Zentraler Einstiegspunkt, Routing und CORS |
| `gradify-auth-service/` | Spring Boot Service | Login, JWT, Refresh-Token, Tenant-Registry |
| `gradify-user-service/` | Spring Boot Service | Benutzer-, Rollen- und Studentenverwaltung |
| `gradify-studiengang-service/` | Spring Boot Service | Studiengänge, POs, Module, Einschreibungen |
| `gradify-noten-service/` | Spring Boot Service | Notenworkflow, Validierung, Freigabe, Audit |
| `gradify-berechnungs-service/` | Spring Boot Service | Gesamtnotenberechnung und Fortschrittsdaten |
| `gradify-frontend/` | Angular SPA + PWA | Web-Client mit rollenbasierter Navigation |
| `gradify-shared/` | Gemeinsames Modul | gRPC/Proto-Definitionen, gemeinsame DTOs/Konstanten |
| `gradify-e2e-tests/` | Testmodul | Serviceübergreifende End-to-End-Tests |
| `k8s/` | Kubernetes-Manifeste + Deploy-Skripte | Orchestrierung und produktionsnahe Bereitstellung |
| `test/` | PowerShell-Testskripte | Unit-, Integrations- und E2E-Testorchestrierung |
| `documentation/` | Projektdokumentation | Fachliche und technische Abgabedokumente |

---

## 3. Strukturprinzipien

- Klare Trennung pro fachlicher Domäne durch eigenständige Service-Module.
- Gemeinsame Schnittstellen werden zentral im Shared-Modul gepflegt.
- Infrastrukturartefakte (`k8s`, `docker-compose`, Testskripte) sind vom Anwendungsquellcode getrennt.
- Die Dokumentation folgt einer nummerierten, nachvollziehbaren Gliederung (`00` bis `15` plus LaTeX-Gesamtdokument).
