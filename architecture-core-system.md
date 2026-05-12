# Autonomous Agentic Software Organization Platform

## Core System Architecture Specification

**Version:** 1.0
**Status:** Draft for Review
**Classification:** Architecture Specification

---

## Table of Contents

1. [Full System Architecture](#1-full-system-architecture)
2. [High-Level Architecture Diagram](#2-high-level-architecture-diagram)
3. [Service-by-Service Breakdown](#3-service-by-service-breakdown)
4. [Monorepo Structure](#4-monorepo-structure)
5. [Infrastructure Topology](#5-infrastructure-topology)
6. [CI/CD Pipeline](#6-cicd-pipeline)

---

## 1. Full System Architecture

### 1.1 Architectural Vision

The Autonomous Agentic Software Organization Platform (AASOP) is designed as a **distributed, event-driven, multi-tenant platform** that orchestrates autonomous software engineering agents within durable organizational contexts. The platform treats software development as a computational workflow problem, applying principles from distributed systems, workflow orchestration, and AI inference serving to create a cohesive "operating system" for code-producing organizations.

The architecture is founded on three core principles:

1. **Agent-First Design**: Every subsystem is designed assuming autonomous agents are the primary actors, not human users. Human interfaces are layered on top of agent-facing APIs.

2. **Durability as Default**: All stateful operations are modeled as durable workflows. No operation is fire-and-forget unless explicitly designated as ephemeral.

3. **Composable Observability**: Every component emits structured telemetry that feeds into a unified observability graph, enabling both human debugging and agent self-reflection.

### 1.2 Layered Architecture

The platform is organized into three logical planes, each with distinct responsibilities, scaling characteristics, and failure domains:

#### 1.2.1 Presentation Plane

The Presentation Plane encompasses all interfaces through which humans and external systems interact with the platform. It is designed as a thin, stateless layer that delegates all business logic to the Control Plane.

**Components:**
- **Web Application**: React-based SPA providing the primary human interface for project management, agent monitoring, code review, and system administration.
- **CLI Tool**: Native command-line interface for developer workflows, scriptable automation, and CI/CD integration.
- **Voice Interface**: LiveKit-powered real-time voice conduit enabling natural language orchestration, status queries, and urgent override commands.
- **External API**: OpenAPI-compliant REST and GraphQL APIs for third-party integrations, webhooks, and custom tooling.
- **Realtime Gateway**: WebSocket gateway providing live updates, collaborative editing surfaces, and streaming output from active agent sessions.

**Technology Stack:**
| Component | Technology | Justification |
|-----------|-----------|---------------|
| Web SPA | React 19 + TypeScript + Vite | Ecosystem maturity, strong typing, fast DX |
| State Management | Zustand + TanStack Query | Lightweight, excellent server-state synchronization |
| UI Components | Radix UI + Tailwind CSS | Accessible, customizable, design-system friendly |
| Realtime Client | Socket.IO Client | Automatic reconnection, multiplexing, fallback support |
| Voice Client | LiveKit Client SDK | Purpose-built for real-time audio/video, low latency |
| CLI | Ink (React for CLI) + Commander.js | Rich terminal UI, proven CLI patterns |
| API Protocol | GraphQL (primary) + REST (legacy/integrations) | Flexible querying for complex dashboards, REST for simple integrations |

**Scaling Characteristics:**
- Stateless horizontally
- WebSocket connections are sticky-sessional via load balancer affinity
- Voice connections require sub-100ms latency to edge nodes
- CDN-served static assets with edge caching

#### 1.2.2 Control Plane

The Control Plane is the brain of the platform. It manages all orchestration, coordination, state transitions, and policy enforcement. It is the only plane with write access to the Data Plane's authoritative stores.

**Components:**
- **API Gateway**: Kong/AWS API Gateway with custom plugins for auth, rate limiting, routing, and request transformation.
- **Auth Service**: OAuth2/OIDC + RBAC + ABAC for identity, session management, and fine-grained authorization.
- **Agent Runtime**: Core execution environment for autonomous agents, managing agent lifecycle, tool execution, and sandbox coordination.
- **Workflow Engine**: Temporal-based durable execution engine for long-running, failure-prone workflows with exactly-once semantics.
- **Task Scheduler**: Cron-like and event-triggered scheduling system for recurring tasks, batch operations, and maintenance.
- **Event Bus**: Apache Kafka as the central nervous system for asynchronous communication between services.
- **Model Router**: Intelligent request routing across multiple LLM providers with load balancing, fallback, and cost optimization.
- **Project Service**: Domain service managing project boundaries, repositories, configurations, and team associations.
- **User Service**: User and organization management, profiles, preferences, and team structures.
- **Billing/Quota Service**: Usage metering, quota enforcement, billing aggregation, and plan management.
- **Audit Service**: Immutable audit logging for compliance, security forensics, and operational accountability.
- **MCP Registry**: Model Context Protocol registry for managing tool definitions, agent capabilities, and context schemas.
- **Notification Service**: Multi-channel notification delivery (email, Slack, SMS, in-app).

**Technology Stack:**
| Component | Technology | Justification |
|-----------|-----------|---------------|
| API Gateway | Kong Gateway + AWS API Gateway | Plugin ecosystem, AWS integration, rate limiting |
| Auth Service | Keycloak + custom ABAC engine | Open-source IAM, extensible, OIDC-compliant |
| Agent Runtime | Custom Node.js + gRPC services | Event loop for async agent operations, streaming support |
| Workflow Engine | Temporal (self-hosted) | Durable execution, saga pattern, exactly-once semantics |
| Task Scheduler | Temporal Schedules + custom scheduler | Unified with workflow engine, avoids separate system |
| Event Bus | Apache Kafka (MSK/self-hosted) | Log-centric durability, replayability, high throughput |
| Model Router | Custom Go service + Envoy proxy | Low-latency routing, connection pooling, provider abstraction |
| Project Service | Node.js + Prisma ORM | Rapid development, strong TypeScript integration |
| User Service | Node.js + Prisma ORM | Shared patterns with Project Service |
| Billing Service | Node.js + ClickHouse for analytics | High-volume event aggregation, cost-efficient storage |
| Audit Service | Node.js + Kafka + S3 (Parquet) | Immutable log, cheap long-term storage, queryable |
| MCP Registry | Node.js + PostgreSQL + Redis cache | Structured storage with fast lookups |
| Notification Service | Node.js + BullMQ (Redis) | Reliable queueing with retry semantics |

**Scaling Characteristics:**
- Microservices pattern: each service independently scalable
- Kafka topic partitions drive parallelism for event consumers
- Temporal worker pools auto-scale based on backlog depth
- Model Router is latency-sensitive: requires warm connections, connection pooling
- Auth Service is cache-heavy: Redis for session and token storage

#### 1.2.3 Data Plane

The Data Plane contains all persistent storage, compute infrastructure, and external integrations. It is accessed exclusively through Control Plane services — no Presentation Plane component talks directly to Data Plane resources.

**Components:**
- **Primary Database**: PostgreSQL 16 cluster for transactional data.
- **Analytics Database**: ClickHouse for metrics, billing events, and observability data.
- **Document Store**: MongoDB for flexible agent state, conversation history, and unstructured context.
- **Cache Layer**: Redis Cluster for sessions, rate limits, feature flags, and hot data.
- **Vector Store**: Pinecone/Weaviate for embedding-based memory retrieval.
- **Object Storage**: S3-compatible store for artifacts, logs, and backups.
- **Search Engine**: OpenSearch for full-text search across code, docs, and conversations.
- **Inference Cluster**: vLLM + Ray Serve for self-hosted model inference.
- **Sandbox Cluster**: Firecracker/Kata Containers for isolated agent execution environments.
- **GPU Node Pools**: Kubernetes node pools with NVIDIA A100/H100 for inference workloads.
- **Message Queue**: RabbitMQ for task queues requiring priority and delayed delivery.

**Technology Stack:**
| Component | Technology | Justification |
|-----------|-----------|---------------|
| Primary DB | PostgreSQL 16 (Patroni + HAProxy) | Proven HA, ACID compliance, JSON support |
| Analytics DB | ClickHouse | Columnar, vectorized, 100x faster for aggregates |
| Document Store | MongoDB (replica set) | Flexible schema for agent state evolution |
| Cache | Redis Cluster (7.x) | Sub-millisecond latency, proven clustering |
| Vector Store | Weaviate | Open-source, GraphQL interface, hybrid search |
| Object Storage | MinIO (self-hosted) / S3 | S3-compatible, cost-efficient, unlimited scale |
| Search | OpenSearch | Open-source Elastic fork, code search capabilities |
| Inference | vLLM + Ray Serve | PagedAttention for throughput, Ray for distribution |
| Sandboxes | Firecracker microVMs | 125ms cold start, strong isolation, low overhead |
| GPU Scheduling | NVIDIA GPU Operator + K8s device plugin | Native K8s GPU scheduling, MIG support |

### 1.3 Core Architectural Patterns

#### 1.3.1 Event-Driven Architecture

All inter-service communication in the Control Plane is event-driven via Kafka. Services publish domain events to topics; interested services consume and react. This provides:

- **Loose coupling**: Services don't know about each other's APIs
- **Auditability**: The event log is the source of truth for system behavior
- **Replayability**: Events can be replayed to reconstruct state or recover from failures
- **Scalability**: Consumers scale independently based on their own throughput needs

**Event Topic Topology:**
```
aasop.{domain}.{event}

Examples:
- aasop.agent.created
- aasop.task.completed
- aasop.workflow.step_failed
- aasop.model.inference_completed
- aasop.user.quota_exceeded
```

Each service owns its event schema and publishes a typed SDK for consumers.

#### 1.3.2 CQRS (Command Query Responsibility Segregation)

The platform uses CQRS at the domain level:

- **Commands** (writes) go through the authoritative service, validate against domain rules, and emit events
- **Queries** (reads) can hit read replicas, materialized views, or dedicated query services
- **Event Projection Services** listen to Kafka and build read-optimized views in ClickHouse, OpenSearch, or Redis

This pattern is particularly valuable for:
- Agent state (complex writes, simple reads)
- Audit logs (append-only writes, analytical reads)
- Billing events (high-volume writes, aggregate reads)

#### 1.3.3 Saga Pattern

Long-running business transactions that span multiple services use the Saga pattern, coordinated by Temporal workflows:

- **Orchestration Saga**: The Workflow Engine centrally coordinates each step, invokes services, and handles compensations
- **Compensating Transactions**: Each saga step defines a compensation action that undoes its effect if subsequent steps fail

Applied to:
- Project provisioning (create repo, setup CI, configure sandbox, initialize agent)
- Agent deployment (allocate sandbox, pull image, start runtime, register with router)
- Billing charge flows (authorize, meter, charge, receipt)

#### 1.3.4 Circuit Breaker

Every service calling an external dependency (LLM provider, VCS, payment gateway) uses circuit breakers:

- **State Machine**: Closed -> Open -> Half-Open
- **Detection**: Error rate threshold (e.g., 50% errors in 30 seconds)
- **Recovery**: Exponential backoff with jitter in Half-Open state
- **Fallback**: Degraded mode (cache response, queue for retry, alternative provider)

Implemented via:
- Opossum (Node.js) for service-to-service calls
- Envoy proxy circuit breaker settings for external HTTP
- Custom health-aware load balancer for LLM provider routing

#### 1.3.5 Bulkhead Isolation

Critical services use bulkhead patterns to prevent cascade failures:

- **Thread Pool Isolation**: Separate worker pools for different operation types
- **Connection Pool Segregation**: Dedicated connection pools per downstream dependency
- **Resource Quotas**: Per-tenant resource limits prevent noisy neighbor problems

Applied to:
- Sandbox execution pools (CPU/memory per tenant)
- LLM provider connection pools (per provider, per model)
- GPU allocation (fractional allocation via MIG/time-slicing)

#### 1.3.6 Outbox Pattern

Services that need to write to a database AND publish an event use the Outbox pattern to ensure atomicity:

1. Write the business data AND the outbox event in a single database transaction
2. A separate relay process reads the outbox table and publishes to Kafka
3. Mark events as published after Kafka acknowledgment
4. Periodic cleanup of published outbox records

This prevents the dual-write problem where a database commit succeeds but the event publish fails.

#### 1.3.7 Strangler Fig Pattern

The platform is designed to evolve. New capabilities are built as independent services that can replace older functionality incrementally:

- Feature flags control routing to old vs. new implementations
- Gradual traffic shifting via weighted routing
- Old code paths remain as fallback during migration

### 1.4 Data Flow Diagrams

#### 1.4.1 Agent Execution Flow

```
User Request
    |
    v
[API Gateway] --> [Auth Service] (validate token, check permissions)
    |
    v
[Agent Runtime] --> [MCP Registry] (fetch available tools/capabilities)
    |                    |
    |                    v
    |              [Memory Service] (retrieve relevant context)
    |                    |
    v                    v
[Model Router] --> [Inference Cluster] (vLLM/Ray)
    |                    |
    |                    v
    |              [LLM Provider] (OpenAI/Anthropic/GCP fallback)
    |
    v
[Sandbox Manager] --> [Firecracker microVM] (isolated execution)
    |                       |
    |                       v
    |                 [File System] + [Network Namespace]
    |
    v
[Workflow Engine] (persist execution state)
    |
    v
[Event Bus] --> [Observability Service] (traces, metrics, logs)
    |               |
    |               v
    |         [Notification Service] (status updates)
    |
    v
[Memory Service] (store learnings, embeddings)
    |
    v
Response to User
```

#### 1.4.2 Workflow Orchestration Flow

```
Trigger (Webhook / Schedule / API / Event)
    |
    v
[Workflow Engine] (Temporal)
    |
    v
Workflow Definition Loaded
    |
    +--> [Step 1: Validation] --> [Task Scheduler]
    |                                 |
    |                                 v
    |                           Queue Task
    |                                 |
    |                                 v
    |                           [Agent Worker] (pickup)
    |                                 |
    |                                 v
    |                           Execute in Sandbox
    |                                 |
    |                                 v
    |                           Report Result
    |                                 |
    +--> [Step 2: Analysis] <---------+
    |       (if success)
    |       |
    |       v
    |   [Model Router] --> LLM Analysis
    |       |
    |       v
    +--> [Step 3: Code Generation]
    |       |
    |       v
    |   [Sandbox Manager] --> Compile/Test
    |       |
    |       v
    |   [Step 4: Review] --> Human Approval Gate
    |       |
    |       v
    |   [Step 5: Merge/Deploy] --> Git Integration
    |
    +--> [Compensation: Rollback] (on failure)
            |
            v
        Cleanup Resources
            |
            v
        Notify Stakeholders
```

#### 1.4.3 Memory and Context Retrieval Flow

```
Agent Request for Context
    |
    v
[Memory Service] ---(check)--> [Redis Cache] (hot context)
    |                              |
    | (cache miss)                 | (cache hit)
    v                              v
[Weaviate Vector Store]    Return Cached Context
    |
    v
Hybrid Search (vector + keyword + metadata filters)
    |
    v
Rank and Deduplicate Results
    |
    v
Fetch Full Documents from MongoDB
    |
    v
Assemble Context Window
    |
    v
Cache in Redis (TTL based on recency)
    |
    v
Return to Agent
```

### 1.5 Technology Stack Summary

| Layer | Category | Technology | Justification |
|-------|----------|-----------|---------------|
| Presentation | Web SPA | React 19 + TypeScript + Vite | Industry standard, excellent ecosystem |
| Presentation | Realtime | LiveKit + Socket.IO | Purpose-built for low-latency communication |
| Presentation | Voice | LiveKit + Whisper + TTS | Unified audio pipeline, local echo cancellation |
| Control | API Gateway | Kong + AWS API Gateway | Plugin ecosystem, hybrid cloud support |
| Control | Auth | Keycloak + custom ABAC | Open-source, extensible, standards-compliant |
| Control | Workflows | Temporal | Durable execution, saga support, visibility |
| Control | Events | Apache Kafka | Log durability, replay, high throughput |
| Control | Agent Runtime | Custom Node.js + gRPC | Async-first, streaming, sandbox orchestration |
| Control | Model Router | Custom Go service | Low-latency, connection pooling, fallback logic |
| Data | Primary DB | PostgreSQL 16 (Patroni) | ACID, HA, JSON support, proven |
| Data | Analytics | ClickHouse | Columnar, fast aggregates, cost-efficient |
| Data | Documents | MongoDB | Schema flexibility for agent state |
| Data | Cache | Redis Cluster | Sub-ms latency, proven clustering |
| Data | Vectors | Weaviate | Open-source, hybrid search, GraphQL |
| Data | Search | OpenSearch | Code search, full-text, aggregations |
| Data | Object Storage | MinIO / S3 | Unlimited scale, cost-efficient |
| Data | Inference | vLLM + Ray Serve | State-of-the-art throughput, distribution |
| Data | Sandboxes | Firecracker microVMs | Strong isolation, fast startup |
| Infra | Orchestration | Kubernetes (EKS/GKE) | Industry standard, GPU support |
| Infra | Service Mesh | Istio + Envoy | mTLS, traffic management, observability |
| Infra | Observability | Grafana stack + Jaeger + Loki | Open-source, unified, scalable |
| Infra | Secrets | HashiCorp Vault | Dynamic secrets, encryption as a service |

---

## 2. High-Level Architecture Diagram

### 2.1 System Context Diagram

```
+==================================================================================+
|                        EXTERNAL SYSTEMS & USERS                                   |
+==================================================================================+
|                                                                                  |
|   +------------+   +------------+   +------------+   +------------+             |
|   |  Human     |   |   CI/CD    |   |  Version   |   |   LLM      |             |
|   |  Users     |   |  Systems   |   |  Control   |   | Providers  |             |
|   |            |   |            |   |            |   |            |             |
|   | - Devs     |   | - GitHub   |   | - GitHub   |   | - OpenAI   |             |
|   | - Managers |   | - GitLab   |   | - GitLab   |   | - Anthropic|             |
|   | - Ops      |   | - Jenkins  |   | - Bitbucket|   | - Google   |             |
|   | - QA       |   | - CircleCI |   |            |   | - Mistral  |             |
|   +------+-----+   +-----+------+   +------+-----+   +------+-----+             |
|          |                |                |                |                     |
+==========|================|================|================|=====================+
           |                |                |                |
           | REST/GraphQL   | Webhooks       | API/SDK        | HTTP/gRPC
           |                |                |                |
+==========|================|================|================|=====================+
|          v                v                v                v                     |
|   PRESENTATION PLANE                                                              |
|                                                                                  |
|   +--------------------------------------------------------------+               |
|   |                    EDGE / CDN LAYER                           |               |
|   |   CloudFront / Cloudflare  (Static Assets, DDoS Protection)   |               |
|   +------------------------+---------------------+---------------+               |
|                            |                     |                                |
|                            v                     v                                |
|   +----------------+  +----------------+  +------------------+                  |
|   |   Web SPA      |  |   WebSocket    |  |   Voice Gateway  |                  |
|   |   (React 19)   |  |   Gateway      |  |   (LiveKit)      |                  |
|   +--------+-------+  +-------+--------+  +--------+---------+                  |
|            |                  |                    |                              |
|            v                  v                    v                              |
|   +--------------------------------------------------------------+               |
|   |                    API GATEWAY LAYER                          |               |
|   |   +------------------------------------------------------+   |               |
|   |   |  Kong Gateway: Auth, Rate Limit, Routing, Transform  |   |               |
|   |   +------------------------------------------------------+   |               |
|   +--------------------------------------------------------------+               |
|                                                                                  |
+==================================================================================+
                                      |
                                      | Internal gRPC / REST
                                      v
+==================================================================================+
|                                                                                  |
|   CONTROL PLANE                                                                   |
|                                                                                  |
|   +------------------+  +------------------+  +------------------+               |
|   |  AUTH SERVICE    |  |  USER SERVICE    |  | BILLING/QUOTA    |               |
|   |  (Keycloak +     |  |  (Node.js +      |  | SERVICE          |               |
|   |   Custom ABAC)   |  |   PostgreSQL)    |  | (Node.js +       |               |
|   |                  |  |                  |  |  ClickHouse)     |               |
|   | - OAuth2/OIDC    |  | - Profiles       |  |                  |               |
|   | - RBAC/ABAC      |  | - Organizations  |  | - Usage Metering |               |
|   | - API Keys       |  | - Teams          |  | - Plan Limits    |               |
|   | - Sessions       |  | - Preferences    |  | - Billing        |               |
|   +--------+---------+  +--------+---------+  +--------+---------+               |
|            |                    |                     |                           |
|            v                    v                     v                           |
|   +--------------------------------------------------------------+               |
|   |              ORCHESTRATION & COORDINATION LAYER               |               |
|   |                                                               |               |
|   |   +----------------+  +----------------+  +----------------+ |               |
|   |   | WORKFLOW ENGINE|  |  TASK SCHEDULER|  |   EVENT BUS    | |               |
|   |   | (Temporal)     |  |  (Temporal +   |  |   (Kafka)      | |               |
|   |   |                |  |   Custom)      |  |                | |               |
|   |   | - Saga Coord.  |  |                |  | - Persistent   | |               |
|   |   | - Durable Exec |  | - Cron Jobs    |  |   Log          | |               |
|   |   | - Human Tasks  |  | - Event Trig.  |  | - Pub/Sub      | |               |
|   |   | - Visibility   |  | - Batch Ops    |  | - Replay       | |               |
|   |   +--------+-------+  +--------+-------+  +--------+-------+ |               |
|   |            |                   |                   |         |               |
|   |            +-------------------+-------------------+         |               |
|   |                                |                             |               |
|   |                                v                             |               |
|   |   +------------------------------------------------------+   |               |
|   |   |              AGENT RUNTIME (Core)                     |   |               |
|   |   |                                                      |   |               |
|   |   |  +-------------+  +-------------+  +-------------+  |   |               |
|   |   |  | Agent       |  | Agent       |  | Agent       |  |   |               |
|   |   |  | Controller  |  | Controller  |  | Controller  |  |   |               |
|   |   |  | (per agent) |  | (per agent) |  | (per agent) |  |   |               |
|   |   |  +------+------+  +------+------+  +------+------+  |   |               |
|   |   |         |               |               |            |   |               |
|   |   |         +---------------+---------------+            |   |               |
|   |   |                         |                            |   |               |
|   |   |         +---------------v---------------+            |   |               |
|   |   |         |      TOOL EXECUTION BUS       |            |   |               |
|   |   |         +---------------+---------------+            |   |               |
|   |   |                         |                            |   |               |
|   |   +------------------------------------------------------+   |               |
|   |                             |                                |               |
|   +--------------------------------------------------------------+               |
|                                 |                                                 |
|                                 v                                                 |
|   +------------------+  +------------------+  +------------------+               |
|   |  MODEL ROUTER    |  |  MCP REGISTRY    |  |  MEMORY SERVICE  |               |
|   |  (Go service)    |  |  (Node.js +      |  |  (Node.js +      |               |
|   |                  |  |   PostgreSQL)    |  |   Weaviate +     |               |
|   | - Load Balancing |  |                  |  |   MongoDB)       |               |
|   | - Fallback Logic |  | - Tool Registry  |  |                  |               |
|   | - Cost Optimizer |  | - Capability Mgmt|  | - Episodic Mem   |               |
|   | - Token Manager  |  | - Context Schema |  | - Semantic Mem   |               |
|   | - Provider Health|  | - A2A Protocol   |  | - Procedural Mem |               |
|   +--------+---------+  +--------+---------+  +--------+---------+               |
|            |                    |                     |                           |
+==================================================================================+
             |                    |                     |
             v                    v                     v
+==================================================================================+
|                                                                                  |
|   DATA PLANE                                                                      |
|                                                                                  |
|   +------------------+  +------------------+  +------------------+               |
|   |  INFERENCE       |  |  SANDBOX         |  |  PERSISTENT      |               |
|   |  CLUSTER         |  |  MANAGER         |  |  STORAGE         |               |
|   |                  |  |                  |  |                  |               |
|   |  +------------+  |  |  +------------+  |  |  +------------+  |               |
|   |  | vLLM       |  |  |  | Firecracker|  |  |  | PostgreSQL |  |               |
|   |  | (Primary)  |  |  |  | microVMs   |  |  |  | (Patroni)  |  |               |
|   |  +------------+  |  |  +------------+  |  |  +------------+  |               |
|   |  +------------+  |  |  +------------+  |  |  +------------+  |               |
|   |  | Ray Serve  |  |  |  | Container  |  |  |  | MongoDB    |  |               |
|   |  | (Distrib.) |  |  |  | Fallback   |  |  |  | (Replica)  |  |               |
|   |  +------------+  |  |  +------------+  |  |  +------------+  |               |
|   |  +------------+  |  |                  |  |  +------------+  |               |
|   |  | GPU Node   |  |  |  - Isolation   |  |  |  | ClickHouse |  |               |
|   |  | Pool (K8s) |  |  |  - Snapshots   |  |  |  | (Analytics)|  |               |
|   |  +------------+  |  |  - Networking  |  |  |  +------------+  |               |
|   |                  |  |                  |  |  +------------+  |               |
|   +------------------+  +------------------+  |  | Weaviate   |  |               |
|                                               |  | (Vectors)  |  |               |
|   +------------------+  +------------------+  |  +------------+  |               |
|   |  MESSAGE QUEUE   |  |  CACHE & SEARCH  |  |  +------------+  |               |
|   |                  |  |                  |  |  | OpenSearch |  |               |
|   |  +------------+  |  |  +------------+  |  |  | (Search)   |  |               |
|   |  | RabbitMQ   |  |  |  | Redis      |  |  |  +------------+  |               |
|   |  | (Priority) |  |  |  | Cluster    |  |  |  +------------+  |               |
|   |  +------------+  |  |  +------------+  |  |  | S3/MinIO   |  |               |
|   |  +------------+  |  |  +------------+  |  |  | (Objects)  |  |               |
|   |  | Kafka      |  |  |  | OpenSearch |  |  |  +------------+  |               |
|   |  | (Events)   |  |  |  | (FTS)      |  |  |                  |               |
|   |  +------------+  |  |  +------------+  |  +------------------+               |
|   +------------------+  +------------------+                                      |
|                                                                                  |
+==================================================================================+
             |                    |                     |                            |
             |                    |                     |                            |
             v                    v                     v                            |
+==================================================================================+
|                                                                                  |
|   OBSERVABILITY & GOVERNANCE PLANE                                               |
|                                                                                  |
|   +------------------+  +------------------+  +------------------+               |
|   |  OBSERVABILITY   |  |  AUDIT SERVICE   |  |  NOTIFICATION    |               |
|   |  SERVICE         |  |                  |  |  SERVICE         |               |
|   |                  |  |                  |  |                  |               |
|   |  +------------+  |  | - Immutable    |  |  - Email         |               |
|   |  | Grafana    |  |  |   Audit Log    |  |  - Slack         |               |
|   |  | (Dashboards)|  |  | - Compliance   |  |  - SMS           |               |
|   |  +------------+  |  | - Forensics    |  |  - In-App        |               |
|   |  +------------+  |  | - Retention    |  |  - Webhooks      |               |
|   |  | Loki       |  |  |   Policies     |  |                  |               |
|   |  | (Logs)     |  |  +------------------+  +------------------+               |
|   |  +------------+  |                                                          |
|   |  +------------+  |  +------------------+  +------------------+               |
|   |  | Prometheus |  |  |  PROJECT SERVICE |  |  REALTIME        |               |
|   |  | (Metrics)  |  |  |                  |  |  SERVICE         |               |
|   |  +------------+  |  | - Repositories   |  |                  |               |
|   |  +------------+  |  | - Configurations |  | - Live Updates   |               |
|   |  | Jaeger     |  |  | - Team Assoc.    |  | - Collab Editing |               |
|   |  | (Traces)   |  |  | - Settings       |  | - Presence       |               |
|   |  +------------+  |  | - Environments   |  | - Streaming      |               |
|   |  +------------+  |  +------------------+  +------------------+               |
|   |  | Tempo      |  |                                                          |
|   |  | (Traces)   |  |                                                          |
|   |  +------------+  |                                                          |
|   +------------------+                                                          |
|                                                                                  |
+==================================================================================+
```

### 2.2 Control Loop Architecture

The platform operates on multiple nested control loops, each with different frequencies and responsibilities:

```
+================================================================================+
|                        CONTROL LOOP HIERARCHY                                 |
+================================================================================+
|                                                                                |
|  +---------------------+    Frequency: Real-time (< 100ms)                    |
|  | INFERENCE LOOP      |    Responsibility: Model request/response            |
|  |                     |    Components: Model Router -> vLLM -> Response      |
|  | Model Selection     |    Failure Mode: Fallback to next provider           |
|  | -> Token Streaming  |    Observability: Per-token latency histograms       |
|  | -> Response Assembly|                                                      |
|  +---------------------+                                                      |
|           ^                                                                    |
|           |                                                                    |
|  +---------------------+    Frequency: Per-task (seconds to minutes)          |
|  | AGENT EXECUTION LOOP|    Responsibility: Single task completion            |
|  |                     |    Components: Agent Runtime -> Tools -> Sandbox       |
|  | Task Decomposition  |    Failure Mode: Retry with backoff, escalation       |
|  | -> Tool Selection   |    Observability: Task duration, tool call counts    |
|  | -> Execution        |                                                      |
|  | -> Result Validation|                                                      |
|  +---------------------+                                                      |
|           ^                                                                    |
|           |                                                                    |
|  +---------------------+    Frequency: Per-workflow (minutes to hours)        |
|  | WORKFLOW LOOP       |    Responsibility: Multi-step process completion      |
|  |                     |    Components: Temporal -> Activities -> Events        |
|  | Step Orchestration  |    Failure Mode: Saga compensation, human escalation  |
|  | -> Human Gates      |    Observability: Workflow execution graphs           |
|  | -> Compensation     |                                                      |
|  | -> Completion       |                                                      |
|  +---------------------+                                                      |
|           ^                                                                    |
|           |                                                                    |
|  +---------------------+    Frequency: Per-project (hours to days)            |
|  | PROJECT LOOP        |    Responsibility: Project health and progress       |
|  |                     |    Components: Project Service -> Analytics -> Alerts |
|  | Sprint Planning     |    Failure Mode: Human intervention, re-assignment    |
|  | -> Progress Tracking|    Observability: Burndown, velocity metrics          |
|  | -> Quality Gates    |                                                      |
|  | -> Delivery         |                                                      |
|  +---------------------+                                                      |
|           ^                                                                    |
|           |                                                                    |
|  +---------------------+    Frequency: Continuous                              |
|  | PLATFORM LOOP       |    Responsibility: System health and optimization      |
|  |                     |    Components: K8s HPA -> Cluster Autoscaler -> Cost  |
|  | Resource Monitoring |    Failure Mode: Scale-out, circuit breaker           |
|  | -> Auto-scaling     |    Observability: Cluster metrics, cost dashboards    |
|  | -> Cost Optimization|                                                      |
|  | -> Security Response|                                                      |
|  +---------------------+                                                      |
|                                                                                |
+================================================================================+
```

### 2.3 Data Flow Topology

```
+================================================================================+
|                     SYNCHRONOUS DATA FLOWS (gRPC/REST)                        |
+================================================================================+
|                                                                                |
|   API Gateway ---auth---> Auth Service                                         |
|        |                                                                       |
|        +----routing---> Agent Runtime                                          |
|        |                   |                                                   |
|        |                   +--tools--> MCP Registry                            |
|        |                   |                                                   |
|        |                   +--context-> Memory Service                         |
|        |                   |                                                   |
|        |                   +--inference-> Model Router                         |
|        |                   |          |                                        |
|        |                   |          +--provider-routing--> vLLM Cluster      |
|        |                   |                                                   |
|        |                   +--sandbox-> Sandbox Manager                        |
|        |                                                               |
|        +----routing---> Project Service                                        |
|        |                                                                       |
|        +----routing---> User Service                                           |
|        |                                                                       |
|        +----routing---> Billing Service                                        |
|        |                                                                       |
|        +----routing---> Workflow Engine (query APIs)                           |
|                                                                                |
+================================================================================+
|                     ASYNCHRONOUS DATA FLOWS (Kafka)                           |
+================================================================================+
|                                                                                |
|   Agent Runtime ---events--> aasop.agent.* --> Multiple Consumers              |
|        |                              |                                        |
|        |                              +--> Observability Service (traces)      |
|        |                              +--> Billing Service (metering)          |
|        |                              +--> Notification Service (alerts)       |
|        |                              +--> Memory Service (state updates)      |
|        |                                                                       |
|   Sandbox Manager --events--> aasop.sandbox.* --> Consumers                    |
|        |                                                                       |
|   Model Router ----events--> aasop.inference.* --> Consumers                   |
|        |                                                                       |
|   Workflow Engine -events--> aasop.workflow.* --> Consumers                    |
|        |                                                                       |
|   Project Service -events--> aasop.project.* --> Consumers                     |
|        |                                                                       |
|   User Service ----events--> aasop.user.* --> Consumers                        |
|        |                                                                       |
|   Billing Service -events--> aasop.billing.* --> Consumers                     |
|                                                                                |
+================================================================================+
|                     INTERNAL QUEUES (RabbitMQ / Redis)                        |
+================================================================================+
|                                                                                |
|   Task Scheduler --> priority.queue --> Agent Workers (fair dispatch)          |
|        |                                                                       |
|   Notification Service --> channels.email --> SMTP Relay                       |
|   Notification Service --> channels.slack --> Slack Webhook                    |
|   Notification Service --> channels.sms --> Twilio                             |
|        |                                                                       |
|   Model Router --> provider-queue.{name} --> Provider-specific workers          |
|                                                                                |
+================================================================================+
```

### 2.4 External Integration Topology

```
+================================================================================+
|                        EXTERNAL INTEGRATION GATEWAYS                            |
+================================================================================+
|                                                                                |
|   +------------------+  +------------------+  +------------------+             |
|   |  LLM PROVIDERS   |  |  VCS PLATFORMS   |  |  CLOUD SERVICES  |             |
|   |                  |  |                  |  |                  |             |
|   | +------------+   |  | +------------+   |  | +------------+   |             |
|   | | OpenAI     |   |  | | GitHub     |   |  | | AWS        |   |             |
|   | | (GPT-4o)   |   |  | | (Repos)    |   |  | | (EKS/S3)   |   |             |
|   | +------------+   |  | +------------+   |  | +------------+   |             |
|   | +------------+   |  | +------------+   |  | +------------+   |             |
|   | | Anthropic  |   |  | | GitLab     |   |  | | GCP        |   |             |
|   | | (Claude)   |   |  | | (Repos)    |   |  | | (GKE)      |   |             |
|   | +------------+   |  | +------------+   |  | +------------+   |             |
|   | +------------+   |  | +------------+   |  | +------------+   |             |
|   | | Google     |   |  | | Bitbucket  |   |  | | Azure      |   |             |
|   | | (Gemini)   |   |  | | (Repos)    |   |  | | (AKS)      |   |             |
|   | +------------+   |  | +------------+   |  | +------------+   |             |
|   | +------------+   |  |                  |  |                  |             |
|   | | vLLM Self  |   |  | +------------+   |  | +------------+   |             |
|   | | (Hosted)   |   |  | | Linear     |   |  | | Datadog    |   |             |
|   | +------------+   |  | | (Project)  |   |  | | (External) |   |             |
|   |                  |  | +------------+   |  | +------------+   |             |
|   +--------+---------+  +--------+---------+  +--------+---------+             |
|            |                     |                     |                        |
|            |  HTTP/gRPC          |  REST API           |  SDK/API               |
|            |  + API keys         |  + OAuth apps       |  + IAM roles            |
|            |  + Token bucket     |  + Webhooks         |  + Service accounts     |
|            |  + Circuit breaker  |  + PAT management   |  + Cost allocation      |
|            v                     v                     v                        |
|   +--------+---------+  +--------+---------+  +--------+---------+             |
|   |  MODEL ROUTER    |  |  GIT INTEGRATION |  |  CLOUD ADAPTER   |             |
|   |  (with fallback) |  |  SERVICE         |  |  SERVICE         |             |
|   +------------------+  +------------------+  +------------------+             |
|                                                                                |
|   +------------------+  +------------------+  +------------------+             |
|   |  IDENTITY        |  |  PAYMENT         |  |  MONITORING      |             |
|   |  PROVIDERS       |  |  PROVIDERS       |  |  INTEGRATIONS    |             |
|   |                  |  |                  |  |                  |             |
|   | - Google OAuth   |  | - Stripe         |  | - PagerDuty      |             |
|   | - GitHub OAuth   |  | - Paddle         |  | - Opsgenie       |             |
|   | - SAML/OIDC      |  | - Usage-based    |  | - Slack          |             |
|   |   (Enterprise)   |  |   billing        |  | - Discord        |             |
|   +------------------+  +------------------+  +------------------+             |
|                                                                                |
+================================================================================+
```

---

## 3. Service-by-Service Breakdown

### 3.1 API Gateway

**Service Name:** `aasop-api-gateway`
**Type:** Infrastructure Service

**Responsibility:**
The API Gateway is the single entry point for all external and internal API traffic. It handles request routing, authentication, authorization, rate limiting, request/response transformation, caching, and load balancing across all Control Plane services.

**API Surface Area:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/*` | ALL | Catch-all proxy to backend services |
| `/health` | GET | Gateway health check |
| `/status` | GET | Gateway status and metrics |
| `/plugins` | GET | List loaded plugins |

**Configuration:**
- Routes defined via declarative YAML/DB (Kong Admin API)
- Rate limits per consumer, per route, per method
- JWT validation with Keycloak public keys
- API key authentication for service-to-service
- Request/response transformation plugins
- CORS configuration per environment

**Dependencies:**
- **Upstream:** Auth Service (token validation, JWKS)
- **Upstream:** All Control Plane services (routing targets)
- **Downstream:** Redis (rate limit counters, cache)
- **Downstream:** PostgreSQL (Kong configuration store)

**Data Stores:**
- PostgreSQL: Configuration persistence
- Redis: Rate limit counters, response cache

**Scaling Characteristics:**
- Stateless, horizontally scalable
- CPU-bound (TLS termination, JWT validation)
- Requires session affinity for WebSocket upgrades
- Typical target: 10,000 RPS per instance

**SLA Targets:**
| Metric | Target |
|--------|--------|
| Availability | 99.99% |
| P50 Latency | < 5ms |
| P99 Latency | < 50ms |
| RPS per instance | 10,000 |

**Technology Stack:**
- Kong Gateway 3.x (Open Source)
- PostgreSQL 16 (configuration)
- Redis 7.x (rate limiting, caching)
- AWS NLB/ALB (load balancing)

**Deployment Topology:**
- 3+ instances in production (across AZs)
- Auto-scaling based on CPU and connection count
- Deployed as Kubernetes Deployment with HPA
- Kong Admin API restricted to internal network

---

### 3.2 Auth Service

**Service Name:** `aasop-auth-service`
**Type:** Core Platform Service

**Responsibility:**
The Auth Service manages identity, authentication, authorization, and access control for the entire platform. It provides OAuth2/OIDC flows, API key management, RBAC and ABAC policy enforcement, session management, and integration with external identity providers.

**API Surface Area:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/login` | POST | Initiate login flow |
| `/auth/callback` | GET | OAuth callback handler |
| `/auth/logout` | POST | Terminate session |
| `/auth/refresh` | POST | Refresh access token |
| `/auth/register` | POST | New user registration |
| `/auth/mfa/enable` | POST | Enable multi-factor auth |
| `/auth/mfa/verify` | POST | Verify MFA code |
| `/tokens` | CRUD | API key management |
| `/permissions/check` | POST | ABAC permission check |
| `/permissions/roles` | CRUD | Role management |
| `/jwks` | GET | Public key set for JWT validation |
| `/sessions` | GET/DELETE | Session management (admin) |

**Dependencies:**
- **Upstream:** User Service (user profile lookups)
- **Upstream:** External IdPs (Google, GitHub, SAML)
- **Downstream:** PostgreSQL (users, sessions, permissions)
- **Downstream:** Redis (session cache, token blacklist)
- **Downstream:** Kafka (auth events: login, logout, mfa)

**Data Stores:**
- PostgreSQL: Users, roles, permissions, API keys, audit log
- Redis: Active sessions (TTL), JWKS cache, rate limit counters

**Scaling Characteristics:**
- Read-heavy workload (token validation, permission checks)
- Redis caching reduces DB load by ~95%
- Write bursts during login spikes (OAuth callbacks)
- JWT validation can be offloaded to gateway (asymmetric keys)

**SLA Targets:**
| Metric | Target |
|--------|--------|
| Availability | 99.95% |
| P50 Latency (auth check) | < 10ms |
| P99 Latency (auth check) | < 100ms |
| P50 Latency (login) | < 200ms |

**Technology Stack:**
- Node.js 22 LTS + Fastify
- Keycloak 24 (embedded for OIDC/OAuth2 flows)
- Custom ABAC engine (Node.js + Rego/OPA policies)
- PostgreSQL 16
- Redis Cluster 7.x
- bcrypt/Argon2 for password hashing

**Deployment Topology:**
- 3+ API instances
- Keycloak clustered with Infinispan
- PostgreSQL read replicas for auth queries
- Redis Sentinel for session cache HA

---

### 3.3 Agent Runtime

**Service Name:** `aasop-agent-runtime`
**Type:** Core Business Service

**Responsibility:**
The Agent Runtime is the heart of the platform. It manages the complete lifecycle of autonomous agents: initialization, execution, tool invocation, context management, and termination. Each running agent has a dedicated controller that maintains state machine transitions and ensures deterministic behavior.

**API Surface Area:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/agents` | POST | Create and start new agent |
| `/agents` | GET | List active agents |
| `/agents/:id` | GET | Get agent status and state |
| `/agents/:id` | DELETE | Stop and destroy agent |
| `/agents/:id/pause` | POST | Pause agent execution |
| `/agents/:id/resume` | POST | Resume agent execution |
| `/agents/:id/chat` | POST | Send message to agent |
| `/agents/:id/tools` | GET | List available tools for agent |
| `/agents/:id/state` | GET | Get full agent state machine state |
| `/agents/:id/history` | GET | Get conversation history |
| `/agents/:id/override` | POST | Human override (inject command) |
| `/agents/:id/sandbox` | GET | Get sandbox connection info |
| `/agents/batch` | POST | Create multiple agents |
| `/agents/:id/memory` | POST | Inject external memory/context |
| `/agents/:id/fork` | POST | Fork agent with current state |

**Agent State Machine:**
```
CREATED -> INITIALIZING -> IDLE -> THINKING -> EXECUTING -> VALIDATING -> IDLE
                                              |                    |
                                              v                    v
                                          WAITING_HUMAN       COMPLETED
                                              |
                                              v
                                          TERMINATED
```

**Dependencies:**
- **Upstream:** MCP Registry (tool definitions, capabilities)
- **Upstream:** Memory Service (context retrieval, memory storage)
- **Upstream:** Model Router (LLM inference requests)
- **Upstream:** Sandbox Manager (code execution environment)
- **Upstream:** Workflow Engine (durable execution for long tasks)
- **Upstream:** Project Service (project configuration)
- **Upstream:** Auth Service (permission checks)
- **Downstream:** Kafka (agent lifecycle events)
- **Downstream:** MongoDB (agent state persistence)
- **Downstream:** Redis (agent session cache)

**Data Stores:**
- MongoDB: Agent state documents, conversation history, execution logs
- Redis: Active agent sessions, in-progress tool calls, rate limiting
- Kafka: Agent events for async processing

**Scaling Characteristics:**
- CPU and memory intensive ( maintaining state machines, parsing LLM outputs)
- State is sharded by agent ID for horizontal scaling
- WebSocket connections are sticky
- Sandboxes are the actual compute-heavy component; Agent Runtime is orchestration
- Target: 1,000 concurrent agents per instance

**SLA Targets:**
| Metric | Target |
|--------|--------|
| Availability | 99.9% |
| P50 Latency (message) | < 100ms |
| P99 Latency (message) | < 2s |
| Agent Startup Time | < 5s |
| Concurrent Agents per Instance | 1,000 |

**Technology Stack:**
- Node.js 22 LTS + Fastify + Socket.IO
- LangGraph (agent orchestration graphs)
- LangChain (tool integration, prompt management)
- Custom state machine engine
- MongoDB 7.x (replica set)
- Redis Cluster 7.x
- gRPC (service-to-service communication)

**Deployment Topology:**
- Kubernetes StatefulSet (for sticky sessions)
- PodDisruptionBudget: minAvailable: 2
- HPA based on custom metric: active_agent_count
- Anti-affinity rules spread across nodes
- Dedicated node pool for agent runtime workloads

---

### 3.4 Workflow Engine

**Service Name:** `aasop-workflow-engine`
**Type:** Core Platform Service

**Responsibility:**
The Workflow Engine provides durable execution for long-running, failure-prone business processes. It implements the Saga pattern for distributed transactions, manages human-in-the-loop approval gates, and ensures exactly-once execution semantics for critical operations.

**API Surface Area:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/workflows` | POST | Start new workflow instance |
| `/workflows` | GET | List workflow instances |
| `/workflows/:id` | GET | Get workflow status and history |
| `/workflows/:id/cancel` | POST | Cancel workflow |
| `/workflows/:id/signal` | POST | Send signal to workflow |
| `/workflows/:id/query` | GET | Query workflow state |
| `/workflows/:id/history` | GET | Get execution history |
| `/workflows/definitions` | CRUD | Workflow definition management |
| `/workflows/schedules` | CRUD | Scheduled workflow management |
| `/workflows/:id/approve` | POST | Human approval action |
| `/workflows/:id/retry` | POST | Retry failed workflow |
| `/workflows/queues` | GET | List task queues |
| `/workflows/queues/:name` | GET | Queue metrics and backlog |

**Built-in Workflow Definitions:**
| Workflow | Description | Saga Steps |
|----------|-------------|------------|
| `project-provisioning` | New project setup | Create repo -> Setup CI -> Configure sandbox -> Initialize agents -> Notify |
| `agent-deployment` | Deploy agent to production | Build image -> Test sandbox -> Gradual rollout -> Monitor -> Commit |
| `code-review-pipeline` | Automated code review | Analyze -> Lint -> Test -> Security scan -> Human review -> Merge |
| `incident-response` | Automated incident handling | Detect -> Triage -> Escalate -> Mitigate -> Post-mortem -> Follow-up |
| `billing-cycle` | Monthly billing processing | Meter usage -> Calculate charges -> Apply credits -> Charge -> Receipt -> Notify |

**Dependencies:**
- **Upstream:** Agent Runtime (activity workers)
- **Upstream:** Project Service (project data)
- **Upstream:** Auth Service (authorization for human tasks)
- **Upstream:** Notification Service (human task notifications)
- **Downstream:** PostgreSQL (workflow state)
- **Downstream:** Elasticsearch (workflow visibility)
- **Downstream:** Kafka (workflow events)

**Data Stores:**
- PostgreSQL: Workflow execution state, visibility records
- Elasticsearch: Workflow search and analytics
- Kafka: Event sourcing for workflow history

**Scaling Characteristics:**
- Temporal handles persistence and state management
- Workers scale based on task queue depth
- CPU-intensive during workflow execution
- I/O-bound during activity execution (waiting for external calls)
- Separate worker pools per workflow type for isolation

**SLA Targets:**
| Metric | Target |
|--------|--------|
| Availability | 99.99% |
| Workflow Start Latency | < 100ms |
| Activity Execution | At-least-once (exactly-once with idempotency) |
| State Persistence | Durable within 100ms of state change |

**Technology Stack:**
- Temporal Server (self-hosted)
- TypeScript SDK (workflow and activity definitions)
- PostgreSQL 16 (Temporal persistence)
- Elasticsearch (Temporal visibility)
- Kafka (event publishing)

**Deployment Topology:**
- Temporal Server: 5 instances (Frontend, History, Matching, Worker, Visibility)
- Temporal Workers: Kubernetes Deployment with HPA per task queue
- PostgreSQL: Dedicated instance with backups
- Elasticsearch: 3-node cluster

---

### 3.5 Memory Service

**Service Name:** `aasop-memory-service`
**Type:** Core Business Service

**Responsibility:**
The Memory Service provides a multi-layered memory system for agents, including episodic memory (conversation history), semantic memory (embedding-based retrieval), and procedural memory (learned patterns and skills). It manages context window assembly, memory consolidation, and long-term knowledge storage.

**API Surface Area:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/memory/episodes` | POST | Store new episode |
| `/memory/episodes` | GET | Query episodes |
| `/memory/episodes/:id` | GET | Get specific episode |
| `/memory/search` | POST | Semantic search across all memory |
| `/memory/semantic` | POST | Store embedding |
| `/memory/semantic/search` | POST | Vector similarity search |
| `/memory/context` | POST | Assemble context window for agent |
| `/memory/consolidate` | POST | Trigger memory consolidation |
| `/memory/procedural` | POST | Store learned procedure/pattern |
| `/memory/procedural` | GET | Retrieve relevant procedures |
| `/memory/forget` | POST | Selective memory deletion |
| `/memory/summary` | GET | Get memory summary for entity |

**Memory Types:**
| Type | Storage | Retrieval | Use Case |
|------|---------|-----------|----------|
| Working Memory | Redis | Key-value | Current conversation context |
| Episodic Memory | MongoDB | Time-range + metadata | Conversation history, events |
| Semantic Memory | Weaviate | Vector similarity | Knowledge, facts, relationships |
| Procedural Memory | PostgreSQL | Structured query | Learned patterns, skills, rules |
| Long-term Memory | S3 (Parquet) | Batch/Athena | Archived memories, analytics |

**Dependencies:**
- **Upstream:** Agent Runtime (memory queries during agent execution)
- **Upstream:** Model Router (embedding generation)
- **Downstream:** MongoDB (episodic memory)
- **Downstream:** Weaviate (semantic/vector memory)
- **Downstream:** Redis (working memory cache)
- **Downstream:** PostgreSQL (procedural memory)
- **Downstream:** S3 (long-term archival)

**Data Stores:**
- MongoDB: Episodic memory documents
- Weaviate: Vector embeddings with metadata
- Redis: Hot cache for working memory
- PostgreSQL: Structured procedural memory
- S3: Compressed archival storage

**Scaling Characteristics:**
- Read-heavy (every agent message queries memory)
- Vector search is GPU-accelerated in Weaviate
- Cache hit rate target: > 80% for working memory
- Write amplification: 1 agent message -> N embedding writes
- Embeddings are computed asynchronously (non-blocking)

**SLA Targets:**
| Metric | Target |
|--------|--------|
| Availability | 99.9% |
| P50 Context Assembly | < 50ms |
| P99 Context Assembly | < 200ms |
| P50 Semantic Search | < 100ms |
| P99 Semantic Search | < 500ms |

**Technology Stack:**
- Node.js 22 LTS + Fastify
- Weaviate (vector database)
- MongoDB 7.x
- Redis Cluster 7.x
- PostgreSQL 16
- LangChain (embedding pipelines)

**Deployment Topology:**
- Kubernetes Deployment with HPA
- Weaviate: dedicated GPU nodes for vector search
- MongoDB: replica set with read preferences
- Memory-intensive: 8GB+ RAM per instance

---

### 3.6 Model Router

**Service Name:** `aasop-model-router`
**Type:** Critical Infrastructure Service

**Responsibility:**
The Model Router is the intelligent traffic director for all LLM inference requests. It handles provider selection, load balancing, fallback chains, token quota management, cost optimization, request batching, and streaming response aggregation. It abstracts away provider-specific APIs behind a unified interface.

**API Surface Area:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/chat/completions` | POST | Standard chat completion (OpenAI-compatible) |
| `/v1/completions` | POST | Text completion |
| `/v1/embeddings` | POST | Embedding generation |
| `/v1/models` | GET | List available models |
| `/v1/models/:id` | GET | Get model info and status |
| `/admin/providers` | CRUD | Provider configuration |
| `/admin/routing-rules` | CRUD | Routing rule management |
| `/admin/quotas` | CRUD | Token quota management |
| `/admin/fallback-chains` | CRUD | Fallback chain configuration |
| `/metrics/providers` | GET | Provider health and metrics |
| `/metrics/usage` | GET | Usage statistics |
| `/batch` | POST | Batch inference request |
| `/batch/:id` | GET | Batch job status |

**Routing Strategies:**
| Strategy | Description | Use Case |
|----------|-------------|----------|
| `cost-optimized` | Route to cheapest available provider | Background tasks |
| `latency-optimized` | Route to lowest-latency provider | Interactive chat |
| `quality-optimized` | Route to highest-quality model | Critical analysis |
| `fallback-chain` | Ordered list with automatic failover | High-availability requirements |
| `sticky` | Same model for session consistency | Multi-turn conversations |
| `smart` | AI-powered routing based on prompt analysis | General purpose |

**Dependencies:**
- **Upstream:** Agent Runtime (inference requests)
- **Upstream:** Memory Service (embedding requests)
- **Downstream:** vLLM Cluster (self-hosted inference)
- **Downstream:** External LLM Providers (OpenAI, Anthropic, Google)
- **Downstream:** Redis (token quotas, rate limits, provider health)
- **Downstream:** Kafka (inference events for billing/observability)

**Data Stores:**
- Redis: Token quotas, provider health status, routing cache
- PostgreSQL: Provider configurations, routing rules, usage history
- Kafka: Inference events (async billing, analytics)

**Scaling Characteristics:**
- Extremely latency-sensitive (every LLM request goes through here)
- Connection pooling to providers is critical
- Stateless: any instance can handle any request
- Request coalescing for identical prompts
- Streaming adds complexity: long-lived connections

**SLA Targets:**
| Metric | Target |
|--------|--------|
| Availability | 99.99% |
| P50 Routing Overhead | < 5ms |
| P99 Routing Overhead | < 20ms |
| Provider Failover | < 1s |
| Streaming Latency | < 100ms first token |

**Technology Stack:**
- Go 1.22 (for low-latency, high-concurrency)
- FastHTTP (HTTP server)
- Envoy Proxy (sidecar for advanced routing)
- Redis Cluster (quotas, health cache)
- PostgreSQL (configuration)
- Custom load balancing algorithms

**Deployment Topology:**
- Kubernetes Deployment with HPA
- 10+ instances minimum for HA
- Anti-affinity across AZs
- Dedicated CPU-optimized nodes
- Keep-alive connections to all providers

---

### 3.7 Inference Cluster Manager

**Service Name:** `aasop-inference-cluster`
**Type:** Infrastructure Service

**Responsibility:**
The Inference Cluster Manager orchestrates the self-hosted GPU infrastructure for model serving. It manages vLLM instances, Ray Serve deployments, model loading/unloading, GPU allocation, auto-scaling based on queue depth, and multi-model concurrency. It provides a Kubernetes-native interface to GPU resources.

**API Surface Area:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/models` | POST | Deploy new model |
| `/models` | GET | List deployed models |
| `/models/:id` | GET | Get model deployment status |
| `/models/:id/scale` | POST | Scale model replicas |
| `/models/:id` | DELETE | Undeploy model |
| `/models/:id/metrics` | GET | Model serving metrics |
| `/gpu/nodes` | GET | List GPU nodes and utilization |
| `/gpu/allocations` | GET | Current GPU allocations |
| `/gpu/allocations` | POST | Allocate GPU resources |
| `/gpu/allocations/:id` | DELETE | Release GPU resources |
| `/batch/jobs` | POST | Submit batch inference job |
| `/batch/jobs/:id` | GET | Get batch job status |
| `/health` | GET | Cluster health |

**Dependencies:**
- **Upstream:** Model Router (deployment requests)
- **Upstream:** Kubernetes API (node management)
- **Downstream:** vLLM (model serving)
- **Downstream:** Ray Serve (distributed serving)
- **Downstream:** Prometheus (metrics collection)

**Data Stores:**
- etcd (Kubernetes): Cluster state
- S3: Model weights and artifacts
- PostgreSQL: Deployment configurations, job history

**Scaling Characteristics:**
- GPU resources are finite and expensive
- Model loading time: 30-120 seconds (must be pre-loaded)
- Auto-scaling: horizontal (more replicas) and vertical (larger GPU)
- Multi-model GPU sharing via MIG or time-slicing
- Queue-based scaling: scale replicas based on request queue depth

**SLA Targets:**
| Metric | Target |
|--------|--------|
| Model Availability | 99.9% |
| Cold Start (unloaded) | < 2 minutes |
| Warm Start (pre-loaded) | < 5 seconds |
| GPU Utilization | > 70% average |
| Queue Wait Time | < 10 seconds |

**Technology Stack:**
- Kubernetes + NVIDIA GPU Operator
- vLLM (inference serving)
- Ray Serve (distributed model serving)
- Karpenter (auto-scaling)
- Prometheus + Grafana (monitoring)
- S3 (model storage)

**Deployment Topology:**
- Dedicated GPU node pools per model size
- Karpenter for dynamic node provisioning
- Pod affinity for model caching on nodes
- Priority classes: interactive > batch > background

---

### 3.8 Sandbox Manager

**Service Name:** `aasop-sandbox-manager`
**Type:** Core Infrastructure Service

**Responsibility:**
The Sandbox Manager provisions and manages isolated execution environments for agents. Using Firecracker microVMs, it provides strong security isolation, fast startup times, snapshot/restore capabilities, and resource-constrained execution. It manages the full lifecycle: allocation, execution, monitoring, and destruction of sandboxes.

**API Surface Area:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/sandboxes` | POST | Create new sandbox |
| `/sandboxes` | GET | List active sandboxes |
| `/sandboxes/:id` | GET | Get sandbox status |
| `/sandboxes/:id` | DELETE | Destroy sandbox |
| `/sandboxes/:id/exec` | POST | Execute command in sandbox |
| `/sandboxes/:id/files` | GET | List files in sandbox |
| `/sandboxes/:id/files` | PUT | Write file to sandbox |
| `/sandboxes/:id/snapshot` | POST | Create snapshot |
| `/sandboxes/:id/restore` | POST | Restore from snapshot |
| `/sandboxes/:id/resize` | POST | Resize sandbox resources |
| `/sandboxes/:id/network` | GET | Get network configuration |
| `/pools` | GET | List sandbox pools |
| `/pools/:name/metrics` | GET | Pool utilization metrics |

**Sandbox Specifications:**
| Tier | CPU | Memory | Disk | Network | Use Case |
|------|-----|--------|------|---------|----------|
| `micro` | 0.5 | 512MB | 1GB | Restricted | Quick scripts, linting |
| `standard` | 2 | 4GB | 10GB | Restricted | Standard development |
| `large` | 4 | 16GB | 50GB | Moderate | Build and test |
| `xl` | 8 | 32GB | 100GB | Full | Heavy compilation |
| `gpu` | 4 | 32GB | 50GB | Moderate | ML workloads |

**Dependencies:**
- **Upstream:** Agent Runtime (sandbox requests)
- **Upstream:** Workflow Engine (CI/CD sandbox provisioning)
- **Downstream:** Firecracker (microVM execution)
- **Downstream:** Containerd (fallback container execution)
- **Downstream:** CNI (container networking)
- **Downstream:** S3 (snapshot storage)

**Data Stores:**
- PostgreSQL: Sandbox inventory, allocations, history
- S3: Sandbox snapshots and artifacts
- etcd: Real-time sandbox state (via Kubernetes)

**Scaling Characteristics:**
- Sandboxes are ephemeral (minutes to hours lifetime)
- High churn rate: create/destroy cycles
- Firecracker cold start: ~125ms
- Firecracker warm start (from snapshot): ~50ms
- Resource-constrained: each node supports N sandboxes based on tier
- Memory is the bottleneck resource

**SLA Targets:**
| Metric | Target |
|--------|--------|
| Sandbox Creation (cold) | < 200ms |
| Sandbox Creation (warm) | < 75ms |
| Command Execution Start | < 50ms |
| Sandbox Destruction | < 100ms |
| Snapshot Creation | < 5s |
| Uptime per Sandbox | 99.9% (during active use) |

**Technology Stack:**
- Go 1.22 (orchestration layer)
- Firecracker v1.7+ (microVMs)
- Containerd (container fallback)
- CNI plugins (networking)
- OverlayFS (storage)
- S3 (snapshot persistence)
- Kubernetes CRDs (sandbox definitions)

**Deployment Topology:**
- Kubernetes DaemonSet on sandbox worker nodes
- Dedicated sandbox node pools (no other workloads)
- Node-local caching for base VM images
- Network policies for sandbox isolation
- Resource quotas per tenant

---

### 3.9 Observability Service

**Service Name:** `aasop-observability`
**Type:** Platform Service

**Responsibility:**
The Observability Service provides unified collection, storage, querying, and visualization of logs, metrics, and distributed traces. It enables both human operators and autonomous agents to understand system behavior, diagnose issues, and optimize performance. It includes alerting, anomaly detection, and cost attribution.

**API Surface Area:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/logs/query` | POST | Query logs (LogQL) |
| `/logs/ingest` | POST | Ingest log batch |
| `/metrics/query` | POST | Query metrics (PromQL) |
| `/metrics/ingest` | POST | Ingest metric batch |
| `/traces/query` | POST | Query traces (TraceQL) |
| `/traces/:id` | GET | Get trace by ID |
| `/alerts/rules` | CRUD | Alert rule management |
| `/alerts/incidents` | GET | List alert incidents |
| `/alerts/incidents/:id` | GET | Get incident details |
| `/alerts/incidents/:id/ack` | POST | Acknowledge incident |
| `/dashboards` | CRUD | Dashboard management |
| `/dashboards/:id` | GET | Get dashboard |
| `/cost/attribution` | GET | Cost attribution report |
| `/anomalies` | GET | Detected anomalies |

**Dependencies:**
- **Upstream:** All services (telemetry emission)
- **Upstream:** Kafka (telemetry event stream)
- **Downstream:** Loki (log storage)
- **Downstream:** Prometheus (metrics storage)
- **Downstream:** Tempo (trace storage)
- **Downstream:** Grafana (visualization)
- **Downstream:** ClickHouse (analytics)
- **Downstream:** Alertmanager (alert routing)

**Data Stores:**
- Loki: Log storage (object storage backend)
- Prometheus: Time-series metrics
- Tempo: Distributed traces
- ClickHouse: Aggregated analytics and cost data
- S3: Long-term storage for all telemetry

**Scaling Characteristics:**
- Write-heavy: millions of telemetry events per second
- Read patterns: ad-hoc queries, dashboard refreshes, alerts
- Retention tiers: hot (7 days), warm (30 days), cold (S3, 1 year)
- Cardinality control: label restrictions to prevent explosion
- Sampling: 100% logs, 100% errors, 10% success traces

**SLA Targets:**
| Metric | Target |
|--------|--------|
| Log Ingestion Latency | < 1s (99th percentile) |
| Metric Scraping Interval | 15s |
| Trace Retention | 30 days hot, 1 year cold |
| Query Response (logs) | < 5s for 24h window |
| Query Response (metrics) | < 1s |
| Alert Evaluation | < 30s delay |

**Technology Stack:**
- Grafana LGTM Stack (Loki + Grafana + Tempo + Mimir/Prometheus)
- OpenTelemetry Collector (receivers, processors, exporters)
- Kafka (telemetry buffering)
- ClickHouse (analytics)
- S3 (long-term storage)
- Alertmanager

**Deployment Topology:**
- OpenTelemetry Collector: DaemonSet on all nodes
- Loki: StatefulSet with object storage backend
- Prometheus: StatefulSet with Thanos for long-term storage
- Tempo: StatefulSet with S3 backend
- Grafana: Deployment with PostgreSQL for dashboards
- Dedicated observability node pool

---

### 3.10 Realtime Service

**Service Name:** `aasop-realtime-service`
**Type:** Presentation Infrastructure Service

**Responsibility:**
The Realtime Service manages WebSocket connections, live collaboration sessions, real-time presence, and streaming output delivery. It provides the infrastructure for collaborative coding sessions, live agent output streaming, and real-time project dashboards.

**API Surface Area:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/ws` | WS | Establish WebSocket connection |
| `/rooms` | POST | Create collaboration room |
| `/rooms/:id` | GET | Get room info |
| `/rooms/:id/join` | POST | Join room |
| `/rooms/:id/leave` | POST | Leave room |
| `/rooms/:id/members` | GET | List room members |
| `/presence` | GET | Get presence status |
| `/presence` | POST | Update presence status |
| `/streams/:id` | GET | Get stream info |
| `/streams/:id/subscribe` | WS | Subscribe to stream |
| `/broadcast` | POST | Broadcast message to room |

**Dependencies:**
- **Upstream:** Agent Runtime (streaming output)
- **Upstream:** Project Service (room-to-project mapping)
- **Upstream:** Auth Service (connection authentication)
- **Downstream:** Redis (presence, room state, pub/sub)
- **Downstream:** Kafka (persistent event log)

**Data Stores:**
- Redis: Presence data, room memberships, pub/sub backbone
- PostgreSQL: Room definitions, persistent messages
- Kafka: Event log for replay and analytics

**Scaling Characteristics:**
- Connection-heavy: 10,000+ concurrent WebSockets per instance
- Memory-bound: each connection holds state
- Requires sticky sessions (client must reconnect to same instance)
- Redis pub/sub for cross-instance message routing
- Message volume varies dramatically (quiet vs. active sessions)

**SLA Targets:**
| Metric | Target |
|--------|--------|
| Connection Establishment | < 100ms |
| Message Latency | < 50ms (same room) |
| Concurrent Connections | 10,000+ per instance |
| Connection Uptime | 99.9% (with reconnection) |

**Technology Stack:**
- Node.js 22 LTS + Socket.IO
- Redis (pub/sub, presence)
- uWebSockets.js (optional, for max performance)
- PostgreSQL (persistent storage)

**Deployment Topology:**
- Kubernetes StatefulSet (for session affinity)
- HPA based on connection count
- PodDisruptionBudget for graceful migration
- Separate node pool for realtime workloads
- Sticky routing via ingress annotation

---

### 3.11 Voice Service

**Service Name:** `aasop-voice-service`
**Type:** Presentation Service

**Responsibility:**
The Voice Service provides speech-to-text (STT), text-to-speech (TTS), and voice activity detection (VAD) capabilities. It enables hands-free interaction with the platform, voice-driven agent commands, and audio conferencing for collaborative sessions. It integrates with LiveKit for real-time audio transport.

**API Surface Area:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/stt` | WS | Real-time speech-to-text stream |
| `/stt/file` | POST | Batch file transcription |
| `/tts` | POST | Text-to-speech synthesis |
| `/tts/stream` | WS | Real-time TTS streaming |
| `/vad` | WS | Voice activity detection |
| `/voices` | GET | List available voices |
| `/voices/:id` | GET | Get voice details |
| `/sessions` | POST | Create voice session |
| `/sessions/:id` | GET | Get session status |
| `/sessions/:id` | DELETE | End session |

**Dependencies:**
- **Upstream:** LiveKit (audio transport)
- **Upstream:** Model Router (for STT/TTS model inference)
- **Downstream:** vLLM/Whisper (STT inference)
- **Downstream:** TTS models (inference cluster)
- **Downstream:** Redis (session cache)

**Data Stores:**
- Redis: Active sessions, audio buffers
- S3: Recorded audio files, transcriptions

**Scaling Characteristics:**
- Audio processing is CPU-intensive
- Real-time requirement: < 300ms end-to-end latency
- Session-based: each voice session consumes resources
- Burst scaling during meeting hours
- GPU optional: Whisper runs on CPU for cost, GPU for speed

**SLA Targets:**
| Metric | Target |
|--------|--------|
| STT Latency | < 300ms |
| TTS Latency | < 200ms |
| Word Error Rate | < 5% |
| Session Availability | 99.9% |

**Technology Stack:**
- Python 3.12 + FastAPI
- Whisper (STT)
- Coqui TTS / Piper (TTS)
- LiveKit Server SDK
- WebRTC
- Redis

**Deployment Topology:**
- Kubernetes Deployment with HPA
- CPU-optimized nodes (STT)
- GPU nodes for large-scale STT (optional)
- LiveKit server as separate deployment

---

### 3.12 WebSocket Gateway

**Service Name:** `aasop-ws-gateway`
**Type:** Infrastructure Service

**Responsibility:**
The WebSocket Gateway is a dedicated ingress point for all WebSocket traffic. It handles connection establishment, authentication upgrade, message routing to backend services, heartbeat management, and graceful degradation. It acts as a protocol adapter between WebSocket clients and internal gRPC/HTTP services.

**API Surface Area:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/ws` | WS | Main WebSocket endpoint |
| `/ws/:service` | WS | Service-specific WebSocket |
| `/health` | GET | Health check |
| `/metrics` | GET | Prometheus metrics |

**Protocol Mapping:**
| Client Message | Backend Service | Backend Protocol |
|----------------|-----------------|-------------------|
| `agent.chat` | Agent Runtime | gRPC streaming |
| `agent.override` | Agent Runtime | gRPC unary |
| `collab.join` | Realtime Service | WebSocket |
| `collab.edit` | Realtime Service | WebSocket |
| `voice.connect` | Voice Service | LiveKit |
| `stream.subscribe` | Realtime Service | Internal pub/sub |

**Dependencies:**
- **Upstream:** Auth Service (upgrade authentication)
- **Downstream:** Agent Runtime (agent messages)
- **Downstream:** Realtime Service (collaboration)
- **Downstream:** Voice Service (audio)
- **Downstream:** Redis (session routing table)

**Data Stores:**
- Redis: Session-to-backend routing table

**Scaling Characteristics:**
- Extremely connection-heavy
- Memory-bound (each WebSocket holds buffers)
- Requires sticky sessions
- Graceful shutdown: drain connections before terminating

**SLA Targets:**
| Metric | Target |
|--------|--------|
| Connection Upgrade | < 50ms |
| Message Routing | < 10ms |
| Concurrent Connections | 50,000 per instance |
| Connection Stability | 99.99% |

**Technology Stack:**
- Go 1.22 (high concurrency, low memory)
- Gorilla WebSocket
- Redis (routing table)
- gRPC (backend communication)

**Deployment Topology:**
- Kubernetes StatefulSet (session stickiness)
- HPA based on connection count
- Load balancer with source IP affinity
- Graceful termination with 30s drain period

---

### 3.13 Task Scheduler

**Service Name:** `aasop-task-scheduler`
**Type:** Platform Service

**Responsibility:**
The Task Scheduler provides cron-like and event-triggered scheduling capabilities. It manages recurring tasks, batch job orchestration, maintenance windows, and event-driven task execution. It integrates with the Workflow Engine for durable execution of scheduled workflows.

**API Surface Area:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/schedules` | POST | Create new schedule |
| `/schedules` | GET | List schedules |
| `/schedules/:id` | GET | Get schedule details |
| `/schedules/:id` | PUT | Update schedule |
| `/schedules/:id` | DELETE | Delete schedule |
| `/schedules/:id/enable` | POST | Enable schedule |
| `/schedules/:id/disable` | POST | Disable schedule |
| `/schedules/:id/history` | GET | Execution history |
| `/triggers` | POST | Create event trigger |
| `/triggers` | GET | List triggers |
| `/jobs` | GET | List job executions |
| `/jobs/:id` | GET | Get job details |
| `/jobs/:id/cancel` | POST | Cancel running job |
| `/jobs/:id/retry` | POST | Retry failed job |

**Dependencies:**
- **Upstream:** Workflow Engine (durable execution)
- **Upstream:** Event Bus (event triggers)
- **Downstream:** PostgreSQL (schedule definitions, job history)
- **Downstream:** Redis (distributed locks, schedule cache)
- **Downstream:** Kafka (job execution events)

**Data Stores:**
- PostgreSQL: Schedule definitions, execution history, job logs
- Redis: Distributed locking (prevent duplicate execution), next-run cache

**Scaling Characteristics:**
- Schedule evaluation is lightweight but must be reliable
- Job execution is delegated to workers
- Requires leader election for schedule evaluation
- Handles timezone complexities for cron expressions
- Backfill support for missed executions

**SLA Targets:**
| Metric | Target |
|--------|--------|
| Schedule Accuracy | < 1s drift |
| Job Execution Start | < 5s from scheduled time |
| Missed Execution Detection | < 30s |
| Availability | 99.95% |

**Technology Stack:**
- Node.js 22 LTS + Fastify
- node-cron (cron expression parsing)
- BullMQ (Redis-based job queues)
- PostgreSQL (persistence)
- Redis (locking and caching)
- Temporal (for durable workflow execution)

**Deployment Topology:**
- Kubernetes Deployment with single-replica leader election
- Redis for distributed locking during failover
- PostgreSQL with backups for schedule persistence

---

### 3.14 Event Bus

**Service Name:** `aasop-event-bus`
**Type:** Infrastructure Service

**Responsibility:**
The Event Bus is the central nervous system of the platform, providing durable, ordered, scalable message streaming between all services. It implements the pub/sub pattern with persistent logs, consumer groups, exactly-once processing semantics, and schema enforcement.

**API Surface Area:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/topics` | POST | Create topic |
| `/topics` | GET | List topics |
| `/topics/:name` | GET | Get topic info |
| `/topics/:name/config` | PUT | Update topic config |
| `/topics/:name/publish` | POST | Publish message |
| `/topics/:name/subscribe` | POST | Create subscription |
| `/subscriptions` | GET | List subscriptions |
| `/subscriptions/:id` | DELETE | Delete subscription |
| `/consumer-groups` | GET | List consumer groups |
| `/consumer-groups/:id` | GET | Get consumer group status |
| `/schemas` | POST | Register schema |
| `/schemas/:subject` | GET | Get schema |
| `/schemas/:subject/versions` | GET | List schema versions |

**Topic Categories:**
| Category | Topics | Retention |
|----------|--------|-----------|
| `aasop.agent.*` | Agent lifecycle events | 7 days |
| `aasop.workflow.*` | Workflow execution events | 30 days |
| `aasop.inference.*` | LLM inference events | 7 days |
| `aasop.sandbox.*` | Sandbox lifecycle events | 3 days |
| `aasop.user.*` | User activity events | 90 days |
| `aasop.billing.*` | Billing events | 1 year |
| `aasop.audit.*` | Security audit events | 1 year |
| `aasop.system.*` | Platform health events | 7 days |

**Dependencies:**
- **Upstream:** All services (publishers)
- **Downstream:** All services (consumers)
- **Downstream:** ZooKeeper/KRaft (cluster coordination)

**Data Stores:**
- Kafka log segments (local disk)
- S3 (tiered storage for older segments)

**Scaling Characteristics:**
- Throughput: millions of messages per second cluster-wide
- Partition count determines parallelism
- Replication factor: 3 for durability
- Min ISR: 2 for availability/durability balance
- Consumer groups for load balancing

**SLA Targets:**
| Metric | Target |
|--------|--------|
| Availability | 99.99% |
| Produce Latency (p99) | < 10ms |
| Consume Latency (p99) | < 50ms |
| Message Durability | 99.999999% (8 nines) |
| Max Throughput | 1M msg/s per topic |

**Technology Stack:**
- Apache Kafka 3.7+ (KRaft mode, no ZooKeeper)
- Kafka Connect (data integration)
- Schema Registry (Avro/JSON Schema/Protobuf)
- Cruise Control (cluster rebalancing)
- S3 (tiered storage)

**Deployment Topology:**
- 6+ brokers across 3 AZs
- Replication factor: 3
- Dedicated Kafka node pool (high I/O)
- Separate ZooKeeper/KRaft controllers
- Monitoring: Kafka exporter + Prometheus

---

### 3.15 Notification Service

**Service Name:** `aasop-notification-service`
**Type:** Supporting Service

**Responsibility:**
The Notification Service delivers multi-channel notifications to users and external systems. It manages notification templates, delivery preferences, rate limiting, retry logic, and delivery tracking across email, Slack, SMS, in-app, and webhook channels.

**API Surface Area:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/notifications` | POST | Send notification |
| `/notifications/batch` | POST | Send batch notifications |
| `/notifications/:id` | GET | Get notification status |
| `/templates` | CRUD | Manage templates |
| `/templates/:id/preview` | POST | Preview template |
| `/preferences` | GET | Get user preferences |
| `/preferences` | PUT | Update preferences |
| `/channels` | GET | List configured channels |
| `/channels/:channel/test` | POST | Test channel |
| `/webhooks` | CRUD | Webhook endpoint management |
| `/webhooks/:id/deliveries` | GET | Delivery history |
| `/metrics` | GET | Delivery metrics |

**Dependencies:**
- **Upstream:** All services (notification triggers via Kafka)
- **Upstream:** User Service (user contact info)
- **Downstream:** SMTP relay (email)
- **Downstream:** Slack API
- **Downstream:** Twilio (SMS)
- **Downstream:** WebSocket (in-app)
- **Downstream:** Redis (rate limiting, deduplication)

**Data Stores:**
- PostgreSQL: Notification history, templates, preferences
- Redis: Rate limit counters, deduplication cache

**Scaling Characteristics:**
- Spiky traffic (incidents, deployments)
- Delivery is async (queued)
- Rate limiting per channel per user
- Template rendering is CPU-light
- External API calls are the bottleneck

**SLA Targets:**
| Metric | Target |
|--------|--------|
| Delivery Latency (email) | < 60s |
| Delivery Latency (Slack) | < 10s |
| Delivery Latency (in-app) | < 1s |
| Delivery Rate | 99.5% |

**Technology Stack:**
- Node.js 22 LTS + Fastify
- Nodemailer (SMTP)
- Slack SDK
- Twilio SDK
- BullMQ (Redis queues per channel)
- Handlebars (templating)

**Deployment Topology:**
- Kubernetes Deployment
- Separate worker pools per channel
- HPA based on queue depth

---

### 3.16 Project Service

**Service Name:** `aasop-project-service`
**Type:** Domain Service

**Responsibility:**
The Project Service manages project boundaries, repository configurations, environment settings, team associations, and project-level policies. It is the source of truth for project metadata and enforces project-scoped access controls.

**API Surface Area:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/projects` | POST | Create project |
| `/projects` | GET | List projects |
| `/projects/:id` | GET | Get project details |
| `/projects/:id` | PUT | Update project |
| `/projects/:id` | DELETE | Archive project |
| `/projects/:id/settings` | GET/PUT | Project settings |
| `/projects/:id/environments` | CRUD | Environment management |
| `/projects/:id/members` | CRUD | Team member management |
| `/projects/:id/repos` | CRUD | Repository configuration |
| `/projects/:id/secrets` | CRUD | Project secrets |
| `/projects/:id/policies` | CRUD | Project policies |
| `/projects/:id/activity` | GET | Project activity feed |

**Dependencies:**
- **Upstream:** Auth Service (permission checks)
- **Upstream:** Git Integration (repository validation)
- **Downstream:** PostgreSQL (project data)
- **Downstream:** Kafka (project events)

**Data Stores:**
- PostgreSQL: Project definitions, settings, members
- Kafka: Project lifecycle events

**SLA Targets:**
| Metric | Target |
|--------|--------|
| Availability | 99.9% |
| P50 Read | < 20ms |
| P99 Read | < 100ms |

**Technology Stack:**
- Node.js 22 LTS + Fastify + Prisma
- PostgreSQL 16

**Deployment Topology:**
- Kubernetes Deployment with HPA
- PostgreSQL read replicas

---

### 3.17 User Service

**Service Name:** `aasop-user-service`
**Type:** Domain Service

**Responsibility:**
The User Service manages user accounts, profiles, organization memberships, team structures, and user preferences. It provides user discovery, directory services, and organization-level management capabilities.

**API Surface Area:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/users` | POST | Create user |
| `/users` | GET | List/search users |
| `/users/:id` | GET | Get user profile |
| `/users/:id` | PUT | Update profile |
| `/users/:id/orgs` | GET | Get user organizations |
| `/users/:id/preferences` | GET/PUT | User preferences |
| `/organizations` | POST | Create organization |
| `/organizations` | GET | List organizations |
| `/organizations/:id` | GET | Get org details |
| `/organizations/:id/members` | CRUD | Org member management |
| `/organizations/:id/teams` | CRUD | Team management |
| `/organizations/:id/billing` | GET | Org billing info |
| `/organizations/:id/settings` | GET/PUT | Org settings |

**Dependencies:**
- **Upstream:** Auth Service (identity verification)
- **Downstream:** PostgreSQL (user data)
- **Downstream:** Kafka (user events)

**Data Stores:**
- PostgreSQL: Users, organizations, teams, memberships

**SLA Targets:**
| Metric | Target |
|--------|--------|
| Availability | 99.9% |
| P50 Read | < 20ms |
| P99 Read | < 100ms |

**Technology Stack:**
- Node.js 22 LTS + Fastify + Prisma
- PostgreSQL 16

**Deployment Topology:**
- Kubernetes Deployment with HPA

---

### 3.18 Billing/Quota Service

**Service Name:** `aasop-billing-service`
**Type:** Domain Service

**Responsibility:**
The Billing/Quota Service tracks resource usage, enforces quota limits, calculates charges, manages subscription plans, and generates invoices. It provides real-time quota checking and usage attribution to organizations and projects.

**API Surface Area:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/usage` | POST | Report usage event |
| `/usage/query` | POST | Query usage |
| `/usage/current` | GET | Current period usage |
| `/quotas` | GET | Get quota configuration |
| `/quotas/check` | POST | Check quota availability |
| `/plans` | GET | List available plans |
| `/plans/:id` | GET | Get plan details |
| `/subscriptions` | POST | Create subscription |
| `/subscriptions/:id` | GET | Get subscription |
| `/subscriptions/:id` | PUT | Update subscription |
| `/invoices` | GET | List invoices |
| `/invoices/:id` | GET | Get invoice |
| `/invoices/:id/pay` | POST | Pay invoice |
| `/webhooks/stripe` | POST | Stripe webhook |

**Dependencies:**
- **Upstream:** Kafka (usage events from all services)
- **Upstream:** Auth Service (authorization)
- **Downstream:** ClickHouse (usage analytics)
- **Downstream:** PostgreSQL (billing data)
- **Downstream:** Stripe (payment processing)

**Data Stores:**
- ClickHouse: High-volume usage events
- PostgreSQL: Subscriptions, invoices, plans
- Redis: Quota counters (real-time)

**SLA Targets:**
| Metric | Target |
|--------|--------|
| Quota Check Latency | < 10ms |
| Usage Event Ingestion | < 1s |
| Invoice Generation | < 24h after period end |

**Technology Stack:**
- Node.js 22 LTS + Fastify
- ClickHouse (analytics)
- PostgreSQL
- Redis
- Stripe SDK

**Deployment Topology:**
- Kubernetes Deployment
- ClickHouse cluster for analytics

---

### 3.19 Audit Service

**Service Name:** `aasop-audit-service`
**Type:** Governance Service

**Responsibility:**
The Audit Service maintains an immutable, tamper-evident log of all security-relevant events in the platform. It provides compliance reporting, forensic analysis capabilities, and real-time anomaly detection for security events.

**API Surface Area:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/audit/events` | POST | Ingest audit event |
| `/audit/events` | GET | Query audit log |
| `/audit/events/:id` | GET | Get specific event |
| `/audit/export` | POST | Export audit log |
| `/audit/reports` | GET | List compliance reports |
| `/audit/reports/:id` | GET | Get report |
| `/audit/anomalies` | GET | Detected anomalies |
| `/audit/retention` | GET | Retention policies |
| `/verify` | POST | Verify log integrity |

**Dependencies:**
- **Upstream:** Kafka (audit events from all services)
- **Downstream:** S3 (immutable log storage)
- **Downstream:** PostgreSQL (metadata, queries)
- **Downstream:** ClickHouse (analytics)

**Data Stores:**
- S3: Immutable audit log (WORM storage)
- PostgreSQL: Event metadata and indexing
- ClickHouse: Analytical queries

**SLA Targets:**
| Metric | Target |
|--------|--------|
| Log Immutability | 100% |
| Event Ingestion | < 5s |
| Query Response | < 10s for 30 days |
| Retention | 7 years (compliance) |

**Technology Stack:**
- Node.js 22 LTS + Fastify
- S3 with Object Lock (WORM)
- PostgreSQL
- ClickHouse
- Cryptographic hashing for integrity

**Deployment Topology:**
- Kubernetes Deployment
- S3 with compliance mode Object Lock

---

### 3.20 MCP Registry

**Service Name:** `aasop-mcp-registry`
**Type:** Domain Service

**Responsibility:**
The MCP (Model Context Protocol) Registry manages tool definitions, agent capabilities, context schemas, and A2A (Agent-to-Agent) protocol specifications. It serves as the capability directory for agents, enabling dynamic tool discovery, schema validation, and capability negotiation between agents.

**API Surface Area:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/tools` | POST | Register tool |
| `/tools` | GET | List tools |
| `/tools/:id` | GET | Get tool definition |
| `/tools/:id` | PUT | Update tool |
| `/tools/:id` | DELETE | Deregister tool |
| `/tools/:id/validate` | POST | Validate tool input |
| `/capabilities` | GET | List capabilities |
| `/capabilities/:id` | GET | Get capability definition |
| `/schemas` | POST | Register context schema |
| `/schemas/:id` | GET | Get schema |
| `/a2a/protocols` | GET | List A2A protocols |
| `/a2a/agents` | GET | Discover agents |
| `/a2a/agents/:id/capabilities` | GET | Get agent capabilities |
| `/a2a/negotiate` | POST | Negotiate agent protocol |

**Dependencies:**
- **Upstream:** Agent Runtime (tool lookups)
- **Downstream:** PostgreSQL (tool definitions)
- **Downstream:** Redis (tool cache)

**Data Stores:**
- PostgreSQL: Tool definitions, schemas, protocols
- Redis: Hot tool cache

**SLA Targets:**
| Metric | Target |
|--------|--------|
| Availability | 99.9% |
| Tool Lookup | < 10ms |
| Schema Validation | < 50ms |

**Technology Stack:**
- Node.js 22 LTS + Fastify
- JSON Schema (validation)
- PostgreSQL
- Redis

**Deployment Topology:**
- Kubernetes Deployment with HPA


---

## 4. Monorepo Structure

### 4.1 Philosophy and Principles

The monorepo is organized around the principle of **co-location with clear boundaries**. Services that change together live together, but dependency boundaries are strictly enforced to prevent tight coupling. The structure supports independent versioning, independent deployment, and independent scaling while maximizing code reuse and developer velocity.

**Core Principles:**
1. **One source of truth**: All source code, configuration, and documentation live in a single repository
2. **Explicit dependencies**: No service imports another service's internals; all cross-service communication is via published SDKs or APIs
3. **Independent deployability**: Each service can be built, tested, and deployed independently
4. **Shared nothing by default**: Shared packages are intentional, versioned artifacts, not free-for-all common directories
5. **Infrastructure as code**: All infrastructure is defined alongside the services it supports

### 4.2 Repository Layout

```
aasop/
|
├── .github/                          # GitHub-specific configuration
│   ├── workflows/                    # CI/CD workflow definitions
│   │   ├── ci.yml                    # Main CI pipeline
│   │   ├── cd-staging.yml           # Staging deployment
│   │   ├── cd-production.yml        # Production deployment
│   │   ├── security-scan.yml        # Security scanning
│   │   ├── release.yml              # Release automation
│   │   └── nightly-e2e.yml          # Nightly E2E tests
│   ├── actions/                      # Reusable GitHub Actions
│   │   ├── setup-node-pnpm/         # Node.js + pnpm setup
│   │   ├── setup-go/                # Go setup
│   │   ├── build-service/           # Service build action
│   │   ├── test-service/            # Service test action
│   │   ├── deploy-k8s/              # Kubernetes deployment
│   │   └── notify-slack/            # Slack notifications
│   ├── CODEOWNERS                    # Code ownership rules
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── dependabot.yml
|
├── .husky/                           # Git hooks
│   ├── commit-msg                    # Commit message linting
│   └── pre-commit                    # Pre-commit checks
|
├── .vscode/                          # VS Code workspace settings
│   ├── settings.json
│   ├── extensions.json
│   └── launch.json
|
├── .cursor/                          # Cursor IDE rules
│   └── rules/
│       ├── typescript.mdc
│       ├── go.mdc
│       ├── python.mdc
│       └── architecture.mdc
|
├── docker/                           # Docker configurations
│   ├── base-images/                  # Shared base images
│   │   ├── nodejs-production/       # Node.js production base
│   │   ├── nodejs-development/      # Node.js development base
│   │   ├── go-production/           # Go production base
│   │   └── python-production/       # Python production base
│   └── compose/                      # Docker Compose for local dev
│       ├── infrastructure.yml        # Databases, message queues, etc.
│       ├── services.yml              # All platform services
│       └── agents.yml                # Agent runtime sandbox services
|
├── docs/                             # Documentation
│   ├── architecture/                 # Architecture decision records (ADRs)
│   │   ├── 001-monorepo-structure.md
│   │   ├── 002-event-driven-architecture.md
│   │   ├── 003-temporal-for-workflows.md
│   │   ├── 004-firecracker-for-sandboxes.md
│   │   ├── 005-model-routing-strategy.md
│   │   └── 006-memory-system-design.md
│   ├── api/                          # API documentation (OpenAPI)
│   ├── runbooks/                     # Operational runbooks
│   │   ├── incident-response.md
│   │   ├── deployment-procedures.md
│   │   ├── rollback-procedures.md
│   │   └── disaster-recovery.md
│   ├── onboarding/                   # Developer onboarding
│   │   ├── getting-started.md
│   │   ├── local-development.md
│   │   ├── service-development.md
│   │   └── testing-guide.md
│   └── standards/                    # Coding and design standards
│       ├── typescript-style-guide.md
│       ├── go-style-guide.md
│       ├── api-design-guide.md
│       ├── naming-conventions.md
│       └── testing-standards.md
|
├── infra/                            # Infrastructure as Code
│   ├── terraform/                    # Terraform modules
│   │   ├── modules/                  # Reusable Terraform modules
│   │   │   ├── eks-cluster/          # EKS cluster provisioning
│   │   │   ├── vpc-networking/       # VPC, subnets, routing
│   │   │   ├── rds-postgresql/       # PostgreSQL provisioning
│   │   │   ├── documentdb-mongodb/   # MongoDB provisioning
│   │   │   ├── elasticache-redis/    # Redis provisioning
│   │   │   ├── msk-kafka/            # Kafka (MSK) provisioning
│   │   │   ├── opensearch/           # OpenSearch provisioning
│   │   │   ├── s3-buckets/           # S3 bucket provisioning
│   │   │   ├── iam-roles/            # IAM role definitions
│   │   │   ├── load-balancers/       # ALB/NLB configuration
│   │   │   ├── gpu-node-pool/        # GPU node pool configuration
│   │   │   ├── firecracker-nodes/    # Firecracker sandbox nodes
│   │   │   ├── weaviate-cluster/     # Weaviate vector DB
│   │   │   ├── clickhouse-cluster/   # ClickHouse cluster
│   │   │   ├── monitoring-stack/     # Grafana, Prometheus, Loki
│   │   │   ├── vault-setup/          # HashiCorp Vault
│   │   │   └── service-mesh/         # Istio service mesh
│   │   ├── environments/
│   │   │   ├── dev/                  # Development environment
│   │   │   │   ├── main.tf
│   │   │   │   ├── variables.tf
│   │   │   │   ├── outputs.tf
│   │   │   │   └── terraform.tfvars
│   │   │   ├── staging/              # Staging environment
│   │   │   │   ├── main.tf
│   │   │   │   ├── variables.tf
│   │   │   │   ├── outputs.tf
│   │   │   │   └── terraform.tfvars
│   │   │   └── production/           # Production environment
│   │   │       ├── main.tf
│   │   │       ├── variables.tf
│   │   │       ├── outputs.tf
│   │   │       └── terraform.tfvars
│   │   └── global/                   # Cross-environment resources
│   │       ├── dns/                  # Route53 DNS zones
│   │       ├── cdn/                  # CloudFront/CDN configuration
│   │       ├── iam/                  # Global IAM policies
│   │       └── organizations/        # AWS Organizations
│   ├── kubernetes/                   # Kubernetes manifests
│   │   ├── base/                     # Base kustomizations
│   │   │   ├── api-gateway/
│   │   │   ├── auth-service/
│   │   │   ├── agent-runtime/
│   │   │   ├── workflow-engine/
│   │   │   ├── memory-service/
│   │   │   ├── model-router/
│   │   │   ├── inference-cluster/
│   │   │   ├── sandbox-manager/
│   │   │   ├── observability/
│   │   │   ├── realtime-service/
│   │   │   ├── voice-service/
│   │   │   ├── websocket-gateway/
│   │   │   ├── task-scheduler/
│   │   │   ├── event-bus/
│   │   │   ├── notification-service/
│   │   │   ├── project-service/
│   │   │   ├── user-service/
│   │   │   ├── billing-service/
│   │   │   ├── audit-service/
│   │   │   ├── mcp-registry/
│   │   │   └── web-frontend/
│   │   ├── overlays/
│   │   │   ├── dev/
│   │   │   ├── staging/
│   │   │   └── production/
│   │   ├── crds/                     # Custom Resource Definitions
│   │   │   ├── sandbox.yaml
│   │   │   ├── workflow.yaml
│   │   │   ├── agent-session.yaml
│   │   │   └── inference-model.yaml
│   │   └── policies/                 # OPA/Gatekeeper policies
│   │       ├── security/
│   │       ├── networking/
│   │       └── resource-limits/
│   └── helm/                         # Helm charts (for external deps)
│       ├── temporal/                 # Temporal server chart
│       ├── kafka/                    # Kafka operator
│       ├── clickhouse/              # ClickHouse operator
│       ├── weaviate/                # Weaviate chart
│       ├── kong/                    # Kong gateway chart
│       └── keycloak/                # Keycloak chart
|
├── packages/                         # Shared packages (pnpm workspaces)
│   ├── config/                       # Shared configuration
│   │   ├── eslint-config/           # ESLint configurations
│   │   │   ├── base.js
│   │   │   ├── node.js
│   │   │   ├── react.js
│   │   │   └── package.json
│   │   ├── typescript-config/       # TypeScript base configs
│   │   │   ├── base.json
│   │   │   ├── node.json
│   │   │   ├── react.json
│   │   │   └── package.json
│   │   ├── prettier-config/         # Prettier configuration
│   │   ├── jest-config/             # Jest test configurations
│   │   ├── vite-config/             # Vite build configurations
│   │   └── tailwind-config/         # Tailwind CSS configuration
│   │
│   ├── types/                        # Shared type definitions
│   │   ├── api-types/               # API DTOs and request/response types
│   │   │   ├── src/
│   │   │   │   ├── auth/
│   │   │   │   ├── agent/
│   │   │   │   ├── workflow/
│   │   │   │   ├── memory/
│   │   │   │   ├── project/
│   │   │   │   ├── user/
│   │   │   │   ├── billing/
│   │   │   │   ├── model-router/
│   │   │   │   ├── sandbox/
│   │   │   │   └── common/
│   │   │   ├── package.json
│   │   │   └── tsconfig.json
│   │   ├── event-types/             # Event schema definitions
│   │   │   ├── src/
│   │   │   │   ├── agent-events.ts
│   │   │   │   ├── workflow-events.ts
│   │   │   │   ├── inference-events.ts
│   │   │   │   ├── billing-events.ts
│   │   │   │   └── system-events.ts
│   │   │   ├── schemas/             # Avro/JSON Schema definitions
│   │   │   │   ├── agent.avsc
│   │   │   │   ├── workflow.avsc
│   │   │   │   └── ...
│   │   │   ├── package.json
│   │   │   └── tsconfig.json
│   │   └── domain-types/            # Core domain types
│   │       ├── src/
│   │       │   ├── agent.ts
│   │       │   ├── project.ts
│   │       │   ├── user.ts
│   │       │   ├── sandbox.ts
│   │       │   └── model.ts
│   │       ├── package.json
│   │       └── tsconfig.json
│   │
│   ├── utils/                        # Shared utility libraries
│   │   ├── common-utils/            # Language-agnostic concepts in TS
│   │   │   ├── src/
│   │   │   │   ├── id-generator.ts  # ULID/CUID generation
│   │   │   │   ├── retry.ts         # Retry policies
│   │   │   │   ├── circuit-breaker.ts
│   │   │   │   ├── rate-limiter.ts
│   │   │   │   ├── validation.ts    # Schema validation helpers
│   │   │   │   ├── errors.ts        # Error classes
│   │   │   │   ├── logger.ts        # Structured logging
│   │   │   │   ├── crypto.ts        # Encryption utilities
│   │   │   │   ├── encoding.ts      # Base64, hex, etc.
│   │   │   │   └── http-client.ts   # HTTP client with retries
│   │   │   ├── package.json
│   │   │   └── tsconfig.json
│   │   ├── go-utils/                # Go shared utilities
│   │   │   ├── retry/
│   │   │   ├── circuitbreaker/
│   │   │   ├── logger/
│   │   │   ├── errors/
│   │   │   └── middleware/
│   │   └── python-utils/            # Python shared utilities
│   │       ├── logger.py
│   │       ├── retry.py
│   │       └── errors.py
│   │
│   ├── middleware/                   # Shared middleware
│   │   ├── auth-middleware/         # Authentication middleware
│   │   │   ├── src/
│   │   │   │   ├── jwt-validator.ts
│   │   │   │   ├── api-key-auth.ts
│   │   │   │   ├── rbac.ts
│   │   │   │   └── abac.ts
│   │   │   ├── package.json
│   │   │   └── tsconfig.json
│   │   ├── request-logger/          # Request logging middleware
│   │   ├── rate-limiter/            # Rate limiting middleware
│   │   ├── error-handler/           # Error handling middleware
│   │   ├── tracing/                 # OpenTelemetry tracing setup
│   │   │   ├── src/
│   │   │   │   ├── node-tracer.ts   # Node.js tracer
│   │   │   │   ├── go-tracer.go     # Go tracer
│   │   │   │   └── python-tracer.py # Python tracer
│   │   │   ├── package.json
│   │   │   └── go.mod
│   │   └── metrics/                 # Prometheus metrics middleware
│   │
│   ├── sdk/                          # Client SDKs
│   │   ├── node-sdk/                # Official Node.js SDK
│   │   │   ├── src/
│   │   │   │   ├── client.ts        # Main API client
│   │   │   │   ├── agents/
│   │   │   │   ├── workflows/
│   │   │   │   ├── projects/
│   │   │   │   ├── memory/
│   │   │   │   ├── models/
│   │   │   │   └── auth/
│   │   │   ├── tests/
│   │   │   ├── package.json
│   │   │   └── tsconfig.json
│   │   ├── python-sdk/              # Official Python SDK
│   │   └── go-sdk/                  # Official Go SDK
│   │
│   ├── connectors/                   # External service connectors
│   │   ├── llm-connector/           # Unified LLM provider connector
│   │   │   ├── src/
│   │   │   │   ├── providers/
│   │   │   │   │   ├── openai.ts
│   │   │   │   │   ├── anthropic.ts
│   │   │   │   │   ├── google.ts
│   │   │   │   │   └── vllm.ts
│   │   │   │   ├── router.ts
│   │   │   │   ├── types.ts
│   │   │   │   └── errors.ts
│   │   │   ├── package.json
│   │   │   └── tsconfig.json
│   │   ├── git-connector/           # Git provider connector
│   │   ├── slack-connector/         # Slack integration
│   │   └── stripe-connector/        # Stripe integration
│   │
│   ├── protocol/                     # Communication protocols
│   │   ├── mcp-protocol/            # Model Context Protocol
│   │   │   ├── src/
│   │   │   │   ├── types.ts
│   │   │   │   ├── validator.ts
│   │   │   │   ├── client.ts
│   │   │   │   └── server.ts
│   │   │   ├── schemas/
│   │   │   ├── package.json
│   │   │   └── tsconfig.json
│   │   ├── a2a-protocol/            # Agent-to-Agent Protocol
│   │   └── event-protocol/          # Internal event schema protocol
│   │
│   └── testing/                      # Shared testing utilities
│       ├── testcontainers/          # Testcontainers configurations
│       ├── fixtures/                # Test fixtures
│       ├── factories/               # Test data factories
│       ├── mocks/                   # Shared mocks
│       └── e2e-helpers/             # E2E testing helpers
|
├── services/                         # Microservices (independent deployables)
│   ├── api-gateway/                  # Kong + custom plugins
│   │   ├── plugins/
│   │   │   ├── custom-auth/
│   │   │   ├── rate-limiter/
│   │   │   └── request-transform/
│   │   ├── kong.yml
│   │   ├── Dockerfile
│   │   └── README.md
│   │
│   ├── auth-service/                 # Authentication and authorization
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── repositories/
│   │   │   ├── models/
│   │   │   ├── middleware/
│   │   │   ├── strategies/          # OAuth strategies
│   │   │   ├── policies/            # ABAC policies
│   │   │   ├── utils/
│   │   │   ├── app.ts
│   │   │   └── server.ts
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── migrations/
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   ├── integration/
│   │   │   └── e2e/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── jest.config.js
│   │   └── README.md
│   │
│   ├── agent-runtime/                # Agent execution runtime
│   │   ├── src/
│   │   │   ├── runtime/             # Core runtime engine
│   │   │   │   ├── agent-controller.ts
│   │   │   │   ├── state-machine.ts
│   │   │   │   ├── context-assembler.ts
│   │   │   │   └── execution-loop.ts
│   │   │   ├── tools/               # Built-in tool implementations
│   │   │   │   ├── file-tools/
│   │   │   │   ├── git-tools/
│   │   │   │   ├── shell-tools/
│   │   │   │   ├── web-tools/
│   │   │   │   └── code-tools/
│   │   │   ├── sandbox/             # Sandbox client
│   │   │   ├── memory/              # Memory service client
│   │   │   ├── router/              # Model router client
│   │   │   ├── streaming/           # Response streaming
│   │   │   ├── websocket/           # WebSocket handlers
│   │   │   ├── app.ts
│   │   │   └── server.ts
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── README.md
│   │
│   ├── workflow-engine/              # Temporal workflow definitions
│   │   ├── src/
│   │   │   ├── workflows/           # Workflow definitions
│   │   │   │   ├── project-provisioning.ts
│   │   │   │   ├── agent-deployment.ts
│   │   │   │   ├── code-review-pipeline.ts
│   │   │   │   ├── incident-response.ts
│   │   │   │   └── billing-cycle.ts
│   │   │   ├── activities/          # Activity implementations
│   │   │   │   ├── repository/
│   │   │   │   ├── sandbox/
│   │   │   │   ├── notification/
│   │   │   │   └── validation/
│   │   │   ├── workers/             # Temporal workers
│   │   │   ├── shared/              # Shared workflow helpers
│   │   │   └── main.ts
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── README.md
│   │
│   ├── memory-service/               # Multi-layered memory system
│   │   ├── src/
│   │   │   ├── episodic/            # Episodic memory handlers
│   │   │   ├── semantic/            # Semantic/vector memory
│   │   │   ├── procedural/          # Procedural memory
│   │   │   ├── working/             # Working memory cache
│   │   │   ├── consolidation/       # Memory consolidation
│   │   │   ├── context/             # Context window assembly
│   │   │   └── app.ts
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── README.md
│   │
│   ├── model-router/                 # LLM routing and load balancing
│   │   ├── src/                     # Go source code
│   │   │   ├── router/
│   │   │   ├── providers/
│   │   │   ├── balancer/
│   │   │   ├── fallback/
│   │   │   ├── cache/
│   │   │   ├── streaming/
│   │   │   ├── config/
│   │   │   ├── metrics/
│   │   │   ├── main.go
│   │   │   └── server.go
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   ├── go.mod
│   │   └── README.md
│   │
│   ├── inference-cluster/            # GPU inference cluster management
│   │   ├── src/                     # Python source
│   │   │   ├── models/
│   │   │   ├── scheduler/
│   │   │   ├── scaling/
│   │   │   ├── monitoring/
│   │   │   └── main.py
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   ├── requirements.txt
│   │   └── README.md
│   │
│   ├── sandbox-manager/              # Sandbox provisioning
│   │   ├── src/                     # Go source
│   │   │   ├── firecracker/
│   │   │   ├── containerd/
│   │   │   ├── networking/
│   │   │   ├── storage/
│   │   │   ├── snapshots/
│   │   │   ├── pool/
│   │   │   └── main.go
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   ├── go.mod
│   │   └── README.md
│   │
│   ├── observability/                # Observability stack integration
│   │   ├── src/
│   │   │   ├── collectors/
│   │   │   ├── processors/
│   │   │   ├── exporters/
│   │   │   ├── dashboards/
│   │   │   └── app.ts
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── README.md
│   │
│   ├── realtime-service/             # Real-time collaboration
│   │   ├── src/
│   │   │   ├── rooms/
│   │   │   ├── presence/
│   │   │   ├── streaming/
│   │   │   ├── collab/
│   │   │   └── server.ts
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── README.md
│   │
│   ├── voice-service/                # Voice processing
│   │   ├── src/                     # Python
│   │   │   ├── stt/
│   │   │   ├── tts/
│   │   │   ├── vad/
│   │   │   └── main.py
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   ├── requirements.txt
│   │   └── README.md
│   │
│   ├── websocket-gateway/            # WebSocket ingress
│   │   ├── src/                     # Go
│   │   │   ├── handlers/
│   │   │   ├── routing/
│   │   │   ├── auth/
│   │   │   ├── heartbeat/
│   │   │   └── main.go
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   ├── go.mod
│   │   └── README.md
│   │
│   ├── task-scheduler/               # Task scheduling
│   │   ├── src/
│   │   │   ├── cron/
│   │   │   ├── triggers/
│   │   │   ├── workers/
│   │   │   └── app.ts
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── README.md
│   │
│   ├── event-bus/                    # Kafka management
│   │   ├── src/
│   │   ├── schemas/                 # Avro schemas
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   └── README.md
│   │
│   ├── notification-service/         # Multi-channel notifications
│   │   ├── src/
│   │   │   ├── channels/
│   │   │   ├── templates/
│   │   │   ├── delivery/
│   │   │   └── app.ts
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── README.md
│   │
│   ├── project-service/              # Project management
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── repositories/
│   │   │   └── app.ts
│   │   ├── prisma/
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── README.md
│   │
│   ├── user-service/                 # User and organization management
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── repositories/
│   │   │   └── app.ts
│   │   ├── prisma/
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── README.md
│   │
│   ├── billing-service/              # Billing and quotas
│   │   ├── src/
│   │   │   ├── metering/
│   │   │   ├── quotas/
│   │   │   ├── billing/
│   │   │   └── app.ts
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── README.md
│   │
│   ├── audit-service/                # Audit logging
│   │   ├── src/
│   │   │   ├── ingestion/
│   │   │   ├── storage/
│   │   │   ├── verification/
│   │   │   ├── export/
│   │   │   └── app.ts
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── README.md
│   │
│   └── mcp-registry/                 # MCP and A2A registry
│       ├── src/
│       │   ├── tools/
│       │   ├── schemas/
│       │   ├── capabilities/
│       │   ├── a2a/
│       │   └── app.ts
│       ├── tests/
│       ├── Dockerfile
│       ├── package.json
│       └── README.md
│
├── frontend/                         # Frontend applications
│   ├── web-app/                      # Main web application
│   │   ├── src/
│   │   │   ├── app/                 # Next.js app router
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx
│   │   │   │   ├── dashboard/
│   │   │   │   ├── projects/
│   │   │   │   ├── agents/
│   │   │   │   ├── workflows/
│   │   │   │   ├── settings/
│   │   │   │   └── admin/
│   │   │   ├── components/          # React components
│   │   │   │   ├── ui/             # Base UI components
│   │   │   │   ├── layout/         # Layout components
│   │   │   │   ├── dashboard/
│   │   │   │   ├── agents/
│   │   │   │   ├── projects/
│   │   │   │   ├── collaboration/
│   │   │   │   └── common/
│   │   │   ├── hooks/               # Custom React hooks
│   │   │   ├── stores/              # Zustand state stores
│   │   │   ├── lib/                 # Utilities
│   │   │   ├── types/               # Frontend-specific types
│   │   │   ├── styles/
│   │   │   └── api/                 # API client setup
│   │   ├── public/
│   │   ├── tests/
│   │   ├── e2e/                     # Playwright tests
│   │   ├── Dockerfile
│   │   ├── next.config.js
│   │   ├── tailwind.config.js
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── cli-tool/                     # Command-line interface
│   │   ├── src/
│   │   │   ├── commands/
│   │   │   │   ├── auth.ts
│   │   │   │   ├── agent.ts
│   │   │   │   ├── project.ts
│   │   │   │   ├── deploy.ts
│   │   │   │   ├── logs.ts
│   │   │   │   └── config.ts
│   │   │   ├── api-client/
│   │   │   ├── ui/                  # Ink components
│   │   │   ├── utils/
│   │   │   └── index.ts
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── vscode-extension/             # VS Code extension
│       ├── src/
│       │   ├── extension.ts
│       │   ├── commands/
│       │   ├── panels/
│       │   ├── providers/
│       │   └── api/
│       ├── package.json
│       └── README.md
│
├── scripts/                          # Development and automation scripts
│   ├── dev/                         # Local development helpers
│   │   ├── setup.sh                 # Initial dev environment setup
│   │   ├── start-infra.sh           # Start infrastructure services
│   │   ├── start-services.sh        # Start all platform services
│   │   ├── seed-data.sh             # Seed development data
│   │   └── teardown.sh              # Clean up dev environment
│   ├── build/                       # Build automation
│   │   ├── build-service.sh
│   │   ├── build-frontend.sh
│   │   └── build-all.sh
│   ├── deploy/                      # Deployment scripts
│   │   ├── deploy-service.sh
│   │   ├── deploy-all.sh
│   │   └── rollback.sh
│   ├── generate/                    # Code generation
│   │   ├── generate-api-types.sh
│   │   ├── generate-clients.sh
│   │   ├── generate-migrations.sh
│   │   └── generate-events.sh
│   └── migrate/                     # Database migration helpers
│       ├── run-migrations.sh
│       ├── create-migration.sh
│       └── verify-migrations.sh
│
├── .editorconfig
├── .gitignore
├── .npmrc                            # pnpm configuration
├── package.json                      # Root workspace configuration
├── pnpm-workspace.yaml               # Workspace definitions
├── turbo.json                        # Turborepo pipeline config
├── nx.json                           # Nx configuration (optional)
├── tsconfig.json                     # Root TypeScript config
├── eslint.config.js                  # Root ESLint config
├── prettier.config.js                # Prettier configuration
├── docker-compose.yml                # Local development stack
├── Makefile                          # Common development commands
├── LICENSE
└── README.md
```

### 4.3 Package Naming Conventions

| Pattern | Examples | Purpose |
|---------|----------|---------|
| `@aasop/*` | `@aasop/types`, `@aasop/utils` | Shared internal packages |
| `@aasop/sdk-*` | `@aasop/sdk-node`, `@aasop/sdk-python` | Client SDKs |
| `@aasop/config-*` | `@aasop/config-eslint`, `@aasop/config-ts` | Shared configurations |
| `@aasop/svc-*` | `@aasop/svc-auth`, `@aasop/svc-agent` | Service-specific packages |
| `@aasop/connector-*` | `@aasop/connector-llm`, `@aasop/connector-git` | External connectors |
| `@aasop/protocol-*` | `@aasop/protocol-mcp`, `@aasop/protocol-a2a` | Protocol implementations |

### 4.4 Dependency Boundaries

```
+================================================================================+
|                    DEPENDENCY BOUNDARY RULES                                  |
+================================================================================+
|                                                                                |
|  Rule 1: services/* CANNOT import from other services/* directly              |
|          - Must use published SDKs or API calls                                |
|                                                                                |
|  Rule 2: packages/* CANNOT import from services/*                              |
|          - Shared packages must be self-contained                              |
|                                                                                |
|  Rule 3: packages/* CAN import from other packages/*                           |
|          - Form a DAG (no circular dependencies)                               |
|                                                                                |
|  Rule 4: frontend/* CAN import from packages/sdk-* and packages/types          |
|          - Cannot import from services/* or packages/utils                     |
|                                                                                |
|  Rule 5: services/* CAN import from packages/*                                 |
|          - Primary consumers of shared packages                                |
|                                                                                |
|  Rule 6: infra/* is independent, CANNOT import from src code                   |
|          - Infrastructure references published artifacts only                    |
|                                                                                |
+================================================================================+
```

**Enforcement:**
- Custom ESLint rule: `@aasop/no-cross-service-imports`
- Nx dependency graph with `enforce-module-boundaries`
- CI check: `pnpm check:boundaries`

### 4.5 Build Pipeline Overview

```
+================================================================================+
|                         BUILD PIPELINE (Turborepo)                            |
+================================================================================+
|                                                                                |
|  Root Task Graph:                                                              |
|                                                                                |
|  lint ──> typecheck ──> test ──> build ──> docker ──> deploy                 |
|    |          |           |         |          |          |                   |
|    v          v           v         v          v          v                   |
|  eslint    tsc          jest     tsc/vite   docker     helm/kubectl           |
|  prettier  (no emit)    vitest   build     build       apply                  |
|                                                                                |
|  Cache Configuration:                                                          |
|  - lint:       {inputs: ["src/**", "*.config.*"]}                             |
|  - typecheck:  {inputs: ["src/**", "tsconfig.json"]}                          |
|  - test:       {inputs: ["src/**", "tests/**"], outputs: ["coverage/**"]}     |
|  - build:      {inputs: ["src/**"], outputs: ["dist/**"]}                     |
|  - docker:     {inputs: ["dist/**", "Dockerfile"]}                            |
|                                                                                |
|  Remote Caching:                                                               |
|  - Vercel Remote Cache (or self-hosted)                                       |
|  - S3-backed artifact storage                                                  |
|                                                                                |
+================================================================================+
```

**Turborepo Configuration (`turbo.json`):**
```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "globalEnv": ["NODE_ENV", "API_URL", "DATABASE_URL"],
  "pipeline": {
    "lint": {
      "dependsOn": ["^lint"],
      "inputs": ["$TURBO_DEFAULT$", ".eslintrc.*", "prettier.config.*"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"],
      "inputs": ["$TURBO_DEFAULT$", "tsconfig.json"]
    },
    "test": {
      "dependsOn": ["^build", "typecheck"],
      "inputs": ["$TURBO_DEFAULT$", "jest.config.*", "vitest.config.*"],
      "outputs": ["coverage/**"]
    },
    "test:integration": {
      "dependsOn": ["build"],
      "inputs": ["$TURBO_DEFAULT$", "docker-compose.test.yml"],
      "outputs": ["coverage/**"]
    },
    "build": {
      "dependsOn": ["^build", "typecheck"],
      "inputs": ["$TURBO_DEFAULT$"],
      "outputs": ["dist/**", ".next/**", "build/**"]
    },
    "docker:build": {
      "dependsOn": ["build"],
      "inputs": ["dist/**", "Dockerfile"],
      "outputs": ["docker.digest"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

### 4.6 pnpm Workspace Configuration

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'packages/config/*'
  - 'packages/types/*'
  - 'packages/utils/*'
  - 'packages/middleware/*'
  - 'packages/connectors/*'
  - 'packages/protocol/*'
  - 'packages/sdk/*'
  - 'packages/testing/*'
  - 'services/*'
  - 'frontend/*'

catalog:
  # Shared dependency versions
  typescript: '^5.5.0'
  node: '^22.0.0'
  react: '^19.0.0'
  fastify: '^5.0.0'
  prisma: '^5.15.0'
  zod: '^3.23.0'
  vitest: '^2.0.0'
  eslint: '^9.0.0'
  prettier: '^3.3.0'
  turbo: '^2.0.0'

# OnlyBuiltDependencies
onlyBuiltDependencies:
  - '@prisma/client'
  - '@prisma/engines'
  - 'bcrypt'
  - 'sharp'
  - 'esbuild'

# Peer dependency rules
peerDependencyRules:
  ignoreMissing:
    - '@babel/*'
    - 'webpack'
```

---

## 5. Infrastructure Topology

### 5.1 Multi-Environment Architecture

```
+================================================================================+
|                         ENVIRONMENT ARCHITECTURE                              |
+================================================================================+
|                                                                                |
|  +------------------+  +------------------+  +------------------+             |
|  |  DEVELOPMENT     |  |  STAGING         |  |  PRODUCTION      |             |
|  |                  |  |                  |  |                  |             |
|  |  Purpose:        |  |  Purpose:        |  |  Purpose:        |             |
|  |  Local dev,      |  |  Pre-prod        |  |  Live workloads  |             |
|  |  feature testing |  |  validation,     |  |  serving users   |             |
|  |                  |  |  integration     |  |                  |             |
|  |                  |  |  testing         |  |                  |             |
|  |  Scale:          |  |  Scale:          |  |  Scale:          |             |
|  |  1-2 replicas    |  |  2-3 replicas    |  |  3+ replicas,    |             |
|  |  per service     |  |  per service     |  |  auto-scaling    |             |
|  |                  |  |                  |  |                  |             |
|  |  Data:           |  |  Data:           |  |  Data:           |             |
|  |  Local Docker    |  |  Persistent,     |  |  Persistent,     |             |
|  |  volumes,        |  |  refreshed from  |  |  backed up,      |             |
|  |  seeded data     |  |  prod anonymized |  |  point-in-time   |             |
|  |                  |  |                  |  |  recovery        |             |
|  |  Access:         |  |  Access:         |  |  Access:         |             |
|  |  Developer local |  |  QA, PM,         |  |  End users,      |             |
|  |  or shared dev   |  |  stakeholders    |  |  production      |             |
|  |  cluster         |  |                  |  |  traffic         |             |
|  |                  |  |                  |  |                  |             |
|  |  Branch:         |  |  Branch:         |  |  Branch:         |             |
|  |  feature/*       |  |  main (after PR) |  |  release/*       |             |
|  |                  |  |                  |  |  (tagged)        |             |
|  |  Cost:           |  |  Cost:           |  |  Cost:           |             |
|  |  Minimal (local) |  |  ~30% of prod    |  |  Full production |             |
|  |  or shared       |  |                  |  |  workloads       |             |
|  +------------------+  +------------------+  +------------------+             |
|                                                                                |
|  Promotion Flow:                                                               |
|  feature/* --> PR review --> merge to main --> staging deploy -->              |
|  automated tests --> promote to release/* --> production deploy                |
|                                                                                |
+================================================================================+
```

### 5.2 Network Topology

#### 5.2.1 VPC Architecture (per environment)

```
+================================================================================+
|                     VPC ARCHITECTURE (Production Example)                      |
+================================================================================+
|                                                                                |
|  VPC: 10.0.0.0/16 (65536 IPs)                                                  |
|                                                                                |
|  +------------------+------------------+------------------+                   |
|  |  AZ-A            |  AZ-B            |  AZ-C            |                   |
|  |  10.0.0.0/20     |  10.0.16.0/20    |  10.0.32.0/20    |                   |
|  |                  |                  |                  |                   |
|  |  Public Subnet:  |  Public Subnet:  |  Public Subnet:  |                   |
|  |  10.0.1.0/24     |  10.0.17.0/24    |  10.0.33.0/24    |                   |
|  |                  |                  |                  |                   |
|  |  - NAT Gateway   |  - NAT Gateway   |  - NAT Gateway   |                   |
|  |  - Bastion Host  |  - Bastion Host  |  - Bastion Host  |                   |
|  |  - ALB (public)  |  - ALB (public)  |  - ALB (public)  |                   |
|  |                  |                  |                  |                   |
|  |  Private Subnet: |  Private Subnet: |  Private Subnet: |                   |
|  |  10.0.2.0/22     |  10.0.18.0/22    |  10.0.34.0/22    |                   |
|  |  (1024 IPs)      |  (1024 IPs)      |  (1024 IPs)      |                   |
|  |                  |                  |                  |                   |
|  |  - EKS Worker    |  - EKS Worker    |  - EKS Worker    |                   |
|  |    Nodes         |    Nodes         |    Nodes         |                   |
|  |  - Application   |  - Application   |  - Application   |                   |
|  |    Pods          |    Pods          |    Pods          |                   |
|  |                  |                  |                  |                   |
|  |  Data Subnet:    |  Data Subnet:    |  Data Subnet:    |                   |
|  |  10.0.6.0/23     |  10.0.22.0/23    |  10.0.38.0/23    |                   |
|  |  (512 IPs)       |  (512 IPs)       |  (512 IPs)       |                   |
|  |                  |                  |                  |                   |
|  |  - RDS (PostgreSQL)               |  - RDS (replica)   |                   |
|  |  - ElastiCache (Redis)            |  - ElastiCache     |                   |
|  |  - DocumentDB (MongoDB)           |  - DocumentDB      |                   |
|  |                                   |    (replica)       |                   |
|  |                  |                  |                  |                   |
|  |  GPU Subnet:     |  GPU Subnet:     |  GPU Subnet:     |                   |
|  |  10.0.8.0/22     |  10.0.24.0/22    |  10.0.40.0/22    |                   |
|  |                  |                  |                  |                   |
|  |  - GPU Nodes     |  - GPU Nodes     |  - GPU Nodes     |                   |
|  |  - vLLM Pods     |  - vLLM Pods     |  - vLLM Pods     |                   |
|  |  - Ray Worker    |  - Ray Worker    |  - Ray Worker    |                   |
|  |                  |                  |                  |                   |
|  |  Sandbox Subnet: |  Sandbox Subnet: |  Sandbox Subnet: |                   |
|  |  10.0.12.0/22    |  10.0.28.0/22    |  10.0.44.0/22    |                   |
|  |                  |                  |                  |                   |
|  |  - Firecracker   |  - Firecracker   |  - Firecracker   |                   |
|  |    Nodes         |    Nodes         |    Nodes         |                   |
|  |  - microVMs      |  - microVMs      |  - microVMs      |                   |
|  |                  |                  |                  |                   |
|  +------------------+------------------+------------------+                   |
|                                                                                |
|  Network Flow:                                                                 |
|  Internet -> CloudFront -> ALB (public subnet) -> EKS pods (private)          |
|  Pods -> NAT Gateway -> Internet (for external APIs)                          |
|  Pods -> VPC Endpoints -> AWS Services (S3, DynamoDB, etc.)                   |
|  Pods -> Security Groups -> RDS/Cache/DocumentDB (data subnet)                |
|  GPU Nodes -> VPC Peering -> S3 (model weights)                               |
|                                                                                |
|  Security Groups:                                                              |
|  - Public ALB: Allow 443 from CloudFront only                                 |
|  - EKS Nodes: Allow from ALB, inter-node, control plane only                  |
|  - Data Layer: Allow from EKS nodes only (port-specific)                      |
|  - GPU Nodes: Allow from EKS nodes + model-router only                        |
|  - Sandbox: Deny all inbound, allow outbound via NAT only                     |
|                                                                                |
+================================================================================+
```

### 5.3 Kubernetes Cluster Design

#### 5.3.1 Cluster Overview

```
+================================================================================+
|                         EKS CLUSTER ARCHITECTURE                               |
+================================================================================+
|                                                                                |
|  Cluster: aasop-prod-<region>                                                  |
|  Kubernetes Version: 1.30+                                                     |
|  Networking: VPC CNI with custom networking                                    |
|  Service Mesh: Istio 1.22+                                                     |
|                                                                                |
|  +------------------+  +------------------+  +------------------+             |
|  |  Control Plane   |  |  Addons          |  |  Node Groups     |             |
|  |  (Managed by AWS)|  |                  |  |                  |             |
|  |                  |  |  - CoreDNS       |  |  1. System       |             |
|  |  - 3 AZs         |  |  - kube-proxy    |  |  2. General      |             |
|  |  - Auto-scaling  |  |  - VPC CNI       |  |  3. Memory       |             |
|  |  - API server HA |  |  - EBS CSI       |  |  4. CPU          |             |
|  |                  |  |  - EFS CSI       |  |  5. GPU          |             |
|  |                  |  |  - S3 CSI        |  |  6. Sandbox      |             |
|  |                  |  |  - Cluster Autoscaler          |  7. Observability |             |
|  |                  |  |  - AWS Load Balancer Controller|  8. Spot          |             |
|  |                  |  |  - NVIDIA GPU Operator         |                  |             |
|  |                  |  |  - Istio Ingress Gateway       |                  |             |
|  |                  |  |  - Cert Manager                |                  |             |
|  |                  |  |  - External DNS                |                  |             |
|  |                  |  |  - Karpenter                   |                  |             |
|  +------------------+  +------------------+  +------------------+             |
|                                                                                |
|  Node Group Specifications:                                                    |
|                                                                                |
|  +------------------+ +------------------+ +------------------+               |
|  | System (NG-1)    | | General (NG-2)   | | Memory (NG-3)    |               |
|  |                  | |                  | |                  |               |
|  |  Instance:       | |  Instance:       | |  Instance:       |               |
|  |  m6i.xlarge      | |  m6i.2xlarge     | |  r6i.2xlarge     |               |
|  |                  | |                  | |                  |               |
|  |  vCPU: 4         | |  vCPU: 8         | |  vCPU: 8         |               |
|  |  Memory: 16GB    | |  Memory: 32GB    | |  Memory: 64GB    |               |
|  |  Nodes: 3        | |  Nodes: 3-20     | |  Nodes: 2-10     |               |
|  |  (fixed)         | |  (auto-scale)    | |  (auto-scale)    |               |
|  |                  | |                  | |                  |               |
|  |  Workloads:      | |  Workloads:      | |  Workloads:      |               |
|  |  - Istio control | |  - API services  | |  - Agent Runtime |               |
|  |  - CoreDNS       | |  - Auth          | |  - Memory Service|               |
|  |  - Monitoring    | |  - Project       | |  - Realtime      |               |
|  |    agents        | |  - User          | |  - Vector search |               |
|  |                  | |  - Billing       | |                  |               |
|  |  Taints: none    | |  - Notification  | |  Taints:         |               |
|  |                  | |  - Audit         | |  memory=optimized|               |
|  |                  | |  - MCP Registry  | |  :NoSchedule     |               |
|  |                  | |                  | |                  |               |
|  |                  | |  Taints: none    | |  Labels:         |               |
|  |                  | |                  | |  workload=memory |               |
|  +------------------+ +------------------+ +------------------+               |
|                                                                                |
|  +------------------+ +------------------+ +------------------+               |
|  | CPU (NG-4)       | | GPU (NG-5)       | | Sandbox (NG-6)   |               |
|  |                  | |                  | |                  |               |
|  |  Instance:       | |  Instance:       | |  Instance:       |               |
|  |  c6i.2xlarge     | |  p4d.24xlarge    | |  c6i.4xlarge     |               |
|  |                  | |  (or g6e.xlarge) | |                  |               |
|  |  vCPU: 8         | |                  | |  vCPU: 16        |               |
|  |  Memory: 16GB    | |  vCPU: 96        | |  Memory: 32GB    |               |
|  |  Nodes: 2-15     | |  Memory: 1.1TB   | |  Nodes: 3-50     |               |
|  |                  | |  GPU: 8x A100    | |  (auto-scale)    |               |
|  |  Workloads:      | |  Nodes: 2-10     | |                  |               |
|  |  - Model Router  | |  (auto-scale)    | |  Workloads:      |               |
|  |  - Workflow      | |                  | |  - Firecracker   |               |
|  |    Engine        | |  Workloads:      | |    microVMs      |               |
|  |  - Task          | |  - vLLM          | |  - Sandbox       |               |
|  |    Scheduler     | |  - Ray Serve     | |    Manager       |               |
|  |  - Event Bus     | |  - Custom        | |                  |               |
|  |    workers       | |    inference     | |  Taints:         |               |
|  |                  | |                  | |  sandbox=enabled |               |
|  |  Taints:         | |  Taints:         | |  :NoSchedule     |               |
|  |  cpu=optimized   | |  nvidia.com/gpu  | |                  |               |
|  |  :NoSchedule     | |  :NoSchedule     | |  Labels:         |               |
|  |                  | |                  | |  workload=sandbox|               |
|  |  Labels:         | |  Labels:         | |                  |               |
|  |  workload=cpu    | |  workload=gpu    | |  Security:       |               |
|  |                  | |                  | |  - gVisor        |               |
|  |                  | |  MIG Config:     | |  - Seccomp       |               |
|  |                  | |  - 7g.40gb x 1   | |  - AppArmor      |               |
|  |                  | |  - 3g.20gb x 2   | |  - No root       |               |
|  |                  | |  - 2g.10gb x 3   | |                  |               |
|  +------------------+ +------------------+ +------------------+               |
|                                                                                |
|  +------------------+ +------------------+                                     |
|  | Observability    | | Spot (NG-8)      |                                     |
|  | (NG-7)           | |                  |                                     |
|  |                  | |  Mixed instances |                                     |
|  |  Instance:       | |  (Spot fleet)    |                                     |
|  |  m6i.2xlarge     | |                  |                                     |
|  |                  | |  Discount:       |                                     |
|  |  Nodes: 3        | |  ~70% off        |                                     |
|  |  (fixed)         | |                  |                                     |
|  |                  | |  Workloads:      |                                     |
|  |  Workloads:      | |  - Batch jobs    |                                     |
|  |  - Prometheus    | |  - Analytics     |                                     |
|  |  - Grafana       | |  - Non-critical  |                                     |
|  |  - Loki          | |  - CI runners    |                                     |
|  |  - Tempo         | |                  |                                     |
|  |  - Jaeger        | |  Taints:         |                                     |
|  |                  | |  spot=true       |                                     |
|  |  Taints:         | |  :NoSchedule     |                                     |
|  |  observability   | |                  |                                     |
|  |  :NoSchedule     | |  Labels:         |                                     |
|  |                  | |  spot=true       |                                     |
|  +------------------+ +------------------+                                     |
|                                                                                |
+================================================================================+
```

#### 5.3.2 Pod Resource Specifications

| Service | CPU Request | CPU Limit | Memory Request | Memory Limit | Node Selector |
|---------|------------|-----------|----------------|--------------|---------------|
| API Gateway | 500m | 2000m | 512Mi | 2Gi | general |
| Auth Service | 500m | 2000m | 1Gi | 4Gi | general |
| Agent Runtime | 1000m | 4000m | 4Gi | 16Gi | memory |
| Workflow Engine | 500m | 2000m | 2Gi | 8Gi | cpu |
| Memory Service | 1000m | 4000m | 8Gi | 32Gi | memory |
| Model Router | 1000m | 4000m | 2Gi | 8Gi | cpu |
| Inference Cluster | 4000m | 16000m | 32Gi | 128Gi | gpu |
| Sandbox Manager | 500m | 2000m | 1Gi | 4Gi | sandbox |
| Observability | 2000m | 8000m | 8Gi | 32Gi | observability |
| Realtime Service | 500m | 2000m | 2Gi | 8Gi | memory |
| Voice Service | 1000m | 4000m | 4Gi | 16Gi | memory |
| WebSocket Gateway | 1000m | 4000m | 2Gi | 8Gi | cpu |
| Task Scheduler | 250m | 1000m | 512Mi | 2Gi | general |
| Event Bus | 2000m | 8000m | 4Gi | 16Gi | cpu |
| Notification Service | 250m | 1000m | 512Mi | 2Gi | general |
| Project Service | 250m | 1000m | 512Mi | 2Gi | general |
| User Service | 250m | 1000m | 512Mi | 2Gi | general |
| Billing Service | 500m | 2000m | 1Gi | 4Gi | general |
| Audit Service | 250m | 1000m | 512Mi | 2Gi | general |
| MCP Registry | 250m | 1000m | 512Mi | 2Gi | general |

### 5.4 Database Topology

#### 5.4.1 PostgreSQL Cluster

```
+================================================================================+
|                     POSTGRESQL HIGH AVAILABILITY TOPOLOGY                      |
+================================================================================+
|                                                                                |
|  +------------------+     +------------------+     +------------------+       |
|  |  Primary (AZ-A)  |<--->|  Replica 1 (AZ-B)|     |  Replica 2 (AZ-C)|       |
|  |                  |     |  (Hot Standby)   |     |  (Hot Standby)   |       |
|  |  - Write ops     |     |  - Read ops      |     |  - Read ops      |       |
|  |  - Sync repl to  |     |  - Failover      |     |  - Failover      |       |
|  |    replicas      |     |    target        |     |    target        |       |
|  |                  |     |                  |     |                  |       |
|  |  Instance:       |     |  Instance:       |     |  Instance:       |       |
|  |  db.r6g.2xlarge  |     |  db.r6g.xlarge   |     |  db.r6g.xlarge   |       |
|  |                  |     |                  |     |                  |       |
|  |  Storage:        |     |  Storage:        |     |  Storage:        |       |
|  |  500GB GP3       |     |  500GB GP3       |     |  500GB GP3       |       |
|  |  IOPS: 3000      |     |  IOPS: 3000      |     |  IOPS: 3000      |       |
|  |                  |     |                  |     |                  |       |
|  |  Backup:         |     |                  |     |                  |       |
|  |  - Automated     |     |                  |     |                  |       |
|  |  - 35-day       |     |                  |     |                  |       |
|  |    retention     |     |                  |     |                  |       |
|  |  - Cross-region  |     |                  |     |                  |       |
|  |    snapshots     |     |                  |     |                  |       |
|  +------------------+     +------------------+     +------------------+       |
|           |                        |                        |                  |
|           |                        v                        |                  |
|           |              +------------------+               |                  |
|           |              |  HAProxy /       |               |                  |
|           |              |  PgBouncer       |               |                  |
|           |              |                  |               |                  |
|           |              |  - Connection    |               |                  |
|           |              |    pooling       |               |                  |
|           |              |  - Read/write    |               |                  |
|           |              |    splitting     |               |                  |
|           |              |  - Health checks |               |                  |
|           |              +--------+---------+               |                  |
|           |                       |                          |                  |
|           |                       v                          |                  |
|           |              +------------------+               |                  |
|           |              |  Applications    |               |                  |
|           |              |  (EKS pods)      |               |                  |
|           |              +------------------+               |                  |
|           |                                                   |                  |
|           +<---------- Streaming Replication (async) -------->+                  |
|                                                                                |
|  Failover:                                                                     |
|  - Patroni manages leader election                                             |
|  - Automatic failover on primary failure (< 30s)                              |
|  - Application reconnects via HAProxy (no config change)                       |
|                                                                                |
+================================================================================+
```

#### 5.4.2 Database Sharding Strategy

| Database | Sharding Key | Shards | Justification |
|----------|-------------|--------|---------------|
| PostgreSQL (Primary) | `organization_id` | 1 (initial) | Single source of truth, replicas for read scaling |
| ClickHouse | `organization_id`, `date` | 12 (monthly) | Time-series partitioning, efficient rollups |
| MongoDB | `project_id` | 1 (initial) | Flexible schema, replica set for HA |
| Weaviate | `collection` | 1 (initial) | Vector search, scales vertically first |
| Redis | `hash slot` (built-in) | 3 nodes + 3 replicas | Built-in cluster mode |
| OpenSearch | `index prefix` | Monthly indices | Time-based index rotation |
| Kafka | `key hash` | 12-48 partitions | Partition-based parallelism |

### 5.5 Message Queue and Cache Clusters

#### 5.5.1 Kafka Cluster

| Component | Specification |
|-----------|--------------|
| Version | Apache Kafka 3.7 (KRaft mode) |
| Brokers | 6 (2 per AZ) |
| Instance Type | r6g.2xlarge |
| Storage | 2TB GP3 per broker |
| Partitions | 12-48 per topic (auto-scaling) |
| Replication Factor | 3 |
| Min ISR | 2 |
| Retention | Configurable per topic (7 days - 1 year) |
| Tiered Storage | S3 for older segments |

#### 5.5.2 Redis Cluster

| Component | Specification |
|-----------|--------------|
| Version | Redis 7.1 (Valkey fork optional) |
| Nodes | 6 (3 master + 3 replica) |
| Instance Type | cache.r6g.xlarge |
| Memory | 26GB per node |
| Persistence | AOF every second + RDB snapshots |
| Eviction | allkeys-lru |
| Multi-AZ | Yes, replicas in different AZs |
| Auto-failover | Yes (< 30s) |

#### 5.5.3 RabbitMQ Cluster (Task Queues)

| Component | Specification |
|-----------|--------------|
| Version | RabbitMQ 3.13 + Erlang 26 |
| Nodes | 3 (quorum queues) |
| Instance Type | m6g.large |
| Storage | 100GB EBS |
| Queue Type | Quorum queues (replicated) |
| Dead Letter | Configured per queue |
| TTL | Per-message and per-queue |

### 5.6 Storage Architecture

```
+================================================================================+
|                         STORAGE ARCHITECTURE                                   |
+================================================================================+
|                                                                                |
|  +------------------+  +------------------+  +------------------+             |
|  |  Object Storage  |  |  Block Storage   |  |  File Storage    |             |
|  |  (S3 / MinIO)    |  |  (EBS)           |  |  (EFS)           |             |
|  |                  |  |                  |  |                  |             |
|  |  Buckets:        |  |  Volumes:        |  |  Access Points:  |             |
|  |                  |  |                  |  |                  |             |
|  |  aasop-artifacts |  |  pvc-postgres-*  |  |  /shared-temp    |             |
|  |  - Build outputs |  |  (StatefulSet)   |  |  - Cross-pod     |             |
|  |  - Releases      |  |                  |  |    scratch space |             |
|  |                  |  |  pvc-mongodb-*   |  |                  |             |
|  |  aasop-snapshots |  |  (StatefulSet)   |  |  /code-repos     |             |
|  |  - Sandbox snaps |  |                  |  |  - Shared repo   |             |
|  |  - VM images     |  |  pvc-kafka-*     |  |    cache         |             |
|  |                  |  |  (StatefulSet)   |  |                  |             |
|  |  aasop-models    |  |                  |  |  /model-cache    |             |
|  |  - Model weights |  |  pvc-redis-*     |  |  - Shared model  |             |
|  |  - Checkpoints   |  |  (StatefulSet)   |  |    weights       |             |
|  |                  |  |                  |  |                  |             |
|  |  aasop-logs      |  |  pvc-temporal-*  |  |                  |             |
|  |  - Audit logs    |  |  (StatefulSet)   |  |                  |             |
|  |  - Access logs   |  |                  |  |                  |             |
|  |                  |  +------------------+  +------------------+             |
|  |  aasop-docs      |                                                          |
|  |  - Documents     |                                                          |
|  |  - Static assets |                                                          |
|  |                  |                                                          |
|  |  aasop-telemetry |                                                          |
|  |  - Metrics       |                                                          |
|  |  - Traces        |                                                          |
|  |  - Long-term     |                                                          |
|  |    storage       |                                                          |
|  |                  |                                                          |
|  |  Lifecycle:      |                                                          |
|  |  - Standard: 90d |                                                          |
|  |  - IA: 1 year    |                                                          |
|  |  - Glacier: 7yr  |                                                          |
|  |    (audit)       |                                                          |
|  +------------------+                                                          |
|                                                                                |
|  +------------------+                                                          |
|  |  CDN (S3 +       |                                                          |
|  |  CloudFront)     |                                                          |
|  |                  |                                                          |
|  |  Origins:        |                                                          |
|  |  - aasop-web-app |                                                          |
|  |  - aasop-docs    |                                                          |
|  |  - aasop-models  |                                                          |
|  |                  |                                                          |
|  |  Features:       |                                                          |
|  |  - Edge caching  |                                                          |
|  |  - Compression   |                                                          |
|  |  - WAF           |                                                          |
|  |  - DDoS          |                                                          |
|  +------------------+                                                          |
|                                                                                |
+================================================================================+
```

### 5.7 Service Mesh (Istio)

```
+================================================================================+
|                         ISTIO SERVICE MESH                                     |
+================================================================================+
|                                                                                |
|  Ingress Gateway (ALB -> Istio Ingress)                                        |
|       |                                                                        |
|       v                                                                        |
|  +------------------+                                                          |
|  |  Virtual Services|  Route by: host, path, headers, weight                   |
|  +------------------+                                                          |
|       |                                                                        |
|       v                                                                        |
|  +------------------+  +------------------+  +------------------+             |
|  |  Auth Policy     |  |  Rate Limiting   |  |  Circuit Breaker |             |
|  |  - JWT validation|  |  - Per consumer  |  |  - Outlier       |             |
|  |  - mTLS          |  |  - Per route     |  |    detection     |             |
|  +------------------+  +------------------+  +------------------+             |
|       |                                                                        |
|       v                                                                        |
|  +------------------+  +------------------+  +------------------+             |
|  |  Destination     |  |  Traffic Split   |  |  Retry Policy    |             |
|  |  Rules           |  |  - Canary: 5%    |  |  - 3 retries     |             |
|  |  - Load balancing|  |  - Blue/Green    |  |  - Exponential   |             |
|  |  - Subsets       |  |  - A/B testing   |  |    backoff       |             |
|  +------------------+  +------------------+  +------------------+             |
|       |                                                                        |
|       v                                                                        |
|  +--------------------------------------------------------------+             |
|  |  Service-to-Service (mTLS everywhere)                        |             |
|  |                                                              |             |
|  |  [Pod A] <--mTLS--> [Pod B]                                |             |
|  |  Envoy sidecar    Envoy sidecar                             |             |
|  |  - Retry          - AuthZ                                  |             |
|  |  - Timeout        - Metrics                                |             |
|  |  - Circuit break  - Tracing                                |             |
|  +--------------------------------------------------------------+             |
|       |                                                                        |
|       v                                                                        |
|  +------------------+                                                          |
|  |  Egress Gateway  |  Controlled outbound access                              |
|  +------------------+                                                          |
|                                                                                |
|  Observability (Istio-native):                                                 |
|  - Prometheus metrics per service                                              |
|  - Grafana dashboards (service mesh)                                           |
|  - Jaeger traces (automatic)                                                   |
|  - Kiali (service graph visualization)                                         |
|                                                                                |
+================================================================================+
```

### 5.8 DNS and External Access

| Domain | Purpose | Routing |
|--------|---------|---------|
| `api.aasop.io` | API Gateway | ALB -> EKS Istio Ingress |
| `app.aasop.io` | Web Application | CloudFront -> S3 + API fallback |
| `ws.aasop.io` | WebSocket Gateway | NLB -> EKS WebSocket pods |
| `voice.aasop.io` | Voice (LiveKit) | NLB -> LiveKit pods |
| `agents.aasop.io` | Agent streaming | NLB -> Realtime service |
| `grafana.aasop.internal` | Monitoring | VPN/Zero Trust only |
| `vault.aasop.internal` | Secrets management | VPN/Zero Trust only |

### 5.9 Multi-Region Considerations

```
+================================================================================+
|                      MULTI-REGION ARCHITECTURE                                 |
+================================================================================+
|                                                                                |
|  Primary Region: us-east-1                                                     |
|  DR Region: us-west-2                                                          |
|                                                                                |
|  +---------------------------+  +---------------------------+                 |
|  |  us-east-1 (Primary)      |  |  us-west-2 (DR)           |                 |
|  |                           |  |                           |                 |
|  |  - Full stack running     |  |  - Warm standby           |                 |
|  |  - All writes             |  |  - Read replicas          |                 |
|  |  - Active traffic         |  |  - Async replication      |                 |
|  |                           |  |  - Ready for failover     |                 |
|  |  RTO: N/A (primary)       |  |  RTO: < 1 hour            |                 |
|  |  RPO: N/A                 |  |  RPO: < 5 minutes         |                 |
|  |                           |  |                           |                 |
|  |  Data Replication:        |  |  Data Replication:        |                 |
|  |  - PostgreSQL: sync       |  |  - PostgreSQL: async      |                 |
|  |    (within region)        |  |    (cross-region)         |                 |
|  |  - S3: cross-region       |  |  - S3: read-ready         |                 |
|  |    replication            |  |                           |                 |
|  |  - Kafka: MirrorMaker2    |  |  - Kafka: consumer lag    |                 |
|  |    to DR                  |  |    monitored              |                 |
|  |                           |  |                           |                 |
|  +---------------------------+  +---------------------------+                 |
|                                                                                |
|  Failover Procedure:                                                           |
|  1. DNS failover (Route53 health checks)                                       |
|  2. Promote DR PostgreSQL to primary                                           |
|  3. Scale up DR EKS nodes                                                      |
|  4. Redirect traffic via DNS                                                   |
|  5. Verify health via synthetic monitoring                                     |
|                                                                                |
+================================================================================+
```

### 5.10 Security Architecture

| Layer | Control | Implementation |
|-------|---------|----------------|
| Network | VPC isolation | Dedicated VPC per environment |
| Network | Subnet isolation | Public/private/data subnet tiers |
| Network | Security groups | Least-privilege port access |
| Network | Network policies | K8s NetworkPolicy (pod-to-pod) |
| Network | WAF | AWS WAF + custom rules |
| Identity | Authentication | OAuth2/OIDC + API keys + mTLS |
| Identity | Authorization | RBAC + ABAC (OPA) |
| Identity | Secrets | HashiCorp Vault with dynamic secrets |
| Data | Encryption at rest | AES-256 (managed keys) |
| Data | Encryption in transit | TLS 1.3 everywhere |
| Data | Field-level encryption | Vault transit engine |
| Application | Container security | Distroless images, non-root |
| Application | Runtime security | Falco (syscall monitoring) |
| Application | Vulnerability scanning | Trivy + Snyk |
| Audit | Logging | Immutable audit log (S3 WORM) |
| Audit | Compliance | SOC2, GDPR, HIPAA controls |

---

## 6. CI/CD Pipeline

### 6.1 Pipeline Overview

```
+================================================================================+
|                         CI/CD PIPELINE ARCHITECTURE                            |
+================================================================================+
|                                                                                |
|  Source Control (GitHub)                                                       |
|       |                                                                        |
|       | Push / PR                                                              |
|       v                                                                        |
|  +------------------+                                                          |
|  |  CI Pipeline     |  (.github/workflows/ci.yml)                              |
|  |                  |                                                          |
|  |  1. Lint         |  ESLint, Prettier, Go vet, shellcheck                   |
|  |  2. Type Check   |  TypeScript compiler, Go build, mypy                    |
|  |  3. Unit Tests   |  Jest/Vitest, Go test, pytest                          |
|  |  4. Security     |  Snyk, Trivy scan, secret detection                    |
|  |  5. Build        |  Compile, bundle, generate artifacts                    |
|  |  6. Integration  |  Testcontainers, Docker Compose tests                   |
|  |     Tests        |                                                          |
|  |  7. Coverage     |  Upload to Codecov (80% threshold)                      |
|  |  8. Build        |  Docker image build + push to ECR                       |
|  |     Artifacts    |                                                          |
|  +------------------+                                                          |
|       |                                                                        |
|       | PR merged to main                                                      |
|       v                                                                        |
|  +------------------+                                                          |
|  |  Staging Deploy  |  (.github/workflows/cd-staging.yml)                     |
|  |                  |                                                          |
|  |  1. Version Bump |  Semantic versioning                                     |
|  |  2. Build Images |  Multi-arch (amd64, arm64)                               |
|  |  3. Deploy to    |  Helm upgrade --install                                   |
|  |     Staging      |                                                          |
|  |  4. Smoke Tests  |  Health checks, basic functionality                      |
|  |  5. E2E Tests    |  Playwright full suite                                   |
|  |  6. Performance  |  k6 load tests                                           |
|  |     Tests        |                                                          |
|  |  7. Approval     |  Auto-approve or manual gate                             |
|  +------------------+                                                          |
|       |                                                                        |
|       | Tag release/*, manual approval                                           |
|       v                                                                        |
|  +------------------+                                                          |
|  |  Production      |  (.github/workflows/cd-production.yml)                  |
|  |  Deploy          |                                                          |
|  |                  |                                                          |
|  |  1. Canary (5%)  |  Deploy to canary subset                                  |
|  |  2. Monitor      |  Error rate, latency, custom metrics                     |
|  |  3. Canary (25%) |  Gradual increase                                        |
|  |  4. Canary (50%) |  Monitor                                                 |
|  |  5. Full (100%)  |  Complete rollout                                        |
|  |  6. Verify       |  Synthetic monitoring                                    |
|  |  7. Notify       |  Slack notification                                      |
|  +------------------+                                                          |
|       |                                                                        |
|       | (If issues detected)                                                   |
|       v                                                                        |
|  +------------------+                                                          |
|  |  Rollback        |  Automatic or one-click                                  |
|  |                  |                                                          |
|  |  1. Detect       |  Error rate > threshold                                   |
|  |  2. Alert        |  PagerDuty + Slack                                       |
|  |  3. Pause        |  Halt rollout                                            |
|  |  4. Rollback     |  helm rollback <release> <revision>                      |
|  |  5. Verify       |  Confirm health                                          |
|  |  6. Post-mortem  |  Create incident record                                  |
|  +------------------+                                                          |
|                                                                                |
+================================================================================+
```

### 6.2 Branching Strategy

```
+================================================================================+
|                         BRANCHING STRATEGY                                     |
+================================================================================+
|                                                                                |
|  main ---------------------------------------------------------------------->  |
|  |  (protected, deploys to staging)                                             |
|  |                                                                              |
|  +-- release/v1.2.0 (from main, deploys to production)                        |
|  |      |                                                                       |
|  |      +-- hotfix/security-patch (cherry-pick to main too)                   |
|  |                                                                              |
|  +-- feature/agent-memory-v2                                                  |
|  |      |                                                                       |
|  |      +-- developer-work (local, force push OK)                              |
|  |                                                                              |
|  +-- feature/workflow-saga-pattern                                            |
|  |                                                                              |
|  +-- bugfix/model-router-timeout                                              |
|  |                                                                              |
|  +-- refactor/observability-collector                                         |
|                                                                                |
|  Conventions:                                                                  |
|  - main: always deployable, protected                                          |
|  - feature/*: feature branches, squash merge to main                           |
|  - bugfix/*: bug fix branches                                                  |
|  - hotfix/*: production emergency fixes, merge to both main and release        |
|  - release/*: production deployment branches, tagged                           |
|  - refactor/*: non-functional changes                                          |
|                                                                                |
|  Pull Request Requirements:                                                    |
|  - 2 approvals (1 senior for core services)                                    |
|  - CI checks passing                                                           |
|  - No merge conflicts                                                          |
|  - Up-to-date with main                                                        |
|  - Squash merge (clean history)                                                |
|                                                                                |
+================================================================================+
```

### 6.3 Automated Testing Strategy

| Test Type | Scope | When | Tools | Threshold |
|-----------|-------|------|-------|-----------|
| Unit Tests | Individual functions/classes | Every push | Jest/Vitest, Go test, pytest | 80% coverage |
| Integration Tests | Service + dependencies | PR | Testcontainers, Docker Compose | All pass |
| Contract Tests | API consumer/provider | PR | Pact | All pass |
| E2E Tests | Full user flows | Staging deploy | Playwright | All pass |
| Performance Tests | Load, stress | Staging | k6 | SLA targets |
| Security Tests | Vulnerabilities | Every push | Snyk, Trivy, OWASP ZAP | 0 critical |
| Chaos Tests | Failure injection | Weekly | Litmus, Chaos Mesh | Recovery < 5min |

### 6.4 Deployment Promotion Flow

```
+================================================================================+
|                     DEPLOYMENT PROMOTION FLOW                                  |
+================================================================================+
|                                                                                |
|  Developer pushes feature branch                                               |
|       |                                                                        |
|       v                                                                        |
|  +------------------+  CI runs (lint, test, build)                              |
|  |  PR to main      |                                                          |
|  |  (code review)   |                                                          |
|  +------------------+                                                          |
|       |                                                                        |
|       v                                                                        |
|  +------------------+  Auto-deploy to staging                                   |
|  |  Merge to main   |  Smoke tests + E2E tests                                  |
|  +------------------+                                                          |
|       |                                                                        |
|       | (manual or scheduled)                                                  |
|       v                                                                        |
|  +------------------+  Semantic version tag                                    |
|  |  Create release  |  Release notes generated                                  |
|  |  branch          |                                                          |
|  +------------------+                                                          |
|       |                                                                        |
|       | (manual approval required)                                             |
|       v                                                                        |
|  +------------------+  Canary: 5% -> 25% -> 50% -> 100%                         |
|  |  Deploy to       |  Automated rollback on error threshold                    |
|  |  production      |                                                          |
|  +------------------+                                                          |
|       |                                                                        |
|       v                                                                        |
|  +------------------+  Synthetic monitoring validates                            |
|  |  Post-deploy     |  Notify on Slack                                          |
|  |  verification    |  Update runbook if needed                                  |
|  +------------------+                                                          |
|                                                                                |
+================================================================================+
```

### 6.5 Rollback Procedures

| Scenario | Detection | Rollback Action | Time to Recover |
|----------|-----------|-----------------|-----------------|
| Deployment error | Automated canary analysis | `helm rollback` to previous revision | < 2 minutes |
| Database migration failure | Migration script error | Rollback migration, restore from snapshot | < 15 minutes |
| Infrastructure failure | Health check failures | Failover to standby (RDS, Redis) | < 5 minutes |
| Dependency failure | Circuit breaker open | Disable feature flag, queue requests | < 1 minute |
| Security incident | Anomaly detection | Isolate service, revoke tokens | < 10 minutes |
| Data corruption | Integrity check failures | Point-in-time recovery from backup | < 30 minutes |

**Rollback Checklist:**
1. Alert on-call engineer (PagerDuty)
2. Assess impact and severity
3. Execute rollback (automated for deployments)
4. Verify service health
5. Notify stakeholders (Slack #incidents)
6. Create incident record
7. Schedule post-mortem (within 24 hours)
8. Document learnings

### 6.6 Infrastructure as Code Integration

| Layer | Tool | State Management | Pipeline Integration |
|-------|------|-----------------|---------------------|
| Cloud Resources | Terraform | S3 backend + DynamoDB locking | `terraform plan` in PR, `apply` on merge |
| Kubernetes Resources | Helm + Kustomize | Git (GitOps) | ArgoCD syncs from git |
| Policy Enforcement | OPA/Gatekeeper | ConfigMap | Automated admission control |
| Secrets | External Secrets Operator | Vault | Automatic sync from Vault to K8s secrets |
| Networking | Terraform + Istio CRDs | Git + S3 | Terraform for AWS, GitOps for Istio |

### 6.7 Security Scanning Integration

| Scan Type | Tool | When | Failure Condition |
|-----------|------|------|-------------------|
| SAST (Static) | SonarQube + Semgrep | Every push | High/Critical issues |
| SCA (Dependencies) | Snyk + npm audit | Every push | Known CVEs in dependencies |
| Container Scan | Trivy | Image build | CVEs with fix available |
| Secret Detection | GitLeaks + TruffleHog | Every push | Any secret detected |
| DAST (Dynamic) | OWASP ZAP | Staging | High/Critical vulnerabilities |
| IaC Scan | Checkov + tfsec | PR | Security misconfigurations |
| License Scan | FOSSA | PR | Prohibited licenses |

### 6.8 Performance Regression Testing

| Test Type | Tool | Scenario | Thresholds |
|-----------|------|----------|------------|
| Load Test | k6 | 1000 concurrent users | P95 < 500ms |
| Stress Test | k6 | Up to 10,000 users | Identify breaking point |
| Soak Test | k6 | 1000 users for 24h | No memory leaks |
| Spike Test | k6 | 0 to 5000 users in 10s | Recovery < 30s |
| Inference Benchmark | Custom | 1000 req/s to model router | P95 < 100ms routing |
| Sandbox Benchmark | Custom | 100 concurrent sandboxes | Creation < 200ms |
| End-to-End | Playwright | Full agent task | Completion < 5 minutes |

### 6.9 Pipeline Configuration Files

#### 6.9.1 Main CI Pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, release/*]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  changes:
    runs-on: ubuntu-latest
    outputs:
      services: ${{ steps.filter.outputs.changes }}
    steps:
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            api-gateway: services/api-gateway/**
            auth-service: services/auth-service/**
            agent-runtime: services/agent-runtime/**
            workflow-engine: services/workflow-engine/**
            memory-service: services/memory-service/**
            model-router: services/model-router/**
            sandbox-manager: services/sandbox-manager/**
            web-app: frontend/web-app/**

  lint:
    needs: changes
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup-node-pnpm
      - run: pnpm lint --filter=[HEAD^1]

  typecheck:
    needs: changes
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup-node-pnpm
      - run: pnpm typecheck --filter=[HEAD^1]

  test:
    needs: [lint, typecheck]
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: ${{ fromJson(needs.changes.outputs.services) }}
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup-node-pnpm
      - run: pnpm test --filter ${{ matrix.service }}
      - uses: codecov/codecov-action@v4
        with:
          files: ./services/${{ matrix.service }}/coverage/lcov.info

  security-scan:
    needs: changes
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Snyk Scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
      - name: Trivy Scan
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          format: 'sarif'
          output: 'trivy-results.sarif'
      - name: Secret Detection
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: main

  build-images:
    needs: [test, security-scan]
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: ${{ fromJson(needs.changes.outputs.services) }}
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/build-service
        with:
          service: ${{ matrix.service }}
          push: ${{ github.ref == 'refs/heads/main' }}
          registry: ${{ secrets.ECR_REGISTRY }}

  integration-tests:
    needs: build-images
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker compose -f docker-compose.test.yml up --abort-on-container-exit
      - run: pnpm test:integration
```

#### 6.9.2 Production Deployment Pipeline

```yaml
# .github/workflows/cd-production.yml
name: Deploy to Production

on:
  push:
    tags: ['v*']
  workflow_dispatch:
    inputs:
      version:
        required: true
        description: 'Version to deploy'
      canary_percentage:
        required: true
        default: '5'
        description: 'Initial canary percentage'

jobs:
  deploy-canary-5:
    runs-on: ubuntu-latest
    environment: production-canary
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/deploy-k8s
        with:
          environment: production
          version: ${{ github.ref_name }}
          canary: 5
          registry: ${{ secrets.ECR_REGISTRY }}

  monitor-canary-5:
    needs: deploy-canary-5
    runs-on: ubuntu-latest
    steps:
      - run: |
          sleep 300  # 5 minute observation window
          ./scripts/monitor-canary.sh --threshold-error-rate=0.01

  deploy-canary-25:
    needs: monitor-canary-5
    runs-on: ubuntu-latest
    environment: production-canary
    steps:
      - uses: ./.github/actions/deploy-k8s
        with:
          environment: production
          canary: 25

  deploy-canary-50:
    needs: deploy-canary-25
    runs-on: ubuntu-latest
    environment: production-canary
    steps:
      - uses: ./.github/actions/deploy-k8s
        with:
          environment: production
          canary: 50

  deploy-full:
    needs: deploy-canary-50
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: ./.github/actions/deploy-k8s
        with:
          environment: production
          canary: 100
      - uses: ./.github/actions/notify-slack
        with:
          message: "Production deployment ${{ github.ref_name }} complete"
```

### 6.10 CI/CD Technology Stack

| Component | Technology | Justification |
|-----------|-----------|---------------|
| Source Control | GitHub | Industry standard, Actions ecosystem |
| CI/CD | GitHub Actions | Native integration, matrix builds, reusable workflows |
| Artifact Registry | Amazon ECR | AWS-native, image scanning, lifecycle policies |
| Container Build | Docker BuildKit + cache mounts | Fast, cached, multi-stage builds |
| Package Manager | pnpm | Workspace support, fast, disk efficient |
| Build Orchestration | Turborepo | Remote caching, pipeline dependencies |
| GitOps | ArgoCD | Declarative deployments, auto-sync, rollback |
| Helm Charts | Helm 3 | Templating, release management, rollback |
| Secret Management | Vault + External Secrets Operator | Dynamic secrets, automatic rotation |
| Notifications | Slack + PagerDuty | Team communication, on-call escalation |

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| A2A | Agent-to-Agent protocol for inter-agent communication |
| ABAC | Attribute-Based Access Control |
| ADR | Architecture Decision Record |
| AZ | Availability Zone |
| CDN | Content Delivery Network |
| CQRS | Command Query Responsibility Segregation |
| ECR | Elastic Container Registry |
| EKS | Elastic Kubernetes Service |
| GPU | Graphics Processing Unit (used for ML inference) |
| HA | High Availability |
| HPA | Horizontal Pod Autoscaler |
| Istio | Service mesh implementation |
| JWKS | JSON Web Key Set |
| Kafka | Distributed event streaming platform |
| KRaft | Kafka Raft consensus mode (no ZooKeeper) |
| LLM | Large Language Model |
| MCP | Model Context Protocol |
| MIG | Multi-Instance GPU (NVIDIA feature) |
| mTLS | Mutual TLS authentication |
| NLB | Network Load Balancer |
| OPA | Open Policy Agent |
| OIDC | OpenID Connect |
| OIDC | OpenID Connect authentication protocol |
| Patroni | PostgreSQL HA template |
| RPO | Recovery Point Objective |
| RTO | Recovery Time Objective |
| SDK | Software Development Kit |
| SLA | Service Level Agreement |
| SLO | Service Level Objective |
| SPA | Single Page Application |
| STT | Speech-to-Text |
| Temporal | Durable execution platform |
| TTS | Text-to-Speech |
| vLLM | High-throughput LLM inference engine |
| VPC | Virtual Private Cloud |
| WAF | Web Application Firewall |
| WORM | Write Once Read Many |

## Appendix B: Decision Records Summary

| ADR | Decision | Status |
|-----|----------|--------|
| ADR-001 | Monorepo with pnpm workspaces | Accepted |
| ADR-002 | Event-driven architecture with Kafka | Accepted |
| ADR-003 | Temporal for durable workflows | Accepted |
| ADR-004 | Firecracker for sandbox isolation | Accepted |
| ADR-005 | Multi-provider model routing | Accepted |
| ADR-006 | Multi-layered memory system | Accepted |
| ADR-007 | Go for latency-critical services | Accepted |
| ADR-008 | Node.js for business services | Accepted |
| ADR-009 | Python for ML/AI services | Accepted |
| ADR-010 | Kubernetes on EKS | Accepted |
| ADR-011 | Istio service mesh | Accepted |
| ADR-012 | Grafana stack for observability | Accepted |

## Appendix C: Reference Links

- [Temporal Documentation](https://docs.temporal.io/)
- [Apache Kafka Documentation](https://kafka.apache.org/documentation/)
- [Firecracker Documentation](https://firecracker-microvm.github.io/)
- [vLLM Documentation](https://docs.vllm.ai/)
- [Istio Documentation](https://istio.io/latest/docs/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [OpenHands](https://github.com/All-Hands-AI/OpenHands)
- [LiveKit Documentation](https://docs.livekit.io/)
