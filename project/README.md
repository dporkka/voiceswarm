# AASOP — Autonomous Agentic Software Organization Platform

> **Infrastructure-as-Code**, **Docker Compose**, **Kubernetes manifests**, **Terraform modules**, and **CI/CD pipelines** for the AASOP platform.

---

## Architecture Overview

```
+-------------------------------------------------------------+
|                        CLIENT LAYER                          |
|     React/Next.js Web    |    Mobile/CLI/External API       |
+-------------+--------------+-------------------------------+
              |                              |
              v                              v
+-------------+--------------+    +----------+-----------+
|         Ingress Controller  |    |    WebSocket (ws)    |
|     (NGINX / AWS ALB)      |    |    Real-time Events   |
+-------------+--------------+    +----------+-----------+
              |                              |
              v                              v
+-------------+--------------+    +----------+-----------+
|          Web Frontend       |    |   Realtime Service   |
|       (Next.js / 3000)     |    |    (Socket.io/4300)  |
+-------------+--------------+    +----------+-----------+
              |                              |
              v                              |
+-------------+--------------+               |
|         API Gateway         |<--------------+
|      (Fastify / 4000)      |
+-----------------------------+
              |
    +---------+---------+---------+---------+
    |         |         |         |         |
    v         v         v         v         v
+-------+ +-------+ +-------+ +-------+ +-------+
|Temporal| | NATS  | | Qdrant| | Redis | |PostgreSQL|
|Workflow| | Events| |Vectors| | Cache | |  (RDS)  |
+-------+ +-------+ +-------+ +-------+ +-------+
    |                                      |
    v                                      v
+-------+                           +-----------+
|Agent  |                           |   S3/MinIO|
|Runtime|                           |   Storage |
|(4100) |                           +-----------+
+-------+
    |
    v
+-------+-------+-------+
| OpenAI | Claude | Bedrock |
+-------+-------+-------+
```

---

## Quick Start

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | >= 20 | Runtime |
| pnpm | >= 9 | Package manager |
| Docker | >= 24 | Containerization |
| Docker Compose | >= 2.20 | Local orchestration |
| kubectl | >= 1.28 | K8s CLI |
| Terraform | >= 1.7 | IaC |
| Helm | >= 3.13 | K8s package manager |

### One-Command Setup

```bash
# Clone the repository
git clone https://github.com/aasop/aasop.git
cd aasop

# Run automated setup
./scripts/setup.sh
```

### Manual Setup

```bash
# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env

# Start infrastructure services
docker compose up -d postgres redis qdrant nats temporal temporal-ui prometheus grafana loki minio

# Run database migrations
cd packages/database && pnpm prisma migrate dev

# Start development servers
pnpm dev
```

### Access Services

| Service | URL | Credentials |
|---------|-----|-------------|
| API | http://localhost:4000 | - |
| Web App | http://localhost:3000 | - |
| Grafana | http://localhost:3000 | admin / admin |
| Prometheus | http://localhost:9090 | - |
| Temporal UI | http://localhost:8088 | - |
| MinIO Console | http://localhost:9001 | aasop / aasop12345 |
| Qdrant | http://localhost:6333 | - |
| Loki | http://localhost:3100 | - |

---

## Development

### Makefile Commands

```bash
make setup          # Initial project setup
make dev            # Start all dev services
make build          # Build all packages
make test           # Run all tests
make lint           # Run linter
make migrate        # Run database migrations
make db-studio      # Open Prisma Studio
make docker-up      # Start Docker Compose
make infra-up       # Apply Terraform (dev)
make k8s-deploy     # Deploy to Kubernetes
make security-scan  # Run security scans
make help           # Show all commands
```

### Package Structure

```
.
├── apps/
│   ├── api/               # Fastify API Gateway (port 4000)
│   ├── web/               # Next.js Frontend (port 3000)
│   ├── agent-runtime/     # Agent execution engine (port 4100)
│   ├── workflow-worker/   # Temporal worker
│   ├── realtime/          # WebSocket server (port 4300)
│   └── voice-service/     # Voice/speech service (port 4400)
├── packages/
│   ├── database/          # Prisma ORM & migrations
│   ├── shared/            # Shared utilities
│   ├── ai-sdk/            # AI provider abstractions
│   ├── tsconfig/          # Shared TypeScript configs
│   └── ui/                # Shared UI components
├── infra/
│   ├── docker/            # Docker configs (prometheus, loki, grafana)
│   ├── kubernetes/        # K8s manifests (30+ files)
│   └── terraform/         # Terraform modules & environments
├── .github/workflows/     # CI/CD pipelines
├── scripts/               # Dev helper scripts
├── docker-compose.yml     # Local dev stack
└── Makefile              # Common commands
```

