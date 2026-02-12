## Test-Skripte

In diesem Ordner liegen **separate PowerShell-Skripte pro Test-Art**

- zeigen **den exakten Befehl**
- zeigen (optional) **Live-Output**
- schreiben alles zusaetzlich nach `test/logs/`
- geben eine kurze **"Was passiert jetzt?"**-Liste aus

### Output lesen (wichtig)

- Jede Ausfuehrung hat eine **Run-ID**. Dadurch werden Surefire-Reports pro Run getrennt (via `-Dsurefire.reportNameSuffix`).
- Bei **[FAIL]** steht immer der **direkte Pfad zum Logfile** daneben (`-> ...log`). Das ist die erste Datei, die du bei Fehlern oeffnest.
- Logfiles sind **UTF-8** (lesbar, ohne `ÿþ`/Nullbytes).

### Unit-Tests

```powershell
.\test\run-unit.ps1
```

### Integrationstests (Testcontainers, Docker erforderlich)

Alle Services:

```powershell
.\test\run-integration-all.ps1
```

Einzelne Services:

```powershell
.\test\run-integration-auth.ps1
.\test\run-integration-user.ps1
.\test\run-integration-studiengang.ps1
.\test\run-integration-noten.ps1
.\test\run-integration-berechnung.ps1
```

### E2E (Docker Compose)

Full run:

```powershell
.\test\run-e2e.ps1
```

Einzelschritte:

```powershell
.\test\e2e-up.ps1
.\test\e2e-run.ps1
.\test\e2e-down.ps1
```

Hinweis:
- `e2e-up.ps1` baut zuerst die JARs (`mvn -DskipTests package ...`), damit die Dockerfiles `target/*.jar` kopieren koennen.
- Im Test-Compose sind RabbitMQ/Postgres **nicht** auf Host-Ports gemappt, um Port-Konflikte zu vermeiden.
- `run-e2e.ps1` wartet **nicht** stumpf 30s, sondern prueft `http://localhost:18080/actuator/health` bis `status=UP`.

### Alles

```powershell
.\test\run-all.ps1 -All
```

### Quiet-Mode

Wenn du weniger Konsolen-Output willst (Logs werden trotzdem geschrieben):

```powershell
.\test\run-unit.ps1 -Quiet
```

