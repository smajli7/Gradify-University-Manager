# Startet die Gradify-Anwendung mit Docker Compose
# Voraussetzung: .\build-docker.ps1 wurde ausgeführt

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "=== Gradify Docker Start ===" -ForegroundColor Cyan
docker compose up -d
if ($LASTEXITCODE -ne 0) {
    exit 1
}
Write-Host "`nServices gestartet. Warte auf Health-Checks..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
docker compose ps
Write-Host "`nFrontend:  http://localhost:4200" -ForegroundColor Green
Write-Host "API Gateway: http://localhost:8080" -ForegroundColor Green
Write-Host "pgAdmin:   http://localhost:5050 (admin@gradify.de / admin123)" -ForegroundColor Green
Write-Host "RabbitMQ:  http://localhost:15672 (gradify / gradify123)" -ForegroundColor Green
