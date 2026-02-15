# PWA (Progressive Web App)

Gradify ist als **Progressive Web App** installierbar und bietet damit ein app-ähnliches Erlebnis.

---

## Features

| Feature | Beschreibung |
|---------|--------------|
| **Installierbar** | App kann auf Homescreen/Desktop hinzugefügt werden |
| **Standalone** | Startet ohne Browser-Chrome (Vollbildmodus) |
| **Offline-Shell** | App-Struktur und statische Assets werden gecacht |
| **Offline-Banner** | Zeigt "Sie sind offline" wenn keine Verbindung |
| **Branding** | Gradify-Farben (Electric Blue, Dark Background) im Splashscreen |

---

## Technische Umsetzung

### Web App Manifest (`public/manifest.webmanifest`)

- **Name**: Gradify - Notenmanagement
- **Theme**: `#00F2FF` (Electric Blue)
- **Background**: `#0B0E14` (Deep Background)
- **Display**: standalone
- **Icons**: 72px bis 512px für alle Geräte

### Service Worker (`ngsw-config.json`)

- **App-Assets**: prefetch (HTML, CSS, JS, Manifest)
- **Statische Dateien**: lazy (Icons, Fonts, Bilder)
- **API/GraphQL**: Nicht gecacht (immer frische Daten)

### Offline-Verhalten

- **Online**: Normale Nutzung, alle API-Calls funktionieren
- **Offline**: App-Shell wird aus Cache geladen, Banner erscheint, API-Calls schlagen fehl

---

## Installation testen

1. **Production-Build** erstellen:
   ```bash
   cd gradify-frontend
   npm run build
   ```

2. **Gebautes Frontend** servieren (z.B. mit `serve`):
   ```bash
   npm run serve:pwa
   ```

3. **Browser** öffnen: http://localhost:4200

4. **Installation**:
   - **Chrome/Edge**: Install-Icon in der Adressleiste
   - **Mobile**: Menü → "Zum Startbildschirm hinzufügen"

---

## DevTools prüfen

- **Application** → **Manifest**: Prüfen ob Manifest geladen wird
- **Application** → **Service Workers**: Prüfen ob `ngsw-worker.js` aktiv
- **Network** → Offline-Modus: Prüfen ob App-Shell aus Cache kommt

---

## Hinweise

- Der Service Worker wird **nur im Production-Build** aktiv (`ng serve` nutzt ihn nicht)
- API- und GraphQL-Anfragen werden bewusst **nicht** gecacht (Datenschutz, Aktualität)
- Für volle Funktionalität muss das Backend erreichbar sein (Port 8080)
