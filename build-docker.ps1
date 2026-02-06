# Build-Script für Docker: Zuerst Maven JARs, dann Docker Images
# Ausführung: .\build-docker.ps1

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot

Write-Host "=== Gradify Docker Build ===" -ForegroundColor Cyan

# 1. Maven: Alle Java-Services bauen
Write-Host "`n[1/2] Maven Package..." -ForegroundColor Yellow
Set-Location $ProjectRoot
mvn package -DskipTests -q
if ($LASTEXITCODE -ne 0) {
    Write-Host "Maven Build fehlgeschlagen." -ForegroundColor Red
    exit 1
}
Write-Host "Maven Build OK" -ForegroundColor Green

# 2. Docker Compose Build
Write-Host "`n[2/2] Docker Build..." -ForegroundColor Yellow
docker compose build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker Build fehlgeschlagen." -ForegroundColor Red
    exit 1
}
Write-Host "`nDocker Build abgeschlossen." -ForegroundColor Green
