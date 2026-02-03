# Gradify - Build gRPC Classes (Windows-optimiert)
# Dieses Skript baut gradify-shared mit robusten Workarounds fuer Windows-Dateisperren

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Gradify - Build gRPC Classes" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Stoppe alle Java-Prozesse
Write-Host "1. Stoppe alle Java-Prozesse..." -ForegroundColor Yellow
Get-Process java -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Wechsle zu gradify-shared
$sharedPath = Join-Path $PSScriptRoot "gradify-shared"
Write-Host "2. Wechsle zu: $sharedPath" -ForegroundColor Yellow
Set-Location $sharedPath

# Loesche target komplett mit cmd.exe (robuster auf Windows)
Write-Host "3. Loesche target-Ordner..." -ForegroundColor Yellow
if (Test-Path "target") {
    # Mehrere Versuche mit Pausen
    for ($i = 1; $i -le 3; $i++) {
        Write-Host "   Versuch $i..." -ForegroundColor Gray
        cmd /c "rmdir /s /q target 2>nul"
        Start-Sleep -Seconds 1
        if (-not (Test-Path "target")) {
            Write-Host "   target geloescht!" -ForegroundColor Green
            break
        }
    }
}

# Erstelle leeren target-Ordner
New-Item -ItemType Directory -Path "target" -Force | Out-Null
Write-Host ""

# Schritt 1: Nur Proto kompilieren (ohne Java compile)
Write-Host "4. Generiere Protobuf-Klassen..." -ForegroundColor Yellow
mvn protobuf:compile protobuf:compile-custom -DskipTests
if ($LASTEXITCODE -ne 0) {
    Write-Host "FEHLER: Protobuf-Generierung fehlgeschlagen!" -ForegroundColor Red
    exit 1
}
Write-Host "   Proto-Generierung erfolgreich!" -ForegroundColor Green
Write-Host ""

# Warte auf Dateisystem (Windows braucht das)
Write-Host "5. Warte auf Dateisystem (3 Sekunden)..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Pruefe ob Dateien existieren (Proto in java/, gRPC ggf. in grpc-java/)
$javaPath = "target\generated-sources\protobuf\java"
$grpcPath = "target\generated-sources\protobuf\grpc-java"
$fileCount = 0
if (Test-Path $javaPath) {
    $fileCount += (Get-ChildItem -Path $javaPath -Recurse -Filter "*.java" | Measure-Object).Count
}
if (Test-Path $grpcPath) {
    $fileCount += (Get-ChildItem -Path $grpcPath -Recurse -Filter "*.java" | Measure-Object).Count
}
if ($fileCount -gt 0) {
    Write-Host "   $fileCount Java-Dateien generiert." -ForegroundColor Green
} else {
    Write-Host "FEHLER: Keine generierten Dateien gefunden!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Schritt 2: Kompilieren
Write-Host "6. Kompiliere Java-Klassen..." -ForegroundColor Yellow
mvn compile -DskipTests
if ($LASTEXITCODE -ne 0) {
    Write-Host "FEHLER: Kompilierung fehlgeschlagen!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Tipp: Antivirus temporaer deaktivieren oder Ordner als Ausnahme hinzufuegen" -ForegroundColor Yellow
    exit 1
}
Write-Host "   Kompilierung erfolgreich!" -ForegroundColor Green
Write-Host ""

# Schritt 3: Install in lokales Maven-Repo
Write-Host "7. Installiere in Maven-Repository..." -ForegroundColor Yellow
mvn install -DskipTests
if ($LASTEXITCODE -ne 0) {
    Write-Host "FEHLER: Installation fehlgeschlagen!" -ForegroundColor Red
    exit 1
}
Write-Host "   Installation erfolgreich!" -ForegroundColor Green
Write-Host ""

# Zurueck zum Root
Set-Location $PSScriptRoot

Write-Host "========================================" -ForegroundColor Green
Write-Host "  gRPC-Klassen erfolgreich gebaut!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Naechster Schritt: .\start-simple.ps1" -ForegroundColor Cyan
Write-Host ""
