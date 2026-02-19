# ============================================================
#  Gradify CLI - Interaktives Konsolen-Interface
#  Nicht-grafisches UI fuer alle Systemfunktionen
#
#  Version: 1.1
#  Protokolle: REST, GraphQL, gRPC (via API Gateway)
#
#  Nutzung: .\gradify-cli.ps1
#  Voraussetzung: Alle Services muessen laufen (.\start-simple.ps1)
# ============================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "Gradify CLI"
$ErrorActionPreference = "Continue"

# ==================== KONFIGURATION ====================

$script:BaseUrl         = "http://localhost:8080"
$script:Token           = $null
$script:RefreshToken    = $null
$script:UserId          = $null
$script:UserName        = $null
$script:UserRoles       = @()
$script:MandantId       = $null
$script:StudentId       = $null
$script:Einschreibungen = @()
$script:PrimaryRole     = $null   # Hauptrolle fuer Menueanzeige

# ==================== HILFSFUNKTIONEN ====================

function Write-Banner {
    Clear-Host
    Write-Host ""
    Write-Host "   ____               _ _  __       " -ForegroundColor Cyan
    Write-Host "  / ___|_ __ __ _  __| (_)/ _|_   _ " -ForegroundColor Cyan
    Write-Host " | |  _| '__/ _`` |/ _`` | | |_| | | |" -ForegroundColor Cyan
    Write-Host " | |_| | | | (_| | (_| | |  _| |_| |" -ForegroundColor Cyan
    Write-Host "  \____|_|  \__,_|\__,_|_|_|  \__, |" -ForegroundColor Cyan
    Write-Host "                               |___/ " -ForegroundColor Cyan
    Write-Host "  Notenmanagement-System  -  CLI v1.1" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host ("=" * 52) -ForegroundColor DarkGray
}

function Write-Header {
    param([string]$Title)
    Write-Host ""
    Write-Host "  $Title" -ForegroundColor Cyan
    Write-Host ("  " + "-" * ($Title.Length + 2)) -ForegroundColor DarkGray
}

function Write-StatusBar {
    if ($script:Token) {
        $nameDisplay = if ($script:UserName) { $script:UserName } else { "?" }
        $roleDisplay = if ($script:UserRoles -and $script:UserRoles.Count -gt 0) { ($script:UserRoles -join ", ") } else { "?" }
        $mandantDisplay = if ($script:MandantId) { "$($script:MandantId)" } else { "-" }
        Write-Host ""
        Write-Host "  Benutzer: " -NoNewline -ForegroundColor DarkGray
        Write-Host "$nameDisplay" -NoNewline -ForegroundColor Green
        Write-Host "  |  Rolle: " -NoNewline -ForegroundColor DarkGray
        Write-Host "$(Get-RoleDisplayName $script:PrimaryRole)" -NoNewline -ForegroundColor Yellow
        Write-Host "  |  Mandant: " -NoNewline -ForegroundColor DarkGray
        Write-Host "$mandantDisplay" -ForegroundColor Magenta
        if ($script:StudentId) {
            Write-Host "  Student-ID: $($script:StudentId)" -NoNewline -ForegroundColor DarkGray
            if ($script:Einschreibungen.Count -gt 0) {
                Write-Host "  |  Einschreibungen: $($script:Einschreibungen.Count)" -ForegroundColor DarkGray
            } else {
                Write-Host "" # newline
            }
        }
        Write-Host ("  " + "-" * 50) -ForegroundColor DarkGray
    }
}

function Read-MenuChoice {
    param([string]$Prompt = "Auswahl")
    Write-Host ""
    Write-Host "  $Prompt`: " -NoNewline -ForegroundColor Yellow
    return (Read-Host).Trim()
}

function Read-UserInput {
    param(
        [string]$Prompt,
        [switch]$Required,
        [string]$Default = ""
    )
    $suffix = if ($Default) { " [$Default]" } else { "" }
    $marker = if ($Required) { "*" } else { "" }
    Write-Host "  ${marker}${Prompt}${suffix}: " -NoNewline -ForegroundColor Gray
    $value = (Read-Host).Trim()
    if (-not $value -and $Default) { return $Default }
    if ($Required -and -not $value) {
        Write-Host "    Pflichtfeld!" -ForegroundColor Red
        return Read-UserInput -Prompt $Prompt -Required:$Required -Default $Default
    }
    return $value
}

# Validierte Eingabe: Notenwert
function Read-NoteValue {
    param([switch]$Required)
    $gueltig = @(1.0, 1.3, 1.7, 2.0, 2.3, 2.7, 3.0, 3.3, 3.7, 4.0, 5.0)
    while ($true) {
        $value = Read-UserInput -Prompt "Note (1.0-5.0)" -Required:$Required
        if (-not $value -and -not $Required) { return $null }
        try {
            $num = [double]$value
            if ($gueltig -contains $num) { return $num }
            Write-Host "    Ungueltig! Erlaubt: 1.0, 1.3, 1.7, 2.0, 2.3, 2.7, 3.0, 3.3, 3.7, 4.0, 5.0" -ForegroundColor Red
        } catch {
            Write-Host "    Keine gueltige Zahl!" -ForegroundColor Red
        }
    }
}

# Validierte Eingabe: Datum (YYYY-MM-DD)
function Read-DateValue {
    param([string]$Default = "", [switch]$Required)
    while ($true) {
        $value = Read-UserInput -Prompt "Datum (YYYY-MM-DD)" -Default $Default -Required:$Required
        if (-not $value -and -not $Required) { return $null }
        if ($value -match '^\d{4}-\d{2}-\d{2}$') {
            try {
                [datetime]::ParseExact($value, "yyyy-MM-dd", $null) | Out-Null
                return $value
            } catch {
                Write-Host "    Ungueltiges Datum!" -ForegroundColor Red
            }
        } else {
            Write-Host "    Format: YYYY-MM-DD (z.B. 2026-02-11)" -ForegroundColor Red
        }
    }
}

# Validierte Eingabe: Positive Ganzzahl
function Read-PositiveInt {
    param([string]$Prompt, [string]$Default = "", [int]$Min = 1, [int]$Max = 9999)
    while ($true) {
        $value = Read-UserInput -Prompt $Prompt -Default $Default -Required
        try {
            $num = [int]$value
            if ($num -ge $Min -and $num -le $Max) { return $num }
            Write-Host "    Muss zwischen $Min und $Max liegen!" -ForegroundColor Red
        } catch {
            Write-Host "    Keine gueltige Zahl!" -ForegroundColor Red
        }
    }
}

# Validierte Eingabe: Ja/Nein
function Read-YesNo {
    param([string]$Prompt)
    while ($true) {
        $value = Read-UserInput -Prompt "$Prompt (j/n)" -Required
        $lower = $value.ToLower()
        if ($lower -eq "j" -or $lower -eq "ja" -or $lower -eq "y" -or $lower -eq "yes") { return $true }
        if ($lower -eq "n" -or $lower -eq "nein" -or $lower -eq "no") { return $false }
        Write-Host "    Bitte j oder n eingeben!" -ForegroundColor Red
    }
}

# ==================== AUSWAHL-HELFER ====================

# Benutzer auswaehlen
function Select-Benutzer {
    param([string]$Title = "Benutzer auswaehlen")
    Write-Host ""
    Write-Host "  $Title" -ForegroundColor Cyan
    Write-Host "  [1] Aus Liste waehlen  [2] ID eingeben" -ForegroundColor DarkGray
    $mode = Read-MenuChoice
    
    if ($mode -eq "1") {
        $users = Invoke-GradifyApi -Path "/api/users"
        if (-not $users -or $users.Count -eq 0) { Write-Info "Keine Benutzer."; return $null }
        Write-Host ""
        $idx = 1
        foreach ($u in $users) {
            $fullName = "$($u.vorname) $($u.nachname)".Trim()
            if (-not $fullName) { $fullName = $u.benutzername }
            $rollen = if ($u.rollen) { ($u.rollen | ForEach-Object { $_.name -replace '^ROLE_','' }) -join "," } else { "-" }
            Write-Host "    [$($idx.ToString().PadLeft(2))] " -NoNewline -ForegroundColor DarkGray
            Write-Host "$($fullName.PadRight(25))" -NoNewline -ForegroundColor White
            Write-Host " ($($u.benutzername))" -NoNewline -ForegroundColor DarkCyan
            Write-Host " $rollen" -ForegroundColor DarkGray
            $idx++
        }
        Write-Host ""
        $choice = Read-UserInput -Prompt "Nummer" -Required
        $selIdx = [int]$choice - 1
        if ($selIdx -ge 0 -and $selIdx -lt $users.Count) { return $users[$selIdx].id }
        Write-Error "Ungueltige Auswahl."; return $null
    } else {
        return Read-UserInput -Prompt "Benutzer-ID" -Required
    }
}

# Student auswaehlen
function Select-Student {
    param([string]$Title = "Student auswaehlen")
    Write-Host ""
    Write-Host "  $Title" -ForegroundColor Cyan
    Write-Host "  [1] Aus Liste waehlen  [2] ID eingeben" -ForegroundColor DarkGray
    $mode = Read-MenuChoice
    
    if ($mode -eq "1") {
        $students = Invoke-GradifyApi -Path "/api/students"
        if (-not $students -or $students.Count -eq 0) { Write-Info "Keine Studenten."; return $null }
        Write-Host ""
        $idx = 1
        foreach ($s in $students) {
            $name = "$($s.vorname) $($s.nachname)".Trim()
            if (-not $name) { $name = "Student $($s.id)" }
            Write-Host "    [$($idx.ToString().PadLeft(2))] " -NoNewline -ForegroundColor DarkGray
            Write-Host "$($name.PadRight(25))" -NoNewline -ForegroundColor White
            Write-Host " Matr: $($s.matrikelnummer)" -ForegroundColor DarkGray
            $idx++
        }
        Write-Host ""
        $choice = Read-UserInput -Prompt "Nummer" -Required
        $selIdx = [int]$choice - 1
        if ($selIdx -ge 0 -and $selIdx -lt $students.Count) { return $students[$selIdx].id }
        Write-Error "Ungueltige Auswahl."; return $null
    } else {
        return Read-UserInput -Prompt "Student-ID" -Required
    }
}

# Studiengang auswaehlen
function Select-Studiengang {
    param([string]$Title = "Studiengang auswaehlen")
    Write-Host ""
    Write-Host "  $Title" -ForegroundColor Cyan
    
    $studiengaenge = Invoke-GradifyApi -Path "/api/studiengaenge"
    if (-not $studiengaenge -or $studiengaenge.Count -eq 0) { Write-Info "Keine Studiengaenge."; return $null }
    Write-Host ""
    $idx = 1
    foreach ($sg in $studiengaenge) {
        Write-Host "    [$($idx.ToString().PadLeft(2))] " -NoNewline -ForegroundColor DarkGray
        Write-Host "$($sg.name)" -ForegroundColor White
        $idx++
    }
    Write-Host ""
    $choice = Read-UserInput -Prompt "Nummer" -Required
    $selIdx = [int]$choice - 1
    if ($selIdx -ge 0 -and $selIdx -lt $studiengaenge.Count) { return $studiengaenge[$selIdx].id }
    Write-Error "Ungueltige Auswahl."; return $null
}

# Einschreibung auswaehlen
function Select-Einschreibung {
    param([string]$Title = "Einschreibung auswaehlen", [string]$FilterStatus = "")
    Write-Host ""
    Write-Host "  $Title" -ForegroundColor Cyan
    Write-Host "  [1] Aus Liste waehlen  [2] ID eingeben" -ForegroundColor DarkGray
    $mode = Read-MenuChoice
    
    if ($mode -eq "1") {
        $einschreibungen = Invoke-GradifyApi -Path "/api/einschreibungen"
        if ($FilterStatus) { $einschreibungen = @($einschreibungen | Where-Object { $_.status -eq $FilterStatus }) }
        if (-not $einschreibungen -or $einschreibungen.Count -eq 0) { Write-Info "Keine Einschreibungen."; return $null }
        Write-Host ""
        $idx = 1
        foreach ($e in $einschreibungen) {
            $studentName = if ($e.studentName) { $e.studentName } else { "Student $($e.studentId)" }
            $sgName = if ($e.studiengangName) { $e.studiengangName } else { "Stg $($e.studiengangId)" }
            Write-Host "    [$($idx.ToString().PadLeft(2))] " -NoNewline -ForegroundColor DarkGray
            Write-Host "$($studentName.PadRight(20))" -NoNewline -ForegroundColor White
            Write-Host " $sgName | $($e.status)" -ForegroundColor DarkGray
            $idx++
        }
        Write-Host ""
        $choice = Read-UserInput -Prompt "Nummer" -Required
        $selIdx = [int]$choice - 1
        if ($selIdx -ge 0 -and $selIdx -lt $einschreibungen.Count) { return $einschreibungen[$selIdx].id }
        Write-Error "Ungueltige Auswahl."; return $null
    } else {
        return Read-UserInput -Prompt "Einschreibungs-ID" -Required
    }
}

# Rolle auswaehlen
function Select-Rolle {
    Write-Host ""
    $rollen = Invoke-GradifyApi -Path "/api/users/roles"
    if (-not $rollen -or $rollen.Count -eq 0) { Write-Info "Keine Rollen."; return $null }
    Write-Host ""
    $idx = 1
    foreach ($r in $rollen) {
        $name = if ($r.name) { $r.name -replace '^ROLE_','' } else { $r -replace '^ROLE_','' }
        Write-Host "    [$idx] $name" -ForegroundColor White
        $idx++
    }
    Write-Host ""
    $choice = Read-UserInput -Prompt "Nummer" -Required
    $selIdx = [int]$choice - 1
    if ($selIdx -ge 0 -and $selIdx -lt $rollen.Count) {
        $r = $rollen[$selIdx]
        return if ($r.id) { $r.id } else { $r.name }
    }
    Write-Error "Ungueltige Auswahl."; return $null
}

function Confirm-Action {
    param([string]$Message)
    Write-Host "  $Message (j/n): " -NoNewline -ForegroundColor Yellow
    $answer = (Read-Host).Trim().ToLower()
    return ($answer -eq "j" -or $answer -eq "ja" -or $answer -eq "y")
}

function Write-Success { param([string]$Msg) Write-Host "  [OK] $Msg" -ForegroundColor Green }
function Write-Error   { param([string]$Msg) Write-Host "  [!]  $Msg" -ForegroundColor Red }
function Write-Info    { param([string]$Msg) Write-Host "  [i]  $Msg" -ForegroundColor DarkGray }
function Write-Warn    { param([string]$Msg) Write-Host "  [!]  $Msg" -ForegroundColor DarkYellow }

function Pause-CLI {
    Write-Host ""
    Write-Host "  Druecke Enter..." -ForegroundColor DarkGray
    Read-Host | Out-Null
}

# ==================== ROLLEN-PRUEFUNG ====================

function Normalize-Role {
    param([string]$Role)
    if (-not $Role) { return "" }
    $normalized = $Role.Trim().ToUpper()
    if ($normalized.StartsWith("ROLE_")) {
        $normalized = $normalized.Substring(5)
    }
    return $normalized
}

function Normalize-Roles {
    param([object[]]$Roles)
    $result = @()
    foreach ($r in $Roles) {
        $n = Normalize-Role "$r"
        if ($n -and -not ($result -contains $n)) {
            $result += $n
        }
    }
    return $result
}

function Test-HasRole {
    param([string[]]$Roles)
    $currentRoles = Normalize-Roles $script:UserRoles
    $targetRoles = Normalize-Roles $Roles
    foreach ($r in $targetRoles) {
        if ($currentRoles -contains $r) { return $true }
    }
    return $false
}

function Test-IsAdmin       { return (Test-HasRole @("ADMIN")) }
function Test-IsVerwalter   { return (Test-HasRole @("ADMIN", "HOCHSCHUL_VERWALTER")) }
function Test-IsPruefamt    { return (Test-HasRole @("ADMIN", "PRUEFUNGSAMT")) }
function Test-IsLehrender   { return (Test-HasRole @("ADMIN", "LEHRENDER")) }
function Test-IsStudent     { return (Test-HasRole @("STUDENT")) }

function Get-PrimaryRole {
    # Bestimme die Hauptrolle fuer die Menueanzeige (hoechste Berechtigung zuerst)
    $currentRoles = Normalize-Roles $script:UserRoles
    $priority = @("ADMIN", "HOCHSCHUL_VERWALTER", "PRUEFUNGSAMT", "LEHRENDER", "STUDENT")
    foreach ($r in $priority) {
        if ($currentRoles -contains $r) { return $r }
    }
    if ($currentRoles.Count -gt 0) { return $currentRoles[0] }
    return "UNBEKANNT"
}

function Get-RoleDisplayName {
    param([string]$Role)
    $Role = Normalize-Role $Role
    switch ($Role) {
        "ADMIN"                { return "Administrator" }
        "HOCHSCHUL_VERWALTER"  { return "Hochschulverwalter" }
        "PRUEFUNGSAMT"         { return "Pruefungsamt" }
        "LEHRENDER"            { return "Lehrender" }
        "STUDENT"              { return "Student" }
        "UNBEKANNT"            { return "Unbekannt" }
        default                { return $Role }
    }
}

# Lade Studenten-Kontext nach Login (Einschreibungen etc.)
function Initialize-StudentContext {
    if (-not (Test-IsStudent) -and -not $script:StudentId) { return }

    # studentId kommt evtl. schon aus dem Login-Response
    # Falls nicht, ueber Studenten-Endpunkt suchen (benutzerId-Feld)
    if (-not $script:StudentId) {
        $students = Invoke-GradifyApi -Path "/api/students"
        if ($students) {
            foreach ($s in $students) {
                # StudentDto hat Feld "benutzerId" das auf die User-ID verweist
                if ($s.benutzerId -and [string]$s.benutzerId -eq [string]$script:UserId) {
                    $script:StudentId = $s.id
                    break
                }
            }
        }
    }

    if (-not $script:StudentId) {
        Write-Warn "Student-Datensatz konnte nicht zugeordnet werden."
        return
    }

    # Einschreibungen laden (primaer ueber Student-ID)
    $data = Invoke-GradifyApi -Path "/api/einschreibungen" -QueryParams @{ studentId = "$($script:StudentId)" }

    # Fallback fuer Alt-Daten: falls keine Treffer ueber Student-ID, versuche User-ID
    if ((-not $data -or @($data).Count -eq 0) -and $script:UserId -and [string]$script:UserId -ne [string]$script:StudentId) {
        $fallback = Invoke-GradifyApi -Path "/api/einschreibungen" -QueryParams @{ studentId = "$($script:UserId)" }
        if ($fallback -and @($fallback).Count -gt 0) {
            $data = $fallback
            Write-Info "Einschreibungen ueber User-ID-Fallback geladen."
        }
    }

    if ($data) {
        $script:Einschreibungen = @($data)
    } else {
        $script:Einschreibungen = @()
    }
}

