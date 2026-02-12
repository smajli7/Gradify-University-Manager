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
    "Maven Unit-Tests ausfuehren (Pattern: *ServiceTest,*ControllerTest,*ValidatorTest)",
    "Surefire-Reports werden pro Run-ID isoliert (reportNameSuffix)",
    "Bei Fehler: Logfile-Pfad steht in der [FAIL]-Zeile"
)

Write-Header "Unit-Tests (Mockito)"

$logFile = Join-Path $logDir "unit-$runId.log"
$cmd = "mvn test ""-Dtest=*ServiceTest,*ControllerTest,*ValidatorTest"" ""-Dsurefire.failIfNoSpecifiedTests=false"" ""-Dsurefire.reportNameSuffix=-$runId"""
$result = Invoke-Logged "Unit-Tests" $cmd $logFile -AllowFail

Write-Result "Unit-Tests" $result
if ($result.ExitCode -eq 0) {
    Show-ExecutedTests $repoRoot $runId
}

exit $result.ExitCode

