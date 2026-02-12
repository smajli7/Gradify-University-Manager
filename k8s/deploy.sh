#!/bin/bash
# Gradify: Komplettes Kubernetes Deployment
# Voraussetzung: kubectl konfiguriert, Cluster erreichbar, nginx-ingress installiert
#
# Nutzung:
#   chmod +x deploy.sh
#   ./deploy.sh          # Deploy
#   ./deploy.sh delete   # Teardown

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ "${1:-}" = "delete" ]; then
    echo "=== Gradify: Kubernetes Teardown ==="
    kubectl delete namespace gradify --ignore-not-found
    echo "Done."
    exit 0
fi

echo "=== Gradify: Kubernetes Deployment ==="
echo ""

# 1. Namespace
echo "[1/7] Namespace..."
kubectl apply -f "$SCRIPT_DIR/namespace.yml"

# 2. Secrets + ConfigMap
echo "[2/7] Secrets + ConfigMap..."
kubectl apply -f "$SCRIPT_DIR/secrets.yml"
kubectl apply -f "$SCRIPT_DIR/configmap.yml"

# 3. Infrastruktur (Postgres + RabbitMQ)
echo "[3/7] PostgreSQL + RabbitMQ..."
kubectl apply -f "$SCRIPT_DIR/postgres.yml"
kubectl apply -f "$SCRIPT_DIR/rabbitmq.yml"

echo "  Warte auf PostgreSQL ready..."
kubectl rollout status statefulset/postgres -n gradify --timeout=120s
echo "  Warte auf RabbitMQ ready..."
kubectl rollout status deployment/rabbitmq -n gradify --timeout=120s

# 4. Backend-Services (Reihenfolge: User -> Auth -> Studiengang -> Noten -> Berechnung)
echo "[4/7] User-Service..."
kubectl apply -f "$SCRIPT_DIR/user-service.yml"
kubectl rollout status deployment/user-service -n gradify --timeout=120s

echo "[5/7] Auth + Studiengang..."
kubectl apply -f "$SCRIPT_DIR/auth-service.yml"
kubectl apply -f "$SCRIPT_DIR/studiengang-service.yml"
kubectl rollout status deployment/auth-service -n gradify --timeout=120s
kubectl rollout status deployment/studiengang-service -n gradify --timeout=120s

echo "[6/7] Noten + Berechnung + Gateway..."
kubectl apply -f "$SCRIPT_DIR/noten-service.yml"
kubectl apply -f "$SCRIPT_DIR/berechnungs-service.yml"
kubectl apply -f "$SCRIPT_DIR/api-gateway.yml"
kubectl rollout status deployment/noten-service -n gradify --timeout=120s
kubectl rollout status deployment/berechnungs-service -n gradify --timeout=120s
kubectl rollout status deployment/api-gateway -n gradify --timeout=120s

# 5. Frontend + Ingress
echo "[7/7] Frontend + Ingress..."
kubectl apply -f "$SCRIPT_DIR/frontend.yml"
kubectl apply -f "$SCRIPT_DIR/ingress.yml"
kubectl rollout status deployment/frontend -n gradify --timeout=60s

echo ""
echo "=== Deployment abgeschlossen ==="
echo ""
echo "Pods:"
kubectl get pods -n gradify -o wide
echo ""
echo "Services:"
kubectl get svc -n gradify
echo ""
echo "Ingress:"
kubectl get ingress -n gradify
echo ""
echo "Zugriff: http://gradify.local (Ingress) oder kubectl port-forward svc/api-gateway 8080:8080 -n gradify"