# Laedt Module bevorzugt po-spezifisch, sonst ueber Studiengang.
function Get-ModuleForEinschreibung {
    param([object]$Einschreibung)

    if (-not $Einschreibung) { return @() }

    $module = @()
    $poId = $Einschreibung.pruefungsordnungId
    $sgId = $Einschreibung.studiengangId

    if ($poId) {
        $module = Invoke-GradifyApi -Path "/api/studiengaenge/po/$poId/module"
    }

    if ((-not $module -or @($module).Count -eq 0) -and $sgId) {
        $module = Invoke-GradifyApi -Path "/api/studiengaenge/$sgId/module"
    }

    if ($module) { return @($module) }
    return @()
}

# ==================== API-AUFRUF (REST) ====================

function Invoke-GradifyApi {
    param(
        [string]$Path,
        [string]$Method = "GET",
        [object]$Body = $null,
        [hashtable]$QueryParams = @{},
        [hashtable]$ExtraHeaders = @{},
        [switch]$RawResponse
    )

    # Query-Parameter an URL anhaengen
    $uri = "$script:BaseUrl$Path"
    if ($QueryParams.Count -gt 0) {
        $qParts = @()
        foreach ($k in $QueryParams.Keys) {
            if ($null -ne $QueryParams[$k] -and $QueryParams[$k] -ne "") {
                $qParts += "$k=$([System.Uri]::EscapeDataString($QueryParams[$k]))"
            }
        }
        if ($qParts.Count -gt 0) { $uri += "?" + ($qParts -join "&") }
    }

    $params = @{
        Uri         = $uri
        Method      = $Method
        ContentType = "application/json; charset=utf-8"
    }

    # Auth-Header
    $headers = @{}
    if ($script:Token) {
        $headers["Authorization"] = "Bearer $script:Token"
    }
    if ($script:UserId) {
        $headers["X-User-Id"] = "$script:UserId"
    }
    foreach ($k in $ExtraHeaders.Keys) { $headers[$k] = $ExtraHeaders[$k] }
    if ($headers.Count -gt 0) { $params["Headers"] = $headers }

    # Body
    if ($Body -and $Method -ne "GET") {
        if ($Body -is [string]) {
            $params["Body"] = $Body
        } else {
            $params["Body"] = ($Body | ConvertTo-Json -Depth 10)
        }
    }

    try {
        $response = Invoke-RestMethod @params
        if ($RawResponse) { return $response }

        if ($response.PSObject.Properties['success']) {
            if ($response.success) {
                return $response.data
            } else {
                Write-Error $response.message
                return $null
            }
        }
        return $response

    } catch {
        $statusCode = 0
        if ($_.Exception.Response) {
            $statusCode = [int]$_.Exception.Response.StatusCode
        }
        if ($statusCode -eq 401) {
            Write-Error "Sitzung abgelaufen. Bitte erneut anmelden."
            $script:Token = $null
            return $null
        }
        $errMsg = $_.ErrorDetails.Message
        if ($errMsg) {
            try {
                $errObj = $errMsg | ConvertFrom-Json
                if ($errObj.message) { Write-Error $errObj.message }
                else { Write-Error $errMsg }
            } catch {
                Write-Error $errMsg
            }
        } else {
            Write-Error "Verbindungsfehler: $($_.Exception.Message)"
        }
        return $null
    }
}

# ==================== API-AUFRUF (GRAPHQL) ====================

function Invoke-GradifyGraphQL {
    param(
        [string]$Service,   # "user", "studiengang", "noten"
        [string]$Query,
        [hashtable]$Variables = @{}
    )

    $body = @{ query = $Query }
    if ($Variables.Count -gt 0) { $body["variables"] = $Variables }

    $uri = "$script:BaseUrl/graphql/$Service"
    $headers = @{ "Content-Type" = "application/json; charset=utf-8" }
    if ($script:Token) { $headers["Authorization"] = "Bearer $script:Token" }

    try {
        $response = Invoke-RestMethod -Uri $uri -Method POST -Headers $headers `
            -Body ($body | ConvertTo-Json -Depth 10) -ContentType "application/json; charset=utf-8"

        if ($response.errors) {
            foreach ($err in $response.errors) { Write-Error $err.message }
            return $null
        }
        return $response.data

    } catch {
        Write-Error "GraphQL-Fehler: $($_.Exception.Message)"
        return $null
    }
}

# ==================== TABELLEN-FORMATIERUNG ====================

function Show-DataTable {
    param(
        [array]$Data,
        [hashtable[]]$Columns  # @{ Header="Name"; Field="name"; Width=20 }
    )

    if (-not $Data -or $Data.Count -eq 0) {
        Write-Info "Keine Daten vorhanden."
        return
    }

    # Header
    $headerLine = "  "
    $separatorLine = "  "
    foreach ($col in $Columns) {
        $w = if ($col.Width) { $col.Width } else { 15 }
        $headerLine += ($col.Header).PadRight($w) + "  "
        $separatorLine += ("-" * $w) + "  "
    }
    Write-Host ""
    Write-Host $headerLine -ForegroundColor Cyan
    Write-Host $separatorLine -ForegroundColor DarkGray

    # Zeilen
    foreach ($row in $Data) {
        $line = "  "
        foreach ($col in $Columns) {
            $w = if ($col.Width) { $col.Width } else { 15 }
            $val = ""

            if ($col.Expression) {
                $val = & $col.Expression $row
            } elseif ($col.Field) {
                $parts = $col.Field -split "\."
                $obj = $row
                foreach ($p in $parts) {
                    if ($null -ne $obj) { $obj = $obj.$p }
                }
                $val = if ($null -ne $obj) { "$obj" } else { "-" }
            }

            if ($val.Length -gt $w) { $val = $val.Substring(0, $w - 2) + ".." }
            $line += $val.PadRight($w) + "  "
        }
        Write-Host $line
    }

    Write-Host ""
    Write-Info "$($Data.Count) Eintraege"
}

# ============================================================
#                      AUTHENTIFIZIERUNG
# ============================================================

function Show-LoginScreen {
    while (-not $script:Token) {
        Write-Banner
        Write-Header "Anmeldung"
        Write-Host ""

        # Demo-User anzeigen
        Write-Host "  Demo-Zugaenge (Passwort: web00100113!):" -ForegroundColor DarkGray
        Write-Host ""
        Write-Host "    admin               " -NoNewline -ForegroundColor White
        Write-Host " System Administrator      " -NoNewline -ForegroundColor Gray
        Write-Host "(Admin)" -ForegroundColor Red
        Write-Host "    hochschulverwalter  " -NoNewline -ForegroundColor White
        Write-Host " Karl Verwalter            " -NoNewline -ForegroundColor Gray
        Write-Host "(Hochschulverwalter)" -ForegroundColor DarkYellow
        Write-Host "    pruefungsamt        " -NoNewline -ForegroundColor White
        Write-Host " Paula Pruefung            " -NoNewline -ForegroundColor Gray
        Write-Host "(Pruefungsamt)" -ForegroundColor Green
        Write-Host "    prof.mueller        " -NoNewline -ForegroundColor White
        Write-Host " Prof. Dr. Max Mueller     " -NoNewline -ForegroundColor Gray
        Write-Host "(Lehrender)" -ForegroundColor Blue
        Write-Host "    max.mustermann      " -NoNewline -ForegroundColor White
        Write-Host " Max Mustermann            " -NoNewline -ForegroundColor Gray
        Write-Host "(Student)" -ForegroundColor Magenta
        Write-Host ""

        $username = Read-UserInput -Prompt "Benutzername" -Required
        Write-Host "  *Passwort: " -NoNewline -ForegroundColor Gray
        $password = Read-Host

        if (-not $username -or -not $password) {
            Write-Error "Benutzername und Passwort erforderlich."
            Pause-CLI
            continue
        }

        Write-Host ""
        Write-Info "Anmeldung laeuft..."

        $loginBody = @{ username = $username; password = $password }
        $result = Invoke-GradifyApi -Path "/api/auth/login" -Method "POST" -Body $loginBody

        if ($result -and $result.accessToken) {
            $script:Token = $result.accessToken
            $script:RefreshToken = $result.refreshToken

            # Benutzerinfo aus Login-Response extrahieren
            # Response-Format: { accessToken, refreshToken, user: { id, username, roles, mandantId, studentId } }
            if ($result.user) {
                $script:UserId    = $result.user.id
                $script:UserName  = $result.user.username
                $script:UserRoles = @($result.user.roles)
                $script:MandantId = $result.user.mandantId
                $script:StudentId = $result.user.studentId
            } else {
                # Fallback: /api/auth/me (tokenPayload-Format)
                $me = Invoke-GradifyApi -Path "/api/auth/me"
                if ($me) {
                    $payload = if ($me.tokenPayload) { $me.tokenPayload } else { $me }
                    $script:UserId    = if ($payload.sub) { $payload.sub } elseif ($payload.userId) { $payload.userId } elseif ($payload.id) { $payload.id } else { $null }
                    $script:UserName  = if ($payload.username) { $payload.username } elseif ($payload.name) { $payload.name } else { $username }
                    $script:UserRoles = if ($payload.roles) { @($payload.roles) } else { @() }
                    $script:MandantId = $payload.mandantId
                    $script:StudentId = $payload.studentId
                }
            }

            # Letzter Fallback fuer Username
            if (-not $script:UserName) { $script:UserName = $username }
            $script:UserRoles = Normalize-Roles $script:UserRoles
            if (-not $script:UserRoles -or $script:UserRoles.Count -eq 0) { $script:UserRoles = @("UNBEKANNT") }

            $script:PrimaryRole = Get-PrimaryRole
            Write-Success "Erfolgreich angemeldet als $script:UserName ($(Get-RoleDisplayName $script:PrimaryRole))"

            # Student-Kontext laden (Einschreibungen etc.)
            if ((Test-IsStudent) -or $script:StudentId) {
                Write-Info "Lade Studiendaten..."
                Initialize-StudentContext
                if ($script:Einschreibungen.Count -gt 0) {
                    Write-Info "$($script:Einschreibungen.Count) Einschreibung(en) gefunden."
                }
            }

            Start-Sleep -Milliseconds 800
        } else {
            Write-Error "Anmeldung fehlgeschlagen. Benutzername oder Passwort falsch."
            Pause-CLI
        }
    }
}

function Invoke-Logout {
    Invoke-GradifyApi -Path "/api/auth/logout" -Method "POST" | Out-Null
    $script:Token = $null
    $script:RefreshToken = $null
    $script:UserId = $null
    $script:UserName = $null
    $script:UserRoles = @()
    $script:MandantId = $null
    $script:StudentId = $null
    $script:Einschreibungen = @()
    $script:PrimaryRole = $null
    Write-Success "Abgemeldet."
    Start-Sleep -Milliseconds 500
}

# ============================================================
#                   MANDANTEN & STUDIENGAENGE
# ============================================================

function Show-MandantenMenu {
    while ($true) {
        Write-Banner
        Write-StatusBar
        Write-Header "Studiengaenge und Module"
        Write-Host ""
        
        # Mandanten-Ansicht nur fuer Admin/Verwalter
        if ((Test-IsAdmin) -or (Test-IsVerwalter)) {
            Write-Host "  [1]  Alle Mandanten (Hochschulen)"
        }
        
        Write-Host "  [2]  Studiengaenge anzeigen"
        Write-Host "  [3]  Module eines Studiengangs"
        Write-Host "  [4]  Pruefungsordnungen anzeigen"
        Write-Host ""
        Write-Host "  [0]  Zurueck" -ForegroundColor DarkGray

        switch (Read-MenuChoice) {
            "1" { if ((Test-IsAdmin) -or (Test-IsVerwalter)) { Show-AllMandanten } }
            "2" { Show-Studiengaenge }
            "3" { Show-StudiengangModule }
            "4" { Show-Pruefungsordnungen }
            "0" { return }
        }
    }
}

function Show-AllMandanten {
    Write-Header "Mandanten"
    $data = Invoke-GradifyApi -Path "/api/mandanten"
    if ($data) {
        Show-DataTable -Data $data -Columns @(
            @{ Header="ID";      Field="id";      Width=5  },
            @{ Header="Name";    Field="name";    Width=35 },
            @{ Header="Kuerzel"; Field="kuerzel"; Width=10 },
            @{ Header="Aktiv";   Field="aktiv";   Width=8  }
        )
    }
    Pause-CLI
}

function Show-Studiengaenge {
    Write-Header "Studiengaenge"
    
    # Optional Mandant filtern
    if ((Test-IsAdmin) -or (Test-IsVerwalter)) {
        Write-Host ""
        Write-Host "  [1] Alle Studiengaenge  [2] Nach Mandant filtern" -ForegroundColor DarkGray
        $mode = Read-MenuChoice
        $qp = @{}
        if ($mode -eq "2") {
            $mandanten = Invoke-GradifyApi -Path "/api/mandanten"
            if ($mandanten -and $mandanten.Count -gt 0) {
                Write-Host ""
                $idx = 1
                foreach ($m in $mandanten) {
                    Write-Host "    [$idx] $($m.name)" -ForegroundColor White
                    $idx++
                }
                Write-Host ""
                $choice = Read-UserInput -Prompt "Nummer"
                $selIdx = [int]$choice - 1
                if ($selIdx -ge 0 -and $selIdx -lt $mandanten.Count) {
                    $qp["mandantId"] = $mandanten[$selIdx].id
                }
            }
        }
    } else {
        $qp = @{}
    }
    
    $data = Invoke-GradifyApi -Path "/api/studiengaenge" -QueryParams $qp
    if ($data) {
        Write-Host ""
        Show-DataTable -Data $data -Columns @(
            @{ Header="ID";        Field="id";              Width=5  },
            @{ Header="Kuerzel";   Field="kuerzel";         Width=10 },
            @{ Header="Name";      Field="name";            Width=35 },
            @{ Header="Abschluss"; Field="abschlussart";    Width=10 },
            @{ Header="ECTS";      Field="gesamtEcts";      Width=6  },
            @{ Header="Semester";  Field="regelstudienzeit"; Width=8  }
        )
    }
    Pause-CLI
}

function Show-StudiengangModule {
    Write-Header "Module eines Studiengangs"
    
    $sgId = Select-Studiengang -Title "Welchen Studiengang anzeigen?"
    if (-not $sgId) { Pause-CLI; return }

    $data = Invoke-GradifyApi -Path "/api/studiengaenge/$sgId/module"
    if ($data) {
        Write-Host ""
        Show-DataTable -Data $data -Columns @(
            @{ Header="ID";       Field="id";             Width=5  },
            @{ Header="Nr";       Field="modulNr";        Width=5  },
            @{ Header="Name";     Field="name";           Width=30 },
            @{ Header="ECTS";     Field="ects";           Width=5  },
            @{ Header="Sem.";     Field="semester";       Width=5  },
            @{ Header="Typ";      Field="modultyp";       Width=12 },
            @{ Header="Bewertung";Field="bewertungsart";  Width=12 },
            @{ Header="Gewicht";  Field="gewichtung";     Width=8  }
        )
    }
    Pause-CLI
}

function Show-Pruefungsordnungen {
    Write-Header "Pruefungsordnungen"
    $sgId = Read-UserInput -Prompt "Studiengang-ID" -Required
    if (-not $sgId) { return }

    $data = Invoke-GradifyApi -Path "/api/studiengaenge/$sgId/pruefungsordnungen"
    if ($data) {
        Show-DataTable -Data $data -Columns @(
            @{ Header="ID";         Field="id";         Width=5  },
            @{ Header="Version";    Field="version";    Width=12 },
            @{ Header="Gueltig ab"; Field="gueltigAb";  Width=12 },
            @{ Header="Gueltig bis"; Field="gueltigBis"; Width=12 }
        )
    }
    Pause-CLI
}

# ============================================================
#                     BENUTZERVERWALTUNG
# ============================================================

function Show-BenutzerMenu {
    while ($true) {
        Write-Banner
        Write-StatusBar
        Write-Header "Benutzerverwaltung"
        Write-Host ""
        Write-Host "  [1]  Alle Benutzer anzeigen"
        Write-Host "  [2]  Benutzer suchen (ID oder Name)"
        Write-Host "  [3]  Benutzer erstellen"
        Write-Host "  [4]  Benutzer bearbeiten"
        Write-Host "  [5]  Benutzer loeschen"
        Write-Host "  [6]  Rolle zuweisen"
        Write-Host "  [7]  Rolle entfernen"
        Write-Host "  [8]  Verfuegbare Rollen"
        Write-Host ""
        Write-Host "  [0]  Zurueck" -ForegroundColor DarkGray

        switch (Read-MenuChoice) {
            "1" { Show-AllBenutzer }
            "2" { Show-BenutzerSuche }
            "3" { New-Benutzer }
            "4" { Edit-Benutzer }
            "5" { Remove-Benutzer }
            "6" { Add-BenutzerRolle }
            "7" { Remove-BenutzerRolle }
            "8" { Show-Rollen }
            "0" { return }
        }
    }
}

function Show-AllBenutzer {
    Write-Header "Alle Benutzer"
    $data = Invoke-GradifyApi -Path "/api/users"
    if ($data) {
        Show-DataTable -Data $data -Columns @(
            @{ Header="ID";       Field="id";            Width=5  },
            @{ Header="Username"; Field="benutzername";  Width=15 },
            @{ Header="Vorname";  Field="vorname";       Width=15 },
            @{ Header="Nachname"; Field="nachname";      Width=15 },
            @{ Header="E-Mail";   Field="email";         Width=25 },
            @{ Header="Aktiv";    Field="aktiv";         Width=6  },
            @{ Header="Rollen";   Width=25; Expression={ param($r) if($r.rollen){ ($r.rollen | ForEach-Object { ($_.name -replace '^ROLE_','') }) -join ", " }else{"-"} } }
        )
    }
    Pause-CLI
}

function Show-BenutzerSuche {
    Write-Header "Benutzer suchen"
    $searchVal = Read-UserInput -Prompt "ID oder Benutzername" -Required
    if (-not $searchVal) { return }

    $data = $null
    if ($searchVal -match '^\d+$') {
        $data = Invoke-GradifyApi -Path "/api/users/$searchVal"
    } else {
        $data = Invoke-GradifyApi -Path "/api/users/username/$searchVal"
    }

    if ($data) {
        Write-Host ""
        Write-Host "  ID:           $($data.id)" -ForegroundColor White
        Write-Host "  Benutzername: $($data.benutzername)" -ForegroundColor White
        Write-Host "  Vorname:      $($data.vorname)" -ForegroundColor White
        Write-Host "  Nachname:     $($data.nachname)" -ForegroundColor White
        Write-Host "  E-Mail:       $($data.email)" -ForegroundColor White
        Write-Host "  Aktiv:        $($data.aktiv)" -ForegroundColor White
        Write-Host "  Mandant-ID:   $($data.mandantId)" -ForegroundColor White
        $rollen = if ($data.rollen) { ($data.rollen | ForEach-Object { ($_.name -replace '^ROLE_','') }) -join ", " } else { "-" }
        Write-Host "  Rollen:       $rollen" -ForegroundColor Yellow
        Write-Host "  Erstellt am:  $($data.erstelltAm)" -ForegroundColor DarkGray
    }
    Pause-CLI
}

function New-Benutzer {
    Write-Header "Neuen Benutzer erstellen"
    Write-Host ""
    
    $benutzername = Read-UserInput -Prompt "Benutzername" -Required
    if (-not $benutzername) { Pause-CLI; return }
    
    $email = Read-UserInput -Prompt "E-Mail" -Required
    $passwort = Read-UserInput -Prompt "Passwort" -Required
    $vorname = Read-UserInput -Prompt "Vorname" -Required
    $nachname = Read-UserInput -Prompt "Nachname" -Required
    
    # Mandant auswaehlen
    Write-Host ""
    Write-Host "  Mandant auswaehlen:" -ForegroundColor Cyan
    $mandanten = Invoke-GradifyApi -Path "/api/mandanten"
    if (-not $mandanten -or $mandanten.Count -eq 0) {
        Write-Warning "Keine Mandanten vorhanden."
        Pause-CLI; return
    }
    $idx = 1
    foreach ($m in $mandanten) {
        Write-Host "    [$idx] $($m.name)" -ForegroundColor White
        $idx++
    }
    Write-Host ""
    $choice = Read-UserInput -Prompt "Mandant-Nummer"
    $selIdx = [int]$choice - 1
    if ($selIdx -lt 0 -or $selIdx -ge $mandanten.Count) {
        Write-Warning "Ungueltige Auswahl."
        Pause-CLI; return
    }
    $mandantId = $mandanten[$selIdx].id
    
    # Rollen auswaehlen (optional)
    Write-Host ""
    Write-Host "  Rollen auswaehlen (optional):" -ForegroundColor Cyan
    $rollen = Invoke-GradifyApi -Path "/api/users/roles"
    $rollenIds = @()
    if ($rollen -and $rollen.Count -gt 0) {
        $idx = 1
        foreach ($r in $rollen) {
            $roleName = $r.name -replace '^ROLE_', ''
            Write-Host "    [$idx] $roleName" -ForegroundColor White
            $idx++
        }
        Write-Host ""
        $rollenInput = Read-UserInput -Prompt "Rollen-Nummern (kommagetrennt, leer = keine)"
        if ($rollenInput) {
            $nums = $rollenInput -split "," | ForEach-Object { $_.Trim() }
            foreach ($n in $nums) {
                $ri = [int]$n - 1
                if ($ri -ge 0 -and $ri -lt $rollen.Count) {
                    $rollenIds += $rollen[$ri].id
                }
            }
        }
    }
    
    $body = @{
        benutzername = $benutzername
        email        = $email
        passwort     = $passwort
        vorname      = $vorname
        nachname     = $nachname
        mandantId    = $mandantId
    }
    if ($rollenIds.Count -gt 0) {
        $body["rollenIds"] = $rollenIds
    }

    if (Confirm-Action "Benutzer '$benutzername' erstellen?") {
        $result = Invoke-GradifyApi -Path "/api/users" -Method "POST" -Body $body
        if ($result) { Write-Success "Benutzer erstellt (ID: $($result.id))" }
    }
    Pause-CLI
}

function Edit-Benutzer {
    Write-Header "Benutzer bearbeiten"
    $userId = Select-Benutzer -Title "Welchen Benutzer bearbeiten?"
    if (-not $userId) { Pause-CLI; return }

    $current = Invoke-GradifyApi -Path "/api/users/$userId"
    if (-not $current) { Pause-CLI; return }

    Write-Info "Aktuell: $($current.vorname) $($current.nachname) ($($current.email))"
    Write-Info "Leer lassen = unveraendert"
    Write-Host ""

    $body = @{}
    $v = Read-UserInput -Prompt "Neuer Vorname" -Default $current.vorname
    if ($v) { $body["vorname"] = $v }
    $v = Read-UserInput -Prompt "Neuer Nachname" -Default $current.nachname
    if ($v) { $body["nachname"] = $v }
    $v = Read-UserInput -Prompt "Neue E-Mail" -Default $current.email
    if ($v) { $body["email"] = $v }

    if ($body.Count -gt 0) {
        $result = Invoke-GradifyApi -Path "/api/users/$userId" -Method "PUT" -Body $body
        if ($result) { Write-Success "Benutzer aktualisiert." }
    } else {
        Write-Info "Keine Aenderungen."
    }
    Pause-CLI
}

function Remove-Benutzer {
    Write-Header "Benutzer loeschen"
    $userId = Select-Benutzer -Title "Welchen Benutzer loeschen?"
    if (-not $userId) { Pause-CLI; return }

    $current = Invoke-GradifyApi -Path "/api/users/$userId"
    if (-not $current) { Pause-CLI; return }

    if (Confirm-Action "Benutzer '$($current.benutzername)' ($($current.vorname) $($current.nachname)) wirklich loeschen?") {
        $result = Invoke-GradifyApi -Path "/api/users/$userId" -Method "DELETE"
        Write-Success "Benutzer geloescht."
    }
    Pause-CLI
}

function Add-BenutzerRolle {
    Write-Header "Rolle zuweisen"
    $userId = Select-Benutzer -Title "Welchem Benutzer eine Rolle zuweisen?"
    if (-not $userId) { Pause-CLI; return }
    
    Write-Host ""
    Write-Host "  Rolle auswaehlen:" -ForegroundColor Cyan
    $roleId = Select-Rolle
    if (-not $roleId) { Pause-CLI; return }

    $result = Invoke-GradifyApi -Path "/api/users/$userId/roles/$roleId" -Method "POST"
    if ($result) { Write-Success "Rolle zugewiesen." }
    Pause-CLI
}

function Remove-BenutzerRolle {
    Write-Header "Rolle entfernen"
    $userId = Select-Benutzer -Title "Bei welchem Benutzer Rolle entfernen?"
    if (-not $userId) { Pause-CLI; return }
    
    # Zeige aktuelle Rollen des Benutzers
    $user = Invoke-GradifyApi -Path "/api/users/$userId"
    if ($user -and $user.rollen) {
        Write-Host ""
        Write-Host "  Aktuelle Rollen:" -ForegroundColor Cyan
        $idx = 1
        foreach ($r in $user.rollen) {
            $name = $r.name -replace '^ROLE_',''
            Write-Host "    [$idx] $name" -ForegroundColor White
            $idx++
        }
        Write-Host ""
        $choice = Read-UserInput -Prompt "Nummer" -Required
        $selIdx = [int]$choice - 1
        if ($selIdx -ge 0 -and $selIdx -lt $user.rollen.Count) {
            $roleId = $user.rollen[$selIdx].id
            $result = Invoke-GradifyApi -Path "/api/users/$userId/roles/$roleId" -Method "DELETE"
            Write-Success "Rolle entfernt."
        } else {
            Write-Error "Ungueltige Auswahl."
        }
    } else {
        Write-Info "Benutzer hat keine Rollen."
    }
    Pause-CLI
}

function Show-Rollen {
    Write-Header "Verfuegbare Rollen"
    $data = Invoke-GradifyApi -Path "/api/users/roles"
    if ($data) {
        Show-DataTable -Data $data -Columns @(
            @{ Header="ID";           Field="id";           Width=5  },
            @{ Header="Name";         Field="name";         Width=25 },
            @{ Header="Beschreibung"; Field="beschreibung"; Width=40 }
        )
    }
    Pause-CLI
}

# ============================================================
#                    STUDENTENVERWALTUNG
# ============================================================

function Show-StudentenMenu {
    while ($true) {
        Write-Banner
        Write-StatusBar
        Write-Header "Studentenverwaltung"
        Write-Host ""
        Write-Host "  --- Anzeigen ---" -ForegroundColor DarkGray
        Write-Host "  [1]  Alle Studenten anzeigen"
        Write-Host "  [2]  Student suchen (ID oder Matrikel)"
        
        # Verwaltung (Admin, Verwalter)
        if ((Test-IsAdmin) -or (Test-IsVerwalter)) {
            Write-Host ""
            Write-Host "  --- Verwaltung ---" -ForegroundColor DarkGray
            Write-Host "  [3]  Student erstellen"
            Write-Host "  [4]  Student bearbeiten"
            Write-Host "  [5]  Student exmatrikulieren" -ForegroundColor DarkYellow
        }
        
        Write-Host ""
        Write-Host "  [0]  Zurueck" -ForegroundColor DarkGray

        switch (Read-MenuChoice) {
            "1" { Show-AllStudenten }
            "2" { Show-StudentSuche }
            "3" { if ((Test-IsAdmin) -or (Test-IsVerwalter)) { New-Student } }
            "4" { if ((Test-IsAdmin) -or (Test-IsVerwalter)) { Edit-Student } }
            "5" { if ((Test-IsAdmin) -or (Test-IsVerwalter)) { Remove-Student } }
            "0" { return }
        }
    }
}

function Show-AllStudenten {
    Write-Header "Alle Studenten"
    $data = Invoke-GradifyApi -Path "/api/students"
    if ($data) {
        Show-DataTable -Data $data -Columns @(
            @{ Header="ID";       Field="id";              Width=5  },
            @{ Header="Matrikel"; Field="matrikelnummer";  Width=15 },
            @{ Header="Vorname";  Field="vorname";         Width=15 },
            @{ Header="Nachname"; Field="nachname";        Width=15 },
            @{ Header="E-Mail";   Field="email";           Width=25 },
            @{ Header="Status";   Field="status";          Width=16 }
        )
    }
    Pause-CLI
}

function Show-StudentSuche {
    Write-Header "Student suchen"
    $searchVal = Read-UserInput -Prompt "ID oder Matrikelnummer" -Required
    if (-not $searchVal) { return }

    $data = $null
    if ($searchVal -match '^\d+$' -and $searchVal.Length -lt 6) {
        $data = Invoke-GradifyApi -Path "/api/students/$searchVal"
    } else {
        $data = Invoke-GradifyApi -Path "/api/students/matrikel/$searchVal"
    }

    if ($data) {
        Write-Host ""
        Write-Host "  ID:              $($data.id)" -ForegroundColor White
        Write-Host "  Matrikelnummer:  $($data.matrikelnummer)" -ForegroundColor White
        Write-Host "  Vorname:         $($data.vorname)" -ForegroundColor White
        Write-Host "  Nachname:        $($data.nachname)" -ForegroundColor White
        Write-Host "  E-Mail:          $($data.email)" -ForegroundColor White
        Write-Host "  Geburtsdatum:    $($data.geburtsdatum)" -ForegroundColor White
        $statusColor = if ($data.status -eq "AKTIV") { "Green" } elseif ($data.status -eq "EXMATRIKULIERT") { "Red" } else { "Yellow" }
        Write-Host "  Status:          " -NoNewline -ForegroundColor White
        Write-Host "$($data.status)" -ForegroundColor $statusColor
    }
    Pause-CLI
}

function New-Student {
    Write-Header "Neuen Studenten erstellen"
    Write-Host ""
    $mandantKuerzel = Read-UserInput -Prompt "Mandant-Kuerzel (z.B. THM)" -Required
    $body = @{
        vorname      = (Read-UserInput -Prompt "Vorname" -Required)
        nachname     = (Read-UserInput -Prompt "Nachname" -Required)
        email        = (Read-UserInput -Prompt "E-Mail" -Required)
        geburtsdatum = (Read-UserInput -Prompt "Geburtsdatum (YYYY-MM-DD)")
    }

    if (Confirm-Action "Student erstellen?") {
        $result = Invoke-GradifyApi -Path "/api/students" -Method "POST" -Body $body `
            -QueryParams @{ mandantKuerzel = $mandantKuerzel }
        if ($result) {
            Write-Success "Student erstellt (ID: $($result.id), Matrikel: $($result.matrikelnummer))"
        }
    }
    Pause-CLI
}

