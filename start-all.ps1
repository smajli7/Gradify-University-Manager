# Gradify - Start All Services Script
# Startet alle Microservices in separaten PowerShell-Fenstern

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Gradify - Start All Services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Prüfe ob Maven installiert ist
$mvnCmd = Get-Command mvn -ErrorAction SilentlyContinue
if (-not $mvnCmd) {
    Write-Host "FEHLER: Maven ist nicht installiert oder nicht im PATH!" -ForegroundColor Red
    Write-Host "Bitte installiere Maven oder füge es zum PATH hinzu." -ForegroundColor Yellow
    exit 1
}

# Prüfe ob Docker installiert ist (für PostgreSQL)
$dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
if (-not $dockerCmd) {
    Write-Host "WARNUNG: Docker ist nicht installiert. PostgreSQL wird nicht gestartet." -ForegroundColor Yellow
    Write-Host "Stelle sicher, dass PostgreSQL auf Port 5432 läuft." -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host "Starte Docker Compose (PostgreSQL)..." -ForegroundColor Green
    docker-compose up -d
    if ($LASTEXITCODE -ne 0) {
        Write-Host "FEHLER: Docker Compose konnte nicht gestartet werden!" -ForegroundColor Red
        exit 1
    }
    Write-Host "Warte 5 Sekunden auf PostgreSQL..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    Write-Host ""
}

# Definiere Services mit ihren Ports und Startreihenfolge
$services = @(
    @{ Name = "gradify-auth-service"; Port = 8081; Order = 1 },
    @{ Name = "gradify-user-service"; Port = 8082; Order = 2 },
    @{ Name = "gradify-studiengang-service"; Port = 8083; Order = 3 },
    @{ Name = "gradify-noten-service"; Port = 8084; Order = 4 },
    @{ Name = "gradify-berechnungs-service"; Port = 8085; Order = 5 },
    @{ Name = "gradify-api-gateway"; Port = 8080; Order = 6 }
)

# Sortiere nach Reihenfolge
$services = $services | Sort-Object -Property Order

Write-Host "Starte Services..." -ForegroundColor Green
Write-Host ""

foreach ($service in $services) {
    $servicePath = Join-Path $PSScriptRoot $service.Name
    
    if (-not (Test-Path $servicePath)) {
        Write-Host "WARNUNG: Service-Verzeichnis nicht gefunden: $($service.Name)" -ForegroundColor Yellow
        continue
    }
    
    Write-Host "Starte $($service.Name) auf Port $($service.Port)..." -ForegroundColor Cyan
    
    # Starte Service in neuem PowerShell-Fenster
    $scriptBlock = @"
        `$Host.UI.RawUI.WindowTitle = '$($service.Name) - Port $($service.Port)'
        cd '$servicePath'
        Write-Host '========================================' -ForegroundColor Cyan
        Write-Host '  $($service.Name)' -ForegroundColor Cyan
        Write-Host '  Port: $($service.Port)' -ForegroundColor Cyan
        Write-Host '========================================' -ForegroundColor Cyan
        Write-Host ''
        mvn spring-boot:run
        Write-Host ''
        Write-Host 'Service beendet. Drücke eine Taste zum Schließen...' -ForegroundColor Yellow
        `$null = `$Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
"@
    
    Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", $scriptBlock
    
    # Warte kurz zwischen den Starts
    if ($service.Order -lt $services.Count) {
        Start-Sleep -Seconds 3
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Alle Services wurden gestartet!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Services laufen auf folgenden Ports:" -ForegroundColor Yellow
Write-Host "  - API Gateway:     http://localhost:8080" -ForegroundColor White
Write-Host "  - Auth Service:    http://localhost:8081" -ForegroundColor White
Write-Host "  - User Service:    http://localhost:8082" -ForegroundColor White
Write-Host "  - Studiengang:     http://localhost:8083" -ForegroundColor White
Write-Host "  - Noten Service:   http://localhost:8084" -ForegroundColor White
Write-Host "  - Berechnungs:     http://localhost:8085" -ForegroundColor White
Write-Host ""
Write-Host "Jeder Service läuft in einem eigenen Fenster." -ForegroundColor Cyan
Write-Host "Schließe die Fenster, um die Services zu beenden." -ForegroundColor Cyan
Write-Host ""