---

## Docker

### Multi-Stage Dockerfiles

All application Dockerfiles use multi-stage builds for minimal image sizes:

```bash
# Build all images
docker compose build

# Build specific app
docker build -f apps/api/Dockerfile -t aasop/api .
docker build -f apps/web/Dockerfile -t aasop/web .
docker build -f apps/agent-runtime/Dockerfile -t aasop/agent-runtime .
docker build -f apps/workflow-worker/Dockerfile -t aasop/workflow-worker .
docker build -f apps/realtime/Dockerfile -t aasop/realtime .
```

### Image Sizes (typical)

| Image | Size | Base |
|-------|------|------|
| api | ~120MB | node:20-alpine |
| web | ~150MB | node:20-alpine |
| agent-runtime | ~130MB | node:20-alpine |
| workflow-worker | ~110MB | node:20-alpine |
| realtime | ~115MB | node:20-alpine |

### Security Hardening

- Non-root user (`aasop:1001`)
- Read-only root filesystem where possible
- Dropped Linux capabilities
- Health checks on all containers
- Distroless final images

---

## Kubernetes

### Architecture

The Kubernetes deployment includes:

| Component | Type | Replicas | Resources |
|-----------|------|----------|-----------|
| api | Deployment | 2-20 (HPA) | 256Mi-512Mi, 250m-1CPU |
| web | Deployment | 2-10 (HPA) | 128Mi-512Mi, 100m-500m |
| agent-runtime | Deployment | 2-30 (HPA) | 512Mi-2Gi, 500m-2CPU |
| workflow-worker | Deployment | 2-10 (HPA) | 256Mi-1Gi, 250m-1CPU |
| realtime | Deployment | 2-10 (HPA) | 256Mi-1Gi, 250m-1CPU |
| postgres | StatefulSet | 1 | 1Gi, 1CPU |
| redis | Deployment | 1 | 512Mi, 500m |
| qdrant | StatefulSet | 1 | 2Gi, 1CPU |
| nats | StatefulSet | 3 | 512Mi, 500m |
| temporal | Deployment | 1 | 1Gi, 1CPU |
| prometheus | Deployment | 1 | 2Gi, 1CPU |
| grafana | Deployment | 1 | 512Mi, 500m |

### Deploy

```bash
# Create namespace
kubectl apply -f infra/kubernetes/namespace.yaml

# Deploy all components
kubectl apply -f infra/kubernetes/

# Or deploy selectively
kubectl apply -f infra/kubernetes/postgres/
kubectl apply -f infra/kubernetes/redis/
kubectl apply -f infra/kubernetes/api/
kubectl apply -f infra/kubernetes/web/

# Check status
kubectl get all -n aasop
make k8s-status

# View logs
make k8s-logs-api
make k8s-logs-agent-runtime

# Port forward
make k8s-port-forward-api
make k8s-port-forward-web
```

### Network Policies

Default deny-all with explicit allow rules:
- Ingress from NGINX Ingress Controller
- Prometheus scraping
- Inter-service communication via labeled selectors
- DNS resolution to kube-system

### HPA Configuration

All application deployments include Horizontal Pod Autoscalers:
- CPU target: 70%
- Memory target: 80%
- Custom metric: active agents count
- Scale-up: Fast (60s stabilization)
- Scale-down: Slow (300s stabilization)

---

## Terraform

### Module Structure

```
infra/terraform/
├── main.tf              # Root module composition
├── variables.tf         # Input variables
├── outputs.tf           # Output values
├── versions.tf          # Provider versions
├── modules/
│   ├── vpc/             # VPC, subnets, NAT, IGW
│   ├── eks/             # EKS cluster, node groups (GPU support)
│   ├── rds/             # PostgreSQL RDS with encryption
│   ├── elasticache/     # Redis cluster
│   ├── s3/              # S3 buckets with lifecycle
│   ├── iam/             # IRSA roles, policies
│   └── monitoring/      # CloudWatch alarms, dashboards
└── environments/
    ├── dev/             # Dev environment
    ├── staging/         # Staging environment
    └── prod/            # Production environment
```

### Deploy Infrastructure

