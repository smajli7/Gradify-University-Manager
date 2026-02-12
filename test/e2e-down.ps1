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
    "docker compose down -v (raeumt Container + Volumes auf)",
    "Wenn Compose-Datei fehlt: SKIP"
)

Write-Header "E2E: docker compose down"

$composeFile = Join-Path $PSScriptRoot "..\\gradify-e2e-tests\\src\\test\\resources\\docker-compose.test.yml"
if (-not (Test-Path $composeFile)) {
    Write-Host "  [SKIP] Compose-Datei nicht gefunden: $composeFile" -ForegroundColor $script:YELLOW
    exit 0
}

$logFile = Join-Path $logDir "e2e-compose-down-$runId.log"
$cmd = "docker compose -f ""$composeFile"" down -v"
$result = Invoke-Logged "docker compose down" $cmd $logFile -AllowFail

Write-Result "E2E compose down" $result
exit $result.ExitCode

