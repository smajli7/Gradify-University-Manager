param(
    [switch]$Integration,
    [switch]$E2E,
    [switch]$All,
    [switch]$Quiet
)

. (Join-Path $PSScriptRoot "_common.ps1") -Quiet:$Quiet

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $repoRoot

Write-Header "Gradify: Test Runner"
Write-Plan "Was passiert jetzt?" @(
    "Unit-Tests laufen immer",
    "Integrationstests nur mit -All oder -Integration (Docker erforderlich)",
    "E2E nur mit -All oder -E2E (Docker Compose)",
    "Bei Fehler: jeweilige [FAIL]-Zeile zeigt dir das Logfile"
)

Write-Host "Tip: separate scripts in ./test/:" -ForegroundColor $script:CYAN
Write-Host " - .\\test\\run-unit.ps1" -ForegroundColor $script:CYAN
Write-Host " - .\\test\\run-integration-all.ps1" -ForegroundColor $script:CYAN
Write-Host " - .\\test\\run-e2e.ps1" -ForegroundColor $script:CYAN

$hasFailures = $false

$null = & (Join-Path $PSScriptRoot "run-unit.ps1") -Quiet:$Quiet
if ($LASTEXITCODE -ne 0) { $hasFailures = $true }

if ($All -or $Integration) {
    $null = & (Join-Path $PSScriptRoot "run-integration-all.ps1") -Quiet:$Quiet
    if ($LASTEXITCODE -ne 0) { $hasFailures = $true }
}

if ($All -or $E2E) {
    $null = & (Join-Path $PSScriptRoot "run-e2e.ps1") -Quiet:$Quiet
    if ($LASTEXITCODE -ne 0) { $hasFailures = $true }
}

if ($hasFailures) { exit 1 }
exit 0

