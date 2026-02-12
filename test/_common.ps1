param(
    [switch]$Quiet
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$script:RED = "Red"
$script:GREEN = "Green"
$script:YELLOW = "Yellow"
$script:CYAN = "Cyan"

function Format-Duration([TimeSpan]$ts) {
    if (-not $ts) { return "" }
    if ($ts.TotalSeconds -lt 60) { return ("{0:n1}s" -f $ts.TotalSeconds) }
    if ($ts.TotalMinutes -lt 60) { return ("{0}m {1:00}s" -f [int]$ts.TotalMinutes, $ts.Seconds) }
    return ("{0}h {1:00}m" -f [int]$ts.TotalHours, $ts.Minutes)
}

function Get-RepoRoot() {
    # This file lives in <repo>/test/_common.ps1
    return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Set-RepoRootLocation() {
    $root = Get-RepoRoot
    Set-Location $root
    return $root
}

function Write-Header($text) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor $script:CYAN
    Write-Host "  $text" -ForegroundColor $script:CYAN
    Write-Host "========================================" -ForegroundColor $script:CYAN
    Write-Host ""
}

function Write-RunInfo($runId, $logDir) {
    Write-Host "Run-ID: $runId" -ForegroundColor $script:CYAN
    Write-Host "Logs:   $logDir" -ForegroundColor $script:CYAN
    Write-Host "CWD:    $((Get-Location).Path)" -ForegroundColor $script:CYAN
    Write-Host ""
}

function Write-Plan([string]$title, [string[]]$steps) {
    if (-not $title) { $title = "Was wird gemacht?" }
    Write-Host $title -ForegroundColor $script:CYAN
    foreach ($s in $steps) {
        if ($s) { Write-Host (" - {0}" -f $s) -ForegroundColor $script:CYAN }
    }
    Write-Host ""
}

function Wait-ForHttpReady(
    [string]$Url,
    [int]$TimeoutSeconds = 120,
    [int]$IntervalSeconds = 2,
    [string]$ExpectJsonStatus = "UP"
) {
    if (-not $Url) { throw "Wait-ForHttpReady: Url is required" }

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    $attempt = 0

    Write-Host ("Warte auf Ready: {0} (timeout={1}s)" -f $Url, $TimeoutSeconds) -ForegroundColor $script:YELLOW

    while ((Get-Date) -lt $deadline) {
        $attempt++
        try {
            # Use a short timeout so we can retry quickly
            $resp = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
            $code = [int]$resp.StatusCode

            if ($code -ge 200 -and $code -lt 300) {
                if ($ExpectJsonStatus) {
                    try {
                        $json = $resp.Content | ConvertFrom-Json -ErrorAction Stop
                        if ($null -ne $json.status -and $json.status -eq $ExpectJsonStatus) {
                            Write-Host ("Ready nach {0} Versuchen." -f $attempt) -ForegroundColor $script:GREEN
                            return $true
                        }
                    } catch {
                        # If parsing fails, treat 2xx as ready
                        Write-Host ("Ready (HTTP {0}) nach {1} Versuchen." -f $code, $attempt) -ForegroundColor $script:GREEN
                        return $true
                    }
                } else {
                    Write-Host ("Ready (HTTP {0}) nach {1} Versuchen." -f $code, $attempt) -ForegroundColor $script:GREEN
                    return $true
                }
            }
        } catch {
            # ignore and retry
        }

        if (($attempt % 5) -eq 0) {
            Write-Host ("  ... noch nicht ready (attempt={0})" -f $attempt) -ForegroundColor $script:YELLOW
        }
        Start-Sleep -Seconds $IntervalSeconds
    }

    Write-Host ("[FAIL] Timeout: Service wurde nicht ready: {0}" -f $Url) -ForegroundColor $script:RED
    return $false
}

function Ensure-Directory($path) {
    if (-not (Test-Path $path)) {
        New-Item -ItemType Directory -Path $path -Force | Out-Null
    }
}

function Get-RunId() {
    # Include milliseconds + PID to avoid collisions when scripts run in parallel
    return ("{0}-pid{1}" -f (Get-Date -Format "yyyyMMdd-HHmmss-fff"), $PID)
}

function Test-ProtobufCleanupError($logFile) {
    try {
        return [bool](Select-String -Path $logFile -Pattern "Unable to clean up temporary proto file directory" -Quiet)
    } catch {
        return $false
    }
}

function Try-RemoveProtocDependenciesDir() {
    $dir = Join-Path (Get-Location) "gradify-shared\\target\\protoc-dependencies"
    if (Test-Path $dir) {
        try {
            Remove-Item -Recurse -Force $dir -ErrorAction SilentlyContinue
        } catch {
            # best-effort
        }
    }
}

function New-Utf8LogWriter($logFile) {
    $dir = Split-Path -Parent $logFile
    if ($dir) { Ensure-Directory $dir }

    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    $fs = [System.IO.File]::Open($logFile, [System.IO.FileMode]::Append, [System.IO.FileAccess]::Write, [System.IO.FileShare]::ReadWrite)
    $sw = New-Object System.IO.StreamWriter($fs, $utf8NoBom)
    $sw.AutoFlush = $true
    return $sw
}

function Invoke-Logged($title, $commandLine, $logFile, [switch]$AllowFail) {
    $maxAttempts = 2
    $attempt = 1
    $started = Get-Date
    $cwd = (Get-Location).Path

    while ($true) {
        if ($attempt -gt 1) {
            Write-Host ""
            Write-Host ">>> Retry $attempt/$maxAttempts" -ForegroundColor $script:YELLOW
        }

    Write-Host ""
    Write-Host ">>> $title" -ForegroundColor $script:YELLOW
    Write-Host ">>> $commandLine" -ForegroundColor $script:YELLOW
    Write-Host ">>> Log: $logFile" -ForegroundColor $script:YELLOW
    Write-Host ""

        # Native commands may write to stderr (e.g. JVM warnings). In PowerShell this can
        # become a NativeCommandError; we don't want to fail the script for that.
        $oldEap = $ErrorActionPreference
        $ErrorActionPreference = "Continue"
        try {
            $sw = New-Utf8LogWriter $logFile
            try {
                $sw.WriteLine("")
                $sw.WriteLine("===== {0} =====" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss.fff"))
                $sw.WriteLine(">>> {0}" -f $title)
                $sw.WriteLine(">>> CWD: {0}" -f $cwd)
                $sw.WriteLine(">>> {0}" -f $commandLine)
                $sw.WriteLine("")

                cmd /c "$commandLine" 2>&1 | ForEach-Object {
                    $line = $_.ToString()
                    $sw.WriteLine($line)
                    if (-not $Quiet) { Write-Host $line }
                } | Out-Null
            } finally {
                if ($sw) { $sw.Dispose() }
            }
        } finally {
            $ErrorActionPreference = $oldEap
        }

        $exitCode = $LASTEXITCODE

        # Workaround: protobuf-maven-plugin intermittently fails on Windows cleanup.
        # Retry once after short wait + best-effort delete of protoc-dependencies.
        if ($exitCode -ne 0 -and $attempt -lt $maxAttempts -and (Test-ProtobufCleanupError $logFile)) {
            Write-Host ""
            Write-Host ">>> Detected protobuf temp-cleanup error. Waiting + retrying..." -ForegroundColor $script:YELLOW
            Try-RemoveProtocDependenciesDir
            Start-Sleep -Seconds (2 * $attempt)
            $attempt++
            continue
        }

        if (-not $AllowFail -and $exitCode -ne 0) {
            throw "Command failed (exit=$exitCode): $commandLine`nSee log: $logFile"
        }
        $ended = Get-Date
        $duration = $ended - $started
        return [pscustomobject]@{
            Title = $title
            CommandLine = $commandLine
            LogFile = $logFile
            ExitCode = $exitCode
            Attempts = $attempt
            Duration = $duration
            DurationText = (Format-Duration $duration)
            Cwd = $cwd
        }
    }
}

function Write-Result($testName, $result) {
    $exitCode = $null
    $logFile = $null
    $durationText = ""
    $attempts = $null

    if ($result -is [int]) {
        $exitCode = $result
    } else {
        $exitCode = $result.ExitCode
        $logFile = $result.LogFile
        $durationText = $result.DurationText
        $attempts = $result.Attempts
    }

    $extra = ""
    if ($durationText) { $extra += "  ($durationText)" }
    if ($attempts -and $attempts -gt 1) { $extra += "  (retries=" + ($attempts - 1) + ")" }
    if ($logFile) { $extra += "  -> $logFile" }

    if ($exitCode -eq 0) {
        Write-Host ("  [PASS] {0}{1}" -f $testName, $extra) -ForegroundColor $script:GREEN
    } else {
        Write-Host ("  [FAIL] {0} (Exit: {1}){2}" -f $testName, $exitCode, $extra) -ForegroundColor $script:RED
    }
}

function Get-SurefireSummary($repoRoot, $reportNameSuffix) {
    $totalTests = 0
    $totalFailed = 0
    $suites = @()

    $filter = "TEST-*.xml"
    if ($reportNameSuffix) {
        $filter = "TEST-*${reportNameSuffix}.xml"
    }

    Get-ChildItem -Recurse -Filter $filter -Path $repoRoot -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -match "surefire-reports" } |
        ForEach-Object {
            try {
                [xml]$report = Get-Content $_.FullName
                $name = $report.testsuite.name
                $tests = [int]$report.testsuite.tests
                $failures = [int]$report.testsuite.failures
                $errors = [int]$report.testsuite.errors
                $skipped = [int]$report.testsuite.skipped
                $totalTests += $tests
                $totalFailed += ($failures + $errors)
                if ($name) {
                    $suites += [pscustomobject]@{
                        Name = $name
                        Tests = $tests
                        Failed = ($failures + $errors)
                        Skipped = $skipped
                        File = $_.FullName
                    }
                }
            } catch {
                # ignore parse errors
            }
        }

    return [pscustomobject]@{
        TotalTests = $totalTests
        TotalFailed = $totalFailed
        Suites = $suites | Sort-Object Name -Unique
    }
}

function Show-ExecutedTests($repoRoot, $runId) {
    $suffix = ""
    if ($runId) { $suffix = "-" + $runId }
    $summary = Get-SurefireSummary $repoRoot $suffix
    if ($summary.TotalTests -le 0) {
        Write-Host "  (Keine surefire TEST-*.xml Reports gefunden)" -ForegroundColor $script:YELLOW
        return
    }

    Write-Host ("  Tests: {0}, Fehlgeschlagen: {1}, Testklassen: {2}" -f `
        $summary.TotalTests, $summary.TotalFailed, $summary.Suites.Count) -ForegroundColor $script:GREEN

    Write-Host ""
    Write-Host "  Ausgefuehrte Testklassen:" -ForegroundColor $script:CYAN
    $summary.Suites | ForEach-Object {
        $displayName = $_.Name
        if ($suffix -and $displayName) {
            $needle = "(" + $suffix + ")"
            if ($displayName.EndsWith($needle)) {
                $displayName = $displayName.Substring(0, $displayName.Length - $needle.Length)
            }
        }

        $failSuffix = ""
        if ($_.Failed -gt 0) { $failSuffix = " (FAILED=$($_.Failed))" }
        Write-Host ("   - {0}{1}" -f $displayName, $failSuffix)
    }
}

function Assert-DockerRunning($logFile) {
    $oldEap = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $sw = New-Utf8LogWriter $logFile
        try {
            $sw.WriteLine("")
            $sw.WriteLine("===== {0} =====" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss.fff"))
            $sw.WriteLine(">>> docker info")
            $sw.WriteLine("")

            $found = $false
            docker info 2>&1 | ForEach-Object {
                $line = $_.ToString()
                $sw.WriteLine($line)
                if (-not $Quiet) { Write-Host $line }
                if ($line -match "Server Version") { $found = $true }
            } | Out-Null
            return $found
        } finally {
            if ($sw) { $sw.Dispose() }
        }
    } finally {
        $ErrorActionPreference = $oldEap
    }
}

