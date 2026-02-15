# Authentifizierung und Autorisierung

Dieses Dokument beschreibt den Authentifizierungs- und Autorisierungsmechanismus von Gradify.

---

## Übersicht

Gradify verwendet einen **eigenen Auth-Service** für die Authentifizierung. Dies bietet folgende Vorteile:

- **Entkopplung**: Auth-Logik ist von anderen Services getrennt
- **Skalierbarkeit**: Auth-Service kann unabhängig skaliert werden
- **Erweiterbarkeit**: Einfache Integration von OAuth2, LDAP etc. möglich

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │────▶│  API-Gateway │────▶│ Auth-Service │
│   (Angular)  │     │   (8080)     │     │   (8081)     │
└──────────────┘     └──────────────┘     └──────────────┘
                                                  │
                                                  ▼
                                          ┌──────────────┐
                                          │  PostgreSQL  │
                                          │ (RefreshToken│
                                          │   Tabelle)   │
                                          └──────────────┘
```

---

## Authentifizierungsablauf

### 1. Login

```
POST /api/auth/login
Content-Type: application/json

{
  "username": "max.mustermann",
  "password": "web00100113!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "gradify.eyJhbGc...",
    "refreshToken": "abc123-...",
    "expiresIn": 900,
    "user": {
      "id": "aaaa1111-...",
      "username": "max.mustermann",
      "vorname": "Max",
      "nachname": "Mustermann",
      "roles": ["ROLE_STUDENT"],
      "studentId": "aaaa1111-..."
    }
  }
}
```

### 2. Token-Struktur

Der Access-Token ist JWT-ähnlich aufgebaut:

```
gradify.<header>.<payload>.<signature>
```

**Payload enthält:**
- `sub`: Benutzer-ID
- `name`: Vollständiger Name
- `roles`: Array der Rollen
- `exp`: Ablaufzeitpunkt (Unix-Timestamp)

### 3. Token-Refresh

```
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "abc123-..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "gradify.eyJhbGc...",
    "expiresIn": 900
  }
}
```

### 4. Logout

```
POST /api/auth/logout
Authorization: Bearer <accessToken>
```

---

## Rollen und Berechtigungen

### Verfügbare Rollen

| Rolle | Beschreibung | Hauptfunktionen |
|-------|--------------|-----------------|
| `ROLE_ADMIN` | Systemadministrator | Benutzerverwaltung, Mandanten, Zuweisungen, alle Funktionen |
| `ROLE_LEHRENDER` | Dozent/Professor | Module verwalten, Noten erfassen, Statistiken eigener Module |
| `ROLE_PRUEFUNGSAMT` | Prüfungsamt-Mitarbeiter | Notenvalidierung, Berechnung, Studenten verwalten |
| `ROLE_STUDENT` | Student | Eigene Noten einsehen, Fortschritt, Studienplan |

### Berechtigungsmatrix

| Funktion | ADMIN | LEHRENDER | PRUEFUNGSAMT | STUDENT |
|----------|:-----:|:---------:|:------------:|:-------:|
| Übersicht (Dashboard) | ✓ | ✓ | ✓ | ✓ |
| Eigene Noten einsehen | - | - | - | ✓ |
| Noten erfassen | ✓ | ✓ | ✓ | - |
| Noten validieren | ✓ | - | ✓ | - |
| Gesamtnote berechnen | ✓ | - | ✓ | - |
| Statistiken | ✓ | ✓* | ✓ | - |
| Studenten verwalten | ✓ | - | ✓ | - |
| Benutzer verwalten | ✓ | - | - | - |
| Mandanten verwalten | ✓ | - | - | - |
| Dozenten-Zuweisungen | ✓ | - | - | - |

*Dozenten sehen nur Statistiken ihrer zugewiesenen Module

---

## Frontend-Integration

### AuthService (Angular)

```typescript
@Injectable({ providedIn: 'root' })
export class AuthService {
  // Reactive State
  currentUser = signal<User | null>(null);
  isLoggedIn = computed(() => this.currentUser() !== null);
  userRole = computed(() => this.currentUser()?.roles[0] || '');
  
  // Login
  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>('/api/auth/login', { username, password });
  }
  
  // Logout
  logout(): void {
    this.currentUser.set(null);
    localStorage.removeItem('gradify_token');
    this.router.navigate(['/login']);
  }
}
```

### Route Guards

```typescript
// Auth Guard - Schützt authentifizierte Routen
export const authGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  if (!authService.isLoggedIn()) {
    return router.parseUrl('/login');
  }
  return true;
};

// Role Redirect Guard - Leitet nach Login zur richtigen Startseite
export const roleRedirectGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  switch (authService.userRole()) {
    case 'ADMIN': return router.parseUrl('/admin');
    case 'LEHRENDER': return router.parseUrl('/dashboard');
    case 'PRUEFUNGSAMT': return router.parseUrl('/students');
    case 'STUDENT': return router.parseUrl('/dashboard');
    default: return router.parseUrl('/dashboard');
  }
};
```

### Rollenbasierte Navigation

Die Dock-Navigation filtert Items basierend auf der Benutzerrolle:

```typescript
dockItems: DockItem[] = [
  { id: 'admin', label: 'Übersicht', route: '/admin', roles: ['ADMIN'] },
  { id: 'grades', label: 'Noten', route: '/grades', roles: ['STUDENT'] },
  { id: 'validation', label: 'Validierung', route: '/grades/validation', roles: ['ADMIN', 'PRUEFUNGSAMT'] },
  // ...
];

get visibleItems() {
  return this.dockItems.filter(item => 
    item.roles.includes(this.userRole)
  );
}
```

---

## Sicherheitsaspekte

### Token-Speicherung

- Access-Token wird im `localStorage` gespeichert
- Refresh-Token wird in der Datenbank gespeichert (Tabelle `refresh_tokens`)
- Tokens werden bei Logout invalidiert

### Token-Lebensdauer

| Token-Typ | Lebensdauer |
|-----------|-------------|
| Access-Token | 15 Minuten |
| Refresh-Token | 7 Tage |

### Zukünftige Erweiterungen

1. **JWT mit Signatur-Validierung**: Aktuell simuliertes JWT-Format, echte Signatur-Validierung implementieren
2. **OAuth2/OpenID Connect**: Integration mit externen Identity Providern (Hochschul-SSO)
3. **Multi-Faktor-Authentifizierung**: TOTP oder WebAuthn
4. **Audit-Logging**: Login-Versuche und Aktionen protokollieren

---

*Zuletzt aktualisiert: Januar 2026*
