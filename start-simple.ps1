# Gradify - Simple Start Script (ohne gradify-shared rebuild)
# VORAUSSETZUNG: gradify-shared muss einmalig gebaut sein mit .\build-grpc.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Gradify - Start Services (Simple)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Pruefe ob gradify-shared gebaut wurde
$sharedJar = Join-Path $env:USERPROFILE ".m2\repository\de\gradify\gradify-shared\1.0.0-SNAPSHOT\gradify-shared-1.0.0-SNAPSHOT.jar"
if (-not (Test-Path $sharedJar)) {
    Write-Host "FEHLER: gradify-shared wurde noch nicht gebaut!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Bitte zuerst ausfuehren: .\build-grpc.ps1" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}
Write-Host "gradify-shared gefunden in Maven-Repository" -ForegroundColor Green
Write-Host ""

# Docker starten
Write-Host "Starte Docker Compose..." -ForegroundColor Green
docker-compose up -d
Start-Sleep -Seconds 3
Write-Host ""

# Alle Services parallel starten
Write-Host "Starte alle Services parallel..." -ForegroundColor Green
Write-Host ""

$services = @(
    @{ Name = "User-Service"; Port = 8082; Path = "gradify-user-service" },
    @{ Name = "Auth-Service"; Port = 8081; Path = "gradify-auth-service" },
    @{ Name = "Studiengang-Service"; Port = 8083; Path = "gradify-studiengang-service" },
    @{ Name = "Noten-Service"; Port = 8084; Path = "gradify-noten-service" },
    @{ Name = "Berechnungs-Service"; Port = 8085; Path = "gradify-berechnungs-service" },
    @{ Name = "API-Gateway"; Port = 8080; Path = "gradify-api-gateway" }
)

foreach ($svc in $services) {
    Write-Host "  - $($svc.Name) (Port $($svc.Port))" -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\$($svc.Path)'; mvn clean spring-boot:run"
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Alle Services werden gestartet!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Ports:" -ForegroundColor Yellow
Write-Host "  8080 - API Gateway"
Write-Host "  8081 - Auth Service"
Write-Host "  8082 - User Service (gRPC: 9092)"
Write-Host "  8083 - Studiengang Service (gRPC: 9093)"
Write-Host "  8084 - Noten Service (gRPC: 9094)"
Write-Host "  8085 - Berechnungs Service"
Write-Host ""
Write-Host "Frontend starten mit: cd gradify-frontend && npm start" -ForegroundColor Cyan
Write-Host ""
