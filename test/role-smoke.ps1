param(
    [string]$BaseUrl = "http://localhost:8080"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Invoke-ApiCall {
    param(
        [string]$Method,
        [string]$Url,
        [string]$Token,
        [object]$Body = $null
    )

    $headers = @{}
    if ($Token) {
        $headers["Authorization"] = "Bearer $Token"
    }

    $params = @{
        Uri     = $Url
        Method  = $Method
        Headers = $headers
    }

    if ($null -ne $Body) {
        $params["ContentType"] = "application/json; charset=utf-8"
        $params["Body"] = ($Body | ConvertTo-Json -Depth 10)
    }

    try {
        $resp = Invoke-RestMethod @params
        return @{
            Status = 200
            Body   = $resp
        }
    } catch {
        $status = 0
        if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
            $status = [int]$_.Exception.Response.StatusCode
        }
        $bodyText = $null
        if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
            $bodyText = $_.ErrorDetails.Message
        } elseif ($_.Exception -and $_.Exception.Message) {
            $bodyText = $_.Exception.Message
        }
        return @{
            Status = $status
            Body   = $bodyText
        }
    }
}

function Add-TestResult {
    param(
        [string]$Role,
        [string]$Name,
        [int]$Status,
        [int[]]$ExpectedStatus
    )
    $ok = $ExpectedStatus -contains $Status
    [PSCustomObject]@{
        Role     = $Role
        Test     = $Name
        Status   = $Status
        Expected = ($ExpectedStatus -join "/")
        Ok       = $ok
    }
}

Write-Host "=== Gradify Role Smoke Test ===" -ForegroundColor Cyan
Write-Host "BaseUrl: $BaseUrl" -ForegroundColor DarkGray
Write-Host ""

# 1) Demo-User abrufen
$demoResp = Invoke-ApiCall -Method "GET" -Url "$BaseUrl/api/users/demo-logins" -Token $null
if ($demoResp.Status -ne 200 -or -not $demoResp.Body.success -or -not $demoResp.Body.data) {
    Write-Host "FEHLER: Demo-Logins konnten nicht geladen werden." -ForegroundColor Red
    Write-Host "Status: $($demoResp.Status)" -ForegroundColor Red
    exit 1
}

$demoData = $demoResp.Body.data
$demoPassword = $demoData.demoPassword
$demoUsers = @($demoData.users)

if (-not $demoPassword -or $demoUsers.Count -eq 0) {
    Write-Host "FEHLER: Demo-Login-Daten unvollstaendig." -ForegroundColor Red
    exit 1
}

# Gewuenschte Rollen
$wantedRoles = @("ADMIN", "HOCHSCHUL_VERWALTER", "PRUEFUNGSAMT", "LEHRENDER", "STUDENT")
$roleContext = @{}

foreach ($role in $wantedRoles) {
    $user = $demoUsers | Where-Object { $_.rolle -eq $role } | Select-Object -First 1
    if (-not $user) {
        Write-Host "WARN: Kein Demo-User fuer Rolle $role gefunden." -ForegroundColor Yellow
        continue
    }

    $loginBody = @{
        username = $user.username
        password = $demoPassword
    }
    $loginResp = Invoke-ApiCall -Method "POST" -Url "$BaseUrl/api/auth/login" -Token $null -Body $loginBody
    if ($loginResp.Status -ne 200 -or -not $loginResp.Body.success -or -not $loginResp.Body.data.accessToken) {
        Write-Host "FEHLER: Login fehlgeschlagen fuer Rolle $role ($($user.username))" -ForegroundColor Red
        continue
    }

    $roleContext[$role] = @{
        Username = $user.username
        UserId   = $loginResp.Body.data.user.id
        Token    = $loginResp.Body.data.accessToken
    }
}

$script:results = [System.Collections.ArrayList]::new()

function Push-TestResult {
    param(
        [string]$Role,
        [string]$Name,
        [int]$Status,
        [int[]]$ExpectedStatus
    )
    $row = Add-TestResult -Role $Role -Name $Name -Status $Status -ExpectedStatus $ExpectedStatus
    [void]$script:results.Add($row)
}

