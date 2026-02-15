# gRPC vs. REST/GraphQL – Woher kommen die Noten?

## Kurzfassung

**Die einzelnen Noten (Einzelprüfungen) kommen immer über GraphQL/REST vom Noten-Service – nicht über gRPC.** gRPC wird nur intern vom Berechnungs-Service verwendet, um die Gesamtnote zu berechnen.

## Datenfluss

### 1. Einzelnoten (Notenliste, Dashboard, Notenerfassung)

| Quelle | Protokoll | Service | Endpoint |
|--------|-----------|---------|----------|
| Noten | **GraphQL** | Noten-Service (8084) | `notenByStudent(einschreibungId)` |
| Noten | **REST** | Noten-Service (8084) | `GET /api/noten`, `POST /api/noten` |

→ **Funktioniert unabhängig von gRPC.** Das Frontend lädt Noten direkt vom Noten-Service.

### 2. Gesamtnote (berechnete Abschlussnote)

| Quelle | Protokoll | Ablauf |
|--------|-----------|--------|
| Berechnungs-Service | REST | Frontend ruft `POST /api/berechnungen/einschreibung/{id}/berechnen` auf |
| Berechnungs-Service intern | **gRPC** | Holt Noten von Noten-Service (9084) und Regelwerk von Studiengang-Service (9083) |

→ **Wenn gRPC fehlschlägt:** Der Berechnungs-Service kann keine Gesamtnote berechnen.

### 3. Frontend-Fallback für Gesamtnote

Wenn der Berechnungs-Service nicht erreichbar ist oder keine Gesamtnote liefert, berechnet das **Dashboard clientseitig** einen einfachen Durchschnitt aus den bereits geladenen GraphQL-Noten:

```typescript
// dashboard.component.ts – gesamtnote computed
// Fallback: Durchschnitt aus bestandenen Noten berechnen
const bestandeneNoten = this.noten().filter(...);  // ← noten() kommt von GraphQL!
const durchschnitt = summe / bestandeneNoten.length;
```

→ **Die Noten stammen weiterhin von GraphQL.** Nur die Berechnungslogik (gewichtet vs. einfacher Durchschnitt) weicht ab.

## Bedeutung von „Kein REST-Fallback aktiv“

- **Berechnungs-Service:** Hat keinen REST-Fallback, um Noten/Regelwerk zu holen, wenn gRPC fehlschlägt.
- **Frontend:** Hat einen Fallback: Es berechnet die Gesamtnote lokal aus den per GraphQL geladenen Noten.

## gRPC-Fehler (INTERNAL) – typische Ursachen

1. **ClassNotFoundException** – z.B. `NoteData` fehlt im gradify-shared JAR (behoben via build-helper-maven-plugin).
2. **Exception im gRPC-Handler** – NotenDataServiceGrpcImpl oder RegelwerkServiceGrpcImpl wirft interne Fehler.
3. **Service nicht gestartet** – gRPC-Server auf 9083/9084 nicht erreichbar.

## Empfehlung

1. **Proto-Build prüfen:** `.\build-grpc.ps1` ausführen und erfolgreichen Build sicherstellen.
2. **Services neu starten:** `.\stop-all.ps1` und `.\start-simple.ps1`.
3. **Logs prüfen:** Noten- und Studiengang-Service auf gRPC-Fehler in den Logs prüfen.
