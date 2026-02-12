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
    "Docker-Check (Testcontainers benoetigt Docker Desktop)",
    "Integrationstests pro Service ausfuehren (mvn test -pl <module> -am -Dtest=*IntegrationTest)",
    "Pro Service wird ein separates Logfile geschrieben",
    "Bei Fehler: [FAIL]-Zeile zeigt dir direkt das Logfile"
)

Write-Header "Integrationstests: Alle Services (Testcontainers)"

$dockerLog = Join-Path $logDir "docker-info-$runId.log"
if (-not (Assert-DockerRunning $dockerLog)) {
    Write-Host "  [SKIP] Docker ist nicht gestartet" -ForegroundColor $script:YELLOW
    exit 0
}

$services = @(
    @{ Name = "Auth-Service";        Module = "gradify-auth-service" },
    @{ Name = "User-Service";        Module = "gradify-user-service" },
    @{ Name = "Studiengang-Service"; Module = "gradify-studiengang-service" },
    @{ Name = "Noten-Service";       Module = "gradify-noten-service" },
    @{ Name = "Berechnungs-Service"; Module = "gradify-berechnungs-service" }
)

$hasFailures = $false
foreach ($svc in $services) {
    $logFile = Join-Path $logDir ("it-" + $svc.Module + "-" + $runId + ".log")
    $cmd = "mvn test -pl " + $svc.Module + " -am ""-Dtest=*IntegrationTest"" ""-Dsurefire.failIfNoSpecifiedTests=false"" ""-Dsurefire.reportNameSuffix=-$runId"""
    $result = Invoke-Logged ($svc.Name + " Integrationstests") $cmd $logFile -AllowFail
    Write-Result ($svc.Name + " Integrationstests") $result
    if ($result.ExitCode -ne 0) { $hasFailures = $true }
}

if (-not $hasFailures) {
    Show-ExecutedTests $repoRoot $runId
    exit 0
}
exit 1