```bash
# Development
cd infra/terraform/environments/dev
terraform init
terraform plan
terraform apply

# Staging
cd infra/terraform/environments/staging
terraform init
terraform plan
terraform apply

# Production
cd infra/terraform/environments/prod
terraform init
terraform plan
terraform apply
```

### State Management

Terraform state is stored in S3 with DynamoDB locking:

```bash
# Create state bucket (one-time)
aws s3 mb s3://aasop-terraform-state
aws dynamodb create-table \
    --table-name aasop-terraform-locks \
    --attribute-definitions AttributeName=LockID,AttributeType=S \
    --key-schema AttributeName=LockID,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST
```

---

## CI/CD Pipelines

### CI Pipeline (`.github/workflows/ci.yml`)

Triggered on push/PR to `main` or `develop`:

```
+---------+     +---------+     +---------+     +---------+
|  Lint   | --> |  Build  | --> |  Test   | --> | Docker  |
| +TypeChk|     | Packages|     | Unit+Int|     |  Build  |
+---------+     +---------+     +---------+     +---------+
```

### CD Pipeline (`.github/workflows/cd.yml`)

Triggered on push to `main` or manual dispatch:

```
+---------+     +---------+     +-----------------+
|  Build  | --> |  Push   | --> | Deploy Staging  |
| Images  |     |  to ECR |     |  (automatic)    |
+---------+     +---------+     +-----------------+
                                          |
                                          v
                               +-----------------+
                               | Deploy Prod     |
                               | (manual approve)|
                               +-----------------+
```

### Security Scanning (`.github/workflows/security-scan.yml`)

- **Snyk**: Dependency vulnerability scanning
- **Trivy**: Container and filesystem scanning
- **Trivy Config**: Terraform and Kubernetes manifest scanning
- **TruffleHog**: Secret detection

### PR Checks (`.github/workflows/pr-check.yml`)

- PR title validation (Conventional Commits)
- Quick lint + typecheck + test for changed files
- Dependency review
- Bundle size check

---

## Observability

### Metrics (Prometheus)

Scraping targets configured for all services:
- HTTP request rate, duration, errors
- Active agents count
- Workflow execution rate
- Container resource usage
- NATS message throughput

### Logs (Loki)

Structured JSON logging with labels:
```json
{
  "level": "info",
  "msg": "Agent completed task",
  "agent_id": "agent-123",
  "task_id": "task-456",
  "duration_ms": 1500,
  "trace_id": "abc123"
}
```

### Dashboards (Grafana)

Pre-configured dashboards:
- **AASOP Overview**: Request rate, response time, CPU, memory, active agents, errors
- **System Metrics**: Node-level metrics
- **Database Metrics**: PostgreSQL query performance

### Alerts (CloudWatch / PagerDuty)

- RDS CPU > 80%
- RDS storage < 5GB
- ElastiCache CPU > 80%
- EKS node CPU > 80%
- EKS node memory > 85%

---

## Security

### Authentication
- JWT-based authentication
- Clerk integration for SSO
- API key authentication for service-to-service

### Authorization
- RBAC with role-based access control
- Kubernetes RBAC for service accounts
- AWS IAM with IRSA for pod-level permissions

### Data Protection
- TLS 1.3 for all communications
- AES-256 encryption at rest (RDS, S3, ElastiCache)
- KMS key management
- Secrets stored in AWS Secrets Manager / Kubernetes Secrets

### Network Security
- VPC with private subnets
- Security groups with least-privilege access
- Network policies in Kubernetes (default deny)
- Private endpoints for AWS services

---

## Contributing

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

Scopes: `api`, `web`, `agent`, `worker`, `db`, `infra`, `ci`, `deps`

### Pull Request Process

1. Create a feature branch from `develop`
2. Make your changes
3. Run `make lint` and `make test`
4. Open a PR against `develop`
5. CI checks must pass
6. Code review required (1+ approvals)
7. Merge via squash

### Release Process

1. Merge `develop` into `main`
2. CI automatically builds and deploys to staging
3. Manual approval required for production deployment
4. Canary deployment with smoke tests
5. Full promotion after verification

---

## License

[MIT](LICENSE)

---

## Support

- **Issues**: [GitHub Issues](https://github.com/aasop/aasop/issues)
- **Discussions**: [GitHub Discussions](https://github.com/aasop/aasop/discussions)
- **Documentation**: [docs.aasop.example.com](https://docs.aasop.example.com)
