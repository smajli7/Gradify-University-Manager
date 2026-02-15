# Frontend Design-Dokumentation

## Übersicht

Das Gradify-Frontend verwendet einen modernen **Dark-Neon** Designstil mit leuchtenden Akzentfarben auf dunklem Hintergrund.

---

## Farbschema

### Hintergründe

| Name | Hex | RGB | Verwendung |
|------|-----|-----|------------|
| **Deep Background** | `#0B0E14` | `11, 14, 20` | Haupthintergrund, "Void" - lässt Glows strahlen |
| **Surface/Cards** | `#161B22` | `22, 27, 34` | Karten, Panels, Sidebar |
| **Elevated** | `#1C2128` | `28, 33, 40` | Hover-States, Dropdowns, modale Fenster |

### Akzentfarben

| Name | Hex | RGB | Verwendung |
|------|-----|-----|------------|
| **Primary (Electric Blue)** | `#00F2FF` | `0, 242, 255` | Links, Buttons, aktive Elemente, "Bestanden" |
| **Secondary (Vivid Purple)** | `#7000FF` | `112, 0, 255` | Hover-Glows, Dekorationen, Gradienten |
| **Danger (Neon Pink)** | `#FF0055` | `255, 0, 85` | Fehler, Warnungen, Löschen-Buttons |

### Text

| Name | Hex | RGB | Verwendung |
|------|-----|-----|------------|
| **Text Primary** | `#E6EDF3` | `230, 237, 243` | Haupttext, Überschriften |
| **Text Muted** | `#8B949E` | `139, 148, 158` | Beschreibungen, Labels, Platzhalter |

### Rahmen und Trenner

| Name | Hex | RGB | Verwendung |
|------|-----|-----|------------|
| **Border** | `#30363D` | `48, 54, 61` | Card-Borders, Trennlinien, Dividers |

---

## Noten-Farbverlauf

Die Notenfarben werden dynamisch auf einem Gradienten von **Grün** (beste Note) über **Gelb** (Mitte) zu **Rot** (schlechteste Note) berechnet.

### Referenzwerte

| Note | Farbe | Hex | Beschreibung |
|------|-------|-----|--------------|
| 1.0 | 🟢 Grün | `#00FF88` | Sehr gut |
| 1.5 | 🟢 Hell-Grün | `#4DFF6A` | Sehr gut |
| 2.0 | 🟡 Grün-Gelb | `#99FF4D` | Gut |
| 2.5 | 🟡 Gelb-Grün | `#CCFF33` | Gut |
| 3.0 | 🟡 Gelb | `#FFDD00` | Befriedigend |
| 3.5 | 🟠 Gelb-Orange | `#FFAA00` | Ausreichend |
| 4.0 | 🟠 Orange | `#FF7722` | Ausreichend (Grenze) |
| 4.5 | 🔴 Orange-Rot | `#FF3344` | Mangelhaft |
| 5.0 | 🔴 Rot/Pink | `#FF0055` | Nicht bestanden |

### Visualisierung

```
Note:  1.0      2.0      3.0      4.0      5.0
       |        |        |        |        |
       ████████████████████████████████████
       Grün    Gelb     Orange   Rot
       
       ← Bestanden →    ← Grenze → Nicht bestanden
```

### Gradient-Berechnung

Der Farbverlauf wird in zwei Abschnitten interpoliert:
1. **Note 1.0 - 3.0**: Grün (`#00FF88`) → Gelb (`#FFDD00`)
2. **Note 3.0 - 5.0**: Gelb (`#FFDD00`) → Rot (`#FF0055`)

---

## Layout-Struktur

### Navigationskonzept: Floating Dock (macOS-Stil)

Das Layout verwendet einen **Floating Dock** am unteren Bildschirmrand - inspiriert vom macOS Dock. Dies maximiert den Content-Bereich und passt perfekt zum Neon-Dark-Theme.

