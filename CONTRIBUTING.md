# Contributing to Gradify

## Entwicklungsworkflow


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


