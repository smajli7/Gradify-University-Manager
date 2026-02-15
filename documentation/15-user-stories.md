# User Stories

## 1. Ziel

Die User Stories verdichten die fachlichen Anforderungen aus Sicht der zentralen Rollen. Sie ergänzen die technischen Servicebeschreibungen um den erwarteten Nutzwert im operativen Hochschulbetrieb.

---

## 2. User-Story-Tabelle

| ID | Als Rolle | möchte ich | damit |
|----|-----------|-------------|-------|
| US-1 | Lehrender | Noten für meine zugewiesenen Module erfassen und bei Bedarf korrigieren | Prüfungsleistungen zeitnah und nachvollziehbar dokumentiert sind |
| US-2 | Prüfungsamt | erfasste Noten validieren, freigeben oder zur Korrektur zurückweisen | nur fachlich geprüfte Ergebnisse an Studierende veröffentlicht werden |
| US-3 | Studierender | meine Noten, den Studienfortschritt und den Studienplan einsehen | ich meinen aktuellen Leistungsstand verlässlich bewerten kann |
| US-4 | Hochschulverwalter | Dozenten-Modul-Zuweisungen und studiengangsbezogene Daten verwalten | der operative Betrieb pro Mandant konsistent gepflegt wird |
| US-5 | Admin | Mandanten, Benutzerkonten und Rollen zentral administrieren | Berechtigungen sicher und revisionsfähig gesteuert werden |
| US-6 | Lehrender/Prüfungsamt | Auswertungen und Statistiken je Modul oder Studiengang abrufen | Entscheidungen auf belastbaren Kennzahlen basieren |
| US-7 | System (asynchron) | nach einer Notenänderung automatisch die Gesamtnote neu berechnen | Folgeprozesse ohne manuelle Eingriffe konsistent bleiben |

---

## 3. Abdeckung im System

| Story-Bereich | Hauptservices |
|---------------|--------------|
| Authentifizierung und Rollen | Auth-Service, User-Service |
| Stammdaten und Studienstruktur | Studiengang-Service, User-Service |
| Notenerfassung und Workflow | Noten-Service |
| Berechnung und Fortschritt | Berechnungs-Service |
| UI/Interaktion | Frontend, API-Gateway |

Die User Stories sind durch die dokumentierten REST-, GraphQL- und gRPC-Schnittstellen umsetzbar und in der aktuellen Architektur technisch abgebildet.
