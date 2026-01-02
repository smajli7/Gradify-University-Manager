# Contributing to Gradify

## Entwicklungsworkflow

### Branch-Namenskonvention

```
feature/<kurzbeschreibung>    # Neue Features
bugfix/<kurzbeschreibung>     # Bugfixes
hotfix/<kurzbeschreibung>     # Dringende Fixes für Production
docs/<kurzbeschreibung>       # Dokumentation
```

**Beispiele:**
- `feature/login-page`
- `bugfix/grade-calculation`
- `docs/api-documentation`


**Types:**
- `feat`: Neues Feature
- `fix`: Bugfix
- `docs`: Dokumentation
- `style`: Formatierung (kein Code-Change)
- `refactor`: Code-Refactoring
- `test`: Tests hinzufügen/ändern
- `chore`: Build, Dependencies, etc.

**Beispiele:**
```
feat(auth): add JWT token refresh endpoint
fix(noten): correct grade calculation for weighted modules
docs(readme): update setup instructions
```

## Code-Style

### Java

- Java 17 Features nutzen (Records, Pattern Matching, etc.)
- Lombok für Boilerplate (`@Data`, `@Builder`, etc.)

### TypeScript/Angular

- Strict Mode aktiviert
- Standalone Components bevorzugen
- Signals für State Management
- Keine `any` Types

### Allgemein

- `.editorconfig` wird automatisch angewendet
- Keine Trailing Whitespaces
- UTF-8 Encoding
- LF Line Endings

## Pull Requests

1. Feature-Branch von `main` erstellen
2. Änderungen committen
3. PR erstellen mit Beschreibung
4. Code Review abwarten
5. Nach Approval: Squash & Merge

## Lokales Setup

Siehe [README.md](README.md) für Setup-Anleitung.

## Projektstruktur

```
gradify-<service>/
├── src/main/java/de/gradify/<service>/
│   ├── controller/     # REST Controller
│   ├── service/        # Business Logic
│   ├── repository/     # Data Access
│   ├── entity/         # JPA Entities
│   ├── dto/            # Data Transfer Objects
│   ├── config/         # Configuration
│   └── exception/      # Custom Exceptions
└── src/main/resources/
    └── application.yml
```


