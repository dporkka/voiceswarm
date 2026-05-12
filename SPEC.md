# SPEC.md — Autonomous Agentic Software Organization Platform

## Project Overview
Production-grade "operating system for autonomous software organizations." A monorepo platform combining autonomous coding agents, durable workflows, voice orchestration, realtime collaboration, and enterprise governance.

## Monorepo Structure (Turborepo + pnpm)
```
aasop/
├── .github/
│   └── workflows/
│       ├── ci.yml              # CI pipeline
│       ├── cd.yml              # CD pipeline
│       └── security-scan.yml   # Security scanning
├── apps/
│   ├── api/                    # Fastify API gateway
│   ├── web/                    # Next.js frontend
│   ├── agent-runtime/          # Agent execution engine
│   ├── workflow-worker/        # Temporal workflow workers
│   ├── realtime/               # WebSocket/Socket.IO server
│   └── voice-service/          # Voice processing service
├── packages/
│   ├── shared-kernel/          # Core types, schemas, events
│   ├── database/               # PostgreSQL + Qdrant + Redis client
│   ├── model-router/           # Inference routing logic
│   ├── sandbox-manager/        # Container/Firecracker sandboxing
│   ├── memory-service/         # Memory system (semantic, episodic, etc.)
│   ├── security/               # RBAC, auth, audit
│   ├── observability/          # OTel, metrics, logging
│   ├── config/                 # Shared config, eslint, tsconfig
│   └── sdk/                    # TypeScript SDK for external use
├── infra/
│   ├── terraform/              # IaC for AWS/GCP
│   ├── kubernetes/             # K8s manifests
│   └── docker/                 # Docker Compose + Dockerfiles
├── docs/
│   ├── architecture/           # Architecture documents
│   └── api/                    # API documentation
├── scripts/
│   ├── setup.sh                # Development setup
│   └── migrate.sh              # Database migrations
├── docker-compose.yml          # Local development stack
├── turbo.json                  # Turborepo config
├── pnpm-workspace.yaml         # Workspace definition
├── pnpm-lock.yaml
├── package.json                # Root package.json
├── .env.example
├── .gitignore
└── Makefile
```

## Technology Stack

### Backend
- **Runtime**: Node.js 20+ (TypeScript 5.4+)
- **API Framework**: Fastify 4.x with @fastify/websocket
- **Validation**: Zod 3.x (schemas shared across frontend/backend)
- **Database ORM**: Kysely (type-safe SQL) + Prisma (migrations)
- **Workflow Engine**: Temporal TypeScript SDK
- **Message Queue**: NATS JetStream (nats.ws client)
- **Cache**: Redis 7+ (ioredis)
- **Vector DB**: Qdrant client
- **Realtime**: Socket.IO 4.x

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS 3.4+
- **UI Components**: shadcn/ui
- **State**: Zustand (client), React Query (server)
- **Terminal**: xterm.js + node-pty
- **Editor**: Monaco Editor (lazy loaded)
- **Charts**: Recharts / Tremor

### Infrastructure
- **Containers**: Docker 24+ / Docker Compose
- **Orchestration**: Kubernetes 1.28+
- **IaC**: Terraform / OpenTofu
- **CI/CD**: GitHub Actions
- **Service Mesh**: Istio (optional)

### Shared Packages
- **Language**: TypeScript 5.4+
- **Build Tool**: tsup (packages), Next.js (apps)
- **Linting**: ESLint + @aasop/eslint-config
- **Formatting**: Prettier
- **Testing**: Vitest (unit), Playwright (e2e)

## Core Module Specifications

### 1. @aasop/shared-kernel
**Path**: `packages/shared-kernel`
**Purpose**: Core domain types, Zod schemas, event definitions shared across all services.

**Exports**:
- Domain types: `User`, `Organization`, `Agent`, `Task`, `Workflow`, `Project`
- Zod schemas for all API request/response validation
- Event definitions: `AgentEvent`, `TaskEvent`, `WorkflowEvent` (CloudEvents compatible)
- Enums: `AgentState`, `TaskStatus`, `WorkflowStatus`, `MemoryType`, `SandboxStatus`
- Utility types: `Result<T,E>`, `PaginatedResponse<T>`, `EventEnvelope`

