param(
    [switch]$Quiet
)

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
. (Join-Path $PSScriptRoot "_common.ps1") -Quiet:$Quiet
$repoRoot = Set-RepoRootLocation

$runId = Get-RunId
$logDir = Join-Path $PSScriptRoot "logs"
Ensure-Directory $logDir
Write-RunInfo $runId $logDir
Write-Plan "Was passiert jetzt?" @(
    "Docker-Check",
    "Studiengang-Service Integrationstests via Testcontainers (gradify-studiengang-service)",
    "Tenant-Routing ist in Integrationstests deaktiviert (Single-DB)",
    "Bei Fehler: Logfile-Pfad steht in der [FAIL]-Zeile"
)

Write-Header "Integrationstests: Studiengang-Service (Testcontainers)"

$dockerLog = Join-Path $logDir "docker-info-$runId.log"
if (-not (Assert-DockerRunning $dockerLog)) {
    Write-Host "  [SKIP] Docker ist nicht gestartet" -ForegroundColor $script:YELLOW
    exit 0
}

$logFile = Join-Path $logDir "it-gradify-studiengang-service-$runId.log"
$cmd = "mvn test -pl gradify-studiengang-service -am ""-Dtest=*IntegrationTest"" ""-Dsurefire.failIfNoSpecifiedTests=false"" ""-Dsurefire.reportNameSuffix=-$runId"""
$result = Invoke-Logged "Studiengang Integrationstests" $cmd $logFile -AllowFail

Write-Result "Studiengang Integrationstests" $result
if ($result.ExitCode -eq 0) {
    Show-ExecutedTests $repoRoot $runId
}
exit $result.ExitCode

