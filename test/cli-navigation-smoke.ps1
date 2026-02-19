param(
    [string]$BaseUrl = "http://localhost:8080",
    [string]$CliScriptPath = ".\gradify-cli.ps1",
    [int]$TimeoutSeconds = 45
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Invoke-ApiCall {
    param(
        [string]$Method,
        [string]$Url,
        [object]$Body = $null
    )

    $params = @{
        Uri    = $Url
        Method = $Method
    }

    if ($null -ne $Body) {
        $params["ContentType"] = "application/json; charset=utf-8"
        $params["Body"] = ($Body | ConvertTo-Json -Depth 10)
    }

    try {
        return Invoke-RestMethod @params
    } catch {
        return $null
    }
}

function New-ProcessOutput {
    param([int]$ExitCode, [string]$StdOut, [string]$StdErr, [bool]$TimedOut)
    return [PSCustomObject]@{
        ExitCode = $ExitCode
        StdOut   = $StdOut
        StdErr   = $StdErr
        TimedOut = $TimedOut
    }
}

function Invoke-CliWithInput {
    param(
        [string]$CliPath,
        [string[]]$InputLines,
        [int]$TimeoutSec
    )

    $resolvedCli = (Resolve-Path $CliPath).Path

    $job = Start-Job -ScriptBlock {
        param([string]$ScriptPath, [string[]]$Lines)
        $output = ($Lines | & powershell -NoProfile -ExecutionPolicy Bypass -File $ScriptPath 2>&1 | Out-String)
        [PSCustomObject]@{
            ExitCode = $LASTEXITCODE
            Output   = $output
        }
    } -ArgumentList $resolvedCli, $InputLines

    if (-not (Wait-Job -Job $job -Timeout $TimeoutSec)) {
        Stop-Job -Job $job | Out-Null
        Remove-Job -Job $job -Force | Out-Null
        return (New-ProcessOutput -ExitCode 124 -StdOut "" -StdErr "Timeout" -TimedOut $true)
    }

    $result = Receive-Job -Job $job
    Remove-Job -Job $job -Force | Out-Null

    return (New-ProcessOutput -ExitCode $result.ExitCode -StdOut $result.Output -StdErr "" -TimedOut $false)
}

function Add-Result {
    param(
        [System.Collections.ArrayList]$Target,
        [string]$Role,
        [string]$Check,
        [bool]$Ok,
        [string]$Detail
    )
    [void]$Target.Add([PSCustomObject]@{
        Role   = $Role
        Check  = $Check
        Ok     = $Ok
        Detail = $Detail
    })
}

Write-Host "=== Gradify CLI Navigation Smoke Test ===" -ForegroundColor Cyan
Write-Host "BaseUrl: $BaseUrl" -ForegroundColor DarkGray
Write-Host "CLI:     $CliScriptPath" -ForegroundColor DarkGray
Write-Host ""

# Demo-Logins laden
$demoResp = Invoke-ApiCall -Method "GET" -Url "$BaseUrl/api/users/demo-logins"
if (-not $demoResp -or -not $demoResp.success -or -not $demoResp.data) {
    Write-Host "FEHLER: Demo-Logins konnten nicht geladen werden." -ForegroundColor Red
    exit 1
}

$demoPassword = $demoResp.data.demoPassword
$demoUsers = @($demoResp.data.users)
if (-not $demoPassword -or $demoUsers.Count -eq 0) {
    Write-Host "FEHLER: Demo-Login-Daten sind unvollstaendig." -ForegroundColor Red
    exit 1
}

$scenarios = @(
    @{
        Role = "ADMIN"
        InputsAfterLogin = @("1", "0", "0", "j")
        MustContain = @("Benutzerverwaltung", "Modul-Zuweisungen (Dozenten)", "Studiengaenge und Module")
        MustNotContain = @("Mein Studium")
    },
    @{
        Role = "HOCHSCHUL_VERWALTER"
        InputsAfterLogin = @("1", "0", "0", "j")
        MustContain = @("Notenvalidierung", "Studentenverwaltung")
        MustNotContain = @("Benutzerverwaltung", "Systemstatus")
    },
    @{
        Role = "PRUEFUNGSAMT"
        InputsAfterLogin = @("1", "0", "0", "j")
        MustContain = @("Noten validieren und freigeben", "Notenverwaltung", "Note validieren")
        MustNotContain = @("Benutzerverwaltung", "Systemstatus")
    },
    @{
        Role = "LEHRENDER"
        InputsAfterLogin = @("1", "0", "4", "1", "0", "0", "j")
        MustContain = @("Notenerfassung", "Studiengaenge und Module")
        MustNotContain = @("Benutzerverwaltung", "Alle Mandanten (Hochschulen)")
    },
    @{
        Role = "STUDENT"
        InputsAfterLogin = @("0", "j")
        MustContain = @("Mein Studium", "Meine Noten", "Mein Fortschritt", "Meine Gesamtnote")
        MustNotContain = @("Benutzerverwaltung", "Notenvalidierung", "Systemstatus", "Modul-Zuweisungen (Dozenten)")
    }
)

$results = [System.Collections.ArrayList]::new()

foreach ($scenario in $scenarios) {
    $role = $scenario.Role
    $user = $demoUsers | Where-Object { $_.rolle -eq $role } | Select-Object -First 1
    if (-not $user) {
        Add-Result -Target $results -Role $role -Check "Demo user exists" -Ok $false -Detail "Kein Demo-User gefunden"
        continue
    }

    $inputLines = @($user.username, $demoPassword) + @($scenario.InputsAfterLogin)
    $run = Invoke-CliWithInput -CliPath $CliScriptPath -InputLines $inputLines -TimeoutSec $TimeoutSeconds
    $out = "$($run.StdOut)`n$($run.StdErr)"

    Add-Result -Target $results -Role $role -Check "Process finished" -Ok (-not $run.TimedOut) -Detail "Exit=$($run.ExitCode)"

    $loginMarker = "Erfolgreich angemeldet als $($user.username)"
    Add-Result -Target $results -Role $role -Check "Login success" -Ok ($out -match [regex]::Escape($loginMarker)) -Detail $loginMarker

    foreach ($must in @($scenario.MustContain)) {
        Add-Result -Target $results -Role $role -Check "Contains: $must" -Ok ($out -match [regex]::Escape($must)) -Detail "menu text found"
    }

    foreach ($forbidden in @($scenario.MustNotContain)) {
        Add-Result -Target $results -Role $role -Check "Not contains: $forbidden" -Ok (-not ($out -match [regex]::Escape($forbidden))) -Detail "forbidden text absent"
    }
}

Write-Host "=== Ergebnisse ===" -ForegroundColor Cyan
$results | Format-Table -AutoSize

$failed = @($results | Where-Object { -not $_.Ok })
Write-Host ""
Write-Host "Gesamt: $($results.Count), OK: $($results.Count - $failed.Count), FAIL: $($failed.Count)" -ForegroundColor Cyan

if ($failed.Count -gt 0) {
    Write-Host "CLI-Navigationspruefung hat Fehler." -ForegroundColor Red
    exit 1
}

Write-Host "CLI-Navigation ist rollenbasiert konsistent." -ForegroundColor Green
exit 0

