#!/usr/bin/env bash
# ============================================================
# AASOP - Development Environment Setup Script
# ============================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          AASOP Development Environment Setup                  ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check prerequisites
check_prerequisite() {
    if command -v "$1" &> /dev/null; then
        echo -e "${GREEN}✓${NC} $1 found ($($1 --version 2>/dev/null | head -n1))"
        return 0
    else
        echo -e "${RED}✗${NC} $1 not found"
        return 1
    fi
}

echo "Checking prerequisites..."
MISSING=0

if ! check_prerequisite "node"; then
    echo -e "${YELLOW}  Please install Node.js 20+ from https://nodejs.org${NC}"
    MISSING=1
fi

if ! check_prerequisite "pnpm"; then
    echo -e "${YELLOW}  Installing pnpm...${NC}"
    npm install -g pnpm@9.0.0
fi

if ! check_prerequisite "docker"; then
    echo -e "${YELLOW}  Please install Docker from https://docker.com${NC}"
    MISSING=1
fi

if ! check_prerequisite "docker compose"; then
    echo -e "${YELLOW}  Please install Docker Compose${NC}"
    MISSING=1
fi

if ! check_prerequisite "kubectl"; then
    echo -e "${YELLOW}  Please install kubectl from https://kubernetes.io${NC}"
    MISSING=1
fi

if ! check_prerequisite "terraform"; then
    echo -e "${YELLOW}  Please install Terraform from https://terraform.io${NC}"
    MISSING=1
fi

if ! check_prerequisite "helm"; then
    echo -e "${YELLOW}  Please install Helm from https://helm.sh${NC}"
    MISSING=1
fi

if [ $MISSING -eq 1 ]; then
    echo ""
    echo -e "${RED}Some prerequisites are missing. Please install them and try again.${NC}"
    exit 1
fi

echo ""
echo "All prerequisites found. Continuing setup..."
echo ""

# Install dependencies
echo -e "${BLUE}→${NC} Installing project dependencies..."
cd "${PROJECT_DIR}"
pnpm install

# Setup environment file
if [ ! -f .env ]; then
    echo -e "${BLUE}→${NC} Creating .env file..."
    cat > .env << EOF
# ============================================================
# AASOP - Environment Configuration
# ============================================================
NODE_ENV=development
PORT=4000

# Database
DATABASE_URL=postgresql://aasop:aasop@localhost:5432/aasop

# Redis
REDIS_URL=redis://localhost:6379

# Qdrant
QDRANT_URL=http://localhost:6333

# NATS
NATS_URL=nats://localhost:4222

# Temporal
TEMPORAL_HOST=localhost:7233

# MinIO
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=aasop
MINIO_SECRET_KEY=aasop12345

# AI Providers
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_AI_API_KEY=

# Authentication
JWT_SECRET=dev-jwt-secret-change-in-production
CLERK_SECRET_KEY=

# Observability
LOKI_HOST=http://localhost:3100
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
EOF
    echo -e "${GREEN}✓${NC} .env created. Please add your API keys."
else
    echo -e "${GREEN}✓${NC} .env already exists."
fi

# Create init-scripts directory
mkdir -p "${PROJECT_DIR}/init-scripts"

# Start infrastructure
echo ""
echo -e "${BLUE}→${NC} Starting infrastructure services..."
docker compose up -d postgres redis qdrant nats temporal temporal-ui prometheus grafana loki minio

# Wait for PostgreSQL
echo -e "${BLUE}→${NC} Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
    if docker compose exec -T postgres pg_isready -U aasop > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} PostgreSQL is ready"
        break
    fi
    echo -n "."
    sleep 1
done

# Run migrations
echo -e "${BLUE}→${NC} Running database migrations..."
cd "${PROJECT_DIR}/packages/database"
pnpm prisma generate
pnpm prisma migrate dev --name init

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              Setup Complete!                                  ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Available services:"
echo -e "  ${BLUE}API${NC}          http://localhost:4000"
echo -e "  ${BLUE}Web${NC}          http://localhost:3000"
echo -e "  ${BLUE}Grafana${NC}      http://localhost:3000 (admin/admin)"
echo -e "  ${BLUE}Prometheus${NC}   http://localhost:9090"
echo -e "  ${BLUE}Temporal UI${NC}  http://localhost:8088"
echo -e "  ${BLUE}MinIO${NC}        http://localhost:9001 (aasop/aasop12345)"
echo -e "  ${BLUE}Qdrant${NC}       http://localhost:6333"
echo -e "  ${BLUE}Loki${NC}         http://localhost:3100"
echo ""
echo -e "Next steps:"
echo -e "  1. Add your API keys to ${YELLOW}.env${NC}"
echo -e "  2. Run ${YELLOW}pnpm dev${NC} to start the application"
echo -e "  3. Run ${YELLOW}make test${NC} to verify everything works"
echo ""