function Edit-Student {
    Write-Header "Student bearbeiten"
    $studentId = Select-Student -Title "Welchen Student bearbeiten?"
    if (-not $studentId) { Pause-CLI; return }

    $current = Invoke-GradifyApi -Path "/api/students/$studentId"
    if (-not $current) { Pause-CLI; return }

    Write-Info "Aktuell: $($current.vorname) $($current.nachname) ($($current.matrikelnummer))"
    Write-Host ""

    $body = @{}
    $wantDate = Read-UserInput -Prompt "Geburtsdatum aendern? (j/n)"
    if ($wantDate -and $wantDate.ToLower() -eq "j") {
        $v = Read-DateValue
        if ($v) { $body["geburtsdatum"] = $v }
    }
    
    Write-Host ""
    Write-Host "  Status: [1] AKTIV  [2] BEURLAUBT  [3] EXMATRIKULIERT  [Enter] unveraendert" -ForegroundColor DarkGray
    $statusChoice = Read-MenuChoice
    switch ($statusChoice) {
        "1" { $body["status"] = "AKTIV" }
        "2" { $body["status"] = "BEURLAUBT" }
        "3" { $body["status"] = "EXMATRIKULIERT" }
    }

    if ($body.Count -gt 0) {
        $result = Invoke-GradifyApi -Path "/api/students/$studentId" -Method "PUT" -Body $body
        if ($result) { Write-Success "Student aktualisiert." }
    } else {
        Write-Info "Keine Aenderungen."
    }
    Pause-CLI
}

function Remove-Student {
    Write-Header "Student exmatrikulieren"
    $studentId = Select-Student -Title "Welchen Student exmatrikulieren?"
    if (-not $studentId) { Pause-CLI; return }

    $current = Invoke-GradifyApi -Path "/api/students/$studentId"
    if (-not $current) { Pause-CLI; return }

    if (Confirm-Action "Student '$($current.vorname) $($current.nachname)' ($($current.matrikelnummer)) exmatrikulieren?") {
        Invoke-GradifyApi -Path "/api/students/$studentId" -Method "DELETE" | Out-Null
        Write-Success "Student exmatrikuliert."
    }
    Pause-CLI
}

# ============================================================
#                      EINSCHREIBUNGEN
# ============================================================

function Show-EinschreibungMenu {
    while ($true) {
        Write-Banner
        Write-StatusBar
        Write-Header "Einschreibungen"
        Write-Host ""
        Write-Host "  --- Anzeigen ---" -ForegroundColor DarkGray
        Write-Host "  [1]  Alle Einschreibungen anzeigen"
        Write-Host "  [2]  Einschreibungen eines Studenten"
        
        # Verwaltung (Admin, Verwalter, Pruefungsamt)
        if ((Test-IsAdmin) -or (Test-IsVerwalter) -or (Test-IsPruefamt)) {
            Write-Host ""
            Write-Host "  --- Verwaltung ---" -ForegroundColor DarkGray
            Write-Host "  [3]  Neue Einschreibung"
            Write-Host "  [4]  Einschreibung abschliessen"
            Write-Host "  [5]  Semester erhoehen"
        }
        
        # Abbrechen (nur Admin, Verwalter)
        if ((Test-IsAdmin) -or (Test-IsVerwalter)) {
            Write-Host "  [6]  Einschreibung abbrechen" -ForegroundColor DarkYellow
        }
        
        Write-Host ""
        Write-Host "  [0]  Zurueck" -ForegroundColor DarkGray

        switch (Read-MenuChoice) {
            "1" { Show-AllEinschreibungen }
            "2" { Show-StudentEinschreibungen }
            "3" { if ((Test-IsAdmin) -or (Test-IsVerwalter) -or (Test-IsPruefamt)) { New-Einschreibung } }
            "4" { if ((Test-IsAdmin) -or (Test-IsVerwalter) -or (Test-IsPruefamt)) { Complete-Einschreibung } }
            "5" { if ((Test-IsAdmin) -or (Test-IsVerwalter) -or (Test-IsPruefamt)) { Increment-Semester } }
            "6" { if ((Test-IsAdmin) -or (Test-IsVerwalter)) { Cancel-Einschreibung } }
            "0" { return }
        }
    }
}

function Show-AllEinschreibungen {
    Write-Header "Alle Einschreibungen"
    $data = Invoke-GradifyApi -Path "/api/einschreibungen"
    if ($data) {
        Show-DataTable -Data $data -Columns @(
            @{ Header="ID";       Field="id";                    Width=5  },
            @{ Header="Student";  Width=20; Expression={ param($r) if($r.studentName){$r.studentName}else{"#$($r.studentId)"} } },
            @{ Header="Studiengang"; Width=22; Expression={ param($r) if($r.studiengangName){$r.studiengangName}else{"#$($r.studiengangId)"} } },
            @{ Header="Sem.";    Field="aktuellesSemester";      Width=5  },
            @{ Header="Immatrik."; Field="immatrikuliertAm";     Width=12 },
            @{ Header="Status";  Field="status";                 Width=15 }
        )
    }
    Pause-CLI
}

function Show-StudentEinschreibungen {
    Write-Header "Einschreibungen eines Studenten"
    
    $studentId = Select-Student -Title "Welchen Studenten anzeigen?"
    if (-not $studentId) { Pause-CLI; return }

    $data = Invoke-GradifyApi -Path "/api/einschreibungen" -QueryParams @{ studentId = $studentId }
    if ($data) {
        Show-DataTable -Data $data -Columns @(
            @{ Header="ID";         Field="id";                    Width=5  },
            @{ Header="Studiengang"; Width=22; Expression={ param($r) if($r.studiengangName){$r.studiengangName}else{"#$($r.studiengangId)"} } },
            @{ Header="PO";         Width=10; Expression={ param($r) if($r.pruefungsordnungVersion){$r.pruefungsordnungVersion}elseif($r.pruefungsordnungId){"PO #$($r.pruefungsordnungId)"}else{"-"} } },
            @{ Header="Sem.";       Field="aktuellesSemester";     Width=5  },
            @{ Header="Immatrik.";   Field="immatrikuliertAm";     Width=12 },
            @{ Header="Status";      Field="status";               Width=15 }
        )
    }
    Pause-CLI
}