### Desktop-Layout

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ╭─────────────────────────────────────────────────────╮    │
│  │ 🎓 GRADIFY                    Max Mustermann  [▼]  │    │  ← Mini-Header
│  ╰─────────────────────────────────────────────────────╯    │
│                                                             │
│                                                             │
│                       HAUPTINHALT                           │
│                       (Router Outlet)                       │
│                                                             │
│                                                             │
│         ╭───────────────────────────────────────╮           │
│         │   🏠    👥    📝    📊    📈    ⚙️   │           │  ← Floating Dock
│         ╰───────────────────────────────────────╯           │
└─────────────────────────────────────────────────────────────┘
```

### Mobile-Layout (< 768px)

```
┌─────────────────────────┐
│ ☰  🎓 GRADIFY    👤    │  ← Header mit Hamburger
├─────────────────────────┤
│                         │
│      HAUPTINHALT        │
│                         │
└─────────────────────────┘

Hamburger öffnet Slide-In Menu:

┌─────────────────────────┐
│ ✕  Navigation           │
├─────────────────────────┤
│ 🏠 Dashboard            │
│ 👥 Studenten            │
│ 📝 Noten erfassen       │
│ 📊 Berechnung           │
│ ─────────────────────   │
│ 👤 Profil               │
│ 🚪 Logout               │
└─────────────────────────┘
```

### Dock-Verhalten

| Aktion | Effekt |
|--------|--------|
| **Hover über Icon** | Icon vergrößert sich + Glow + Label erscheint darüber |
| **Aktives Item** | Leuchtender Punkt unter dem Icon (Primary-Farbe) |
| **Idle** | Dock bleibt immer sichtbar (kein Auto-Hide) |

### Responsive Breakpoints

| Breakpoint | Breite | Navigation |
|------------|--------|------------|
| Desktop | > 1024px | Floating Dock unten |
| Tablet | 768px - 1024px | Floating Dock unten (kompakter) |
| Mobile | < 768px | Hamburger-Menu (Slide-In) |

---

## Rollenbasierte Navigation

Die sichtbaren Dock-Items hängen von der Benutzerrolle ab.

### 👨‍🎓 STUDENT

```
╭─────────────────────────────────────────╮
│   🏠    📊    📈    👤                 │
╰─────────────────────────────────────────╯
```

| Icon | Label | Route | Beschreibung |
|------|-------|-------|--------------|
| 🏠 | Dashboard | `/dashboard` | Eigene Übersicht |
| 📊 | Meine Noten | `/grades` | Nur Ansicht der eigenen Noten |
| 📈 | Fortschritt | `/progress` | ECTS, Durchschnitt, Prognose |
| 👤 | Profil | `/profile` | Eigene Daten, Passwort ändern |

### 👨‍🏫 DOZENT

```
╭─────────────────────────────────────────╮
│   🏠    👥    📝    📊    👤           │
╰─────────────────────────────────────────╯
```

| Icon | Label | Route | Beschreibung |
|------|-------|-------|--------------|
| 🏠 | Dashboard | `/dashboard` | Übersicht eigene Kurse |
| 👥 | Meine Studenten | `/students` | Studenten in eigenen Kursen |
| 📝 | Noten erfassen | `/grades/entry` | Noten eingeben (eigene Module) |
| 📊 | Kurs-Statistik | `/stats` | Notenspiegel pro Kurs |
| 👤 | Profil | `/profile` | Eigene Daten |

### 🏛️ PRUEFUNGSAMT

```
╭─────────────────────────────────────────────────╮
│   🏠    👥    📝    ✅    📊    📈    👤       │
╰─────────────────────────────────────────────────╯
```

| Icon | Label | Route | Beschreibung |
|------|-------|-------|--------------|
| 🏠 | Dashboard | `/dashboard` | Gesamtübersicht |
| 👥 | Studenten | `/students` | Alle Studenten verwalten |
| 📝 | Noten | `/grades` | Alle Noten einsehen |
| ✅ | Validierung | `/grades/validation` | Noten prüfen & freigeben |
| 📊 | Berechnung | `/calculation` | Gesamtnoten berechnen |
| 📈 | Statistik | `/stats` | Auswertungen, Reports |
| 👤 | Profil | `/profile` | Eigene Daten |

### 👑 ADMIN

```
╭───────────────────────────────────────────────────────╮
│   🏠    👥    📝    ✅    📊    📈    ⚙️    👤       │
╰───────────────────────────────────────────────────────╯
```

| Icon | Label | Route | Beschreibung |
|------|-------|-------|--------------|
| 🏠 | Dashboard | `/dashboard` | Systemübersicht |
| 👥 | Benutzer | `/users` | Alle User verwalten |
| 📝 | Noten | `/grades` | Alle Noten |
| ✅ | Validierung | `/grades/validation` | Alle freigeben |
| 📊 | Berechnung | `/calculation` | Alle berechnen |
| 📈 | Statistik | `/stats` | Systemweite Stats |
| ⚙️ | Admin | `/admin` | Mandanten, Studiengänge, POs |
| 👤 | Profil | `/profile` | Eigene Daten |

### Zusammenfassung Navigation

| Aspekt | Entscheidung |
|--------|--------------|
| **Header** | Mini-Header (Logo links + User-Menu rechts) |
| **Navigation Desktop** | Floating Dock unten (macOS-Stil) |
| **Navigation Mobile** | Hamburger-Menu (Slide-In von links) |
| **Dock-Items** | Rollenbasiert (4-8 Items je nach Rolle) |
| **Aktiv-Indikator** | Glow-Punkt unter aktivem Icon |
| **Hover-Effekt** | Icon vergrößert sich + Label erscheint

---

## Typografie

### Schriftart

- **Primär**: DM Sans (Google Fonts)
- **Fallback**: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif

### Schriftgrößen

| Element | Größe | Gewicht |
|---------|-------|---------|
| H1 | 32px | 700 (Bold) |
| H2 | 24px | 600 (Semibold) |
| H3 | 20px | 600 (Semibold) |
| Body | 16px | 400 (Regular) |
| Small | 14px | 400 (Regular) |
| Caption | 12px | 400 (Regular) |

---

## Komponenten-Stil

### Buttons

- **Primary**: Gradient `#00F2FF` → `#7000FF`, weißer Text
- **Secondary**: Border `#30363D`, transparenter Hintergrund
- **Danger**: Hintergrund `#FF0055`, weißer Text
- **Hover**: Glow-Effekt mit `box-shadow`

