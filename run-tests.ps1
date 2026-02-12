#
# Gradify - Testskript (Wrapper)
# Nutze bevorzugt die einzelnen Skripte in ./test/
#   .\test\run-unit.ps1
#   .\test\run-integration-all.ps1
#   .\test\run-e2e.ps1
#   .\test\run-all.ps1 -All
#

param(
    [switch]$Integration,
    [switch]$E2E,
    [switch]$All,
    [switch]$Quiet
)

$runner = Join-Path $PSScriptRoot "test\\run-all.ps1"
if (-not (Test-Path $runner)) {
    Write-Host "[FAIL] Missing: $runner" -ForegroundColor Red
    exit 1
}

& $runner -Integration:$Integration -E2E:$E2E -All:$All -Quiet:$Quiet
exit $LASTEXITCODE