function New-Einschreibung {
    Write-Header "Neue Einschreibung"
    
    # Student auswaehlen
    $studentId = Select-Student -Title "Welchen Student einschreiben?"
    if (-not $studentId) { Pause-CLI; return }
    
    # Studiengang auswaehlen
    $studiengangId = Select-Studiengang -Title "In welchen Studiengang?"
    if (-not $studiengangId) { Pause-CLI; return }

    # Pruefungsordnung auswaehlen (Pflichtfeld im Backend)
    $pruefungsordnungen = Invoke-GradifyApi -Path "/api/studiengaenge/$studiengangId/pruefungsordnungen"
    if (-not $pruefungsordnungen -or $pruefungsordnungen.Count -eq 0) {
        Write-Error "Keine Pruefungsordnungen fuer diesen Studiengang gefunden."
        Pause-CLI; return
    }

    Write-Host ""
    Write-Host "  Pruefungsordnung auswaehlen:" -ForegroundColor Cyan
    $idx = 1
    foreach ($po in $pruefungsordnungen) {
        $version = if ($po.version) { $po.version } else { "PO $($po.id)" }
        $gueltigAb = if ($po.gueltigAb) { " (gueltig ab $($po.gueltigAb))" } else { "" }
        Write-Host "    [$idx] $version$gueltigAb" -ForegroundColor White
        $idx++
    }
    Write-Host ""
    $choice = Read-UserInput -Prompt "PO-Nummer" -Required
    $selIdx = [int]$choice - 1
    if ($selIdx -lt 0 -or $selIdx -ge $pruefungsordnungen.Count) {
        Write-Error "Ungueltige Auswahl."
        Pause-CLI; return
    }
    $pruefungsordnungId = $pruefungsordnungen[$selIdx].id
    
    $body = @{
        studentId         = [int]$studentId
        studiengangId     = [int]$studiengangId
        pruefungsordnungId = [int]$pruefungsordnungId
    }

    if (Confirm-Action "Einschreibung erstellen?") {
        $result = Invoke-GradifyApi -Path "/api/einschreibungen" -Method "POST" -Body $body
        if ($result) { Write-Success "Einschreibung erstellt (ID: $($result.id))" }
    }
    Pause-CLI
}

function Complete-Einschreibung {
    Write-Header "Einschreibung abschliessen"
    $id = Select-Einschreibung -Title "Welche Einschreibung abschliessen?" -FilterStatus "AKTIV"
    if (-not $id) { Pause-CLI; return }

    if (Confirm-Action "Einschreibung $id als abgeschlossen markieren?") {
        $result = Invoke-GradifyApi -Path "/api/einschreibungen/$id/abschliessen" -Method "POST"
        if ($result) { Write-Success "Einschreibung abgeschlossen." }
    }
    Pause-CLI
}

function Cancel-Einschreibung {
    Write-Header "Einschreibung abbrechen"
    $id = Select-Einschreibung -Title "Welche Einschreibung abbrechen?" -FilterStatus "AKTIV"
    if (-not $id) { Pause-CLI; return }

    if (Confirm-Action "Einschreibung $id wirklich abbrechen?") {
        $result = Invoke-GradifyApi -Path "/api/einschreibungen/$id/abbrechen" -Method "POST"
        if ($result) { Write-Success "Einschreibung abgebrochen." }
    }
    Pause-CLI
}

function Increment-Semester {
    Write-Header "Semester erhoehen"
    $id = Select-Einschreibung -Title "Bei welcher Einschreibung Semester erhoehen?" -FilterStatus "AKTIV"
    if (-not $id) { Pause-CLI; return }

    $result = Invoke-GradifyApi -Path "/api/einschreibungen/$id/semester" -Method "POST"
    if ($result) { Write-Success "Semester erhoeht auf $($result.aktuellesSemester)." }
    Pause-CLI
}

# ============================================================
#                      NOTENVERWALTUNG
# ============================================================

function Show-NotenMenu {
    while ($true) {
        Write-Banner
        Write-StatusBar
        Write-Header "Notenverwaltung"
        Write-Host ""
        
        # Anzeige-Optionen (alle Rollen mit Zugang)
        Write-Host "  --- Anzeigen ---" -ForegroundColor DarkGray
        Write-Host "  [1]  Noten einer Einschreibung"
        Write-Host "  [2]  Noten eines Moduls"
        Write-Host "  [3]  Gueltige Notenwerte"
        Write-Host "  [4]  Notenstatistik"
        
        # Erfassung (Admin, Lehrender)
        if ((Test-IsAdmin) -or (Test-IsLehrender)) {
            Write-Host ""
            Write-Host "  --- Erfassung ---" -ForegroundColor DarkGray
            Write-Host "  [5]  Note erfassen"
            Write-Host "  [6]  Note bearbeiten"
        }
        
        # Validierung/Freigabe (Admin, Pruefungsamt, Verwalter)
        if ((Test-IsAdmin) -or (Test-IsPruefamt) -or (Test-IsVerwalter)) {
            Write-Host ""
            Write-Host "  --- Validierung ---" -ForegroundColor DarkGray
            Write-Host "  [7]  Note validieren"
            Write-Host "  [8]  Note freigeben"
            Write-Host "  [9]  Note ablehnen (Rueckstufung)"
        }
        
        # Loeschen (nur Admin)
        if (Test-IsAdmin) {
            Write-Host ""
            Write-Host "  [10] Note loeschen" -ForegroundColor DarkRed
        }
        
        Write-Host ""
        Write-Host "  [0]  Zurueck" -ForegroundColor DarkGray

        switch (Read-MenuChoice) {
            "1"  { Show-NotenEinschreibung }
            "2"  { Show-NotenModul }
            "3"  { Show-GueltigeNoten }
            "4"  { Show-NotenStatistik }
            "5"  { if ((Test-IsAdmin) -or (Test-IsLehrender)) { New-Note } }
            "6"  { if ((Test-IsAdmin) -or (Test-IsLehrender)) { Edit-Note } }
            "7"  { if ((Test-IsAdmin) -or (Test-IsPruefamt) -or (Test-IsVerwalter)) { Confirm-Note } }
            "8"  { if ((Test-IsAdmin) -or (Test-IsPruefamt) -or (Test-IsVerwalter)) { Release-Note } }
            "9"  { if ((Test-IsAdmin) -or (Test-IsPruefamt) -or (Test-IsVerwalter)) { Reject-Note } }
            "10" { if (Test-IsAdmin) { Remove-Note } }
            "0"  { return }
        }
    }
}

function Format-NoteRow {
    param($note)
    $noteStr = if ($null -ne $note.noteWert) { "{0:N1}" -f $note.noteWert } else { "-" }
    $bestanden = if ($note.bestanden) { "Ja" } elseif ($null -eq $note.bestanden) { "-" } else { "Nein" }
    $statusColor = switch ($note.status) {
        "ERFASST"     { "Yellow" }
        "VALIDIERT"   { "Cyan" }
        "FREIGEGEBEN" { "Green" }
        default       { "White" }
    }
    return @{ NoteStr=$noteStr; Bestanden=$bestanden; StatusColor=$statusColor }
}

function Show-NotenEinschreibung {
    Write-Header "Noten einer Einschreibung"
    
    $eid = Select-Einschreibung -Title "Welche Einschreibung anzeigen?"
    if (-not $eid) { Pause-CLI; return }

    $data = Invoke-GradifyApi -Path "/api/noten/einschreibung/$eid"
    if ($data) {
        Show-DataTable -Data $data -Columns @(
            @{ Header="ID";       Field="id";         Width=5  },
            @{ Header="Modul";    Field="modulId";    Width=6  },
            @{ Header="Note";     Width=6;  Expression={ param($r) if($null -ne $r.noteWert){"{0:N1}" -f $r.noteWert}else{"-"} } },
            @{ Header="Best.";    Width=6;  Expression={ param($r) if($r.bestanden){"Ja"}elseif($null -eq $r.bestanden){"-"}else{"Nein"} } },
            @{ Header="Versuch";  Field="versuch";    Width=7  },
            @{ Header="Status";   Field="status";     Width=13 },
            @{ Header="Datum";    Field="pruefungsdatum"; Width=12 },
            @{ Header="Kommentar";Field="kommentar";  Width=20 }
        )
    }
    Pause-CLI
}

function Show-NotenModul {
    Write-Header "Noten eines Moduls"
    
    # Erst Studiengang waehlen, dann Modul
    $sgId = Select-Studiengang -Title "Aus welchem Studiengang?"
    if (-not $sgId) { Pause-CLI; return }
    
    $module = Invoke-GradifyApi -Path "/api/studiengaenge/$sgId/module"
    if (-not $module -or $module.Count -eq 0) {
        Write-Warning "Keine Module in diesem Studiengang."
        Pause-CLI; return
    }
    
    Write-Host ""
    $idx = 1
    foreach ($m in $module) {
        Write-Host "    [$idx] $($m.name) (ECTS: $($m.ects))" -ForegroundColor White
        $idx++
    }
    Write-Host ""
    $choice = Read-UserInput -Prompt "Modul-Nummer"
    $selIdx = [int]$choice - 1
    if ($selIdx -lt 0 -or $selIdx -ge $module.Count) {
        Write-Warning "Ungueltige Auswahl."
        Pause-CLI; return
    }
    $mid = $module[$selIdx].id

    $data = Invoke-GradifyApi -Path "/api/noten/modul/$mid"
    if ($data) {
        Write-Host ""
        Write-Host "  Modul: $($module[$selIdx].name)" -ForegroundColor Cyan
        Show-DataTable -Data $data -Columns @(
            @{ Header="ID";       Field="id";             Width=5  },
            @{ Header="Einschr."; Field="einschreibungId"; Width=9  },
            @{ Header="Note";     Width=6;  Expression={ param($r) if($null -ne $r.noteWert){"{0:N1}" -f $r.noteWert}else{"-"} } },
            @{ Header="Best.";    Width=6;  Expression={ param($r) if($r.bestanden){"Ja"}elseif($null -eq $r.bestanden){"-"}else{"Nein"} } },
            @{ Header="Versuch";  Field="versuch";        Width=7  },
            @{ Header="Status";   Field="status";         Width=13 },
            @{ Header="Datum";    Field="pruefungsdatum"; Width=12 }
        )
    }
    Pause-CLI
}

function New-Note {
    Write-Header "Note erfassen"
    
    # 1. Student/Einschreibung auswaehlen
    Write-Host ""
    Write-Host "  Schritt 1: Student auswaehlen" -ForegroundColor Cyan
    Write-Host ""
    
    $einschreibungen = Invoke-GradifyApi -Path "/api/einschreibungen"
    if (-not $einschreibungen -or $einschreibungen.Count -eq 0) {
        Write-Error "Keine Einschreibungen gefunden."
        Pause-CLI; return
    }
    
    # Zeige Einschreibungen mit Studentenname
    $idx = 1
    $einschreibungListe = @()
    foreach ($e in $einschreibungen) {
        $studentName = if ($e.studentName) { $e.studentName } else { "Student $($e.studentId)" }
        $sgName = if ($e.studiengangName) { $e.studiengangName } else { "Studiengang $($e.studiengangId)" }
        Write-Host "    [$idx] " -NoNewline -ForegroundColor DarkGray
        Write-Host "$studentName" -NoNewline -ForegroundColor White
        Write-Host " - $sgName (Sem. $($e.aktuellesSemester))" -ForegroundColor DarkGray
        $einschreibungListe += $e
        $idx++
    }
    
    $choice = Read-UserInput -Prompt "Nummer" -Required
    $selIdx = [int]$choice - 1
    if ($selIdx -lt 0 -or $selIdx -ge $einschreibungListe.Count) {
        Write-Error "Ungueltige Auswahl."; Pause-CLI; return
    }
    $selectedEinschreibung = $einschreibungListe[$selIdx]
    
    # 2. Modul auswaehlen
    Write-Host ""
    Write-Host "  Schritt 2: Modul auswaehlen" -ForegroundColor Cyan
    Write-Host ""
    
    $module = Get-ModuleForEinschreibung -Einschreibung $selectedEinschreibung
    if (-not $module -or $module.Count -eq 0) {
        Write-Error "Keine Module fuer diese Einschreibung gefunden."
        Pause-CLI; return
    }
    
    $idx = 1
    $modulListe = @()
    foreach ($m in $module) {
        $bewertung = if ($m.bewertungsart -eq "BESTANDEN_NICHT_BESTANDEN") { " [b/nb]" } else { "" }
        Write-Host "    [$($idx.ToString().PadLeft(2))] " -NoNewline -ForegroundColor DarkGray
        Write-Host "$($m.name.PadRight(30).Substring(0,30))" -NoNewline -ForegroundColor White
        Write-Host " $($m.ects) ECTS  Sem.$($m.semester)$bewertung" -ForegroundColor DarkGray
        $modulListe += $m
        $idx++
    }
    
    $choice = Read-UserInput -Prompt "Nummer" -Required
    $selIdx = [int]$choice - 1
    if ($selIdx -lt 0 -or $selIdx -ge $modulListe.Count) {
        Write-Error "Ungueltige Auswahl."; Pause-CLI; return
    }
    $selectedModul = $modulListe[$selIdx]
    
    # 3. Note eingeben
    Write-Host ""
    Write-Host "  Schritt 3: Note eingeben" -ForegroundColor Cyan
    Write-Host ""
    
    $studentName = if ($selectedEinschreibung.studentName) { $selectedEinschreibung.studentName } else { "Student $($selectedEinschreibung.studentId)" }
    Write-Host "    Student: $studentName" -ForegroundColor White
    Write-Host "    Modul:   $($selectedModul.name)" -ForegroundColor White
    Write-Host ""
    
    $body = @{
        einschreibungId = [int]$selectedEinschreibung.id
        modulId         = [int]$selectedModul.id
        versuch         = Read-PositiveInt -Prompt "Versuch (1-3)" -Default "1" -Min 1 -Max 3
        pruefungsdatum  = Read-DateValue -Default (Get-Date -Format "yyyy-MM-dd") -Required
    }
    
    if ($selectedModul.bewertungsart -eq "NOTE") {
        $noteWert = Read-NoteValue -Required
        $body["noteWert"] = $noteWert
        $body["bestanden"] = ($noteWert -le 4.0)
    } else {
        $body["bestanden"] = Read-YesNo -Prompt "Bestanden"
    }
    
    $kommentar = Read-UserInput -Prompt "Kommentar (optional)"
    if ($kommentar) { $body["kommentar"] = $kommentar }

    Write-Host ""
    if (Confirm-Action "Note erfassen?") {
        $result = Invoke-GradifyApi -Path "/api/noten" -Method "POST" -Body $body
        if ($result) { Write-Success "Note erfasst (ID: $($result.id))" }
    }
    Pause-CLI
}

function Edit-Note {
    Write-Header "Note bearbeiten"
    
    # Zuerst Einschreibung waehlen um Noten zu sehen
    Write-Host ""
    Write-Host "  [1] Note per ID bearbeiten" -ForegroundColor White
    Write-Host "  [2] Erst Noten anzeigen (nach Einschreibung)" -ForegroundColor White
    Write-Host ""
    
    $mode = Read-MenuChoice
    
    $noteId = $null
    if ($mode -eq "2") {
        # Noten einer Einschreibung anzeigen
        $eid = Read-UserInput -Prompt "Einschreibungs-ID" -Required
        $noten = Invoke-GradifyApi -Path "/api/noten/einschreibung/$eid"
        if (-not $noten -or $noten.Count -eq 0) {
            Write-Info "Keine Noten fuer diese Einschreibung."
            Pause-CLI; return
        }
        Write-Host ""
        foreach ($n in $noten) {
            $noteStr = if ($null -ne $n.noteWert) { "{0:N1}" -f $n.noteWert } else { "b/nb" }
            $statusColor = switch ($n.status) { "FREIGEGEBEN" { "Green" }; "VALIDIERT" { "Cyan" }; "ERFASST" { "Yellow" }; default { "Gray" } }
            Write-Host "    ID $($n.id.ToString().PadLeft(3)): " -NoNewline -ForegroundColor DarkGray
            Write-Host "Modul $($n.modulId.ToString().PadLeft(2))" -NoNewline -ForegroundColor White
            Write-Host " | $noteStr | " -NoNewline -ForegroundColor Gray
            Write-Host "$($n.status)" -ForegroundColor $statusColor
        }
        Write-Host ""
        $noteId = Read-UserInput -Prompt "Noten-ID zum Bearbeiten" -Required
    } else {
        $noteId = Read-UserInput -Prompt "Noten-ID" -Required
    }
    
    if (-not $noteId) { return }

    $current = Invoke-GradifyApi -Path "/api/noten/$noteId"
    if (-not $current) { Pause-CLI; return }

    $curNote = if ($null -ne $current.noteWert) { "{0:N1}" -f $current.noteWert } else { "-" }
    Write-Host ""
    Write-Info "Aktuell: Modul $($current.modulId), Note $curNote, Versuch $($current.versuch), Status $($current.status)"
    Write-Host ""

    $body = @{}
    
    # Neue Note (optional mit Validierung)
    $wantNote = Read-UserInput -Prompt "Neue Note aendern? (j/n, Enter=nein)"
    if ($wantNote -and ($wantNote.ToLower() -eq "j" -or $wantNote.ToLower() -eq "ja")) {
        $noteWert = Read-NoteValue -Required
        $body["noteWert"] = $noteWert
        $body["bestanden"] = ($noteWert -le 4.0)
    }
    
    # Datum (optional mit Validierung)
    $v = Read-UserInput -Prompt "Neues Datum YYYY-MM-DD (leer = unveraendert)"
    if ($v) {
        if ($v -match '^\d{4}-\d{2}-\d{2}$') {
            try {
                [datetime]::ParseExact($v, "yyyy-MM-dd", $null) | Out-Null
                $body["pruefungsdatum"] = $v
            } catch {
                Write-Host "    Ignoriert (ungueltiges Datum)" -ForegroundColor DarkYellow
            }
        } else {
            Write-Host "    Ignoriert (Format: YYYY-MM-DD)" -ForegroundColor DarkYellow
        }
    }
    
    $v = Read-UserInput -Prompt "Kommentar (leer = unveraendert)"
    if ($v) { $body["kommentar"] = $v }

    if ($body.Count -gt 0) {
        $result = Invoke-GradifyApi -Path "/api/noten/$noteId" -Method "PUT" -Body $body
        if ($result) { Write-Success "Note aktualisiert." }
    } else {
        Write-Info "Keine Aenderungen."
    }
    Pause-CLI
}

# Hilfsfunktion: Noten mit bestimmtem Status anzeigen und auswaehlen
function Select-NoteByStatus {
    param([string]$Title, [string]$FilterStatus)
    
    Write-Host ""
    Write-Host "  Einschreibungs-ID eingeben oder [Enter] fuer alle:" -ForegroundColor DarkGray
    $eid = Read-UserInput -Prompt "Einschreibungs-ID (optional)"
    
    $noten = @()
    if ($eid) {
        $noten = Invoke-GradifyApi -Path "/api/noten/einschreibung/$eid"
    } else {
        # Alle Noten holen (Admin-Funktion)
        $noten = Invoke-GradifyApi -Path "/api/noten"
    }
    
    if (-not $noten -or $noten.Count -eq 0) {
        Write-Info "Keine Noten gefunden."
        return $null
    }
    
    # Nach Status filtern
    $filtered = @($noten | Where-Object { $_.status -eq $FilterStatus })
    if ($filtered.Count -eq 0) {
        Write-Info "Keine Noten mit Status '$FilterStatus' gefunden."
        return $null
    }
    
    Write-Host ""
    Write-Host "  Noten mit Status $FilterStatus ($($filtered.Count)):" -ForegroundColor Cyan
    Write-Host ""
    foreach ($n in $filtered) {
        $noteStr = if ($null -ne $n.noteWert) { "{0:N1}" -f $n.noteWert } else { "b/nb" }
        Write-Host "    ID $($n.id.ToString().PadLeft(3)): " -NoNewline -ForegroundColor DarkGray
        Write-Host "Einschr. $($n.einschreibungId)" -NoNewline -ForegroundColor White
        Write-Host " | Modul $($n.modulId) | $noteStr" -ForegroundColor Gray
    }
    Write-Host ""
    
    $noteId = Read-UserInput -Prompt "Noten-ID" -Required
    return $noteId
}

