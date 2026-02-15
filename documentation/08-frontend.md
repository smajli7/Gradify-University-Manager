# Frontend (Angular SPA + PWA)

## 1. Zweck und Funktion

Das Gradify-Frontend ist eine Single Page Application (SPA), die als grafische Benutzeroberfläche für alle Nutzerrollen dient. Es kommuniziert ausschließlich über den API-Gateway mit den Backend-Services und verwendet REST für Schreiboperationen sowie GraphQL (Apollo Angular) für komplexe Leseabfragen.

**Technologie:** Angular 18.2, Angular Material 18.2, Apollo Angular 7.0
**Port:** 4200 (Entwicklung), 80 (nginx-Container)

---

## 2. Routen

### Öffentliche Routen

| Pfad | Komponente | Guard |
|------|-----------|-------|
| `/login` | LoginComponent | guestGuard (nur für nicht-angemeldete Benutzer) |

### Geschützte Routen (erfordern Authentifizierung)

| Pfad | Komponente | Zusätzlicher Guard |
|------|-----------|-------------------|
| `/` | Redirect nach Rolle | roleRedirectGuard |
| `/dashboard` | DashboardComponent | – |
| `/students` | StudentsComponent | – |
| `/grades` | GradesComponent | – |
| `/grades/validation` | ValidationComponent | – |
| `/grades/audit` | AuditComponent | – |
| `/grades/entry` | GradeEntryComponent | – |
| `/stats` | StatsComponent | – |
| `/progress` | ProgressComponent | – |
| `/study-plan` | StudyPlanComponent | studyPlanGuard (nur STUDENT) |
| `/admin` | AdminComponent | adminGuard (nur ADMIN) |
| `/admin/mandanten` | MandantenComponent | adminOrHochschulGuard (ADMIN oder HOCHSCHUL_VERWALTER) |
| `/admin/users` | UsersAdminComponent | adminGuard (nur ADMIN) |
| `/admin/assignments` | AssignmentsComponent | assignmentsGuard (ADMIN, HOCHSCHUL_VERWALTER, PRUEFUNGSAMT) |
| `/profile` | ProfileComponent | – |

### Rollenbasierte Umleitung nach Login

| Rolle | Ziel |
|-------|------|
| ROLE_ADMIN | `/admin` |
| ROLE_HOCHSCHUL_VERWALTER | `/admin/mandanten` |
| ROLE_LEHRENDER | `/dashboard` |
| ROLE_PRUEFUNGSAMT | `/dashboard` |
| ROLE_STUDENT | `/dashboard` |

---

## 3. Authentifizierung

### Token-Verwaltung

| Token | Speicherort |
|-------|------------|
| Access-Token | `localStorage` (Key: `access_token`) |
| Refresh-Token | `localStorage` (Key: `refresh_token`) |
| Benutzerdaten | `localStorage` (Key: `current_user`, JSON) |

### Auth-Interceptor

Der `authInterceptor` liest den Access-Token aus dem `localStorage` und fügt ihn als `Authorization: Bearer`-Header an jede HTTP-Anfrage an. Die Methode `refreshToken()` ist implementiert; ein automatischer Refresh bei HTTP-401-Fehlern durch einen globalen Refresh-Interceptor wird derzeit nicht ausgeführt.

### Rollen-Prüfung

Der `AuthService` stellt berechnete Eigenschaften bereit:

| Eigenschaft | Beschreibung |
|-------------|-------------|
| `isAdmin` | Prüft auf ROLE_ADMIN |
| `isHochschulVerwalter` | Prüft auf ROLE_HOCHSCHUL_VERWALTER |
| `isDozent` | Prüft auf ROLE_LEHRENDER |
| `isPruefungsamt` | Prüft auf ROLE_PRUEFUNGSAMT |
| `isStudent` | Prüft auf ROLE_STUDENT |
| `hasRole(role)` | Generische Rollenprüfung (normalisiert mit/ohne ROLE_-Präfix) |

---

## 4. Design: Professionelles Dark-Theme

Das Frontend verwendet ein professionelles Dark-Theme mit gedämpften Grautönen und dezenten Akzentfarben. Bewusst wird kein reines Schwarz oder Weiß eingesetzt – stattdessen abgestufte Grautöne für natürliche Darstellung und klare visuelle Hierarchie durch Elevationsstufen.

### Farbschema (CSS-Variablen)

| Kategorie | Hex-Wert | Verwendung |
|-----------|----------|-----------|
| Deep Background | #121212 | Haupthintergrund (tiefste Ebene) |
| Surface | #1A1A1A | Karten, Panels, Sidebar |
| Elevated | #242424 | Hover-States, Dialoge |
| Text Primary | #E8E8E8 | Haupttext, Überschriften |
| Text Secondary | #A1A1AA | Beschreibungen, Labels |
| Text Muted | #71717A | Platzhalter, deaktivierte Elemente |
| Akzent (Orange) | #F97316 | Aktive Sidebar-Elemente, Fokus-Rahmen |
| Success | #15803D | Bestanden, Erfolgsmeldungen |
| Danger | #B91C1C | Nicht bestanden, Fehlermeldungen |
| Border | #27272A | Trennlinien, Kartenrahmen |

**Schriftart:** DM Sans (Google Fonts) mit System-Fallbacks.

### Notenfarbkodierung

Notenwerte werden über semantische Farben visualisiert: Grün für bestanden, Rot für nicht bestanden, Orange für Warnungen.

### Navigation: Feste Sidebar

- **Desktop (≥ 769 px):** Feste linke Sidebar (240 px, zusammenklappbar auf 68 px) mit Glasmorphismus-Effekt. Aktives Item mit orangefarbenem Balken markiert. Sektionsgruppen (u. a. „Prüfungsamt", „Verwaltung", „Auswertung", „Akademisch", „LEHRE", „Leistung", „Studium", „Konto").
- **Tablet (769–1024 px):** Gleiches Verhalten wie Desktop (kein separater Tablet-Breakpoint in der Implementierung)
- **Mobil (< 768 px):** Sidebar ausgeblendet; Hamburger-Menü mit Overlay-Navigation

---

## 5. Kommunikation mit dem Backend

| Protokoll | Verwendung | Bibliothek |
|-----------|-----------|------------|
| REST (HTTP) | Login, CRUD-Operationen, Validierung, Import/Export | Angular HttpClient |
| GraphQL | Dashboard-Abfragen, verschachtelte Daten (Studenten mit Noten, Module) | Apollo Angular + @apollo/client |

---

## 6. Progressive Web App (PWA)

| Eigenschaft | Beschreibung |
|-------------|-------------|
| Installierbarkeit | Über Web App Manifest (`manifest.webmanifest`) auf Desktop/Mobile installierbar |
| Standalone-Modus | Darstellung ohne Browser-Chrome |
| Service Worker | `ngsw-config.json` – App-Assets werden vorab gecacht, API-Daten nicht |
| Offline-Verhalten | App-Shell aus Cache, Datenanfragen zeigen Offline-Hinweis |

---

## 7. Technologie-Stack

| Kategorie | Technologie | Version |
|-----------|-------------|---------|
| Framework | Angular | 18.2 |
| UI-Bibliothek | Angular Material | 18.2 |
| GraphQL-Client | Apollo Angular | 7.0 |
| Charts | Chart.js | 4.4 |
| PDF-Export | jsPDF | 4.0 |
| Styling | SCSS mit CSS-Variablen | – |
| Icons | Material Icons | – |
| Deployment | Multi-Stage Docker Build (Node 20 → nginx:alpine) | – |