### 2. @aasop/database
**Path**: `packages/database`
**Purpose**: Database clients, migrations, seeders, and repository patterns.

**Exports**:
- `PostgresClient` — Kysely query builder with connection pooling
- `QdrantClient` — Vector search client with collection management
- `RedisClient` — Cache + pub/sub + queue operations
- `migrate()` — Migration runner using Prisma Migrate
- `seed()` — Development seed data
- Repository classes: `UserRepo`, `AgentRepo`, `TaskRepo`, `WorkflowRepo`, `MemoryRepo`, `SandboxRepo`

### 3. @aasop/model-router
**Path**: `packages/model-router`
**Purpose**: Intelligent LLM routing with fallback, cost tracking, and load balancing.

**Exports**:
- `ModelRouter` — Main routing engine
- `ProviderAdapter` interface + implementations (OpenAI, Anthropic, Gemini, vLLM, SGLang)
- `RoutingStrategy` — CostOptimized, LatencyOptimized, QualityOptimized
- `FallbackChain` — Automatic provider failover
- `TokenTracker` — Per-request token counting and cost attribution

### 4. @aasop/sandbox-manager
**Path**: `packages/sandbox-manager`
**Purpose**: Secure code execution environments.

**Exports**:
- `SandboxManager` — Pool-based sandbox lifecycle
- `Sandbox` — Individual sandbox operations (exec, write, read)
- Security: Resource constraints, network isolation, secret injection
- `SandboxPool` — Pre-warmed pool management

### 5. @aasop/memory-service
**Path**: `packages/memory-service`
**Purpose**: Multi-tier memory management for agents.

**Exports**:
- `MemoryService` — Unified memory interface
- `SemanticMemory` — Qdrant-backed vector search
- `EpisodicMemory` — PostgreSQL conversation history
- `ProjectMemory` — Repository embeddings and context
- `ContextAssembler` — Context window management

### 6. @aasop/security
**Path**: `packages/security`
**Purpose**: Authentication, authorization, RBAC, audit logging.

**Exports**:
- `AuthManager` — JWT + API key + OAuth2
- `RBAC` — Role-based access control
- `PermissionChecker` — Resource-level permission validation
- `AuditLogger` — Immutable audit logging
- `TenantResolver` — Multi-tenant context resolution

### 7. @aasop/observability
**Path**: `packages/observability`
**Purpose**: Tracing, metrics, structured logging.

**Exports**:
- `createTracer()` — OpenTelemetry tracer setup
- `createMetrics()` — Prometheus metrics registry
- `createLogger()` — Pino structured logger
- Fastify plugins for automatic instrumentation

### 8. @aasop/sdk
**Path**: `packages/sdk`
**Purpose**: External TypeScript SDK for API consumers.

**Exports**:
- `AASOPClient` — Main client with auth
- Resource clients: `AgentClient`, `TaskClient`, `WorkflowClient`
- Type exports from shared-kernel

## App Specifications

### apps/api — API Gateway
- Fastify server with modular plugin architecture
- Routes: `/v1/agents`, `/v1/tasks`, `/v1/workflows`, `/v1/projects`, `/v1/memory`, `/v1/sandbox`, `/v1/models`, `/v1/auth`, `/v1/observability`
- Middleware: Auth, rate limiting, request validation, error handling, CORS
- Health checks: `/health`, `/ready`, `/metrics`
- WebSocket upgrade on `/v1/realtime`

### apps/web — Frontend Application
- Next.js App Router with route groups
- Route structure:
  - `/` — Dashboard
  - `/agents` — Agent fleet management
  - `/agents/[id]` — Agent detail with terminal
  - `/tasks` — Task kanban board
  - `/workflows` — Workflow visualizer
  - `/projects` — Project management
  - `/memory` — Memory inspection
  - `/observability` — Metrics and logs
  - `/settings` — Organization settings
- Key components: Terminal, Kanban, Chat, WorkflowGraph, AgentCard, CostDashboard

### apps/agent-runtime — Agent Execution Engine
- Agent lifecycle management
- Task execution loop with sandbox integration
- Agent-to-agent communication
- State machine implementation
- Event emission for observability