function Confirm-Note {
    Write-Header "Note validieren"
    Write-Info "Validiert Noten mit Status ERFASST"
    
    $noteId = Select-NoteByStatus -Title "Validieren" -FilterStatus "ERFASST"
    if (-not $noteId) { Pause-CLI; return }
    
    $kommentar = Read-UserInput -Prompt "Kommentar (optional)"
    $qp = @{}
    if ($kommentar) { $qp["kommentar"] = $kommentar }

    $result = Invoke-GradifyApi -Path "/api/noten/$noteId/validate" -Method "POST" -QueryParams $qp
    if ($result) { Write-Success "Note validiert (Status: $($result.status))" }
    Pause-CLI
}

function Release-Note {
    Write-Header "Note freigeben"
    Write-Info "Gibt Noten mit Status VALIDIERT frei"
    
    $noteId = Select-NoteByStatus -Title "Freigeben" -FilterStatus "VALIDIERT"
    if (-not $noteId) { Pause-CLI; return }

    $result = Invoke-GradifyApi -Path "/api/noten/$noteId/release" -Method "POST"
    if ($result) { Write-Success "Note freigegeben (Status: $($result.status))" }
    Pause-CLI
}

function Reject-Note {
    Write-Header "Note ablehnen (Rueckstufung)"
    Write-Info "Stuft validierte Noten zurueck auf ERFASST"
    
    $noteId = Select-NoteByStatus -Title "Ablehnen" -FilterStatus "VALIDIERT"
    if (-not $noteId) { Pause-CLI; return }
    
    $kommentar = Read-UserInput -Prompt "Begruendung"
    $qp = @{}
    if ($kommentar) { $qp["kommentar"] = $kommentar }

    $result = Invoke-GradifyApi -Path "/api/noten/$noteId/reject" -Method "POST" -QueryParams $qp
    if ($result) { Write-Success "Note zurueckgestuft (Status: $($result.status))" }
    Pause-CLI
}

function Remove-Note {
    Write-Header "Note loeschen"
    $noteId = Read-UserInput -Prompt "Noten-ID" -Required
    if (-not $noteId) { return }

    if (Confirm-Action "Note $noteId wirklich loeschen? (Nur moeglich bei Status ERFASST)") {
        Invoke-GradifyApi -Path "/api/noten/$noteId" -Method "DELETE" | Out-Null
        Write-Success "Note geloescht."
    }
    Pause-CLI
}

function Show-GueltigeNoten {
    Write-Header "Gueltige Notenwerte"
    $data = Invoke-GradifyApi -Path "/api/noten/gueltige-noten"
    if ($data) {
        Write-Host ""
        Write-Host "  Notenskala:" -ForegroundColor Cyan
        Write-Host ""
        $sortedData = $data | Sort-Object
        foreach ($note in $sortedData) {
            $color = if ($note -le 1.5) { "Green" } elseif ($note -le 2.5) { "Cyan" } elseif ($note -le 3.5) { "Yellow" } elseif ($note -le 4.0) { "DarkYellow" } else { "Red" }
            $label = switch ([string]$note) {
                "1.0" { "sehr gut" }
                "1.3" { "sehr gut (-)" }
                "1.7" { "gut (+)" }
                "2.0" { "gut" }
                "2.3" { "gut (-)" }
                "2.7" { "befriedigend (+)" }
                "3.0" { "befriedigend" }
                "3.3" { "befriedigend (-)" }
                "3.7" { "ausreichend (+)" }
                "4.0" { "ausreichend" }
                "5.0" { "nicht bestanden" }
                default { "" }
            }
            Write-Host ("    {0,4:N1}  -  {1}" -f $note, $label) -ForegroundColor $color
        }
        Write-Host ""
    }
    Pause-CLI
}

function Show-NotenStatistik {
    Write-Header "Notenstatistik"
    $data = Invoke-GradifyApi -Path "/api/noten/stats"
    if ($data) {
        $total = if ($data.total) { $data.total } else { 0 }
        $erfasst = if ($data.erfasst) { $data.erfasst } else { 0 }
        $validiert = if ($data.validiert) { $data.validiert } else { 0 }
        $freigegeben = if ($data.freigegeben) { $data.freigegeben } else { 0 }
        Write-Host ""
        Write-Host "  Gesamt:      $total" -ForegroundColor White
        Write-Host "  Erfasst:     $erfasst" -ForegroundColor Yellow
        Write-Host "  Validiert:   $validiert" -ForegroundColor Cyan
        Write-Host "  Freigegeben: $freigegeben" -ForegroundColor Green
        Write-Host ""
    }
    Pause-CLI
}

# ============================================================
#                  BERECHNUNGEN & FORTSCHRITT
# ============================================================

function Show-BerechnungMenu {
    while ($true) {
        Write-Banner
        Write-StatusBar
        Write-Header "Berechnungen und Fortschritt"
        Write-Host ""
        Write-Host "  --- Anzeigen ---" -ForegroundColor DarkGray
        Write-Host "  [1]  Berechnungsdetails anzeigen"
        Write-Host "  [2]  Studienfortschritt anzeigen"
        Write-Host "  [3]  Durchschnittsnote (gesamt)"
        Write-Host "  [4]  Berechnungsarten anzeigen"
        
        # Berechnung ausloesen (Admin, Pruefungsamt)
        if ((Test-IsAdmin) -or (Test-IsPruefamt)) {
            Write-Host ""
            Write-Host "  --- Aktionen ---" -ForegroundColor DarkGray
            Write-Host "  [5]  Gesamtnote neu berechnen"
        }
        
        Write-Host ""
        Write-Host "  [0]  Zurueck" -ForegroundColor DarkGray

        switch (Read-MenuChoice) {
            "1" { Show-BerechnungsDetails }
            "2" { Show-Fortschritt }
            "3" { Show-Durchschnitt }
            "4" { Show-Berechnungsarten }
            "5" { if ((Test-IsAdmin) -or (Test-IsPruefamt)) { Invoke-Berechnung } }
            "0" { return }
        }
    }
}

function Invoke-Berechnung {
    Write-Header "Gesamtnote berechnen"
    
    $eid = Select-Einschreibung -Title "Fuer welche Einschreibung berechnen?" -StatusFilter "AKTIV"
    if (-not $eid) { Pause-CLI; return }

    Write-Info "Berechnung wird ausgefuehrt..."
    $result = Invoke-GradifyApi -Path "/api/berechnungen/einschreibung/$eid/berechnen" -Method "POST"
    if ($result) {
        Write-Host ""
        $note = Get-Gesamtnote $result
        $noteStr = if ($null -ne $note) { "{0:N2}" -f $note } else { "noch nicht berechenbar" }
        Write-Host "  Gesamtnote: " -NoNewline -ForegroundColor White
        Write-Host "$noteStr" -ForegroundColor (Get-NoteColor $note)
        if ($result.status) { Write-Host "  Status: $($result.status)" -ForegroundColor DarkGray }
        if ($result.berechnungsart) { Write-Host "  Berechnungsart: $($result.berechnungsart)" -ForegroundColor DarkGray }
        Write-Success "Berechnung abgeschlossen."
    }
    Pause-CLI
}

function Show-BerechnungsDetails {
    Write-Header "Berechnungsdetails"
    
    $eid = Select-Einschreibung -Title "Welche Einschreibung anzeigen?"
    if (-not $eid) { Pause-CLI; return }

    $data = Invoke-GradifyApi -Path "/api/berechnungen/einschreibung/$eid/details"
    if ($data) {
        Show-BerechnungDetailData $data
    }
    Pause-CLI
}

# Gemeinsame Anzeige fuer Berechnungsdetails (admin + student)
function Show-BerechnungDetailData {
    param($data)
    Write-Host ""
    $note = Get-Gesamtnote $data
    if ($null -ne $note) {
        Write-Host "  Gesamtnote: " -NoNewline -ForegroundColor White
        Write-Host ("{0:N2}" -f $note) -ForegroundColor (Get-NoteColor $note)
    }
    if ($data.status) { Write-Host "  Status: $($data.status)" -ForegroundColor DarkGray }
    if ($data.berechnungsart) { Write-Host "  Berechnungsart: $($data.berechnungsart)" -ForegroundColor DarkGray }
    Write-Host ""

    if ($data.modulDetails) {
        Show-DataTable -Data $data.modulDetails -Columns @(
            @{ Header="Modul";     Field="modulName";  Width=30 },
            @{ Header="Note";      Width=6;  Expression={ param($r) if($null -ne $r.note){"{0:N1}" -f $r.note}elseif($null -ne $r.noteWert){"{0:N1}" -f $r.noteWert}else{"-"} } },
            @{ Header="Gewicht";   Field="gewichtung"; Width=8  },
            @{ Header="ECTS";      Field="ects";       Width=6  },
            @{ Header="Bestanden"; Width=10; Expression={ param($r) if($r.bestanden -eq $true){"Ja"}elseif($r.bestanden -eq $false){"Nein"}else{"-"} } }
        )
    }
}

# Hilfsfunktion: Gesamtnote aus API-Response holen (gesamtNote ODER gesamtnote)
function Get-Gesamtnote {
    param($obj)
    if ($null -ne $obj.gesamtNote) { return $obj.gesamtNote }
    if ($null -ne $obj.gesamtnote) { return $obj.gesamtnote }
    if ($null -ne $obj.gesamtNoteRoh) { return $obj.gesamtNoteRoh }
    if ($null -ne $obj.gesamtnoteRoh) { return $obj.gesamtnoteRoh }
    return $null
}

function Get-NoteColor {
    param($note)
    if ($null -eq $note) { return "DarkGray" }
    if ($note -le 1.5) { return "Green" }
    if ($note -le 2.5) { return "Cyan" }
    if ($note -le 3.5) { return "Yellow" }
    if ($note -le 4.0) { return "DarkYellow" }
    return "Red"
}

# Gemeinsame Fortschritt-Anzeige (API: ectsErreicht, ectsGesamt, fortschrittProzent,
# moduleBestanden, moduleOffen, moduleNichtBestanden - KEIN moduleGesamt!)
function Show-FortschrittData {
    param($data)
    Write-Host ""
    $ectsErreicht = if ($data.ectsErreicht) { $data.ectsErreicht } else { 0 }
    $ectsGesamt = if ($data.ectsGesamt) { $data.ectsGesamt } else { 0 }
    $pctEcts = if ($data.fortschrittProzent) { $data.fortschrittProzent } elseif ($ectsGesamt -gt 0) { [math]::Round(($ectsErreicht / $ectsGesamt) * 100, 1) } else { 0 }

    $moduleBestanden = if ($data.moduleBestanden) { $data.moduleBestanden } else { 0 }
    $moduleOffen = if ($data.moduleOffen) { $data.moduleOffen } else { 0 }
    $moduleNichtBestanden = if ($data.moduleNichtBestanden) { $data.moduleNichtBestanden } else { 0 }
    $moduleGesamt = if ($data.moduleGesamt) { $data.moduleGesamt } else { $moduleBestanden + $moduleOffen + $moduleNichtBestanden }
    $pctModul = if ($moduleGesamt -gt 0) { [math]::Round(($moduleBestanden / $moduleGesamt) * 100, 1) } else { 0 }

    Write-Host "  ECTS-Fortschritt:" -ForegroundColor Cyan
    $barLen = 30
    $filled = [math]::Max(0, [math]::Min($barLen, [math]::Floor($pctEcts / 100 * $barLen)))
    $bar = ("#" * $filled) + ("-" * ($barLen - $filled))
    Write-Host "  [$bar] $ectsErreicht/$ectsGesamt ECTS ($pctEcts%)" -ForegroundColor Green
    Write-Host ""

    Write-Host "  Module:" -ForegroundColor Cyan
    $filled = [math]::Max(0, [math]::Min($barLen, [math]::Floor($pctModul / 100 * $barLen)))
    $bar = ("#" * $filled) + ("-" * ($barLen - $filled))
    Write-Host "  [$bar] $moduleBestanden/$moduleGesamt bestanden ($pctModul%)" -ForegroundColor Green
    if ($moduleOffen -gt 0) { Write-Host "  Offen: $moduleOffen | Nicht bestanden: $moduleNichtBestanden" -ForegroundColor DarkGray }
    Write-Host ""

    # durchschnittsnote kann fehlen
    $avg = if ($null -ne $data.durchschnittsnote) { $data.durchschnittsnote } elseif ($null -ne $data.durchschnitt) { $data.durchschnitt } else { $null }
    if ($null -ne $avg) {
        Write-Host "  Aktueller Durchschnitt: " -NoNewline -ForegroundColor White
        Write-Host ("{0:N2}" -f $avg) -ForegroundColor Yellow
    }
}

function Show-Fortschritt {
    Write-Header "Studienfortschritt"
    
    $eid = Select-Einschreibung -Title "Welche Einschreibung anzeigen?"
    if (-not $eid) { Pause-CLI; return }

    $data = Invoke-GradifyApi -Path "/api/berechnungen/einschreibung/$eid/fortschritt"
    if ($data) { Show-FortschrittData $data }
    Pause-CLI
}

function Show-Durchschnitt {
    Write-Header "Durchschnittsnote aller Abschluesse"
    $data = Invoke-GradifyApi -Path "/api/berechnungen/statistik/durchschnitt"
    if ($null -ne $data) {
        Write-Host ""
        Write-Host "  Durchschnitt: " -NoNewline -ForegroundColor White
        Write-Host ("{0:N2}" -f $data) -ForegroundColor Yellow
    }
    Pause-CLI
}

function Show-Berechnungsarten {
    Write-Header "Verfuegbare Berechnungsarten"
    $data = Invoke-GradifyApi -Path "/api/berechnungen/berechnungsarten"
    if ($data) {
        Write-Host ""
        # API liefert ein Objekt/Dictionary: { "GEWICHTET": "Beschreibung", ... }
        if ($data -is [System.Collections.IDictionary] -or $data.PSObject) {
            $data.PSObject.Properties | ForEach-Object {
                $key = $_.Name
                $val = $_.Value
                Write-Host "  $key" -NoNewline -ForegroundColor Cyan
                Write-Host "  -  $val" -ForegroundColor DarkGray
            }
        } else {
            # Fallback: Array
            foreach ($art in $data) { Write-Host "  - $art" -ForegroundColor Cyan }
        }
        Write-Host ""
    }
    Pause-CLI
}

# ============================================================
#                      IMPORT / EXPORT
# ============================================================

function Show-ImportExportMenu {
    while ($true) {
        Write-Banner
        Write-StatusBar
        Write-Header "Import / Export (CSV)"
        Write-Host ""
        Write-Host "  --- Export ---" -ForegroundColor DarkGray
        Write-Host "  [1]  Benutzer exportieren"
        Write-Host "  [2]  Studiengaenge exportieren"
        Write-Host "  [3]  Noten exportieren"
        Write-Host ""
        Write-Host "  --- Import ---" -ForegroundColor DarkGray
        Write-Host "  [4]  Benutzer importieren"
        Write-Host "  [5]  Studiengaenge importieren"
        Write-Host ""
        Write-Host "  --- Templates ---" -ForegroundColor DarkGray
        Write-Host "  [6]  Import-Template: Benutzer"
        Write-Host "  [7]  Import-Template: Studiengaenge"
        Write-Host ""
        Write-Host "  [0]  Zurueck" -ForegroundColor DarkGray

        switch (Read-MenuChoice) {
            "1" { Export-Users }
            "2" { Export-Studiengaenge }
            "3" { Export-Noten }
            "4" { Import-Users }
            "5" { Import-Studiengaenge }
            "6" { Download-Template "users" }
            "7" { Download-Template "studiengaenge" }
            "0" { return }
        }
    }
}

function Export-Users {
    Write-Header "Benutzer exportieren"
    $outFile = Read-UserInput -Prompt "Ausgabedatei" -Default "users_export.csv"
    $headers = @{}
    if ($script:Token) { $headers["Authorization"] = "Bearer $script:Token" }

    try {
        Invoke-WebRequest -Uri "$script:BaseUrl/api/users/export" -Headers $headers -OutFile $outFile
        Write-Success "Exportiert nach: $outFile"
    } catch {
        Write-Error "Export fehlgeschlagen: $($_.Exception.Message)"
    }
    Pause-CLI
}

function Export-Studiengaenge {
    Write-Header "Studiengaenge exportieren"
    
    # Mandant auswaehlen
    $mandanten = Invoke-GradifyApi -Path "/api/mandanten"
    if ($mandanten -and $mandanten.Count -gt 0) {
        Write-Host ""
        $idx = 1
        foreach ($m in $mandanten) {
            Write-Host "    [$idx] $($m.name)" -ForegroundColor White
            $idx++
        }
        Write-Host ""
        $choice = Read-UserInput -Prompt "Mandant-Nummer"
        $selIdx = [int]$choice - 1
        if ($selIdx -lt 0 -or $selIdx -ge $mandanten.Count) {
            Write-Warning "Ungueltige Auswahl."
            Pause-CLI; return
        }
        $mandantId = $mandanten[$selIdx].id
    } else {
        Write-Warning "Keine Mandanten vorhanden."
        Pause-CLI; return
    }
    
    $outFile = Read-UserInput -Prompt "Ausgabedatei" -Default "studiengaenge_export.csv"
    $headers = @{}
    if ($script:Token) { $headers["Authorization"] = "Bearer $script:Token" }

    try {
        Invoke-WebRequest -Uri "$script:BaseUrl/api/import/export/studiengaenge?mandantId=$mandantId" `
            -Headers $headers -OutFile $outFile
        Write-Success "Exportiert nach: $outFile"
    } catch {
        Write-Error "Export fehlgeschlagen: $($_.Exception.Message)"
    }
    Pause-CLI
}

function Export-Noten {
    Write-Header "Noten exportieren"
    
    $eid = Select-Einschreibung -Title "Welche Einschreibung exportieren?"
    if (-not $eid) { Pause-CLI; return }
    
    $outFile = Read-UserInput -Prompt "Ausgabedatei" -Default "noten_export.csv"
    $headers = @{}
    if ($script:Token) { $headers["Authorization"] = "Bearer $script:Token" }

    try {
        Invoke-WebRequest -Uri "$script:BaseUrl/api/noten/export/$eid" -Headers $headers -OutFile $outFile
        Write-Success "Exportiert nach: $outFile"
    } catch {
        Write-Error "Export fehlgeschlagen: $($_.Exception.Message)"
    }
    Pause-CLI
}

function Import-Users {
    Write-Header "Benutzer importieren"
    $filePath = Read-UserInput -Prompt "CSV-Datei Pfad" -Required
    if (-not (Test-Path $filePath)) {
        Write-Error "Datei nicht gefunden: $filePath"
        Pause-CLI; return
    }
    $headers = @{}
    if ($script:Token) { $headers["Authorization"] = "Bearer $script:Token" }

    try {
        $form = @{ file = Get-Item $filePath }
        $result = Invoke-RestMethod -Uri "$script:BaseUrl/api/users/import" -Method POST `
            -Headers $headers -Form $form
        if ($result.success) { Write-Success "Import erfolgreich: $($result.message)" }
        else { Write-Error $result.message }
    } catch {
        Write-Error "Import fehlgeschlagen: $($_.Exception.Message)"
    }
    Pause-CLI
}

