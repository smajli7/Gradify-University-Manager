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
    "E2E-Tests (gradify-e2e-tests) gegen den gestarteten Stack ausfuehren",
    "Surefire-Reports werden pro Run-ID isoliert (reportNameSuffix)",
    "Bei Fehler: Logfile-Pfad steht in der [FAIL]-Zeile"
)

Write-Header "E2E: Tests ausfuehren (gegen Gateway)"

$logFile = Join-Path $logDir "e2e-tests-$runId.log"
$cmd = "mvn test -pl gradify-e2e-tests ""-Dtest=*E2ETest"" ""-Dsurefire.failIfNoSpecifiedTests=false"" ""-Dsurefire.reportNameSuffix=-$runId"""
$result = Invoke-Logged "E2E Tests" $cmd $logFile -AllowFail

Write-Result "E2E Tests" $result
if ($result.ExitCode -eq 0) {
    Show-ExecutedTests $repoRoot $runId
}
exit $result.ExitCode