function Invoke-RoleTests {
    param([string]$Role)
    if (-not $roleContext.ContainsKey($Role)) { return }

    $ctx = $roleContext[$Role]
    $token = $ctx.Token

    # Basis-Checks fuer alle Rollen
    $r = Invoke-ApiCall -Method "GET" -Url "$BaseUrl/api/auth/validate" -Token $token
    Push-TestResult -Role $Role -Name "Auth validate" -Status $r.Status -ExpectedStatus @(200)

    $r = Invoke-ApiCall -Method "GET" -Url "$BaseUrl/api/studiengaenge" -Token $token
    Push-TestResult -Role $Role -Name "GET studiengaenge" -Status $r.Status -ExpectedStatus @(200)

    $r = Invoke-ApiCall -Method "GET" -Url "$BaseUrl/api/noten/gueltige-noten" -Token $token
    Push-TestResult -Role $Role -Name "GET noten/gueltige-noten" -Status $r.Status -ExpectedStatus @(200)

    $r = Invoke-ApiCall -Method "GET" -Url "$BaseUrl/api/berechnungen/berechnungsarten" -Token $token
    Push-TestResult -Role $Role -Name "GET berechnungsarten" -Status $r.Status -ExpectedStatus @(200)

    switch ($Role) {
        "ADMIN" {
            $r = Invoke-ApiCall -Method "GET" -Url "$BaseUrl/api/users" -Token $token
            Push-TestResult -Role $Role -Name "GET users (admin only)" -Status $r.Status -ExpectedStatus @(200)

            $r = Invoke-ApiCall -Method "GET" -Url "$BaseUrl/api/module-zuweisungen" -Token $token
            Push-TestResult -Role $Role -Name "GET module-zuweisungen" -Status $r.Status -ExpectedStatus @(200)
        }
        "HOCHSCHUL_VERWALTER" {
            $r = Invoke-ApiCall -Method "GET" -Url "$BaseUrl/api/users" -Token $token
            Push-TestResult -Role $Role -Name "GET users forbidden" -Status $r.Status -ExpectedStatus @(403)

            $r = Invoke-ApiCall -Method "GET" -Url "$BaseUrl/api/students" -Token $token
            Push-TestResult -Role $Role -Name "GET students" -Status $r.Status -ExpectedStatus @(200)

            $r = Invoke-ApiCall -Method "GET" -Url "$BaseUrl/api/module-zuweisungen" -Token $token
            Push-TestResult -Role $Role -Name "GET module-zuweisungen" -Status $r.Status -ExpectedStatus @(200)
        }
        "PRUEFUNGSAMT" {
            $r = Invoke-ApiCall -Method "GET" -Url "$BaseUrl/api/students" -Token $token
            Push-TestResult -Role $Role -Name "GET students" -Status $r.Status -ExpectedStatus @(200)

            $r = Invoke-ApiCall -Method "GET" -Url "$BaseUrl/api/module-zuweisungen" -Token $token
            Push-TestResult -Role $Role -Name "GET module-zuweisungen" -Status $r.Status -ExpectedStatus @(200)

            $r = Invoke-ApiCall -Method "POST" -Url "$BaseUrl/api/berechnungen/einschreibung/1/berechnen" -Token $token
            Push-TestResult -Role $Role -Name "POST berechnen authorized" -Status $r.Status -ExpectedStatus @(200,400,404)
        }
        "LEHRENDER" {
            $uid = $ctx.UserId
            $r = Invoke-ApiCall -Method "GET" -Url "$BaseUrl/api/module-zuweisungen/dozent/$uid" -Token $token
            Push-TestResult -Role $Role -Name "GET module-zuweisungen/dozent/{id}" -Status $r.Status -ExpectedStatus @(200)

            $r = Invoke-ApiCall -Method "GET" -Url "$BaseUrl/api/module-zuweisungen" -Token $token
            Push-TestResult -Role $Role -Name "GET module-zuweisungen forbidden" -Status $r.Status -ExpectedStatus @(403)

            $r = Invoke-ApiCall -Method "POST" -Url "$BaseUrl/api/noten/1/validate" -Token $token
            Push-TestResult -Role $Role -Name "POST noten validate authorized" -Status $r.Status -ExpectedStatus @(200,400,404)
        }
        "STUDENT" {
            $r = Invoke-ApiCall -Method "GET" -Url "$BaseUrl/api/students" -Token $token
            Push-TestResult -Role $Role -Name "GET students forbidden" -Status $r.Status -ExpectedStatus @(403)

            $r = Invoke-ApiCall -Method "POST" -Url "$BaseUrl/api/berechnungen/einschreibung/1/berechnen" -Token $token
            Push-TestResult -Role $Role -Name "POST berechnen forbidden" -Status $r.Status -ExpectedStatus @(403)

            $r = Invoke-ApiCall -Method "GET" -Url "$BaseUrl/api/noten/audit" -Token $token
            Push-TestResult -Role $Role -Name "GET noten audit forbidden" -Status $r.Status -ExpectedStatus @(403)
        }
    }
}

foreach ($r in $wantedRoles) { Invoke-RoleTests -Role $r }

Write-Host ""
Write-Host "=== Ergebnisse ===" -ForegroundColor Cyan
$results | Sort-Object Role, Test | Format-Table -AutoSize

$failed = @($results | Where-Object { -not $_.Ok })
Write-Host ""
Write-Host "Gesamt: $($results.Count), OK: $($results.Count - $failed.Count), FAIL: $($failed.Count)" -ForegroundColor Cyan

if ($failed.Count -gt 0) {
    Write-Host "Mindestens ein Rollen-Test ist fehlgeschlagen." -ForegroundColor Red
    exit 1
}

Write-Host "Alle Rollen-Smoketests erfolgreich." -ForegroundColor Green
exit 0

