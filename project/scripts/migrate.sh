#!/usr/bin/env bash
# ============================================================
# AASOP - Database Migration Runner
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENVIRONMENT="${1:-dev}"

echo "AASOP Database Migration Runner"
echo "Environment: $ENVIRONMENT"
echo ""

# Check if we're in a Kubernetes environment
if [ "$ENVIRONMENT" == "k8s" ] || [ "$ENVIRONMENT" == "kubernetes" ]; then
    echo "Running migrations in Kubernetes..."
    POD_NAME=$(kubectl get pods -n aasop -l app.kubernetes.io/name=api -o jsonpath='{.items[0].metadata.name}')
    echo "Found API pod: $POD_NAME"
    kubectl exec -n aasop "$POD_NAME" -- npx prisma migrate deploy
    echo "Migrations applied successfully."
    exit 0
fi

# Check if DATABASE_URL is set
if [ -z "${DATABASE_URL:-}" ]; then
    if [ -f "${PROJECT_DIR}/.env" ]; then
        export $(grep -v '^#' "${PROJECT_DIR}/.env" | xargs)
    else
        echo "ERROR: DATABASE_URL not set and .env file not found."
        exit 1
    fi
fi

# Run migrations
echo "Running migrations..."
cd "${PROJECT_DIR}/packages/database"

if [ "$ENVIRONMENT" == "dev" ]; then
    pnpm prisma migrate dev
else
    pnpm prisma migrate deploy
fi

# Generate client
echo "Generating Prisma client..."
pnpm prisma generate

echo ""
echo "Migrations completed successfully."
