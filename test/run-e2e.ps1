param(
    [switch]$Quiet
)

. (Join-Path $PSScriptRoot "_common.ps1") -Quiet:$Quiet

Write-Header "E2E: Full Run (up -> test -> down)"
Write-Plan "Was passiert jetzt?" @(
    "1) e2e-up (Build + docker compose up)",
    "2) warten bis Gateway ready ist (Healthcheck statt fixer Sleep)",
    "3) e2e-run (E2E Tests)",
    "4) e2e-down (Cleanup)"
)

$null = & (Join-Path $PSScriptRoot "e2e-up.ps1") -Quiet:$Quiet
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
if (-not (Wait-ForHttpReady -Url "http://localhost:18080/actuator/health" -TimeoutSeconds 180 -IntervalSeconds 2 -ExpectJsonStatus "UP")) {
    $null = & (Join-Path $PSScriptRoot "e2e-down.ps1") -Quiet:$Quiet
    exit 1
}

$null = & (Join-Path $PSScriptRoot "e2e-run.ps1") -Quiet:$Quiet
$testExit = $LASTEXITCODE

$null = & (Join-Path $PSScriptRoot "e2e-down.ps1") -Quiet:$Quiet

exit $testExit

