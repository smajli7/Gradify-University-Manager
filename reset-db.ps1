# Gradify - Datenbank zuruecksetzen (komplett neu)
# Loescht das PostgreSQL-Volume und startet den Container neu.
# init-databases.sql wird automatisch beim ersten Start ausgefuehrt.
#
# Hinweis: Alle Services muessen vorher gestoppt sein (stop-all.ps1)!

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Gradify - Datenbank zuruecksetzen" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# PostgreSQL stoppen
Write-Host "PostgreSQL stoppen..." -ForegroundColor Yellow
docker compose -f docker-compose.dev.yml stop postgres 2>$null
if ($LASTEXITCODE -ne 0) { Write-Host "Hinweis: postgres lief moeglicherweise nicht." }

# Container entfernen (damit Volume freigegeben wird)
Write-Host "PostgreSQL-Container entfernen..." -ForegroundColor Yellow
if (docker ps -a -q -f name=gradify-postgres) {
    docker rm -f gradify-postgres | Out-Null
}

# Volume loeschen (Name: <verzeichnis>_postgres_data)
$projectDir = Split-Path -Leaf $PSScriptRoot
$volumeName = "${projectDir}_postgres_data"
Write-Host "Volume '$volumeName' loeschen..." -ForegroundColor Yellow
$removed = $false
docker volume rm $volumeName 2>$null
if ($LASTEXITCODE -eq 0) { $removed = $true }
if (-not $removed) {
    # Fallback: Volume mit Projekt-Praefix finden (z.B. anderes Namensformat)
    $vols = docker volume ls -q 2>$null | Where-Object { $_ -match [regex]::Escape($projectDir) -and $_ -match "postgres_data" }
    foreach ($v in $vols) {
        docker volume rm $v 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Geloescht: $v" -ForegroundColor Green
            $removed = $true
            break
        }
    }
}
if (-not $removed) {
    Write-Host "Hinweis: Kein Volume gefunden (evtl. bereits frisch)?" -ForegroundColor Gray
}

Write-Host ""
Write-Host "PostgreSQL neu starten (init-databases.sql laeuft automatisch)..." -ForegroundColor Green
docker compose -f docker-compose.dev.yml up -d postgres

# Auf Health warten
Write-Host "Warte auf PostgreSQL (max 30s)..." -ForegroundColor Gray
$maxWait = 30
$waited = 0
while ($waited -lt $maxWait) {
    $ready = docker exec gradify-postgres pg_isready -U gradify 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "PostgreSQL ist bereit!" -ForegroundColor Green
        break
    }
    Start-Sleep -Seconds 2
    $waited += 2
    Write-Host "  ... $waited s" -ForegroundColor Gray
}
if ($waited -ge $maxWait) {
    Write-Host ""
    Write-Host "Zeitueberschreitung - PostgreSQL moeglicherweise noch nicht bereit." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Fertig! Starte jetzt die Services mit:" -ForegroundColor Cyan
Write-Host "  .\start-all.ps1" -ForegroundColor White
Write-Host "  oder .\start-simple.ps1" -ForegroundColor White
Write-Host ""
Write-Host "Die Services erstellen beim Start automatisch die Tabellen und laden Seed-Daten." -ForegroundColor Gray
Write-Host ""
