In dieser Datei befinden sich die Anforderungen des Projekts für Web-basierte Anwendungssysteme - WiSe 25/26.

Diese wurden von der **Projektbeschreibung.pdf** von Herr Prof. Lehmann kopiert. 

1. Allgemeine Beschreibung der Projektaufgabe
Es soll ein web-basiertes Anwendungssystem für Hochschulen entstehen, mit dem
- Studierende eingetragen und verwaltet werden,
- Noten für einzelne Module erfasst, bearbeitet und validiert werden,
- Gesamt- und Durchschnittsnoten berechnet werden,
- verschiedene Nutzerrollen (z. B. Studierende, Lehrende, Prüfungsamt) mit unterschiedlichen
Berechtigungen existieren,
- optional mehrere Mandanten (z. B. verschiedene Studiengänge oder Fakultäten) unabhängig
voneinander arbeiten können.
Jedes Team bekommt zwei Studiengänge und die damit verbundenen Regelwerke die sogenannte
Prüfungsordnung (PO) zur Verfügung gestellt. In der spezifischen PO ist genau geregelt, wie sich
der Notendurchschnitt berechnet. Z. B. wird die Gesamtnote gemäß §12 „Bildung der
Gesamtnote“ und der damit verbundenen Anlage 2 zur Gewichtung der Noten bestimmt.
- Unsere Studiengänge: **Bioverfahrenstechnik 2 BA** & **Forschung in der Sozialen Arbeit 4 MA**
- Die jeweiligen Modul- und Gewichtungsübersichten sind in jeweils **bioverfahrenstechnik.md** und **fsozialearbeit.md** zu finden 

2. Anforderungen an das mit Spring Boot zu entwickelnde System:
Das Anwendungssystem muss aus unterschiedlichen Services zusammengestellt sein, die
jeweils Teilaufgaben des Gesamtsystems erfüllen. Beispielhaft sind folgende Services genannt:
- User- & Rollenmanagement-Service
- Mandanten-/Fakultäts-/Studiengangs-Service (Multi-Tenancy-Service)
- Nutzerverwaltungsservice
- Notenerfassungsservice
- Berechnungsservice (Gesamt- & Durchschnittsnoten)
- Frontend-Gateway / API-Gateway
Die Services sollen verteilt sein und nicht monolithischen implementiert sein. Die Services sollen
somit untereinander über unterschiedliche Protokolle und APIs in Verbindung stehen und
kommunizieren. Hierzu sollen REST- GraphQL- sowie gRPC-Schnittstellen genutzt werden.
Jeder Service besitzt seine eigene Datenhaltung, um Entkopplung zu garantieren.

3. Das Anwendungssystem muss über mindestens ein User Interface (UI) verfügen, mit dem die
gesamten Funktionen getätigt werden können. Dies soll kein grafisches UI sein.
Durch folgende zusätzliche Möglichkeiten können Bonusbewertungen erarbeitet werden:
- Integration eines API Gateway (Begründung muss mit angegeben werden)
- Authentifizierungs-Service (Funktion muss deutlich gemacht werden)
- Weitere technische Lösung einer Kommunikation: z. B. Message Queue (Begründung z. B.
der Vorteile muss angegeben werden)
- Integration einer grafischen UI als weiteres Frontend z.B. mit Angular als Single Page
Application realisiert oder als Progressive Web Application
- Deployment des gesamten Anwendungssystems: Docker + Kubernetes (Multi-Tenant
ready)
_______________________________________________________
4. Vorgehen im Projekt
Erstellen und Planen Sie Ihr Projekt anhand der hier gegebenen Vorgaben.
1. Projektstart: Teamorganisation - Frühzeitige Sammlung der individuellen Stärken und
Kompetenzen (z. B. Technik, Organisation, Design, Recherche), um Aufgaben passend
zuzuordnen. Festlegung der Kommunikationsregeln – z. B. wöchentliches Teammeeting,
Protokollführung, Wahl geeigneter zusätzlicher Tools zu GitHub (z. B. MS Teams) //bereits erledigt
2. Projektplanung (Projektplan in GitHub nach Anleitung erstellen):
- Definition des Projektziels
• Formuliert ein klar abgegrenztes Hauptziel.
• Definiert konkrete Ergebnisse (Deliverables), die am Ende vorliegen müssen.
- Arbeitspakete (Work Packages) definieren (Jedes Arbeitspaket sollte enthalten):
• Zielbeschreibung
• Erwartetes Ergebnis
• Aufwandsabschätzung (Zeit in Stunden/Tagen)
• Abhängigkeiten (welche Aufgaben vorher fertig sein müssen)
• Zuständige Person + Vertretung im Notfall
Beispiel-Arbeitspakete: Recherche & Anforderungsanalyse, Konzeptentwicklung,
Umsetzung / Produktion, Testen / Qualitätssicherung, Dokumentation, Präsentation //bereits erledigt
- Meilensteine festlegen - Meilensteine markieren wichtige Fortschrittspunkte, z. B.:
• Projektdefinition und Rollenverteilung abgeschlossen
• Konzept finalisiert
• Prototyp / Zwischenstand
• Finale Version
• Abgabe & Präsentation
3. Projektdurchführung (mind. wöchentlich)
- Wöchentliche Statusmeetings – z. B. folgende Punkte:
• Fortschritt der Arbeitspakete (durch Commits nachweisbar, ist nicht nur
Quellcode)
• Hindernisse / Probleme (z. B. durch Issues in GitHub abbildbar)
• Anpassung des Zeitplans (In der Roadmap z. B. durch Erledigung von Issues
abbildbar)
• Offene Fragen (Issues können z. B. mit Labeln versehen werden)
Jedes Meeting endet z. B. mit: aktualisierter Aufgabenliste, verbindlichen To-Dos für die
Woche, Protokoll mit Verantwortungen //in progress
4. Projektabschlussphase – Finalisierung:
- Abschluss aller Arbeitspakete
- Qualitätssicherung anhand vorher definierter Kriterien
- Prüfung der Dokumentation
- Vorbereitung der Präsentation mit Demonstration (Demonstration max. 20 Minuten,
mind. 15 Minuten)
- Reflexion im Team - Empfohlene Leitfragen:
• Was lief gut?
• Was war herausfordernd?
• Welche Rollenverteilung war effektiv?
• Was sollte im nächsten Projekt anders gemacht werden?

Folgendes wird als Dokumentation des Projekts verlangt und ist in GitHub abzulegen:
- Entwurf/Architektur des Anwendungssystems mit allen Schnittstellen und APIs. Dazu zählen
Funktionsbeschreibung und Schnittstellendefinition. Es können gerne Tabellen und User
Stories zur Erläuterung eingesetzt werden. Vielleicht orientieren Sie sich an den Hausaufgaben
der Übungen.
- Beschreibung und Übersicht des Anwendungssystems. Nutzen Sie die Möglich der Erstellung
von Diagrammen zur Übersicht und eventuell auch zu Prozessabläufen (z. B.
Sequenzdiagramme).
- GitHub Repository muss eine gute Struktur in Ordnern und Dateien gegliedert haben
_______________________________________________________

**DEADLINE 23.02.2026 - 23:59**
