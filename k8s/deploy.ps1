# Gradify: Kubernetes Deployment (PowerShell)
# Voraussetzung: kubectl konfiguriert, Docker Desktop mit K8s aktiviert
#
# Nutzung:
#   .\k8s\deploy.ps1                # Build + Deploy
#   .\k8s\deploy.ps1 -SkipBuild     # Nur Deploy (Images existieren bereits)
#   .\k8s\deploy.ps1 -Delete        # Alles entfernen
#   .\k8s\deploy.ps1 -Status        # Status anzeigen

param(
    [switch]$Delete,
    [switch]$SkipBuild,
    [switch]$Status
)

$ErrorActionPreference = "Stop"
$scriptDir = $PSScriptRoot
$projectRoot = Split-Path $scriptDir -Parent

# ===== Farben =====
$GREEN  = "Green"
$RED    = "Red"
$YELLOW = "Yellow"
$CYAN   = "Cyan"
$WHITE  = "White"

function Write-Step([string]$step, [string]$msg) {
    Write-Host ""
    Write-Host "[$step] $msg" -ForegroundColor $CYAN
    Write-Host ("-" * 50) -ForegroundColor $CYAN
}

function Write-Ok([string]$msg) {
    Write-Host "  [OK] $msg" -ForegroundColor $GREEN
}

function Write-Fail([string]$msg) {
    Write-Host "  [FAIL] $msg" -ForegroundColor $RED
}

# ===== kubectl Check =====
function Assert-Kubectl {
    $kv = $null
    try {
        $kv = kubectl version --client 2>&1
    } catch { }
    if (-not $kv -or $LASTEXITCODE -ne 0) {
        Write-Fail "kubectl nicht gefunden. Installiere kubectl oder aktiviere Kubernetes in Docker Desktop."
        exit 1
    }

    $ctx = $null
    try {
        $ctx = kubectl config current-context 2>&1
    } catch { }
    if (-not $ctx -or $LASTEXITCODE -ne 0) {
        Write-Fail "Kein kubectl-Kontext aktiv. Starte Docker Desktop und aktiviere Kubernetes."
        exit 1
    }
    Write-Ok "kubectl OK (Kontext: $ctx)"
}

# ===== Status =====
if ($Status) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor $CYAN
    Write-Host "  Gradify Kubernetes: Status" -ForegroundColor $CYAN
    Write-Host "========================================" -ForegroundColor $CYAN
    Write-Host ""

    Write-Host "Pods:" -ForegroundColor $YELLOW
    kubectl get pods -n gradify -o wide 2>$null
    Write-Host ""
    Write-Host "Services:" -ForegroundColor $YELLOW
    kubectl get svc -n gradify 2>$null
    Write-Host ""
    Write-Host "Ingress:" -ForegroundColor $YELLOW
    kubectl get ingress -n gradify 2>$null
    Write-Host ""
    Write-Host "Deployments:" -ForegroundColor $YELLOW
    kubectl get deployments -n gradify 2>$null
    exit 0
}

# ===== Delete =====
if ($Delete) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor $RED
    Write-Host "  Gradify Kubernetes: Teardown" -ForegroundColor $RED
    Write-Host "========================================" -ForegroundColor $RED
    Write-Host ""
    Write-Host "Loesche Namespace 'gradify' (alle Ressourcen)..." -ForegroundColor $YELLOW
    kubectl delete namespace gradify --ignore-not-found 2>$null
    Write-Ok "Namespace geloescht."
    exit 0
}

# ===== Deploy =====
Write-Host ""
Write-Host "========================================" -ForegroundColor $GREEN
Write-Host "  Gradify: Kubernetes Deployment" -ForegroundColor $GREEN
Write-Host "========================================" -ForegroundColor $GREEN

Assert-Kubectl

# ----- 1. Build -----
if (-not $SkipBuild) {
    Write-Step "1/8" "Maven Build (JARs)"
    Push-Location $projectRoot
    try {
        mvn -DskipTests package -pl gradify-api-gateway,gradify-auth-service,gradify-user-service,gradify-studiengang-service,gradify-noten-service,gradify-berechnungs-service -am
        if ($LASTEXITCODE -ne 0) { Write-Fail "Maven Build fehlgeschlagen"; exit 1 }
        Write-Ok "JARs gebaut"
    } finally {
        Pop-Location
    }

    Write-Step "2/8" "Docker Images bauen"
    $services = @(
        @{ name = "gradify/api-gateway";          dir = "gradify-api-gateway" },
        @{ name = "gradify/auth-service";          dir = "gradify-auth-service" },
        @{ name = "gradify/user-service";          dir = "gradify-user-service" },
        @{ name = "gradify/studiengang-service";   dir = "gradify-studiengang-service" },
        @{ name = "gradify/noten-service";         dir = "gradify-noten-service" },
        @{ name = "gradify/berechnungs-service";   dir = "gradify-berechnungs-service" },
        @{ name = "gradify/frontend";              dir = "gradify-frontend" }
    )

    $prevEAP = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    foreach ($svc in $services) {
        $ctx = Join-Path $projectRoot $svc.dir
        Write-Host "  Building $($svc.name)..." -ForegroundColor $WHITE -NoNewline
        docker build -t $svc.name $ctx 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Host ""
            Write-Fail "Docker build fehlgeschlagen: $($svc.name)"
            $ErrorActionPreference = $prevEAP
            exit 1
        }
        Write-Host " OK" -ForegroundColor $GREEN
    }
    $ErrorActionPreference = $prevEAP
    Write-Ok "Alle Images gebaut"
} else {
    Write-Host ""
    Write-Host "  Build uebersprungen (-SkipBuild)" -ForegroundColor $YELLOW
}

