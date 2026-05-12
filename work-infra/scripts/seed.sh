#!/usr/bin/env bash
# ============================================================
# AASOP - Development Data Seeder
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "AASOP Development Data Seeder"
echo ""

# Load environment
if [ -f "${PROJECT_DIR}/.env" ]; then
    export $(grep -v '^#' "${PROJECT_DIR}/.env" | xargs)
fi

if [ -z "${DATABASE_URL:-}" ]; then
    echo "ERROR: DATABASE_URL not set."
    exit 1
fi

echo "Seeding development data..."
cd "${PROJECT_DIR}/packages/database"

# Use Prisma db seed if available, otherwise use a direct approach
if [ -f "prisma/seed.ts" ]; then
    npx ts-node prisma/seed.ts
else
    echo "No seed script found. Creating basic seed..."
    
    # Create seed SQL
    cat > /tmp/seed.sql << 'EOF'
-- Seed development data
INSERT INTO "Organization" (id, name, slug, settings, created_at, updated_at)
VALUES (
    'dev-org-1',
    'AASOP Development Org',
    'aasop-dev',
    '{}',
    NOW(),
    NOW()
) ON CONFLICT DO NOTHING;

INSERT INTO "User" (id, email, name, role, organization_id, created_at, updated_at)
VALUES (
    'dev-user-1',
    'dev@aasop.local',
    'Developer',
    'ADMIN',
    'dev-org-1',
    NOW(),
    NOW()
) ON CONFLICT DO NOTHING;

INSERT INTO "Project" (id, name, slug, description, organization_id, settings, created_at, updated_at)
VALUES (
    'dev-project-1',
    'Sample Project',
    'sample',
    'A sample project for development',
    'dev-org-1',
    '{}',
    NOW(),
    NOW()
) ON CONFLICT DO NOTHING;

INSERT INTO "AgentTemplate" (id, name, description, config, organization_id, created_at, updated_at)
VALUES (
    'template-1',
    'Code Review Agent',
    'Reviews code for quality and best practices',
    '{"model": "gpt-4", "maxTokens": 4000}',
    'dev-org-1',
    NOW(),
    NOW()
) ON CONFLICT DO NOTHING;

INSERT INTO "AgentTemplate" (id, name, description, config, organization_id, created_at, updated_at)
VALUES (
    'template-2',
    'Bug Fix Agent',
    'Identifies and fixes bugs in code',
    '{"model": "gpt-4", "maxTokens": 4000}',
    'dev-org-1',
    NOW(),
    NOW()
) ON CONFLICT DO NOTHING;

INSERT INTO "WorkflowTemplate" (id, name, description, definition, organization_id, created_at, updated_at)
VALUES (
    'wf-template-1',
    'CI/CD Pipeline',
    'Automated CI/CD workflow',
    '{"steps": [{"name": "build"}, {"name": "test"}, {"name": "deploy"}]}',
    'dev-org-1',
    NOW(),
    NOW()
) ON CONFLICT DO NOTHING;
EOF
    
    psql "$DATABASE_URL" -f /tmp/seed.sql
    rm /tmp/seed.sql
fi

echo ""
echo "Development data seeded successfully."
echo ""
echo "Default accounts:"
echo "  Organization: AASOP Development Org (aasop-dev)"
echo "  User: dev@aasop.local (role: ADMIN)"