### apps/workflow-worker — Temporal Workers
- Temporal worker registration
- Workflow implementations (sequential, parallel, human-in-the-loop)
- Activity definitions with retry policies
- Signal and query handlers

### apps/realtime — WebSocket Server
- Socket.IO server with room-based channels
- Presence tracking
- Event broadcasting
- Collaborative session management

### apps/voice-service — Voice Processing
- STT integration (Whisper/Deepgram)
- Conversational orchestration
- TTS integration
- LiveKit audio pipeline

## Infrastructure Specifications

### Docker Services (docker-compose.yml)
- PostgreSQL 16 (primary + replica)
- Qdrant (vector search)
- Redis 7 (cache + pub/sub)
- NATS JetStream (message queue)
- Temporal (server + UI + Elasticsearch)
- Grafana + Prometheus + Loki (observability)
- MinIO (S3-compatible object storage)

### Kubernetes Manifests
- Namespace: `aasop`
- Deployments for each app service
- StatefulSets for databases
- Services + Ingress
- ConfigMaps + Secrets
- HPA for auto-scaling
- Network policies

### Terraform
- VPC + subnets + security groups
- EKS/GKE cluster
- RDS/Cloud SQL (PostgreSQL)
- ElastiCache/Memorystore (Redis)
- S3/GCS buckets
- DNS + CDN

## Key Interfaces

### ModelRouter
```typescript
interface ModelRouter {
  route(request: RouteRequest): Promise<RouteResult>;
  registerProvider(provider: ProviderAdapter): void;
  setStrategy(strategy: RoutingStrategy): void;
  getProviderHealth(): ProviderHealth[];
}

interface RouteRequest {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  routing?: RoutingConfig;
  stream?: boolean;
  structured?: ZodSchema;
}

interface RouteResult {
  content: string;
  usage: TokenUsage;
  provider: string;
  model: string;
  latency: number;
  cost: number;
}
```

### Agent Runtime
```typescript
interface AgentRuntime {
  createAgent(config: AgentConfig): Promise<Agent>;
  assignTask(agentId: string, task: Task): Promise<void>;
  pauseAgent(agentId: string): Promise<void>;
  resumeAgent(agentId: string): Promise<void>;
  getAgentState(agentId: string): Promise<AgentState>;
  onEvent(handler: EventHandler): Unsubscribe;
}
```

### SandboxManager
```typescript
interface SandboxManager {
  createSandbox(config: SandboxConfig): Promise<Sandbox>;
  getSandbox(id: string): Promise<Sandbox>;
  destroySandbox(id: string): Promise<void>;
  listSandboxes(filter: SandboxFilter): Promise<Sandbox[]>;
}

interface Sandbox {
  execute(command: string): Promise<ExecutionResult>;
  writeFile(path: string, content: string): Promise<void>;
  readFile(path: string): Promise<string>;
  getLogs(): Promise<string[]>;
}
```

## Environment Variables (.env.example)
```
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/aasop
DATABASE_URL_REPLICA=postgresql://user:pass@localhost:5433/aasop
QDRANT_URL=http://localhost:6333
REDIS_URL=redis://localhost:6379

# Temporal
TEMPORAL_HOST=localhost:7233
TEMPORAL_NAMESPACE=aasop

# NATS
NATS_URL=nats://localhost:4222

# Auth
JWT_SECRET=changeme
JWT_ISSUER=aasop
SESSION_SECRET=changeme

# Model Providers
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
VLLM_URL=http://localhost:8000

# Observability
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
GRAFANA_URL=http://localhost:3000

# Object Storage
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=
S3_SECRET_KEY=
S3_BUCKET=aasop
```

## Build Pipeline
```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["build"]
    },
    "lint": {},
    "typecheck": {
      "dependsOn": ["^build"]
    }
  }
}
```

## Implementation Order
1. shared-kernel, config (foundational)
2. database (all data access)
3. security (auth/authorization)
4. observability (logging/tracing)
5. model-router, sandbox-manager, memory-service (core packages)
6. api (backend gateway)
7. web (frontend)
8. agent-runtime, workflow-worker (compute)
9. realtime, voice-service (advanced features)
10. infra (deployment)