# ----- 2. Namespace + Config -----
Write-Step "3/8" "Namespace + Secrets + ConfigMap"
kubectl apply -f (Join-Path $scriptDir "namespace.yml")
kubectl apply -f (Join-Path $scriptDir "secrets.yml")
kubectl apply -f (Join-Path $scriptDir "configmap.yml")
Write-Ok "Konfiguration angelegt"

# ----- 3. Infrastruktur -----
Write-Step "4/8" "PostgreSQL + RabbitMQ"
kubectl apply -f (Join-Path $scriptDir "postgres.yml")
kubectl apply -f (Join-Path $scriptDir "rabbitmq.yml")

Write-Host "  Warte auf PostgreSQL..." -ForegroundColor $YELLOW
kubectl rollout status statefulset/postgres -n gradify --timeout=180s
Write-Host "  Warte auf RabbitMQ..." -ForegroundColor $YELLOW
kubectl rollout status deployment/rabbitmq -n gradify --timeout=120s
Write-Ok "Infrastruktur ready"

# ----- 4. User-Service (muss zuerst, Auth braucht ihn via gRPC) -----
Write-Step "5/8" "User-Service"
kubectl apply -f (Join-Path $scriptDir "user-service.yml")
kubectl rollout status deployment/user-service -n gradify --timeout=180s
Write-Ok "User-Service ready"

# ----- 5. Auth + Studiengang -----
Write-Step "6/8" "Auth-Service + Studiengang-Service"
kubectl apply -f (Join-Path $scriptDir "auth-service.yml")
kubectl apply -f (Join-Path $scriptDir "studiengang-service.yml")
kubectl rollout status deployment/auth-service -n gradify --timeout=180s
kubectl rollout status deployment/studiengang-service -n gradify --timeout=180s
Write-Ok "Auth + Studiengang ready"

# ----- 6. Noten + Berechnung + Gateway -----
Write-Step "7/8" "Noten + Berechnung + API-Gateway"
kubectl apply -f (Join-Path $scriptDir "noten-service.yml")
kubectl apply -f (Join-Path $scriptDir "berechnungs-service.yml")
kubectl apply -f (Join-Path $scriptDir "api-gateway.yml")
kubectl rollout status deployment/noten-service -n gradify --timeout=180s
kubectl rollout status deployment/berechnungs-service -n gradify --timeout=180s
kubectl rollout status deployment/api-gateway -n gradify --timeout=120s
Write-Ok "Backend ready"

# ----- 7. Frontend + Ingress -----
Write-Step "8/8" "Frontend + Ingress"
kubectl apply -f (Join-Path $scriptDir "frontend.yml")
kubectl apply -f (Join-Path $scriptDir "ingress.yml")
kubectl rollout status deployment/frontend -n gradify --timeout=60s
Write-Ok "Frontend + Ingress ready"

# ----- Zusammenfassung -----
Write-Host ""
Write-Host "========================================" -ForegroundColor $GREEN
Write-Host "  Deployment abgeschlossen!" -ForegroundColor $GREEN
Write-Host "========================================" -ForegroundColor $GREEN
Write-Host ""

kubectl get pods -n gradify
Write-Host ""
kubectl get svc -n gradify

Write-Host ""
Write-Host "Zugriff:" -ForegroundColor $CYAN
Write-Host "  API:      kubectl port-forward svc/api-gateway 8080:8080 -n gradify" -ForegroundColor $WHITE
Write-Host "  Frontend: kubectl port-forward svc/frontend 4200:80 -n gradify" -ForegroundColor $WHITE
Write-Host "  Ingress:  http://gradify.local (wenn nginx-ingress installiert)" -ForegroundColor $WHITE
Write-Host ""
Write-Host "Weitere Befehle:" -ForegroundColor $CYAN
Write-Host "  Status:   .\k8s\deploy.ps1 -Status" -ForegroundColor $WHITE
Write-Host "  Loeschen: .\k8s\deploy.ps1 -Delete" -ForegroundColor $WHITE
Write-Host "  Logs:     kubectl logs -f deployment/auth-service -n gradify" -ForegroundColor $WHITE