function Import-Studiengaenge {
    Write-Header "Studiengaenge importieren"
    
    # Mandant auswaehlen
    $mandanten = Invoke-GradifyApi -Path "/api/mandanten"
    if ($mandanten -and $mandanten.Count -gt 0) {
        Write-Host ""
        $idx = 1
        foreach ($m in $mandanten) {
            Write-Host "    [$idx] $($m.name)" -ForegroundColor White
            $idx++
        }
        Write-Host ""
        $choice = Read-UserInput -Prompt "Mandant-Nummer"
        $selIdx = [int]$choice - 1
        if ($selIdx -lt 0 -or $selIdx -ge $mandanten.Count) {
            Write-Warning "Ungueltige Auswahl."
            Pause-CLI; return
        }
        $mandantId = $mandanten[$selIdx].id
    } else {
        Write-Warning "Keine Mandanten vorhanden."
        Pause-CLI; return
    }
    
    $filePath = Read-UserInput -Prompt "CSV-Datei Pfad" -Required
    if (-not (Test-Path $filePath)) {
        Write-Error "Datei nicht gefunden: $filePath"
        Pause-CLI; return
    }
    $headers = @{}
    if ($script:Token) { $headers["Authorization"] = "Bearer $script:Token" }

    try {
        $form = @{ file = Get-Item $filePath; mandantId = $mandantId }
        $result = Invoke-RestMethod -Uri "$script:BaseUrl/api/import/studiengaenge" -Method POST `
            -Headers $headers -Form $form
        if ($result.success) { Write-Success "Import erfolgreich: $($result.message)" }
        else { Write-Error $result.message }
    } catch {
        Write-Error "Import fehlgeschlagen: $($_.Exception.Message)"
    }
    Pause-CLI
}

function Download-Template {
    param([string]$Type)
    Write-Header "Import-Template herunterladen"

    $url = switch ($Type) {
        "users"          { "$script:BaseUrl/api/users/import/template" }
        "studiengaenge"  { "$script:BaseUrl/api/import/template" }
    }
    $outFile = "${Type}_template.csv"
    $headers = @{}
    if ($script:Token) { $headers["Authorization"] = "Bearer $script:Token" }

    try {
        Invoke-WebRequest -Uri $url -Headers $headers -OutFile $outFile
        Write-Success "Template gespeichert: $outFile"
    } catch {
        Write-Error "Download fehlgeschlagen: $($_.Exception.Message)"
    }
    Pause-CLI
}

# ============================================================
#                     AUDIT-PROTOKOLL
# ============================================================

function Show-AuditMenu {
    while ($true) {
        Write-Banner
        Write-StatusBar
        Write-Header "Audit-Protokoll"
        Write-Host ""
        Write-Host "  [1]  Noten-Aenderungshistorie"
        Write-Host "  [2]  Modul-Zuweisungen Audit"
        Write-Host ""
        Write-Host "  [0]  Zurueck" -ForegroundColor DarkGray

        switch (Read-MenuChoice) {
            "1" { Show-NotenAudit }
            "2" { Show-ModulAudit }
            "0" { return }
        }
    }
}

function Show-NotenAudit {
    Write-Header "Noten-Aenderungshistorie"
    Write-Info "Filter (alle optional, Enter = kein Filter):"
    Write-Host ""

    $qp = @{}
    $v = Read-UserInput -Prompt "Einschreibungs-ID"
    if ($v) { $qp["einschreibungId"] = $v }
    $v = Read-UserInput -Prompt "Modul-ID"
    if ($v) { $qp["modulId"] = $v }
    $v = Read-UserInput -Prompt "Noten-ID"
    if ($v) { $qp["noteId"] = $v }
    $v = Read-UserInput -Prompt "Von Datum (YYYY-MM-DD)"
    if ($v) { $qp["vonDatum"] = $v }
    $v = Read-UserInput -Prompt "Bis Datum (YYYY-MM-DD)"
    if ($v) { $qp["bisDatum"] = $v }
    $v = Read-UserInput -Prompt "Aenderungstyp (ERSTELLT/NOTE_GEAENDERT/VALIDIERT/FREIGEGEBEN/FREIGABE_ZURUECKGENOMMEN/STORNIERT)"
    if ($v) { $qp["aenderungsTyp"] = $v.ToUpper() }
    $qp["limit"] = "100"

    $data = Invoke-GradifyApi -Path "/api/noten/audit" -QueryParams $qp
    if ($data) {
        Show-DataTable -Data $data -Columns @(
            @{ Header="ID";       Field="id";             Width=5  },
            @{ Header="Note-ID";  Field="noteId";         Width=8  },
            @{ Header="Typ";      Field="aenderungsTyp";  Width=15 },
            @{ Header="Benutzer"; Width=18; Expression={ param($r) if($r.geaendertVonName){$r.geaendertVonName}elseif($r.geaendertVon){$r.geaendertVon}elseif($r.benutzerId){$r.benutzerId}else{"-"} } },
            @{ Header="Alt";      Width=6;  Expression={ param($r) if($r.alterWert){$r.alterWert}else{"-"} } },
            @{ Header="Neu";      Width=6;  Expression={ param($r) if($r.neuerWert){$r.neuerWert}else{"-"} } },
            @{ Header="Zeitpunkt"; Width=20; Expression={ param($r) if($r.geaendertAm){$r.geaendertAm}elseif($r.zeitpunkt){$r.zeitpunkt}else{"-"} } },
            @{ Header="Kommentar"; Field="kommentar";     Width=20 }
        )
    }
    Pause-CLI
}

function Show-ModulAudit {
    Write-Header "Modul-Zuweisungen Audit"
    Write-Info "Filter (alle optional):"
    Write-Host ""

    $qp = @{}
    $v = Read-UserInput -Prompt "Von Datum (YYYY-MM-DD)"
    if ($v) { $qp["vonDatum"] = $v }
    $v = Read-UserInput -Prompt "Bis Datum (YYYY-MM-DD)"
    if ($v) { $qp["bisDatum"] = $v }
    $v = Read-UserInput -Prompt "Aenderungstyp"
    if ($v) { $qp["aenderungsTyp"] = $v }

    $data = Invoke-GradifyApi -Path "/api/module-zuweisungen/audit" -QueryParams $qp
    if ($data) {
        Show-DataTable -Data $data -Columns @(
            @{ Header="ID";        Field="id";             Width=5  },
            @{ Header="Dozent-ID"; Field="dozentId";       Width=10 },
            @{ Header="Modul-ID";  Field="modulId";        Width=10 },
            @{ Header="Typ";       Field="aenderungsTyp";  Width=15 },
            @{ Header="Von";       Field="geaendertVon";   Width=8  },
            @{ Header="Zeitpunkt"; Width=20; Expression={ param($r) if($r.geaendertAm){$r.geaendertAm}elseif($r.zeitpunkt){$r.zeitpunkt}else{"-"} } }
        )
    }
    Pause-CLI
}

# ============================================================
#                    GRAPHQL-ABFRAGEN
# ============================================================

function Show-GraphQLMenu {
    while ($true) {
        Write-Banner
        Write-StatusBar
        Write-Header "GraphQL-Abfragen"
        Write-Info "Zeigt die Nutzung von GraphQL als alternatives Protokoll"
        Write-Host ""
        Write-Host "  [1]  Benutzer abfragen (GraphQL)"
        Write-Host "  [2]  Studenten abfragen (GraphQL)"
        Write-Host "  [3]  Studiengaenge abfragen (GraphQL)"
        Write-Host "  [4]  Noten abfragen (GraphQL)"
        Write-Host "  [5]  Eigene GraphQL-Query ausfuehren"
        Write-Host ""
        Write-Host "  [0]  Zurueck" -ForegroundColor DarkGray

        switch (Read-MenuChoice) {
            "1" { Invoke-GraphQLBenutzer }
            "2" { Invoke-GraphQLStudenten }
            "3" { Invoke-GraphQLStudiengaenge }
            "4" { Invoke-GraphQLNoten }
            "5" { Invoke-GraphQLCustom }
            "0" { return }
        }
    }
}

function Invoke-GraphQLBenutzer {
    Write-Header "GraphQL: Benutzer"
    Write-Info "Query: { users { id, benutzername, vorname, nachname, email, rollen { name } } }"
    Write-Host ""

    $query = '{ users { id benutzername vorname nachname email rollen { name } } }'
    $data = Invoke-GradifyGraphQL -Service "user" -Query $query

    if ($data -and $data.users) {
        Show-DataTable -Data $data.users -Columns @(
            @{ Header="ID";       Field="id";           Width=5  },
            @{ Header="Username"; Field="benutzername"; Width=15 },
            @{ Header="Vorname";  Field="vorname";      Width=15 },
            @{ Header="Nachname"; Field="nachname";     Width=15 },
            @{ Header="E-Mail";   Field="email";        Width=25 },
            @{ Header="Rollen";   Width=25; Expression={ param($r) if($r.rollen){ ($r.rollen | ForEach-Object { if($_.name){$_.name -replace '^ROLE_',''}else{"$_" -replace '^ROLE_',''} }) -join ", " }else{"-"} } }
        )
    }
    Pause-CLI
}

function Invoke-GraphQLStudenten {
    Write-Header "GraphQL: Studenten"
    Write-Info "Query: { students { id, matrikelnummer, vorname, nachname, status } }"
    Write-Host ""

    $query = '{ students { id matrikelnummer vorname nachname email status } }'
    $data = Invoke-GradifyGraphQL -Service "user" -Query $query

    if ($data -and $data.students) {
        Show-DataTable -Data $data.students -Columns @(
            @{ Header="ID";       Field="id";             Width=5  },
            @{ Header="Matrikel"; Field="matrikelnummer"; Width=15 },
            @{ Header="Vorname";  Field="vorname";        Width=15 },
            @{ Header="Nachname"; Field="nachname";       Width=15 },
            @{ Header="E-Mail";   Field="email";          Width=25 },
            @{ Header="Status";   Field="status";         Width=16 }
        )
    }
    Pause-CLI
}

function Invoke-GraphQLStudiengaenge {
    Write-Header "GraphQL: Studiengaenge"
    Write-Info "Query: { studiengaenge { id, kuerzel, name, abschlussart, gesamtEcts } }"
    Write-Host ""

    $query = '{ studiengaenge { id kuerzel name abschlussart gesamtEcts regelstudienzeit } }'
    $data = Invoke-GradifyGraphQL -Service "studiengang" -Query $query

    if ($data -and $data.studiengaenge) {
        Show-DataTable -Data $data.studiengaenge -Columns @(
            @{ Header="ID";        Field="id";              Width=5  },
            @{ Header="Kuerzel";   Field="kuerzel";         Width=10 },
            @{ Header="Name";      Field="name";            Width=35 },
            @{ Header="Abschluss"; Field="abschlussart";    Width=10 },
            @{ Header="ECTS";      Field="gesamtEcts";      Width=6  },
            @{ Header="Semester";  Field="regelstudienzeit"; Width=8  }
        )
    }
    Pause-CLI
}

function Invoke-GraphQLNoten {
    Write-Header "GraphQL: Noten"
    
    $eid = Select-Einschreibung -Title "Welche Einschreibung abfragen?"
    if (-not $eid) { Pause-CLI; return }

    $query = "{ notenByStudent(einschreibungId: $eid) { id modulId noteWert bestanden versuch status pruefungsdatum } }"
    Write-Info "Query: $query"
    Write-Host ""

    $data = Invoke-GradifyGraphQL -Service "noten" -Query $query

    if ($data -and $data.notenByStudent) {
        Show-DataTable -Data $data.notenByStudent -Columns @(
            @{ Header="ID";      Field="id";         Width=5  },
            @{ Header="Modul";   Field="modulId";    Width=6  },
            @{ Header="Note";    Width=6;  Expression={ param($r) if($null -ne $r.noteWert){"{0:N1}" -f $r.noteWert}else{"-"} } },
            @{ Header="Best.";   Width=6;  Expression={ param($r) if($r.bestanden){"Ja"}elseif($null -eq $r.bestanden){"-"}else{"Nein"} } },
            @{ Header="Versuch"; Field="versuch";    Width=7  },
            @{ Header="Status";  Field="status";     Width=13 },
            @{ Header="Datum";   Field="pruefungsdatum"; Width=12 }
        )
    }
    Pause-CLI
}

function Invoke-GraphQLCustom {
    Write-Header "Eigene GraphQL-Query"
    Write-Host ""
    Write-Host "  Verfuegbare Services:" -ForegroundColor Cyan
    Write-Host "    user         - Benutzer & Studenten"
    Write-Host "    studiengang  - Mandanten, Studiengaenge, Module, Einschreibungen"
    Write-Host "    noten        - Noten & Statistiken"
    Write-Host ""

    $service = Read-UserInput -Prompt "Service (user/studiengang/noten)" -Required
    if ($service -notin @("user", "studiengang", "noten")) {
        Write-Error "Ungueltiger Service. Erlaubt: user, studiengang, noten"
        Pause-CLI; return
    }

    Write-Host ""
    Write-Host "  GraphQL-Query eingeben (einzeilig):" -ForegroundColor Cyan
    Write-Host "  Beispiel: { users { id benutzername } }" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "  > " -NoNewline -ForegroundColor Yellow
    $query = Read-Host

    if (-not $query) { return }

    Write-Host ""
    Write-Info "Fuehre aus..."
    $data = Invoke-GradifyGraphQL -Service $service -Query $query

    if ($data) {
        Write-Host ""
        Write-Host "  Ergebnis:" -ForegroundColor Cyan
        Write-Host ($data | ConvertTo-Json -Depth 10) -ForegroundColor White
    }
    Pause-CLI
}

# ============================================================
#                      SYSTEMSTATUS
# ============================================================

function Show-SystemMenu {
    while ($true) {
        Write-Banner
        Write-StatusBar
        Write-Header "Systemstatus"
        Write-Host ""
        Write-Host "  [1]  Health-Check aller Services"
        Write-Host "  [2]  gRPC-Verbindungsstatus"
        Write-Host "  [3]  Token validieren"
        Write-Host "  [4]  Token erneuern"
        Write-Host "  [5]  System-Info (Protokolle)"
        Write-Host ""
        Write-Host "  [0]  Zurueck" -ForegroundColor DarkGray

        switch (Read-MenuChoice) {
            "1" { Show-HealthCheck }
            "2" { Show-GrpcStatus }
            "3" { Show-TokenValidation }
            "4" { Invoke-TokenRefresh }
            "5" { Show-SystemInfo }
            "0" { return }
        }
    }
}

function Show-SystemInfo {
    Write-Header "System-Info"
    Write-Host ""
    Write-Host "  Gradify Notenmanagement-System" -ForegroundColor Cyan
    Write-Host "  CLI Version: 1.1" -ForegroundColor White
    Write-Host ""
    Write-Host "  Verwendete Protokolle:" -ForegroundColor Cyan
    Write-Host "  -----------------------" -ForegroundColor DarkGray
    Write-Host "  REST     " -NoNewline -ForegroundColor Green
    Write-Host "Alle CRUD-Operationen, Authentifizierung"
    Write-Host "  GraphQL  " -NoNewline -ForegroundColor Yellow
    Write-Host "Flexible Abfragen (Benutzer, Studenten, Noten)"
    Write-Host "  gRPC     " -NoNewline -ForegroundColor Magenta
    Write-Host "Inter-Service-Kommunikation (Auth <-> User)"
    Write-Host ""
    Write-Host "  Microservices:" -ForegroundColor Cyan
    Write-Host "  -----------------------" -ForegroundColor DarkGray
    Write-Host "  API Gateway      " -NoNewline; Write-Host "Port 8080  " -ForegroundColor DarkGray -NoNewline; Write-Host "(Einstiegspunkt)"
    Write-Host "  Auth-Service     " -NoNewline; Write-Host "Port 8081  " -ForegroundColor DarkGray -NoNewline; Write-Host "(JWT, Login)"
    Write-Host "  User-Service     " -NoNewline; Write-Host "Port 8082  " -ForegroundColor DarkGray -NoNewline; Write-Host "(Benutzer, Rollen)"
    Write-Host "  Noten-Service    " -NoNewline; Write-Host "Port 8083  " -ForegroundColor DarkGray -NoNewline; Write-Host "(Noten, Validierung)"
    Write-Host "  Studiengang-Svc  " -NoNewline; Write-Host "Port 8084  " -ForegroundColor DarkGray -NoNewline; Write-Host "(Module, PO)"
    Write-Host "  Berechnungs-Svc  " -NoNewline; Write-Host "Port 8085  " -ForegroundColor DarkGray -NoNewline; Write-Host "(Durchschnitt, ECTS)"
    Write-Host ""
    Write-Host "  Datenbank: PostgreSQL (DB-per-Tenant Multi-Tenancy)" -ForegroundColor DarkGray
    Write-Host "  Message Queue: RabbitMQ (Event-basierte Neuberechnung)" -ForegroundColor DarkGray
    Write-Host ""
    Pause-CLI
}

function Show-HealthCheck {
    Write-Header "Health-Check"
    Write-Host ""

    $services = @(
        @{ Name="API-Gateway";         Port=8080; Path="/actuator/health" },
        @{ Name="Auth-Service";        Port=8081; Path="/actuator/health" },
        @{ Name="User-Service";        Port=8082; Path="/actuator/health" },
        @{ Name="Studiengang-Service"; Port=8083; Path="/actuator/health" },
        @{ Name="Noten-Service";       Port=8084; Path="/actuator/health" },
        @{ Name="Berechnungs-Service"; Port=8085; Path="/actuator/health" }
    )

    foreach ($svc in $services) {
        Write-Host "  $($svc.Name.PadRight(25))" -NoNewline
        try {
            $health = Invoke-RestMethod -Uri "http://localhost:$($svc.Port)$($svc.Path)" -TimeoutSec 3
            $status = if ($health.status) { $health.status } else { "UP" }
            $color = if ($status -eq "UP") { "Green" } else { "Red" }
            Write-Host "[$status]" -ForegroundColor $color
        } catch {
            Write-Host "[DOWN]" -ForegroundColor Red
        }
    }
    Write-Host ""
    Pause-CLI
}

function Show-GrpcStatus {
    Write-Header "gRPC-Verbindungsstatus"
    Write-Host ""

    Write-Host "  Auth-Service (-> User-Service):" -ForegroundColor Cyan
    $data = Invoke-GradifyApi -Path "/api/auth/grpc-status"
    if ($data) {
        Write-Host "    $($data | ConvertTo-Json -Compress)" -ForegroundColor White
    }
    Write-Host ""

    Write-Host "  Berechnungs-Service (-> Noten + Studiengang):" -ForegroundColor Cyan
    $data = Invoke-GradifyApi -Path "/api/berechnungen/grpc-status" -QueryParams @{ test = "true" }
    if ($data) {
        Write-Host "    $($data | ConvertTo-Json -Compress)" -ForegroundColor White
    }
    Write-Host ""

    Write-Info "gRPC-Ports: User 9082, Studiengang 9083, Noten 9084, Berechnung 9085"
    Pause-CLI
}

function Show-TokenValidation {
    Write-Header "Token validieren"
    $result = Invoke-GradifyApi -Path "/api/auth/validate"
    if ($null -eq $result) {
        Pause-CLI
        return
    }
    if ([bool]$result) {
        Write-Success "Token ist gueltig."
        Write-Host "  Details: $($result | ConvertTo-Json -Compress)" -ForegroundColor DarkGray
    } else {
        Write-Warn "Token ist ungueltig oder abgelaufen."
    }
    Pause-CLI
}

function Invoke-TokenRefresh {
    Write-Header "Token erneuern"
    if (-not $script:RefreshToken) {
        Write-Error "Kein Refresh-Token vorhanden."
        Pause-CLI; return
    }

    $body = @{ refreshToken = $script:RefreshToken }
    $result = Invoke-GradifyApi -Path "/api/auth/refresh" -Method "POST" -Body $body
    if ($result -and $result.accessToken) {
        $script:Token = $result.accessToken
        if ($result.refreshToken) { $script:RefreshToken = $result.refreshToken }
        Write-Success "Token erfolgreich erneuert."
    }
    Pause-CLI
}

# ============================================================
#                      MODUL-ZUWEISUNGEN
# ============================================================

# --- Lehrender: Eigene Modul-Zuweisungen anzeigen ---
function Show-MeineModulZuweisungen {
    Write-Header "Meine zugewiesenen Module"
    
    if (-not $script:UserId) {
        Write-Warn "Benutzer-ID nicht verfuegbar."
        Pause-CLI
        return
    }
    
    $zuweisungen = Invoke-GradifyApi -Path "/api/module-zuweisungen/dozent/$($script:UserId)"
    if (-not $zuweisungen -or $zuweisungen.Count -eq 0) {
        Write-Info "Keine Module zugewiesen."
        Pause-CLI
        return
    }
    
    Write-Host ""
    $idx = 1
    foreach ($z in $zuweisungen) {
        $modulName = if ($z.modulName) { $z.modulName } else { "Modul $($z.modulId)" }
        $sgName = if ($z.studiengangName) { " ($($z.studiengangName))" } else { "" }
        Write-Host "    [$idx] " -NoNewline -ForegroundColor DarkGray
        Write-Host "$modulName" -NoNewline -ForegroundColor Cyan
        Write-Host "$sgName" -ForegroundColor DarkGray
        $idx++
    }
    
    Write-Host ""
    Write-Host "  $($zuweisungen.Count) Module zugewiesen." -ForegroundColor Green
    Write-Host ""
    Write-Host "  Modul-Nr eingeben um Noten anzuzeigen, oder Enter zum Zurueck:" -ForegroundColor DarkGray
    $choice = Read-UserInput -Prompt "Auswahl"
    
    if ($choice) {
        $selIdx = [int]$choice - 1
        if ($selIdx -ge 0 -and $selIdx -lt $zuweisungen.Count) {
            $mid = $zuweisungen[$selIdx].modulId
            $modulName = if ($zuweisungen[$selIdx].modulName) { $zuweisungen[$selIdx].modulName } else { "Modul $mid" }
            
            Write-Host ""
            Write-Host "  Noten fuer: $modulName" -ForegroundColor Cyan
            $noten = Invoke-GradifyApi -Path "/api/noten/modul/$mid"
            if ($noten -and $noten.Count -gt 0) {
                Show-DataTable -Data $noten -Columns @(
                    @{ Header="ID";       Field="id";             Width=5  },
                    @{ Header="Einschr."; Field="einschreibungId"; Width=9  },
                    @{ Header="Note";     Width=6;  Expression={ param($r) if($null -ne $r.noteWert){"{0:N1}" -f $r.noteWert}else{"-"} } },
                    @{ Header="Best.";    Width=6;  Expression={ param($r) if($r.bestanden){"Ja"}elseif($null -eq $r.bestanden){"-"}else{"Nein"} } },
                    @{ Header="Versuch";  Field="versuch";        Width=7  },
                    @{ Header="Status";   Field="status";         Width=13 },
                    @{ Header="Datum";    Field="pruefungsdatum"; Width=12 }
                )
                Write-Host ""
                Write-Success "$($noten.Count) Noten gefunden."
            } else {
                Write-Info "Noch keine Noten fuer dieses Modul."
            }
            Pause-CLI
        }
    }
}

function Show-ModulZuweisungMenu {
    while ($true) {
        Write-Banner
        Write-StatusBar
        Write-Header "Modul-Zuweisungen (Dozent <-> Modul)"
        Write-Host ""
        Write-Host "  --- Anzeigen ---" -ForegroundColor DarkGray
        Write-Host "  [1]  Alle Zuweisungen anzeigen"
        Write-Host "  [2]  Zuweisungen eines Dozenten"
        Write-Host ""
        Write-Host "  --- Verwaltung ---" -ForegroundColor DarkGray
        Write-Host "  [3]  Modul einem Dozenten zuweisen"
        Write-Host "  [4]  Zuweisung entfernen"
        Write-Host ""
        Write-Host "  [0]  Zurueck" -ForegroundColor DarkGray

        switch (Read-MenuChoice) {
            "1" { Show-AllModulZuweisungen }
            "2" { Show-DozentModulZuweisungen }
            "3" { New-ModulZuweisung }
            "4" { Remove-ModulZuweisung }
            "0" { return }
        }
    }
}

function Show-AllModulZuweisungen {
    Write-Header "Alle Modul-Zuweisungen"
    $data = Invoke-GradifyApi -Path "/api/module-zuweisungen"
    if ($data -and $data.Count -gt 0) {
        # Benutzer laden fuer Namensaufloesung
        $users = Invoke-GradifyApi -Path "/api/users"
        $userMap = @{}
        if ($users) {
            foreach ($u in $users) {
                $fullName = "$($u.vorname) $($u.nachname)".Trim()
                if (-not $fullName) { $fullName = $u.benutzername }
                $userMap[$u.id] = $fullName
            }
        }
        
        Write-Host ""
        foreach ($z in $data) {
            $modulName = if ($z.modulName) { $z.modulName } else { "Modul $($z.modulId)" }
            $dozentName = if ($z.dozentName) { 
                $z.dozentName 
            } elseif ($userMap.ContainsKey($z.dozentId)) { 
                $userMap[$z.dozentId] 
            } else { 
                "Dozent #$($z.dozentId)" 
            }
            Write-Host "    " -NoNewline
            Write-Host "$($dozentName.PadRight(25))" -NoNewline -ForegroundColor White
            Write-Host " -> " -NoNewline -ForegroundColor DarkGray
            Write-Host "$modulName" -ForegroundColor Cyan
        }
        Write-Host ""
        Write-Success "$($data.Count) Zuweisungen gefunden."
    } else {
        Write-Info "Keine Zuweisungen vorhanden."
    }
    Pause-CLI
}

function Show-DozentModulZuweisungen {
    Write-Header "Zuweisungen eines Dozenten"
    $dozentId = Select-Benutzer -Title "Welchen Dozenten anzeigen?"
    if (-not $dozentId) { Pause-CLI; return }
    
    $data = Invoke-GradifyApi -Path "/api/module-zuweisungen/dozent/$dozentId"
    if ($data -and $data.Count -gt 0) {
        Write-Host ""
        foreach ($z in $data) {
            $modulName = if ($z.modulName) { $z.modulName } else { "Modul $($z.modulId)" }
            $sgName = if ($z.studiengangName) { $z.studiengangName } else { "" }
            Write-Host "    - " -NoNewline -ForegroundColor DarkGray
            Write-Host "$modulName" -NoNewline -ForegroundColor Cyan
            if ($sgName) { Write-Host " ($sgName)" -ForegroundColor DarkGray } else { Write-Host "" }
        }
        Write-Host ""
        Write-Success "$($data.Count) Module zugewiesen."
    } else {
        Write-Info "Keine Module zugewiesen."
    }
    Pause-CLI
}

function New-ModulZuweisung {
    Write-Header "Modul einem Dozenten zuweisen"
    
    # Dozent auswaehlen (nur Lehrende anzeigen waere ideal, aber wir zeigen alle Benutzer)
    Write-Host ""
    Write-Host "  Schritt 1: Dozent (Lehrender) auswaehlen" -ForegroundColor Cyan
    $dozentId = Select-Benutzer -Title "Welchem Benutzer Modul zuweisen?"
    if (-not $dozentId) { Pause-CLI; return }
    
    # Modul auswaehlen
    Write-Host ""
    Write-Host "  Schritt 2: Modul auswaehlen" -ForegroundColor Cyan
    $sgId = Select-Studiengang -Title "Aus welchem Studiengang?"
    if (-not $sgId) { Pause-CLI; return }
    
    $module = Invoke-GradifyApi -Path "/api/studiengaenge/$sgId/module"
    if (-not $module -or $module.Count -eq 0) {
        Write-Error "Keine Module gefunden."
        Pause-CLI; return
    }
    
    Write-Host ""
    $idx = 1
    foreach ($m in $module) {
        Write-Host "    [$($idx.ToString().PadLeft(2))] " -NoNewline -ForegroundColor DarkGray
        Write-Host "$($m.name)" -ForegroundColor White
        $idx++
    }
    Write-Host ""
    $choice = Read-UserInput -Prompt "Nummer" -Required
    $selIdx = [int]$choice - 1
    if ($selIdx -lt 0 -or $selIdx -ge $module.Count) {
        Write-Error "Ungueltige Auswahl."
        Pause-CLI; return
    }
    $modulId = $module[$selIdx].id

    $body = @{ dozentId = [int]$dozentId; modulId = [int]$modulId }
    $result = Invoke-GradifyApi -Path "/api/module-zuweisungen" -Method "POST" -Body $body
    if ($result) { Write-Success "Modul '$($module[$selIdx].name)' zugewiesen." }
    Pause-CLI
}

function Remove-ModulZuweisung {
    Write-Header "Zuweisung entfernen"
    
    # Alle Zuweisungen anzeigen
    $zuweisungen = Invoke-GradifyApi -Path "/api/module-zuweisungen"
    if (-not $zuweisungen -or $zuweisungen.Count -eq 0) {
        Write-Info "Keine Zuweisungen vorhanden."
        Pause-CLI; return
    }
    
    Write-Host ""
    $idx = 1
    foreach ($z in $zuweisungen) {
        $modulName = if ($z.modulName) { $z.modulName } else { "Modul $($z.modulId)" }
        $dozentName = if ($z.dozentName) { $z.dozentName } else { "Dozent $($z.dozentId)" }
        Write-Host "    [$($idx.ToString().PadLeft(2))] " -NoNewline -ForegroundColor DarkGray
        Write-Host "$dozentName" -NoNewline -ForegroundColor White
        Write-Host " -> $modulName" -ForegroundColor Cyan
        $idx++
    }
    Write-Host ""
    $choice = Read-UserInput -Prompt "Nummer zum Entfernen" -Required
    $selIdx = [int]$choice - 1
    if ($selIdx -lt 0 -or $selIdx -ge $zuweisungen.Count) {
        Write-Error "Ungueltige Auswahl."
        Pause-CLI; return
    }
    
    $z = $zuweisungen[$selIdx]
    $qp = @{ dozentId = $z.dozentId; modulId = $z.modulId }
    Invoke-GradifyApi -Path "/api/module-zuweisungen" -Method "DELETE" -QueryParams $qp | Out-Null
    Write-Success "Zuweisung entfernt."
    Pause-CLI
}

# ============================================================
#                  MEIN STUDIUM (Student-Ansicht)
# ============================================================

function Select-MeineEinschreibung {
    if ($script:Einschreibungen.Count -eq 0) {
        Write-Error "Keine Einschreibungen vorhanden."
        return $null
    }
    if ($script:Einschreibungen.Count -eq 1) {
        return $script:Einschreibungen[0].id
    }
    # Mehrere Einschreibungen -> Auswahl
    Write-Host ""
    Write-Host "  Einschreibung waehlen:" -ForegroundColor Cyan
    for ($i = 0; $i -lt $script:Einschreibungen.Count; $i++) {
        $e = $script:Einschreibungen[$i]
        $sgName = if ($e.studiengangName) { $e.studiengangName } elseif ($e.studiengang) { $e.studiengang.name } else { "Studiengang $($e.studiengangId)" }
        Write-Host "    [$($i+1)] $sgName (Sem. $($e.aktuellesSemester), $($e.status))"
    }
    $choice = Read-MenuChoice -Prompt "Nummer"
    $idx = [int]$choice - 1
    if ($idx -ge 0 -and $idx -lt $script:Einschreibungen.Count) {
        return $script:Einschreibungen[$idx].id
    }
    Write-Error "Ungueltige Auswahl."
    return $null
}

function Show-MeineNoten {
    Write-Header "Meine Noten"
    $eid = Select-MeineEinschreibung
    if (-not $eid) { Pause-CLI; return }

    # Module laden fuer Namen-Aufloesung
    $einschreibung = $script:Einschreibungen | Where-Object { $_.id -eq $eid } | Select-Object -First 1
    $module = Get-ModuleForEinschreibung -Einschreibung $einschreibung
    
    $data = Invoke-GradifyApi -Path "/api/noten/einschreibung/$eid"
    if ($data) {
        $freigegebene = @($data | Where-Object { $_.status -eq "FREIGEGEBEN" })
        $ausstehend = @($data | Where-Object { $_.status -ne "FREIGEGEBEN" })

        if ($freigegebene.Count -gt 0) {
            Write-Host ""
            Write-Host "  Freigegebene Noten ($($freigegebene.Count)):" -ForegroundColor Green
            Write-Host ""
            
            # Tabelle mit Modulnamen
            foreach ($n in ($freigegebene | Sort-Object { $_.modulId })) {
                $modul = $module | Where-Object { $_.id -eq $n.modulId } | Select-Object -First 1
                $modulName = if ($modul) { $modul.name } else { "Modul $($n.modulId)" }
                $modulName = $modulName.PadRight(28).Substring(0,28)
                
                $noteStr = if ($null -ne $n.noteWert) { "{0:N1}" -f $n.noteWert } else { "b/nb" }
                $noteColor = if ($null -ne $n.noteWert) { Get-NoteColor $n.noteWert } else { "White" }
                
                $statusMark = if ($n.bestanden) { "[OK]" } else { "[X]" }
                $statusColor = if ($n.bestanden) { "Green" } else { "Red" }
                
                Write-Host "  $statusMark " -NoNewline -ForegroundColor $statusColor
                Write-Host "$modulName  " -NoNewline -ForegroundColor White
                Write-Host $noteStr.PadLeft(5) -NoNewline -ForegroundColor $noteColor
                Write-Host "  V$($n.versuch)" -ForegroundColor DarkGray
            }
        }

        if ($ausstehend.Count -gt 0) {
            Write-Host ""
            Write-Host "  Ausstehende Pruefungen: $($ausstehend.Count)" -ForegroundColor DarkYellow
            Write-Info "(Noten werden nach Freigabe durch das Pruefungsamt sichtbar)"
        }

        if ($freigegebene.Count -eq 0 -and $ausstehend.Count -eq 0) {
            Write-Info "Noch keine Noten vorhanden."
        }
    }
    Pause-CLI
}

function Show-MeinFortschritt {
    Write-Header "Mein Studienfortschritt"
    $eid = Select-MeineEinschreibung
    if (-not $eid) { Pause-CLI; return }

    # Fortschritt vom Service
    $data = Invoke-GradifyApi -Path "/api/berechnungen/einschreibung/$eid/fortschritt"
    
    # Wenn Service keine brauchbaren Daten liefert, selbst berechnen
    $hasData = $data -and ($data.ectsErreicht -gt 0 -or $data.moduleBestanden -gt 0 -or $data.ectsGesamt -gt 0)
    
    if ($hasData) {
        Show-FortschrittData $data
    } else {
        # Fallback: Aus Noten + Modulen berechnen
        $noten = Invoke-GradifyApi -Path "/api/noten/einschreibung/$eid"
        $einschreibung = $script:Einschreibungen | Where-Object { $_.id -eq $eid } | Select-Object -First 1
        $module = Get-ModuleForEinschreibung -Einschreibung $einschreibung
        
        Write-Host ""
        if ($noten) {
            $freigegebene = @($noten | Where-Object { $_.status -eq "FREIGEGEBEN" })
            $bestanden = @($freigegebene | Where-Object { $_.bestanden -eq $true })
            $nichtBestanden = @($freigegebene | Where-Object { $_.bestanden -eq $false })
            $offen = @($noten | Where-Object { $_.status -ne "FREIGEGEBEN" })
            
            # ECTS berechnen
            $ectsErreicht = 0
            $bestandeneIds = $bestanden | ForEach-Object { $_.modulId }
            foreach ($m in $module) {
                if ($bestandeneIds -contains $m.id) { $ectsErreicht += $m.ects }
            }
            $ectsGesamt = if ($module.Count -gt 0) { ($module | Measure-Object -Property ects -Sum).Sum } else { 0 }
            
            $pctEcts = if ($ectsGesamt -gt 0) { [math]::Round(($ectsErreicht / $ectsGesamt) * 100, 1) } else { 0 }
            $barLen = 30
            $filled = [math]::Max(0, [math]::Min($barLen, [math]::Floor($pctEcts / 100 * $barLen)))
            $bar = ("#" * $filled) + ("-" * ($barLen - $filled))
            
            Write-Host "  ECTS-Fortschritt:" -ForegroundColor Cyan
            Write-Host "  [$bar] $ectsErreicht/$ectsGesamt ECTS ($pctEcts%)" -ForegroundColor Green
            Write-Host ""
            
            Write-Host "  Module:" -ForegroundColor Cyan
            $moduleGesamt = $bestanden.Count + $offen.Count + $nichtBestanden.Count
            $pctModul = if ($moduleGesamt -gt 0) { [math]::Round(($bestanden.Count / $moduleGesamt) * 100, 1) } else { 0 }
            $filled = [math]::Max(0, [math]::Min($barLen, [math]::Floor($pctModul / 100 * $barLen)))
            $bar = ("#" * $filled) + ("-" * ($barLen - $filled))
            Write-Host "  [$bar] $($bestanden.Count)/$moduleGesamt bestanden ($pctModul%)" -ForegroundColor Green
            if ($offen.Count -gt 0 -or $nichtBestanden.Count -gt 0) {
                Write-Host "  Offen: $($offen.Count) | Nicht bestanden: $($nichtBestanden.Count)" -ForegroundColor DarkGray
            }
            Write-Host ""
            
            # Durchschnitt aus benoteten Modulen
            $benotete = @($bestanden | Where-Object { $null -ne $_.noteWert })
            if ($benotete.Count -gt 0) {
                $summe = 0.0
                foreach ($n in $benotete) { $summe += [double]$n.noteWert }
                $avg = [math]::Round($summe / $benotete.Count, 2)
                Write-Host "  Durchschnittsnote: " -NoNewline -ForegroundColor White
                Write-Host ("{0:N2}" -f $avg) -ForegroundColor (Get-NoteColor $avg)
            }
        } else {
            Write-Info "Keine Fortschrittsdaten verfuegbar."
        }
    }
    Pause-CLI
}

function Show-MeineGesamtnote {
    Write-Header "Meine Gesamtnote"
    $eid = Select-MeineEinschreibung
    if (-not $eid) { Pause-CLI; return }

    # 1. Versuche offizielle Berechnung vom Service
    $berechnung = Invoke-GradifyApi -Path "/api/berechnungen/einschreibung/$eid"
    $note = Get-Gesamtnote $berechnung

    # 2. Fallback: Selbst aus freigegebenen Noten berechnen (wie das Frontend)
    if ($null -eq $note) {
        $noten = Invoke-GradifyApi -Path "/api/noten/einschreibung/$eid"
        if ($noten) {
            $freigegebene = @($noten | Where-Object { $_.status -eq "FREIGEGEBEN" -and $null -ne $_.noteWert })
            if ($freigegebene.Count -gt 0) {
                $summe = 0.0
                foreach ($n in $freigegebene) { $summe += [double]$n.noteWert }
                $note = [math]::Round($summe / $freigegebene.Count, 2)
                Write-Host ""
                Write-Host "  Gesamtnote (Durchschnitt): " -NoNewline -ForegroundColor White
                Write-Host ("{0:N2}" -f $note) -ForegroundColor (Get-NoteColor $note)
                Write-Host "  (berechnet aus $($freigegebene.Count) benoteten Modulen)" -ForegroundColor DarkGray
            } else {
                # Zeige zumindest bestanden-Module
                $bestanden = @($noten | Where-Object { $_.status -eq "FREIGEGEBEN" -and $_.bestanden -eq $true })
                Write-Host ""
                Write-Host "  Gesamtnote: " -NoNewline -ForegroundColor White
                Write-Host "noch nicht berechenbar" -ForegroundColor DarkYellow
                if ($bestanden.Count -gt 0) {
                    Write-Host "  (aber $($bestanden.Count) Module bestanden - nur b/nb-Module)" -ForegroundColor DarkGray
                }
            }
        } else {
            Write-Host ""
            Write-Info "Keine Notendaten verfuegbar."
        }
    } else {
        Write-Host ""
        Write-Host "  Gesamtnote: " -NoNewline -ForegroundColor White
        Write-Host ("{0:N2}" -f $note) -ForegroundColor (Get-NoteColor $note)
    }

    if ($berechnung) {
        if ($berechnung.status) { Write-Host "  Status: $($berechnung.status)" -ForegroundColor DarkGray }
        if ($berechnung.berechnungsart) { Write-Host "  Berechnungsart: $($berechnung.berechnungsart)" -ForegroundColor DarkGray }
    }
    Pause-CLI
}

function Show-MeineBerechnungsDetails {
    Write-Header "Berechnungsdetails"
    $eid = Select-MeineEinschreibung
    if (-not $eid) { Pause-CLI; return }

    # Service-Daten
    $data = Invoke-GradifyApi -Path "/api/berechnungen/einschreibung/$eid"
    $noteVomService = Get-Gesamtnote $data

    if ($null -ne $noteVomService -or ($data -and $data.moduleBestanden -gt 0)) {
        Show-BerechnungDetailData $data
    } else {
        # Fallback: Eigene Berechnung zeigen
        $noten = Invoke-GradifyApi -Path "/api/noten/einschreibung/$eid"
        $einschreibung = $script:Einschreibungen | Where-Object { $_.id -eq $eid } | Select-Object -First 1
        $module = Get-ModuleForEinschreibung -Einschreibung $einschreibung
        
        Write-Host ""
        if ($noten) {
            $freigegebene = @($noten | Where-Object { $_.status -eq "FREIGEGEBEN" })
            $bestanden = @($freigegebene | Where-Object { $_.bestanden -eq $true })
            $benotete = @($bestanden | Where-Object { $null -ne $_.noteWert })
            
            # Moduldetails
            Write-Host "  Moduluebersicht (freigegebene Noten)" -ForegroundColor Cyan
            Write-Host "  ------------------------------------" -ForegroundColor DarkGray
            
            foreach ($n in $freigegebene) {
                $modul = $module | Where-Object { $_.id -eq $n.modulId } | Select-Object -First 1
                $name = if ($modul) { $modul.name.PadRight(30).Substring(0,30) } else { "Modul $($n.modulId)".PadRight(30) }
                $ects = if ($modul) { "$($modul.ects) ECTS" } else { "? ECTS" }
                $noteStr = if ($null -ne $n.noteWert) { "{0:N1}" -f $n.noteWert } else { "b/nb" }
                $statusMark = if ($n.bestanden) { "[OK]" } else { "[X]" }
                $color = if ($n.bestanden) { "Green" } else { "Red" }
                Write-Host "  $statusMark " -NoNewline -ForegroundColor $color
                Write-Host "$name  $noteStr  $ects" -ForegroundColor Gray
            }
            
            Write-Host ""
            Write-Host "  Zusammenfassung" -ForegroundColor Cyan
            Write-Host "  ---------------" -ForegroundColor DarkGray
            Write-Host "  Module bestanden:  $($bestanden.Count)" -ForegroundColor White
            Write-Host "  Davon benotet:     $($benotete.Count)" -ForegroundColor White
            
            if ($benotete.Count -gt 0) {
                $summe = 0.0
                foreach ($n in $benotete) { $summe += [double]$n.noteWert }
                $avg = [math]::Round($summe / $benotete.Count, 2)
                Write-Host "  Durchschnitt:      " -NoNewline -ForegroundColor White
                Write-Host ("{0:N2}" -f $avg) -ForegroundColor (Get-NoteColor $avg)
            }
            
            $ectsErreicht = 0
            $bestandeneIds = $bestanden | ForEach-Object { $_.modulId }
            foreach ($m in $module) {
                if ($bestandeneIds -contains $m.id) { $ectsErreicht += $m.ects }
            }
            $ectsGesamt = if ($module.Count -gt 0) { ($module | Measure-Object -Property ects -Sum).Sum } else { 0 }
            Write-Host "  ECTS:              $ectsErreicht / $ectsGesamt" -ForegroundColor White
            
            if ($data -and $data.status) { 
                Write-Host ""
                Write-Host "  Status:            $($data.status)" -ForegroundColor DarkGray 
            }
        } else {
            Write-Info "Keine Notendaten verfuegbar."
        }
    }
    Pause-CLI
}

function Show-MeinStudiengang {
    Write-Header "Mein Studiengang und Module"
    $eid = Select-MeineEinschreibung
    if (-not $eid) { Pause-CLI; return }

    $einschreibung = $script:Einschreibungen | Where-Object { $_.id -eq $eid } | Select-Object -First 1
    $data = Get-ModuleForEinschreibung -Einschreibung $einschreibung
    if ((-not $data -or $data.Count -eq 0)) {
        $sgId = Read-UserInput -Prompt "Studiengang-ID" -Required
        if ($sgId) { $data = Invoke-GradifyApi -Path "/api/studiengaenge/$sgId/module" }
    }
    if ($data) {
        Show-DataTable -Data $data -Columns @(
            @{ Header="Nr";       Field="modulNr";        Width=5  },
            @{ Header="Name";     Field="name";           Width=30 },
            @{ Header="ECTS";     Field="ects";           Width=5  },
            @{ Header="Sem.";     Field="semester";       Width=5  },
            @{ Header="Typ";      Field="modultyp";       Width=12 },
            @{ Header="Pruefung"; Field="pruefungsform";  Width=12 },
            @{ Header="Bewertung";Field="bewertungsart";  Width=12 }
        )
    }
    Pause-CLI
}

# ============================================================
#                        HAUPTMENUE
# ============================================================

function Show-LogoutOption {
    if (Confirm-Action "Wirklich abmelden?") {
        Invoke-Logout
        Write-Banner
        Write-Host ""
        Write-Host "  Auf Wiedersehen!" -ForegroundColor Cyan
        Write-Host ""
        return $true
    }
    return $false
}

function Show-MainMenu {
    while ($true) {
        # Pruefen ob noch eingeloggt
        if (-not $script:Token) {
            Show-LoginScreen
            if (-not $script:Token) { return }
        }

        switch ($script:PrimaryRole) {
            "ADMIN"                { if (Show-AdminMenu)      { return } }
            "HOCHSCHUL_VERWALTER"  { if (Show-VerwalterMenu)  { return } }
            "PRUEFUNGSAMT"         { if (Show-PruefamtMenu)   { return } }
            "LEHRENDER"            { if (Show-LehrenderMenu)  { return } }
            "STUDENT"              { if (Show-StudentMenu)    { return } }
            default                { if (Show-StudentMenu)    { return } }
        }
    }
}

# --- ADMIN: Vollzugriff ---
function Show-AdminMenu {
    Write-Banner
    Write-StatusBar
    Write-Host ""
    Write-Host "  --- Verwaltung ---" -ForegroundColor DarkGray
    Write-Host "  [1]   Mandanten und Studiengaenge"    -ForegroundColor White
    Write-Host "  [2]   Benutzerverwaltung"             -ForegroundColor White
    Write-Host "  [3]   Studentenverwaltung"             -ForegroundColor White
    Write-Host "  [4]   Einschreibungen"                 -ForegroundColor White
    Write-Host "  [5]   Notenverwaltung"                 -ForegroundColor White
    Write-Host "  [6]   Berechnungen und Fortschritt"    -ForegroundColor White
    Write-Host "  [7]   Modul-Zuweisungen (Dozenten)"    -ForegroundColor White
    Write-Host ""
    Write-Host "  --- Extras ---" -ForegroundColor DarkGray
    Write-Host "  [8]   Import / Export (CSV)"           -ForegroundColor DarkCyan
    Write-Host "  [9]   Audit-Protokoll"                 -ForegroundColor DarkCyan
    Write-Host "  [10]  GraphQL-Abfragen"                -ForegroundColor DarkCyan
    Write-Host "  [11]  Systemstatus"                    -ForegroundColor DarkCyan
    Write-Host ""
    Write-Host "  [0]   Abmelden und Beenden"           -ForegroundColor DarkGray

    switch (Read-MenuChoice) {
        "1"  { Show-MandantenMenu }
        "2"  { Show-BenutzerMenu }
        "3"  { Show-StudentenMenu }
        "4"  { Show-EinschreibungMenu }
        "5"  { Show-NotenMenu }
        "6"  { Show-BerechnungMenu }
        "7"  { Show-ModulZuweisungMenu }
        "8"  { Show-ImportExportMenu }
        "9"  { Show-AuditMenu }
        "10" { Show-GraphQLMenu }
        "11" { Show-SystemMenu }
        "0"  { return (Show-LogoutOption) }
    }
    return $false
}

# --- HOCHSCHULVERWALTER: Verwaltung ohne Noten ---
function Show-VerwalterMenu {
    Write-Banner
    Write-StatusBar
    Write-Host ""
    Write-Host "  --- Akademisch ---" -ForegroundColor DarkGray
    Write-Host "  [1]   Studiengaenge und Module"        -ForegroundColor White
    Write-Host "  [2]   Studentenverwaltung"             -ForegroundColor White
    Write-Host "  [3]   Einschreibungen"                 -ForegroundColor White
    Write-Host "  [4]   Notenvalidierung"                -ForegroundColor White
    Write-Host "  [5]   Modul-Zuweisungen (Dozenten)"    -ForegroundColor White
    Write-Host ""
    Write-Host "  --- Extras ---" -ForegroundColor DarkGray
    Write-Host "  [6]   Audit-Protokoll"                 -ForegroundColor DarkCyan
    Write-Host "  [7]   Import / Export (CSV)"           -ForegroundColor DarkCyan
    Write-Host ""
    Write-Host "  [0]   Abmelden und Beenden"           -ForegroundColor DarkGray

    switch (Read-MenuChoice) {
        "1" { Show-MandantenMenu }
        "2" { Show-StudentenMenu }
        "3" { Show-EinschreibungMenu }
        "4" { Show-NotenMenu }
        "5" { Show-ModulZuweisungMenu }
        "6" { Show-AuditMenu }
        "7" { Show-ImportExportMenu }
        "0" { return (Show-LogoutOption) }
    }
    return $false
}

# --- PRUEFUNGSAMT: Noten validieren/freigeben, Einschreibungen ---
function Show-PruefamtMenu {
    Write-Banner
    Write-StatusBar
    Write-Host ""
    Write-Host "  --- Pruefungsamt ---" -ForegroundColor DarkGray
    Write-Host "  [1]   Noten validieren und freigeben"           -ForegroundColor White
    Write-Host "  [2]   Berechnungen und Gesamtnoten"             -ForegroundColor White
    Write-Host ""
    Write-Host "  --- Verwaltung ---" -ForegroundColor DarkGray
    Write-Host "  [3]   Einschreibungen verwalten"                -ForegroundColor White
    Write-Host "  [4]   Studenten anzeigen"                       -ForegroundColor White
    Write-Host "  [5]   Studiengaenge und Module"                 -ForegroundColor White
    Write-Host ""
    Write-Host "  --- Extras ---" -ForegroundColor DarkGray
    Write-Host "  [6]   Audit-Protokoll"                          -ForegroundColor DarkCyan
    Write-Host "  [7]   Noten exportieren (CSV)"                  -ForegroundColor DarkCyan
    Write-Host ""
    Write-Host "  [0]   Abmelden und Beenden"                    -ForegroundColor DarkGray

    switch (Read-MenuChoice) {
        "1" { Show-NotenMenu }
        "2" { Show-BerechnungMenu }
        "3" { Show-EinschreibungMenu }
        "4" { Show-StudentenMenu }
        "5" { Show-MandantenMenu }
        "6" { Show-AuditMenu }
        "7" { Export-Noten }
        "0" { return (Show-LogoutOption) }
    }
    return $false
}

# --- LEHRENDER: Notenerfassung fuer zugewiesene Module ---
function Show-LehrenderMenu {
    Write-Banner
    Write-StatusBar
    Write-Host ""
    Write-Host "  --- Lehre ---" -ForegroundColor DarkGray
    Write-Host "  [1]   Notenerfassung"                          -ForegroundColor White
    Write-Host "  [2]   Meine zugewiesenen Module"               -ForegroundColor White
    Write-Host "  [3]   Noten eines Moduls anzeigen"             -ForegroundColor White
    Write-Host ""
    Write-Host "  --- Uebersicht ---" -ForegroundColor DarkGray
    Write-Host "  [4]   Studiengaenge und Module"                -ForegroundColor White
    Write-Host "  [5]   Audit-Protokoll"                         -ForegroundColor DarkCyan
    Write-Host ""
    Write-Host "  [0]   Abmelden und Beenden"                   -ForegroundColor DarkGray

    switch (Read-MenuChoice) {
        "1" { Show-LehrenderNotenMenu }
        "2" { Show-MeineModulZuweisungen }
        "3" { Show-NotenModul }
        "4" { Show-MandantenMenu }
        "5" { Show-AuditMenu }
        "0" { return (Show-LogoutOption) }
    }
    return $false
}

function Show-LehrenderNotenMenu {
    while ($true) {
        Write-Banner
        Write-StatusBar
        Write-Header "Notenerfassung (Lehrender)"
        Write-Host ""
        Write-Host "  [1]  Note erfassen"
        Write-Host "  [2]  Note bearbeiten"
        Write-Host "  [3]  Noten eines Moduls anzeigen"
        Write-Host "  [4]  Noten einer Einschreibung"
        Write-Host "  [5]  Gueltige Notenwerte"
        Write-Host ""
        Write-Host "  [0]  Zurueck" -ForegroundColor DarkGray

        switch (Read-MenuChoice) {
            "1" { New-Note }
            "2" { Edit-Note }
            "3" { Show-NotenModul }
            "4" { Show-NotenEinschreibung }
            "5" { Show-GueltigeNoten }
            "0" { return }
        }
    }
}

# --- STUDENT: Nur eigene Daten ---
function Show-StudentMenu {
    Write-Banner
    Write-StatusBar
    
    # Einschreibungs-Uebersicht direkt im Hauptmenue
    if ($script:Einschreibungen.Count -gt 0) {
        Write-Host ""
        foreach ($e in $script:Einschreibungen) {
            $sgName = if ($e.studiengangName) { $e.studiengangName } elseif ($e.studiengang) { $e.studiengang.name } else { "Studiengang $($e.studiengangId)" }
            $statusColor = switch ($e.status) { "AKTIV" { "Green" }; "ABGESCHLOSSEN" { "Cyan" }; default { "DarkGray" } }
            Write-Host "    $sgName" -NoNewline -ForegroundColor White
            Write-Host " | Sem. $($e.aktuellesSemester)" -NoNewline -ForegroundColor DarkGray
            Write-Host " | $($e.status)" -ForegroundColor $statusColor
        }
    }
    
    Write-Host ""
    Write-Host "  --- Mein Studium ---" -ForegroundColor DarkGray
    Write-Host "  [1]   Meine Noten"                    -ForegroundColor White
    Write-Host "  [2]   Mein Fortschritt"               -ForegroundColor White
    Write-Host "  [3]   Meine Gesamtnote"               -ForegroundColor White
    Write-Host ""
    Write-Host "  --- Informationen ---" -ForegroundColor DarkGray
    Write-Host "  [4]   Studiengang und Module"         -ForegroundColor White
    Write-Host "  [5]   Berechnungsdetails"             -ForegroundColor DarkCyan
    Write-Host ""
    Write-Host "  [0]   Abmelden und Beenden"           -ForegroundColor DarkGray

    switch (Read-MenuChoice) {
        "1" { Show-MeineNoten }
        "2" { Show-MeinFortschritt }
        "3" { Show-MeineGesamtnote }
        "4" { Show-MeinStudiengang }
        "5" { Show-MeineBerechnungsDetails }
        "0" { return (Show-LogoutOption) }
    }
    return $false
}

# ============================================================
#                          START
# ============================================================

Write-Banner
Show-LoginScreen
if ($script:Token) {
    Show-MainMenu
}
