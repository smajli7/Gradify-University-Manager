# Gradify - Stop All Services Script
# Beendet alle laufenden Gradify-Services

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Gradify - Stop All Services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Ports der Services
$ports = @(8080, 8081, 8082, 8083, 8084, 8085)

Write-Host "Suche nach laufenden Services..." -ForegroundColor Yellow
Write-Host ""

$stoppedCount = 0

foreach ($port in $ports) {
    # Finde Prozesse die auf diesem Port lauschen
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" }
    
    if ($connections) {
        foreach ($conn in $connections) {
            $process = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
            if ($process) {
                Write-Host "Beende Prozess auf Port $port : $($process.ProcessName) (PID: $($process.Id))" -ForegroundColor Yellow
                Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
                $stoppedCount++
            }
        }
    }
}

# Beende auch Java-Prozesse die Maven/Spring Boot verwenden
Write-Host ""
Write-Host "Suche nach Java-Prozessen (Maven/Spring Boot)..." -ForegroundColor Yellow

$javaProcesses = Get-Process -Name "java" -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*gradify*" -or 
    $_.CommandLine -like "*spring-boot*" -or
    $_.MainWindowTitle -like "*gradify*"
}

if ($javaProcesses) {
    foreach ($proc in $javaProcesses) {
        Write-Host "Beende Java-Prozess: $($proc.ProcessName) (PID: $($proc.Id))" -ForegroundColor Yellow
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
        $stoppedCount++
    }
}

# Stoppe Docker Compose
Write-Host ""
Write-Host "Stoppe Docker Compose..." -ForegroundColor Yellow
docker-compose down 2>$null

if ($stoppedCount -eq 0) {
    Write-Host ""
    Write-Host "Keine laufenden Services gefunden." -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  $stoppedCount Service(s) beendet" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
}

Write-Host ""
