param(
    [switch]$Quiet
)

. (Join-Path $PSScriptRoot "_common.ps1") -Quiet:$Quiet
$null = Set-RepoRootLocation

$runId = Get-RunId
$logDir = Join-Path $PSScriptRoot "logs"
Ensure-Directory $logDir
Write-RunInfo $runId $logDir
Write-Plan "Was passiert jetzt?" @(
    "Docker-Check",
    "JARs bauen (skip tests), damit Dockerfiles target/*.jar kopieren koennen",
    "docker compose up -d --build (Compose-Datei: gradify-e2e-tests/.../docker-compose.test.yml)",
    "Bei Fehler: Logfile-Pfad steht in der [FAIL]-Zeile"
)

Write-Header "E2E: docker compose up"

$dockerLog = Join-Path $logDir "docker-info-$runId.log"
if (-not (Assert-DockerRunning $dockerLog)) {
    Write-Host "  [FAIL] Docker ist nicht gestartet" -ForegroundColor $script:RED
    exit 1
}

$composeFile = Join-Path $PSScriptRoot "..\\gradify-e2e-tests\\src\\test\\resources\\docker-compose.test.yml"
if (-not (Test-Path $composeFile)) {
    Write-Host "  [FAIL] Compose-Datei nicht gefunden: $composeFile" -ForegroundColor $script:RED
    exit 1
}

$buildLogFile = Join-Path $logDir "e2e-build-$runId.log"
$buildCmd = "mvn -DskipTests package -pl gradify-api-gateway,gradify-auth-service,gradify-user-service,gradify-studiengang-service,gradify-noten-service,gradify-berechnungs-service -am"
$buildResult = Invoke-Logged "Build JARs (skip tests)" $buildCmd $buildLogFile -AllowFail
Write-Result "E2E build" $buildResult
if ($buildResult.ExitCode -ne 0) { exit $buildResult.ExitCode }

$logFile = Join-Path $logDir "e2e-compose-up-$runId.log"
$cmd = "docker compose -f ""$composeFile"" up -d --build"
$result = Invoke-Logged "docker compose up" $cmd $logFile -AllowFail
Write-Result "E2E compose up" $result
exit $result.ExitCode