### Cards

- Hintergrund: `#161B22`
- Border: `1px solid #30363D`
- Border-Radius: `12px`
- Box-Shadow: `0 4px 24px rgba(0, 0, 0, 0.4)`

### Inputs

- Hintergrund: `#0B0E14`
- Border: `1px solid #30363D`
- Focus-Border: `#00F2FF`
- Border-Radius: `8px`

---

## Glow-Effekte

Für den Neon-Look werden CSS-Glows verwendet:

### Button Glow (Hover)
```
box-shadow: 0 0 20px rgba(0, 242, 255, 0.4);
```

### Neon Text
```
text-shadow: 0 0 10px rgba(0, 242, 255, 0.8);
```

### Card Hover
```
box-shadow: 0 0 30px rgba(112, 0, 255, 0.2);
```

---

## CSS-Variablen

```scss
:root {
  // Backgrounds
  --bg-deep: #0B0E14;
  --bg-surface: #161B22;
  --bg-elevated: #1C2128;
  
  // Accents
  --color-primary: #00F2FF;
  --color-secondary: #7000FF;
  --color-danger: #FF0055;
  
  // Noten-Gradient
  --grade-best: #00FF88;
  --grade-mid: #FFDD00;
  --grade-worst: #FF0055;
  
  // Text
  --text-primary: #E6EDF3;
  --text-muted: #8B949E;
  
  // Border
  --border-color: #30363D;
  
  // Spacing
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  
  // Border Radius
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
}
```

---

## Technologie-Stack

- **Framework**: Angular 18
- **UI Library**: Angular Material (angepasstes Theme)
- **State Management**: Signals / RxJS
- **GraphQL Client**: Apollo Angular
- **Styling**: SCSS mit CSS-Variablen
- **Icons**: Material Icons

---

*Letzte Aktualisierung: 10.01.2026 - Layout-Konzept mit Floating Dock hinzugefügt*
