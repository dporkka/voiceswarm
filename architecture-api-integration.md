# Autonomous Agentic Software Organization Platform
## API Specifications, Voice System, MCP/A2A Integration, OSS Integrations & Build-vs-Buy Analysis

**Document Version:** 1.0.0  
**Status:** Production Architecture Specification  
**Classification:** Architecture & Integration Design  
**Date:** 2025-01-15  

---

## Table of Contents

1. [Item 15: API Specifications](#item-15-api-specifications)
   - [REST API (Fastify-based)](#rest-api)
   - [WebSocket API](#websocket-api)
   - [Server-Sent Events (SSE) API](#sse-api)
   - [MCP Compatibility Layer](#mcp-compatibility)
2. [Item 27: Voice System Architecture](#item-27-voice-system-architecture)
   - [Speech-to-Text Pipeline](#stt-pipeline)
   - [Conversational Orchestration](#conversational-orchestration)
   - [Text-to-Speech Pipeline](#tts-pipeline)
   - [Real-time Audio Pipeline](#realtime-audio)
   - [Voice Commands & NLU](#voice-commands)
   - [Voice-Driven Task Assignment](#voice-tasks)
   - [Conversation Memory](#voice-memory)
   - [Voice UI Integration](#voice-ui)
3. [Item 28: MCP/A2A Integration Strategy](#item-28-mcpa2a-integration-strategy)
   - [MCP Server Implementation](#mcp-server)
   - [MCP Client Support](#mcp-client)
   - [A2A Protocol Implementation](#a2a-protocol)
   - [Interoperability Layer](#interop-layer)
   - [External Tool Integration](#external-tools)
   - [Third-party Agent Communication](#third-party-agents)
   - [Memory System Integration](#memory-integration)
   - [Version Compatibility](#version-compatibility)
4. [Item 36: Recommended OSS Integrations](#item-36-recommended-oss-integrations)
   - [Workflow/Scheduling](#oss-workflow)
   - [Distributed Computing](#oss-distributed)
   - [Message Queue](#oss-message-queue)
   - [Vector Database](#oss-vector-db)
   - [Observability](#oss-observability)
   - [Realtime](#oss-realtime)
   - [ML Inference](#oss-ml-inference)
   - [API Gateway](#oss-api-gateway)
   - [Auth](#oss-auth)
   - [Storage](#oss-storage)
   - [Search](#oss-search)
   - [Code Intelligence](#oss-code-intel)
   - [Terminal](#oss-terminal)
5. [Item 37: Build-vs-Buy Analysis](#item-37-build-vs-buy-analysis)
   - [Workflow Engine](#bvb-workflow)
   - [Message Queue](#bvb-message-queue)
   - [Vector DB](#bvb-vector-db)
   - [Observability](#bvb-observability)
   - [Auth/SSO](#bvb-auth)
   - [Realtime](#bvb-realtime)
   - [Voice](#bvb-voice)
   - [Sandbox](#bvb-sandbox)
   - [CI/CD](#bvb-cicd)
   - [Secrets Management](#bvb-secrets)
   - [Billing](#bvb-billing)
   - [Monitoring](#bvb-monitoring)

---

## Item 15: API Specifications

### Overview

The API surface area of the Autonomous Agentic Software Organization Platform is designed as a **multi-protocol, versioned, strongly-typed interface** that serves four primary constituencies:

1. **Web Application**: Browser-based dashboard and IDE (REST + WebSocket)
2. **Autonomous Agents**: Machine consumers requiring structured, programmatic access (REST + MCP)
3. **Human Developers**: Third-party integrations, CLI tools, SDKs (REST + SSE)
4. **External Systems**: CI/CD pipelines, enterprise systems, other agent platforms (REST + MCP + A2A)

### Design Principles

| Principle | Implementation |
|-----------|---------------|
| **Type Safety** | Zod schemas for all request/response validation; TypeScript types auto-generated |
| **Versioning** | URL-based (`/v1/...`), quarterly releases, 12-month deprecation window |
| **Idempotency** | `Idempotency-Key` header for mutation endpoints; 24-hour key retention |
| **Pagination** | Cursor-based with `next_cursor`, `prev_cursor`, `limit` (default 20, max 100) |
| **Filtering** | Structured query parameters with JSONPath-like syntax |
| **Error Consistency** | RFC 7807 `Problem Details` format with error codes, tracing, and retry guidance |
| **Rate Limiting** | Token bucket per tenant; headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` |
| **Observability** | Every request traced with `traceparent` header; structured logging |

### Authentication Architecture

The platform implements a **multi-factor authentication system** supporting:

- **OAuth 2.1** (Authorization Code + PKCE, Device Authorization Grant, Client Credentials)
- **API Keys** (scoped, rotatable, with fine-grained permissions)
- **Session-based Auth** (HTTP-only cookies, CSRF protection, refresh token rotation)
- **JWT Access Tokens** (RS256, 15-minute expiry, signed by platform JWKS)
- **mTLS** (for service-to-service communication)

#### JWT Claims Structure

```typescript
interface PlatformJWT {
  // Standard claims
  iss: "aasop.io";           // Issuer
  sub: "user_<uuid>";        // Subject (user ID)
  aud: "aasop-api";          // Audience
  exp: number;               // Expiration (15 min)
  iat: number;               // Issued at
  jti: "<uuid>";             // JWT ID (for revocation)

  // Platform claims
  org_id: "org_<uuid>";      // Organization
  tenant_id: "ten_<uuid>";   // Tenant (for multi-tenant)
  roles: string[];           // Platform roles
  permissions: string[];     // Granular permissions
  session_id: "sess_<uuid>"; // Session reference
  auth_method: "oauth2" | "api_key" | "session";
  scopes: string[];          // OAuth scopes
}
```

#### Permission Model (RBAC + ABAC)

```
Permission Format: <resource>:<action>:<scope>

Examples:
  agents:create:org          - Create agents in org
  agents:*:project:<id>      - Full agent access in project
  workflows:read:own         - Read own workflows only
  billing:read:org           - Read org billing (admin)
  inference:execute:project  - Execute inference in project
```

---

### REST API Endpoints

#### 1. Authentication Endpoints

##### 1.1 OAuth 2.1 Authorization

```
GET /v1/auth/authorize
```

Initiate OAuth 2.1 authorization flow with PKCE.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `client_id` | string | Yes | Registered application client ID |
| `response_type` | string | Yes | Fixed: `code` |
| `redirect_uri` | string | Yes | Pre-registered redirect URI |
| `scope` | string | Yes | Space-separated scopes |
| `state` | string | Yes | CSRF protection token |
| `code_challenge` | string | Yes | PKCE code challenge |
| `code_challenge_method` | string | Yes | `S256` or `plain` |

**Zod Schema:**
```typescript
const AuthorizeQuery = z.object({
  client_id: z.string().min(1).max(128),
  response_type: z.literal("code"),
  redirect_uri: z.string().url().max(2048),
  scope: z.string().min(1).max(512),
  state: z.string().min(16).max(256),
  code_challenge: z.string().min(43).max(128),
  code_challenge_method: z.enum(["S256", "plain"]),
});
```

**Response:**
- `302 Redirect` to login page with `state` parameter
- Error: `400 Bad Request` (invalid parameters)

**Rate Limit:** 30 requests/minute per IP

---

##### 1.2 Token Exchange

```
POST /v1/auth/token
```

Exchange authorization code for tokens.

**Request Body (application/x-www-form-urlencoded):**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `grant_type` | string | Yes | `authorization_code` or `refresh_token` |
| `code` | string | Cond. | Authorization code (for auth_code grant) |
| `refresh_token` | string | Cond. | Refresh token (for refresh grant) |
| `redirect_uri` | string | Yes | Must match authorize request |
| `client_id` | string | Yes | Client ID |
| `code_verifier` | string | Cond. | PKCE verifier (for auth_code grant) |

**Zod Schema:**
```typescript
const TokenRequest = z.object({
  grant_type: z.enum(["authorization_code", "refresh_token", "client_credentials"]),
  code: z.string().optional(),
  refresh_token: z.string().optional(),
  redirect_uri: z.string().url().optional(),
  client_id: z.string(),
  client_secret: z.string().optional(),
  code_verifier: z.string().optional(),
}).refine(data => {
  if (data.grant_type === "authorization_code") {
    return !!data.code && !!data.code_verifier;
  }
  if (data.grant_type === "refresh_token") {
    return !!data.refresh_token;
  }
  return true;
});
```

**Response (200 OK):**
```typescript
const TokenResponse = z.object({
  access_token: z.string(),           // JWT, 15-minute expiry
  token_type: z.literal("Bearer"),
  expires_in: z.number().default(900), // seconds
  refresh_token: z.string().optional(),
  scope: z.string(),
});
```

**Error Codes:**
| Code | Status | Description |
|------|--------|-------------|
| `invalid_grant` | 400 | Invalid/expired authorization code |
| `invalid_client` | 401 | Invalid client credentials |
| `invalid_scope` | 400 | Requested scope exceeds granted |
| `unsupported_grant_type` | 400 | Grant type not supported |

---

##### 1.3 Device Authorization Grant

```
POST /v1/auth/device/code
```

Initiate device flow for CLI and headless applications.

**Request Body:**
```typescript
const DeviceCodeRequest = z.object({
  client_id: z.string(),
  scope: z.string().optional(),
});
```

**Response (200 OK):**
```typescript
const DeviceCodeResponse = z.object({
  device_code: z.string(),         // Unique device code
  user_code: z.string(),           // Short code for user to enter
  verification_uri: z.string().url(), // Where user completes auth
  verification_uri_complete: z.string().url().optional(),
  expires_in: z.number(),          // Device code expiry (600s)
  interval: z.number(),            // Polling interval (5s)
});
```

---

##### 1.4 API Key Management

```
POST   /v1/auth/api-keys              # Create API key
GET    /v1/auth/api-keys              # List API keys
GET    /v1/auth/api-keys/:id          # Get API key details
PATCH  /v1/auth/api-keys/:id          # Update API key (name, scopes)
DELETE /v1/auth/api-keys/:id          # Revoke API key
```

**Create API Key Request:**
```typescript
const CreateApiKeyRequest = z.object({
  name: z.string().min(1).max(128),
  description: z.string().max(512).optional(),
  scopes: z.array(z.string()).min(1),
  expires_in_days: z.number().min(1).max(365).optional(),
  rate_limit_multiplier: z.number().min(0.1).max(10).default(1),
  allowed_ips: z.array(z.string().ip()).optional(),
  allowed_origins: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});
```

**Create API Key Response:**
```typescript
const CreateApiKeyResponse = z.object({
  id: z.string(),
  name: z.string(),
  key: z.string(),                  // Full key, shown ONCE
  key_prefix: z.string(),           // First 8 chars for display
  scopes: z.array(z.string()),
  created_at: z.string().datetime(),
  expires_at: z.string().datetime().optional(),
  created_by: z.string(),
});
```

**Auth:** Requires `auth:apikeys:manage` permission  
**Rate Limit:** 10 requests/minute per user

---

##### 1.5 Session Management

```
POST   /v1/auth/sessions              # Create session (login)
DELETE /v1/auth/sessions/:id          # Revoke session
GET    /v1/auth/sessions              # List active sessions
GET    /v1/auth/sessions/current      # Get current session
POST   /v1/auth/sessions/:id/refresh  # Refresh session
```

**Create Session Request:**
```typescript
const CreateSessionRequest = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  mfa_code: z.string().length(6).optional(),
  device_info: z.object({
    name: z.string().optional(),
    type: z.enum(["desktop", "mobile", "tablet", "cli", "agent"]),
    os: z.string().optional(),
    browser: z.string().optional(),
  }).optional(),
});
```

---

#### 2. Organization Management

##### 2.1 Organization CRUD

```
POST   /v1/orgs                       # Create organization
GET    /v1/orgs                       # List organizations (user's)
GET    /v1/orgs/:orgId                # Get organization
PATCH  /v1/orgs/:orgId                # Update organization
DELETE /v1/orgs/:orgId                # Delete organization (with confirmation)
```

**Organization Schema:**
```typescript
const Organization = z.object({
  id: z.string(),
  name: z.string().min(1).max(128),
  slug: z.string().regex(/^[a-z0-9-]+$/).max(64),
  description: z.string().max(1024).optional(),
  avatar_url: z.string().url().optional(),
  tier: z.enum(["free", "team", "enterprise", "dedicated"]),
  settings: z.object({
    default_project_quota: z.number().default(10),
    default_agent_quota: z.number().default(50),
    default_workflow_quota: z.number().default(100),
    require_mfa: z.boolean().default(false),
    allowed_domains: z.array(z.string()).optional(),
    audit_retention_days: z.number().default(90),
    auto_approve_agents: z.boolean().default(false),
    custom_models_enabled: z.boolean().default(false),
  }),
  billing: z.object({
    plan: z.string(),
    seats: z.number(),
    addons: z.array(z.string()),
  }),
  usage: z.object({
    compute_minutes_this_period: z.number(),
    inference_tokens_this_period: z.number(),
    storage_gb: z.number(),
    agents_active: z.number(),
  }),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().optional(),
});
```

**Create Organization Request:**
```typescript
const CreateOrgRequest = z.object({
  name: z.string().min(1).max(128),
  slug: z.string().regex(/^[a-z0-9-]+$/).max(64),
  description: z.string().max(1024).optional(),
  tier: z.enum(["free", "team", "enterprise"]).default("free"),
});
```

**Auth:** Authenticated user  
**Rate Limit:** 5 org creations/hour per user  
**Errors:**
| Code | Status | Description |
|------|--------|-------------|
| `org_slug_taken` | 409 | Organization slug already exists |
| `org_limit_reached` | 403 | User has reached org creation limit |
| `invalid_slug` | 400 | Slug format invalid |

---

##### 2.2 Member Management

```
GET    /v1/orgs/:orgId/members              # List members
POST   /v1/orgs/:orgId/members              # Add member (by email/invite)
GET    /v1/orgs/:orgId/members/:userId      # Get member details
PATCH  /v1/orgs/:orgId/members/:userId      # Update member role
DELETE /v1/orgs/:orgId/members/:userId      # Remove member
```

**Member Schema:**
```typescript
const OrgMember = z.object({
  user_id: z.string(),
  org_id: z.string(),
  role: z.enum(["owner", "admin", "member", "viewer", "agent"]),
  permissions: z.array(z.string()),
  joined_at: z.string().datetime(),
  invited_by: z.string().optional(),
  teams: z.array(z.string()), // team IDs
  status: z.enum(["active", "invited", "suspended"]),
  last_active_at: z.string().datetime().optional(),
});
```

**Add Member Request:**
```typescript
const AddMemberRequest = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member", "viewer", "agent"]).default("member"),
  team_ids: z.array(z.string()).optional(),
  message: z.string().max(500).optional(),
});
```

**Auth:** Requires `org:members:manage`  
**Rate Limit:** 20 invites/hour per org

---

##### 2.3 Team Management

```
POST   /v1/orgs/:orgId/teams               # Create team
GET    /v1/orgs/:orgId/teams               # List teams
GET    /v1/orgs/:orgId/teams/:teamId       # Get team
PATCH  /v1/orgs/:orgId/teams/:teamId       # Update team
DELETE /v1/orgs/:orgId/teams/:teamId       # Delete team
```

**Team Schema:**
```typescript
const Team = z.object({
  id: z.string(),
  org_id: z.string(),
  name: z.string().min(1).max(128),
  description: z.string().max(512).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  member_ids: z.array(z.string()),
  project_ids: z.array(z.string()),
  agent_quota: z.number().default(10),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
```

---

##### 2.4 Invitations

```
POST   /v1/orgs/:orgId/invites             # Create invitation
GET    /v1/orgs/:orgId/invites             # List pending invites
POST   /v1/orgs/:orgId/invites/:id/accept  # Accept invitation
POST   /v1/orgs/:orgId/invites/:id/revoke  # Revoke invitation
```

**Invitation Schema:**
```typescript
const Invitation = z.object({
  id: z.string(),
  org_id: z.string(),
  email: z.string().email(),
  role: z.string(),
  invited_by: z.string(),
  status: z.enum(["pending", "accepted", "expired", "revoked"]),
  expires_at: z.string().datetime(),
  created_at: z.string().datetime(),
  accepted_at: z.string().datetime().optional(),
});
```

---

#### 3. Project Management

##### 3.1 Project CRUD

```
POST   /v1/orgs/:orgId/projects           # Create project
GET    /v1/orgs/:orgId/projects           # List projects
GET    /v1/orgs/:orgId/projects/:id       # Get project
PATCH  /v1/orgs/:orgId/projects/:id       # Update project
DELETE /v1/orgs/:orgId/projects/:id       # Delete project
```

**Project Schema:**
```typescript
const Project = z.object({
  id: z.string(),
  org_id: z.string(),
  team_id: z.string().optional(),
  name: z.string().min(1).max(128),
  slug: z.string().regex(/^[a-z0-9-]+$/).max(64),
  description: z.string().max(2048).optional(),
  status: z.enum(["active", "archived", "paused"]).default("active"),
  repositories: z.array(z.object({
    id: z.string(),
    provider: z.enum(["github", "gitlab", "bitbucket", "azure_devops", "custom"]),
    url: z.string().url(),
    default_branch: z.string().default("main"),
    webhook_configured: z.boolean().default(false),
    last_synced_at: z.string().datetime().optional(),
  })),
  settings: z.object({
    default_agent_type: z.string().optional(),
    auto_code_review: z.boolean().default(true),
    require_approval_for: z.array(z.enum([
      "production_deploy", "schema_migration", "cost_over_10", "external_api_call"
    ])).default(["production_deploy", "schema_migration"]),
    notification_channels: z.array(z.object({
      type: z.enum(["slack", "discord", "email", "webhook"]),
      config: z.record(z.unknown()),
    })).optional(),
    branch_protection: z.object({
      pattern: z.string(),
      require_reviews: z.number().default(1),
      require_tests_pass: z.boolean().default(true),
    }).optional(),
  }),
  usage: z.object({
    compute_minutes_this_month: z.number(),
    agents_active: z.number(),
    tasks_completed_this_month: z.number(),
  }),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
```

**Create Project Request:**
```typescript
const CreateProjectRequest = z.object({
  name: z.string().min(1).max(128),
  slug: z.string().regex(/^[a-z0-9-]+$/).max(64),
  description: z.string().max(2048).optional(),
  team_id: z.string().optional(),
  repositories: z.array(z.object({
    provider: z.enum(["github", "gitlab", "bitbucket", "azure_devops", "custom"]),
    url: z.string().url(),
    default_branch: z.string().default("main"),
    credentials: z.object({
      type: z.enum(["oauth", "token", "ssh_key"]),
      value: z.string(), // Encrypted at rest
    }).optional(),
  })).optional(),
  settings: Project.shape.settings.partial().optional(),
});
```

**Auth:** `projects:create:org`  
**Rate Limit:** 20 projects/hour per org  
**Errors:**
| Code | Status | Description |
|------|--------|-------------|
| `project_slug_taken` | 409 | Slug already in use |
| `project_limit_reached` | 403 | Org project quota exceeded |
| `invalid_repo_url` | 400 | Repository URL inaccessible |

---

##### 3.2 Branch Management

```
GET    /v1/projects/:projectId/branches           # List branches
POST   /v1/projects/:projectId/branches           # Create branch
GET    /v1/projects/:projectId/branches/:name     # Get branch details
DELETE /v1/projects/:projectId/branches/:name     # Delete branch
POST   /v1/projects/:projectId/branches/:name/merge # Merge branch
```

**Branch Schema:**
```typescript
const Branch = z.object({
  name: z.string(),
  sha: z.string(),
  behind_by: z.number(),
  ahead_by: z.number(),
  is_protected: z.boolean(),
  is_default: z.boolean(),
  last_commit_at: z.string().datetime(),
  author: z.string(),
  pull_request: z.object({
    id: z.string(),
    status: z.enum(["open", "merged", "closed"]),
    url: z.string().url(),
  }).optional(),
});
```

---

#### 4. Agent Management

##### 4.1 Agent Type Definitions

```
POST   /v1/orgs/:orgId/agent-types            # Create agent type
GET    /v1/orgs/:orgId/agent-types            # List agent types
GET    /v1/orgs/:orgId/agent-types/:id        # Get agent type
PATCH  /v1/orgs/:orgId/agent-types/:id        # Update agent type
DELETE /v1/orgs/:orgId/agent-types/:id        # Delete agent type
```

**Agent Type Schema:**
```typescript
const AgentType = z.object({
  id: z.string(),
  org_id: z.string(),
  name: z.string().min(1).max(128),
  description: z.string().max(2048).optional(),
  version: z.string().default("1.0.0"),
  icon: z.string().optional(),
  capabilities: z.array(z.enum([
    "code_generation", "code_review", "debugging", "testing",
    "documentation", "refactoring", "architecture_design",
    "dependency_management", "deployment", "monitoring",
    "natural_language", "file_operations", "shell_execution",
    "web_browsing", "api_integration", "data_analysis"
  ])),
  model_config: z.object({
    provider: z.enum(["openai", "anthropic", "google", "mistral", "local", "custom"]),
    model: z.string(),
    temperature: z.number().min(0).max(2).default(0.7),
    max_tokens: z.number().default(4096),
    top_p: z.number().min(0).max(1).default(1),
    system_prompt: z.string().max(16000).optional(),
    tools: z.array(z.object({
      name: z.string(),
      description: z.string(),
      parameters: z.record(z.unknown()),
    })).optional(),
  }),
  sandbox_config: z.object({
    image: z.string().default("aasop/sandbox:latest"),
    resources: z.object({
      cpu: z.string().default("2"),
      memory: z.string().default("4Gi"),
      disk: z.string().default("10Gi"),
    }),
    timeout_seconds: z.number().default(3600),
    network_access: z.boolean().default(true),
    allowed_commands: z.array(z.string()).optional(),
    environment_variables: z.record(z.string()).optional(),
  }),
  memory_config: z.object({
    vector_collection: z.string().optional(),
    context_window_size: z.number().default(128000),
    persistent_memory: z.boolean().default(true),
  }),
  workflow_template: z.string().optional(), // Workflow definition ID
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
```

**Auth:** `agents:manage:org`  
**Rate Limit:** 50 requests/minute

---

##### 4.2 Agent Instance Management

```
POST   /v1/projects/:projectId/agents         # Create/spawn agent instance
GET    /v1/projects/:projectId/agents         # List agent instances
GET    /v1/projects/:projectId/agents/:id     # Get agent instance
PATCH  /v1/projects/:projectId/agents/:id     # Update agent (pause, resume, config)
DELETE /v1/projects/:projectId/agents/:id     # Terminate agent
POST   /v1/projects/:projectId/agents/:id/clone # Clone agent with state
```

**Agent Instance Schema:**
```typescript
const AgentInstance = z.object({
  id: z.string(),
  project_id: z.string(),
  agent_type_id: z.string(),
  name: z.string(),
  status: z.enum([
    "creating", "initializing", "idle", "working", "paused",
    "error", "terminated", "archived"
  ]),
  state: z.object({
    current_task: z.string().optional(),
    progress_percent: z.number().min(0).max(100).optional(),
    current_file: z.string().optional(),
    current_line: z.number().optional(),
    memory_usage_mb: z.number(),
    cpu_usage_percent: z.number(),
    tokens_consumed: z.number(),
    cost_usd: z.number(),
    last_heartbeat: z.string().datetime(),
  }),
  tasks: z.array(z.object({
    id: z.string(),
    status: z.string(),
    description: z.string(),
  })),
  sandbox_id: z.string().optional(),
  session_id: z.string().optional(),
  created_at: z.string().datetime(),
  started_at: z.string().datetime().optional(),
  terminated_at: z.string().datetime().optional(),
  created_by: z.string(),
});
```

**Create Agent Instance Request:**
```typescript
const CreateAgentRequest = z.object({
  agent_type_id: z.string(),
  name: z.string().min(1).max(128),
  task_description: z.string().max(4000).optional(),
  initial_context: z.object({
    files: z.array(z.string()).optional(),
    codebase_snapshot: z.string().optional(),
    custom_instructions: z.string().max(4000).optional(),
  }).optional(),
  priority: z.enum(["low", "normal", "high", "critical"]).default("normal"),
  auto_start: z.boolean().default(true),
});
```

**Response:** `201 Created` with full AgentInstance  
**Async:** Agent creation is async; status progresses `creating` -> `initializing` -> `idle`/`working`  
**WebSocket:** Agent state changes broadcast on `project:{id}:agents` channel

---

##### 4.3 Agent Logs & Output

```
GET /v1/projects/:projectId/agents/:id/logs       # Get agent logs
GET /v1/projects/:projectId/agents/:id/output     # Get agent output (files, diffs)
GET /v1/projects/:projectId/agents/:id/thoughts   # Get agent reasoning chain
```

**Log Entry Schema:**
```typescript
const AgentLogEntry = z.object({
  timestamp: z.string().datetime(),
  level: z.enum(["debug", "info", "warn", "error", "critical"]),
  source: z.enum(["system", "llm", "tool", "sandbox", "user"]),
  message: z.string(),
  metadata: z.object({
    tool_name: z.string().optional(),
    tool_input: z.unknown().optional(),
    tool_output: z.unknown().optional(),
    file_path: z.string().optional(),
    line_range: z.tuple([z.number(), z.number()]).optional(),
    tokens_used: z.number().optional(),
    latency_ms: z.number().optional(),
  }).optional(),
});
```

---

#### 5. Task Management

##### 5.1 Task CRUD

```
POST   /v1/projects/:projectId/tasks          # Create task
GET    /v1/projects/:projectId/tasks          # List tasks
GET    /v1/projects/:projectId/tasks/:id      # Get task
PATCH  /v1/projects/:projectId/tasks/:id      # Update task
DELETE /v1/projects/:projectId/tasks/:id      # Delete task
```

**Task Schema:**
```typescript
const Task = z.object({
  id: z.string(),
  project_id: z.string(),
  title: z.string().min(1).max(256),
  description: z.string().max(10000).optional(),
  status: z.enum([
    "backlog", "todo", "in_progress", "in_review",
    "blocked", "completed", "cancelled", "failed"
  ]),
  priority: z.enum(["lowest", "low", "medium", "high", "highest"]).default("medium"),
  type: z.enum([
    "feature", "bug", "refactor", "test", "docs",
    "research", "deployment", "review", "custom"
  ]),
  assignee: z.object({
    type: z.enum(["agent", "user", "team", "unassigned"]),
    id: z.string().optional(),
    name: z.string().optional(),
  }),
  dependencies: z.array(z.object({
    task_id: z.string(),
    type: z.enum(["blocks", "blocked_by", "relates_to"]),
  })),
  estimated_effort: z.object({
    value: z.number(),
    unit: z.enum(["minutes", "hours", "days", "story_points"]),
  }).optional(),
  actual_effort: z.object({
    value: z.number(),
    unit: z.enum(["minutes", "hours", "days", "story_points"]),
  }).optional(),
  labels: z.array(z.string()),
  due_date: z.string().datetime().optional(),
  started_at: z.string().datetime().optional(),
  completed_at: z.string().datetime().optional(),
  metadata: z.object({
    source: z.enum(["manual", "agent_created", "voice_command", "webhook", "integration"]).optional(),
    external_id: z.string().optional(),
    git_branch: z.string().optional(),
    pull_request_url: z.string().url().optional(),
  }).optional(),
  created_by: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
```

**Create Task Request:**
```typescript
const CreateTaskRequest = z.object({
  title: z.string().min(1).max(256),
  description: z.string().max(10000).optional(),
  priority: z.enum(["lowest", "low", "medium", "high", "highest"]).default("medium"),
  type: z.enum([
    "feature", "bug", "refactor", "test", "docs",
    "research", "deployment", "review", "custom"
  ]).default("feature"),
  assignee: z.object({
    type: z.enum(["agent", "user", "team", "unassigned"]),
    id: z.string().optional(),
  }).optional(),
  dependencies: z.array(z.object({
    task_id: z.string(),
    type: z.enum(["blocks", "blocked_by", "relates_to"]),
  })).optional(),
  labels: z.array(z.string()).default([]),
  due_date: z.string().datetime().optional(),
  estimated_effort: z.object({
    value: z.number().positive(),
    unit: z.enum(["minutes", "hours", "days", "story_points"]),
  }).optional(),
});
```

**Auth:** `tasks:create:project`  
**Rate Limit:** 100 requests/minute per project

---

##### 5.2 Task Assignment & Bulk Operations

```
POST /v1/projects/:projectId/tasks/:id/assign     # Assign task
POST /v1/projects/:projectId/tasks/:id/unassign   # Unassign task
POST /v1/projects/:projectId/tasks/bulk-update    # Bulk update status
POST /v1/projects/:projectId/tasks/bulk-assign    # Bulk assign
```

**Bulk Update Request:**
```typescript
const BulkUpdateRequest = z.object({
  task_ids: z.array(z.string()).min(1).max(100),
  updates: z.object({
    status: z.enum(["backlog", "todo", "in_progress", "in_review", "blocked", "completed", "cancelled"]).optional(),
    priority: z.enum(["lowest", "low", "medium", "high", "highest"]).optional(),
    assignee: z.object({ type: z.string(), id: z.string().optional() }).optional(),
    labels: z.object({
      add: z.array(z.string()).optional(),
      remove: z.array(z.string()).optional(),
    }).optional(),
  }).refine(data => Object.keys(data).length > 0, "At least one update required"),
});
```

---

#### 6. Workflow Management

##### 6.1 Workflow Definitions

```
POST   /v1/orgs/:orgId/workflows/definitions      # Create workflow definition
GET    /v1/orgs/:orgId/workflows/definitions      # List definitions
GET    /v1/orgs/:orgId/workflows/definitions/:id  # Get definition
PATCH  /v1/orgs/:orgId/workflows/definitions/:id  # Update definition
DELETE /v1/orgs/:orgId/workflows/definitions/:id  # Delete definition
POST   /v1/orgs/:orgId/workflows/definitions/:id/versions # Create version
```

**Workflow Definition Schema:**
```typescript
const WorkflowDefinition = z.object({
  id: z.string(),
  org_id: z.string(),
  name: z.string().min(1).max(128),
  description: z.string().max(2048).optional(),
  version: z.string().default("1.0.0"),
  version_id: z.string(),
  dsl: z.object({
    // Temporal-compatible workflow DSL
    start_at: z.string(), // State name
    states: z.record(z.object({
      type: z.enum([
        "task", "choice", "wait", "parallel", "map",
        "succeed", "fail", "retry", " compensation"
      ]),
      // Task state
      resource: z.string().optional(), // "arn:aasop:agent:#{agent_type}"
      parameters: z.record(z.unknown()).optional(),
      result_path: z.string().optional(), // "$.result"
      result_selector: z.record(z.unknown()).optional(),
      retry: z.array(z.object({
        error_equals: z.array(z.string()),
        interval_seconds: z.number(),
        max_attempts: z.number(),
        backoff_rate: z.number(),
      })).optional(),
      // Choice state
      choices: z.array(z.object({
        variable: z.string(),
        operator: z.enum(["eq", "lt", "gt", "lte", "gte", "exists"]),
        value: z.unknown(),
        next: z.string(),
      })).optional(),
      default: z.string().optional(),
      // Parallel state
      branches: z.array(z.unknown()).optional(),
      // Wait state
      seconds: z.number().optional(),
      timestamp: z.string().datetime().optional(),
      // Next state
      next: z.string().optional(),
      end: z.boolean().optional(),
    })),
    timeouts: z.object({
      total: z.number().optional(),
      task: z.number().optional(),
    }).optional(),
  }),
  variables: z.record(z.unknown()).optional(), // Template variables
  input_schema: z.record(z.unknown()).optional(), // JSON Schema
  output_schema: z.record(z.unknown()).optional(),
  triggers: z.array(z.object({
    type: z.enum(["webhook", "schedule", "event", "manual", "task_created"]),
    config: z.record(z.unknown()),
  })).optional(),
  is_active: z.boolean().default(true),
  created_by: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
```

**Auth:** `workflows:manage:org`  
**Rate Limit:** 30 requests/minute

---

##### 6.2 Workflow Executions

```
POST   /v1/workflows/executions              # Start execution
GET    /v1/workflows/executions              # List executions
GET    /v1/workflows/executions/:id          # Get execution details
POST   /v1/workflows/executions/:id/cancel   # Cancel execution
POST   /v1/workflows/executions/:id/signal   # Send signal
GET    /v1/workflows/executions/:id/history  # Execution history
```

**Workflow Execution Schema:**
```typescript
const WorkflowExecution = z.object({
  id: z.string(),
  definition_id: z.string(),
  definition_version: z.string(),
  status: z.enum([
    "pending", "running", "completed", "failed",
    "cancelled", "timed_out", "compensating"
  ]),
  input: z.unknown(),
  output: z.unknown().optional(),
  current_state: z.string().optional(),
  started_at: z.string().datetime(),
  completed_at: z.string().datetime().optional(),
  duration_ms: z.number().optional(),
  error: z.object({
    type: z.string(),
    message: z.string(),
    stack: z.string().optional(),
    state_name: z.string().optional(),
  }).optional(),
  history: z.array(z.object({
    timestamp: z.string().datetime(),
    state_name: z.string(),
    event: z.string(),
    input: z.unknown().optional(),
    output: z.unknown().optional(),
    error: z.unknown().optional(),
    duration_ms: z.number().optional(),
  })),
  signals_received: z.array(z.object({
    name: z.string(),
    payload: z.unknown(),
    received_at: z.string().datetime(),
  })),
  created_by: z.string(),
});
```

**Start Execution Request:**
```typescript
const StartExecutionRequest = z.object({
  definition_id: z.string(),
  input: z.record(z.unknown()).optional(),
  execution_id: z.string().optional(), // Custom ID
  priority: z.enum(["low", "normal", "high"]).default("normal"),
});
```

**Send Signal Request:**
```typescript
const SignalRequest = z.object({
  signal_name: z.string(),
  payload: z.unknown(),
});
```

---

#### 7. Memory Operations

##### 7.1 Memory Storage

```
POST   /v1/projects/:projectId/memory/store       # Store memory
GET    /v1/projects/:projectId/memory/retrieve    # Retrieve by ID
POST   /v1/projects/:projectId/memory/search      # Semantic search
DELETE /v1/projects/:projectId/memory/:id         # Delete memory
POST   /v1/projects/:projectId/memory/summarize   # Summarize memories
```

**Memory Entry Schema:**
```typescript
const MemoryEntry = z.object({
  id: z.string(),
  project_id: z.string(),
  agent_id: z.string().optional(),
  type: z.enum([
    "conversation", "code_context", "decision", "error",
    "file_change", "user_preference", "system_state", "custom"
  ]),
  content: z.object({
    text: z.string(),
    structured: z.record(z.unknown()).optional(),
    embedding: z.array(z.number()).optional(), // Vector embedding
  }),
  metadata: z.object({
    source: z.string().optional(),
    confidence: z.number().min(0).max(1).optional(),
    tags: z.array(z.string()).default([]),
    related_ids: z.array(z.string()).optional(),
    scope: z.enum(["session", "project", "organization", "global"]).default("session"),
  }),
  vector_id: z.string().optional(), // Reference to vector DB
  created_at: z.string().datetime(),
  expires_at: z.string().datetime().optional(),
  access_count: z.number().default(0),
  last_accessed_at: z.string().datetime().optional(),
});
```

**Store Memory Request:**
```typescript
const StoreMemoryRequest = z.object({
  type: z.enum([
    "conversation", "code_context", "decision", "error",
    "file_change", "user_preference", "system_state", "custom"
  ]),
  content: z.object({
    text: z.string().min(1).max(50000),
    structured: z.record(z.unknown()).optional(),
  }),
  metadata: z.object({
    source: z.string().optional(),
    confidence: z.number().min(0).max(1).optional(),
    tags: z.array(z.string()).default([]),
    scope: z.enum(["session", "project", "organization", "global"]).default("session"),
    expires_in_hours: z.number().optional(),
  }).optional(),
  generate_embedding: z.boolean().default(true),
});
```

---

##### 7.2 Semantic Search

**Search Request:**
```typescript
const SearchMemoryRequest = z.object({
  query: z.string().min(1).max(1000),
  filters: z.object({
    type: z.array(z.string()).optional(),
    agent_id: z.string().optional(),
    tags: z.array(z.string()).optional(),
    scope: z.array(z.string()).optional(),
    created_after: z.string().datetime().optional(),
    created_before: z.string().datetime().optional(),
  }).optional(),
  search_type: z.enum(["semantic", "keyword", "hybrid"]).default("hybrid"),
  top_k: z.number().min(1).max(100).default(10),
  min_score: z.number().min(0).max(1).default(0.7),
  include_metadata: z.boolean().default(true),
});
```

**Search Response:**
```typescript
const SearchMemoryResponse = z.object({
  results: z.array(z.object({
    memory: MemoryEntry,
    score: z.number(),
    matched_chunks: z.array(z.object({
      text: z.string(),
      score: z.number(),
    })).optional(),
  })),
  total_results: z.number(),
  query_embedding_time_ms: z.number(),
  search_time_ms: z.number(),
});
```

**Auth:** `memory:read:project`  
**Rate Limit:** 200 requests/minute per project

---

##### 7.3 Memory Summarization

**Summarize Request:**
```typescript
const SummarizeMemoryRequest = z.object({
  filters: z.object({
    type: z.array(z.string()).optional(),
    agent_id: z.string().optional(),
    tags: z.array(z.string()).optional(),
    time_range: z.object({
      from: z.string().datetime(),
      to: z.string().datetime(),
    }).optional(),
  }),
  summary_type: z.enum(["brief", "detailed", "bullet_points", "action_items"]).default("detailed"),
  max_length: z.number().min(100).max(10000).default(1000),
});
```

---

#### 8. Sandbox Operations

##### 8.1 Sandbox Lifecycle

```
POST   /v1/sandboxes                    # Create sandbox
GET    /v1/sandboxes                    # List sandboxes
GET    /v1/sandboxes/:id                # Get sandbox
PATCH  /v1/sandboxes/:id                # Update sandbox config
DELETE /v1/sandboxes/:id                # Destroy sandbox
POST   /v1/sandboxes/:id/start          # Start sandbox
POST   /v1/sandboxes/:id/stop           # Stop sandbox
POST   /v1/sandboxes/:id/pause          # Pause sandbox
POST   /v1/sandboxes/:id/resume         # Resume sandbox
```

**Sandbox Schema:**
```typescript
const Sandbox = z.object({
  id: z.string(),
  project_id: z.string(),
  agent_id: z.string().optional(),
  status: z.enum(["creating", "running", "paused", "stopped", "error", "destroyed"]),
  config: z.object({
    image: z.string(),
    resources: z.object({
      cpu_cores: z.number(),
      memory_mb: z.number(),
      disk_gb: z.number(),
      gpu: z.object({
        count: z.number(),
        type: z.string(),
      }).optional(),
    }),
    network: z.object({
      mode: z.enum(["isolated", "limited", "full"]),
      allowed_hosts: z.array(z.string()).optional(),
      port_forwards: z.array(z.object({
        container_port: z.number(),
        host_port: z.number().optional(),
      })).optional(),
    }),
    volumes: z.array(z.object({
      name: z.string(),
      mount_path: z.string(),
      size_gb: z.number(),
      persistent: z.boolean(),
    })),
    environment: z.record(z.string()),
    timeout_seconds: z.number(),
  }),
  runtime: z.object({
    started_at: z.string().datetime().optional(),
    last_active_at: z.string().datetime().optional(),
    process_count: z.number().default(0),
    memory_usage_mb: z.number().default(0),
    cpu_usage_percent: z.number().default(0),
    network_io_mb: z.number().default(0),
  }),
  created_at: z.string().datetime(),
  expires_at: z.string().datetime().optional(),
  created_by: z.string(),
});
```

**Create Sandbox Request:**
```typescript
const CreateSandboxRequest = z.object({
  project_id: z.string(),
  agent_id: z.string().optional(),
  config: z.object({
    image: z.string().default("aasop/sandbox:latest"),
    resources: z.object({
      cpu_cores: z.number().min(0.5).max(32).default(2),
      memory_mb: z.number().min(512).max(128000).default(4096),
      disk_gb: z.number().min(1).max(1000).default(10),
    }).optional(),
    network: z.object({
      mode: z.enum(["isolated", "limited", "full"]).default("limited"),
      allowed_hosts: z.array(z.string()).optional(),
    }).optional(),
    volumes: z.array(z.object({
      name: z.string(),
      mount_path: z.string(),
      size_gb: z.number(),
      persistent: z.boolean().default(false),
    })).optional(),
    environment: z.record(z.string()).optional(),
    timeout_seconds: z.number().min(60).max(86400).default(3600),
  }).optional(),
  auto_start: z.boolean().default(true),
});
```

**Auth:** `sandboxes:create:project`  
**Rate Limit:** 20 sandboxes/minute per project

---

##### 8.2 Sandbox Execution

```
POST /v1/sandboxes/:id/execute         # Execute command
GET  /v1/sandboxes/:id/files           # List files
POST /v1/sandboxes/:id/files           # Upload file
GET  /v1/sandboxes/:id/files/:path     # Download/read file
POST /v1/sandboxes/:id/files/:path     # Write file
DELETE /v1/sandboxes/:id/files/:path   # Delete file
GET  /v1/sandboxes/:id/logs            # Get execution logs
POST /v1/sandboxes/:id/shell           # Interactive shell session (WebSocket upgrade)
```

**Execute Command Request:**
```typescript
const ExecuteCommandRequest = z.object({
  command: z.string().min(1).max(10000),
  working_directory: z.string().optional(),
  environment: z.record(z.string()).optional(),
  timeout_seconds: z.number().min(1).max(3600).optional(),
  stdin: z.string().optional(),
  capture_output: z.boolean().default(true),
  stream_output: z.boolean().default(false), // If true, returns SSE stream
});
```

**Execute Command Response:**
```typescript
const ExecuteCommandResponse = z.object({
  execution_id: z.string(),
  exit_code: z.number(),
  stdout: z.string(),
  stderr: z.string(),
  duration_ms: z.number(),
  resource_usage: z.object({
    memory_peak_mb: z.number(),
    cpu_time_ms: z.number(),
  }),
});
```

---

#### 9. Model Management

##### 9.1 Model Providers

```
POST   /v1/orgs/:orgId/models/providers        # Register provider
GET    /v1/orgs/:orgId/models/providers        # List providers
GET    /v1/orgs/:orgId/models/providers/:id    # Get provider
PATCH  /v1/orgs/:orgId/models/providers/:id    # Update provider
DELETE /v1/orgs/:orgId/models/providers/:id    # Delete provider
```

**Model Provider Schema:**
```typescript
const ModelProvider = z.object({
  id: z.string(),
  org_id: z.string(),
  name: z.string(),
  type: z.enum(["openai", "anthropic", "google", "mistral", "azure_openai", "bedrock", "ollama", "vllm", "sglang", "custom"]),
  config: z.object({
    base_url: z.string().url().optional(),
    api_key: z.string().optional(), // Encrypted
    default_headers: z.record(z.string()).optional(),
    organization_id: z.string().optional(),
    project_id: z.string().optional(),
    region: z.string().optional(),
  }),
  models: z.array(z.object({
    id: z.string(),
    name: z.string(),
    display_name: z.string(),
    capabilities: z.array(z.enum([
      "chat", "completion", "embedding", "vision", "function_calling",
      "json_mode", "streaming", "fine_tuning"
    ])),
    context_window: z.number(),
    max_output_tokens: z.number(),
    pricing: z.object({
      input_per_1m_tokens: z.number(),
      output_per_1m_tokens: z.number(),
      caching_discount: z.number().optional(),
    }),
    is_enabled: z.boolean().default(true),
  })),
  health_status: z.enum(["healthy", "degraded", "unhealthy", "unknown"]),
  last_health_check: z.string().datetime().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
```

---

##### 9.2 Routing Rules

```
POST   /v1/orgs/:orgId/models/routing          # Create routing rule
GET    /v1/orgs/:orgId/models/routing          # List routing rules
PATCH  /v1/orgs/:orgId/models/routing/:id      # Update rule
DELETE /v1/orgs/:orgId/models/routing/:id      # Delete rule
```

**Routing Rule Schema:**
```typescript
const RoutingRule = z.object({
  id: z.string(),
  org_id: z.string(),
  name: z.string(),
  priority: z.number().min(1).max(1000),
  conditions: z.array(z.object({
    field: z.enum([
      "model_capability", "cost_per_token", "latency_ms",
      "context_window", "task_type", "agent_type", "project_id"
    ]),
    operator: z.enum(["eq", "lt", "gt", "lte", "gte", "in", "contains"]),
    value: z.unknown(),
  })),
  targets: z.array(z.object({
    provider_id: z.string(),
    model_id: z.string(),
    weight: z.number().min(0).max(1).default(1),
    fallback_order: z.number().default(1),
  })),
  fallback_behavior: z.enum(["next_target", "error", "queue"]).default("next_target"),
  circuit_breaker: z.object({
    failure_threshold: z.number().default(5),
    recovery_timeout_ms: z.number().default(30000),
    half_open_max_calls: z.number().default(3),
  }).optional(),
  is_active: z.boolean().default(true),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
```

---

#### 10. Inference API

##### 10.1 Chat Completions

```
POST /v1/inference/chat/completions
```

**Request:**
```typescript
const ChatCompletionRequest = z.object({
  // Model selection
  model: z.string().optional(), // "gpt-4o", "claude-sonnet-3.5", "auto"
  routing_hint: z.enum(["cost", "quality", "speed", "balanced"]).default("balanced"),

  // Messages
  messages: z.array(z.object({
    role: z.enum(["system", "user", "assistant", "tool"]),
    content: z.union([
      z.string(),
      z.array(z.object({
        type: z.enum(["text", "image_url", "file"]),
        text: z.string().optional(),
        image_url: z.object({ url: z.string(), detail: z.enum(["low", "high", "auto"]).optional() }).optional(),
        file: z.object({ url: z.string(), mime_type: z.string() }).optional(),
      })),
    ]),
    name: z.string().optional(), // For tool messages
    tool_call_id: z.string().optional(),
    tool_calls: z.array(z.object({
      id: z.string(),
      type: z.literal("function"),
      function: z.object({
        name: z.string(),
        arguments: z.string(),
      }),
    })).optional(),
  })).min(1),

  // Generation parameters
  temperature: z.number().min(0).max(2).default(0.7),
  max_tokens: z.number().min(1).max(128000).optional(),
  top_p: z.number().min(0).max(1).default(1),
  frequency_penalty: z.number().min(-2).max(2).default(0),
  presence_penalty: z.number().min(-2).max(2).default(0),
  stop: z.union([z.string(), z.array(z.string())]).optional(),

  // Tools / Functions
  tools: z.array(z.object({
    type: z.literal("function"),
    function: z.object({
      name: z.string(),
      description: z.string(),
      parameters: z.record(z.unknown()), // JSON Schema
    }),
  })).optional(),
  tool_choice: z.union([
    z.enum(["none", "auto", "required"]),
    z.object({ type: z.literal("function"), function: z.object({ name: z.string() }) }),
  ]).default("auto"),

  // Response format
  response_format: z.object({
    type: z.enum(["text", "json_object", "json_schema"]),
    schema: z.record(z.unknown()).optional(), // JSON Schema for structured output
  }).optional(),

  // Streaming
  stream: z.boolean().default(false),
  stream_options: z.object({
    include_usage: z.boolean().default(false),
  }).optional(),

  // Platform-specific
  agent_id: z.string().optional(),
  project_id: z.string().optional(),
  use_memory: z.boolean().default(true),
  memory_search_query: z.string().optional(),
  tags: z.array(z.string()).optional(),
});
```

**Response (Non-Streaming, 200 OK):**
```typescript
const ChatCompletionResponse = z.object({
  id: z.string(),
  object: z.literal("chat.completion"),
  created: z.number(),
  model: z.string(),
  choices: z.array(z.object({
    index: z.number(),
    message: z.object({
      role: z.literal("assistant"),
      content: z.string().nullable(),
      tool_calls: z.array(z.object({
        id: z.string(),
        type: z.literal("function"),
        function: z.object({
          name: z.string(),
          arguments: z.string(),
        }),
      })).optional(),
    }),
    finish_reason: z.enum(["stop", "length", "tool_calls", "content_filter", "error"]),
    logprobs: z.unknown().optional(),
  })),
  usage: z.object({
    prompt_tokens: z.number(),
    completion_tokens: z.number(),
    total_tokens: z.number(),
    prompt_tokens_details: z.object({
      cached_tokens: z.number().optional(),
    }).optional(),
  }),
  // Platform extensions
  _platform: z.object({
    routing: z.object({
      provider: z.string(),
      model: z.string(),
      latency_ms: z.number(),
    }),
    cost: z.object({
      input_cost_usd: z.number(),
      output_cost_usd: z.number(),
      total_cost_usd: z.number(),
    }),
    memory_references: z.array(z.object({
      memory_id: z.string(),
      relevance_score: z.number(),
    })).optional(),
  }).optional(),
});
```

**Streaming Response:** Server-Sent Events with `data: ` prefixed JSON  
**Auth:** `inference:execute:project`  
**Rate Limit:** Tier-based (Free: 20/min, Team: 200/min, Enterprise: custom)  
**Errors:**
| Code | Status | Description |
|------|--------|-------------|
| `model_unavailable` | 503 | All routing targets unhealthy |
| `context_too_long` | 413 | Input exceeds model context window |
| `content_filtered` | 400 | Content blocked by safety filter |
| `insufficient_quota` | 429 | Organization quota exceeded |
| `invalid_json_schema` | 400 | Invalid schema for structured output |

---

##### 10.2 Embeddings

```
POST /v1/inference/embeddings
```

**Request:**
```typescript
const EmbeddingRequest = z.object({
  input: z.union([z.string(), z.array(z.string())]),
  model: z.string().default("text-embedding-3-large"),
  dimensions: z.number().optional(),
  encoding_format: z.enum(["float", "base64"]).default("float"),
  project_id: z.string().optional(),
});
```

**Response:**
```typescript
const EmbeddingResponse = z.object({
  object: z.literal("list"),
  data: z.array(z.object({
    object: z.literal("embedding"),
    embedding: z.array(z.number()),
    index: z.number(),
  })),
  model: z.string(),
  usage: z.object({
    prompt_tokens: z.number(),
    total_tokens: z.number(),
  }),
});
```

---

#### 11. Observability

##### 11.1 Distributed Tracing

```
GET    /v1/orgs/:orgId/traces               # List traces
GET    /v1/orgs/:orgId/traces/:traceId      # Get trace details
GET    /v1/orgs/:orgId/traces/:traceId/spans # Get spans for trace
POST   /v1/orgs/:orgId/traces/search        # Advanced trace search
```

**Trace Schema:**
```typescript
const Trace = z.object({
  trace_id: z.string(),
  org_id: z.string(),
  project_id: z.string().optional(),
  name: z.string(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime().optional(),
  duration_ms: z.number().optional(),
  status: z.enum(["ok", "error", "unset"]),
  service_name: z.string(),
  attributes: z.record(z.unknown()),
  spans: z.array(z.object({
    span_id: z.string(),
    parent_span_id: z.string().optional(),
    name: z.string(),
    start_time: z.string().datetime(),
    end_time: z.string().datetime(),
    duration_ms: z.number(),
    status: z.enum(["ok", "error", "unset"]),
    kind: z.enum(["internal", "server", "client", "producer", "consumer"]),
    attributes: z.record(z.unknown()),
    events: z.array(z.object({
      name: z.string(),
      timestamp: z.string().datetime(),
      attributes: z.record(z.unknown()),
    })),
    links: z.array(z.unknown()),
  })),
});
```

---

##### 11.2 Metrics

```
GET /v1/orgs/:orgId/metrics              # Query metrics
GET /v1/orgs/:orgId/metrics/names        # List available metrics
```

**Metrics Query Request:**
```typescript
const MetricsQueryRequest = z.object({
  queries: z.array(z.object({
    metric: z.string(), // e.g., "inference.tokens.total"
    aggregation: z.enum(["sum", "avg", "min", "max", "count", "p50", "p95", "p99"]).default("sum"),
    filters: z.record(z.string()).optional(),
    group_by: z.array(z.string()).optional(),
  })),
  time_range: z.object({
    from: z.string().datetime(),
    to: z.string().datetime().optional(),
    granularity: z.enum(["1m", "5m", "1h", "1d"]).default("1h"),
  }),
});
```

---

##### 11.3 Logs

```
GET /v1/orgs/:orgId/logs                 # Query logs
POST /v1/orgs/:orgId/logs/ingest         # Ingest logs (for agents)
```

**Log Query Request:**
```typescript
const LogQueryRequest = z.object({
  query: z.string().optional(), // Lucene-like syntax
  filters: z.object({
    level: z.array(z.enum(["debug", "info", "warn", "error", "critical"])).optional(),
    source: z.array(z.string()).optional(),
    service: z.array(z.string()).optional(),
    project_id: z.string().optional(),
    agent_id: z.string().optional(),
  }).optional(),
  time_range: z.object({
    from: z.string().datetime(),
    to: z.string().datetime().optional(),
  }),
  sort: z.object({
    field: z.enum(["timestamp", "level"]).default("timestamp"),
    order: z.enum(["asc", "desc"]).default("desc"),
  }).optional(),
});
```

---

##### 11.4 Cost Analytics

```
GET /v1/orgs/:orgId/analytics/cost       # Cost breakdown
GET /v1/orgs/:orgId/analytics/usage      # Usage analytics
GET /v1/orgs/:orgId/analytics/agents     # Agent performance
GET /v1/orgs/:orgId/analytics/projects   # Project analytics
```

**Cost Analytics Response:**
```typescript
const CostAnalyticsResponse = z.object({
  period: z.object({ from: z.string().datetime(), to: z.string().datetime() }),
  total_cost_usd: z.number(),
  breakdown: z.array(z.object({
    category: z.enum(["inference", "compute", "storage", "network", "egress"]),
    cost_usd: z.number(),
    percentage: z.number(),
    details: z.array(z.object({
      name: z.string(),
      cost_usd: z.number(),
      usage_unit: z.string(),
      usage_amount: z.number(),
    })),
  })),
  trends: z.array(z.object({
    timestamp: z.string().datetime(),
    cost_usd: z.number(),
  })),
  projections: z.object({
    month_end_estimate_usd: z.number(),
    budget_utilization_percent: z.number(),
    alert_threshold_breached: z.boolean(),
  }),
});
```

---

#### 12. Billing & Quotas

##### 12.1 Usage

```
GET /v1/orgs/:orgId/billing/usage        # Current period usage
GET /v1/orgs/:orgId/billing/history      # Historical usage
```

##### 12.2 Limits & Allocations

```
GET    /v1/orgs/:orgId/billing/limits    # Get current limits
PATCH  /v1/orgs/:orgId/billing/limits    # Update limits (admin)
GET    /v1/orgs/:orgId/billing/quotas    # Get quota allocations
POST   /v1/orgs/:orgId/billing/quotas    # Allocate quotas to projects
```

**Quota Schema:**
```typescript
const Quota = z.object({
  org_id: z.string(),
  project_id: z.string().optional(),
  limits: z.object({
    compute_minutes_per_month: z.number(),
    inference_tokens_per_month: z.number(),
    storage_gb: z.number(),
    max_agents: z.number(),
    max_projects: z.number(),
    max_workflows: z.number(),
    max_team_members: z.number(),
    max_sandboxes: z.number(),
    voice_minutes_per_month: z.number(),
  }),
  usage: z.object({
    compute_minutes: z.number(),
    inference_tokens: z.number(),
    storage_gb: z.number(),
    agents_active: z.number(),
    voice_minutes: z.number(),
  }),
  alerts: z.array(z.object({
    threshold_percent: z.number(),
    triggered: z.boolean(),
    triggered_at: z.string().datetime().optional(),
  })),
  reset_date: z.string().datetime(),
});
```

---

#### 13. Realtime

##### 13.1 Session Management

```
POST   /v1/realtime/sessions             # Create realtime session
GET    /v1/realtime/sessions             # List sessions
GET    /v1/realtime/sessions/:id         # Get session
DELETE /v1/realtime/sessions/:id         # End session
```

**Realtime Session Schema:**
```typescript
const RealtimeSession = z.object({
  id: z.string(),
  org_id: z.string(),
  project_id: z.string().optional(),
  type: z.enum(["collaboration", "voice", "agent_monitor", "command_stream"]),
  status: z.enum(["connecting", "active", "paused", "ended"]),
  participants: z.array(z.object({
    id: z.string(),
    type: z.enum(["user", "agent", "system"]),
    name: z.string(),
    joined_at: z.string().datetime(),
    permissions: z.array(z.string()),
  })),
  subscriptions: z.array(z.object({
    channel: z.string(),
    filters: z.record(z.unknown()).optional(),
  })),
  created_at: z.string().datetime(),
  ended_at: z.string().datetime().optional(),
  expires_at: z.string().datetime(),
});
```

---

##### 13.2 Presence

```
GET  /v1/realtime/presence/:channel      # Get presence for channel
POST /v1/realtime/presence/:channel      # Update own presence
```

**Presence Schema:**
```typescript
const Presence = z.object({
  channel: z.string(),
  users: z.array(z.object({
    user_id: z.string(),
    status: z.enum(["online", "away", "busy", "offline"]),
    current_view: z.string().optional(), // e.g., "/projects/123/agents"
    cursor_position: z.object({ file: z.string(), line: z.number(), column: z.number() }).optional(),
    activity: z.string().optional(),
    last_seen_at: z.string().datetime(),
  })),
  count: z.number(),
});
```

---

### Universal Error Response Format

All errors follow RFC 7807 `Problem Details`:

```typescript
const ProblemDetails = z.object({
  type: z.string().url(),           // Error type URI
  title: z.string(),                // Human-readable title
  status: z.number(),               // HTTP status code
  detail: z.string(),               // Detailed description
  instance: z.string().url(),       // Request URI
  trace_id: z.string(),             // Distributed trace ID
  error_code: z.string(),           // Machine-readable error code
  retry_after: z.number().optional(), // Seconds to wait before retry
  suggestions: z.array(z.string()).optional(), // Remediation suggestions
  documentation_url: z.string().url().optional(),
  // Additional context-specific fields
  context: z.record(z.unknown()).optional(),
});
```

**Example:**
```json
{
  "type": "https://api.aasop.io/errors/rate-limit-exceeded",
  "title": "Rate Limit Exceeded",
  "status": 429,
  "detail": "You have exceeded the rate limit of 100 requests per minute for project proj_abc123. Your quota will reset at 2025-01-15T14:30:00Z.",
  "instance": "/v1/projects/proj_abc123/agents",
  "trace_id": "trace_abc123def456",
  "error_code": "RATE_LIMIT_EXCEEDED",
  "retry_after": 45,
  "suggestions": [
    "Reduce request frequency",
    "Use bulk operations instead of individual requests",
    "Upgrade to Enterprise tier for higher limits"
  ],
  "documentation_url": "https://docs.aasop.io/rate-limits"
}
```

---

### Rate Limit Tiers

| Tier | Requests/min | Inference/min | Sandboxes/min | WebSocket/msg/min |
|------|-------------|---------------|---------------|-------------------|
| Free | 60 | 20 | 5 | 100 |
| Team | 600 | 200 | 20 | 1000 |
| Enterprise | Custom | Custom | Custom | Custom |
| Internal | Unlimited | Unlimited | Unlimited | Unlimited |

---

### OpenAPI 3.1 Specification Summary

```yaml
openapi: 3.1.0
info:
  title: AASOP API
  version: 1.0.0
  description: Autonomous Agentic Software Organization Platform API
  contact:
    name: AASOP API Support
    url: https://aasop.io/support
servers:
  - url: https://api.aasop.io/v1
    description: Production
  - url: https://api.staging.aasop.io/v1
    description: Staging
security:
  - BearerAuth: []
  - ApiKeyAuth: []
paths:
  # Authentication
  /auth/authorize: { get: { operationId: oauthAuthorize, tags: [Auth] } }
  /auth/token: { post: { operationId: oauthToken, tags: [Auth] } }
  /auth/device/code: { post: { operationId: deviceCode, tags: [Auth] } }
  /auth/api-keys: { get: { operationId: listApiKeys }, post: { operationId: createApiKey, tags: [Auth] } }
  /auth/sessions: { get: { operationId: listSessions }, post: { operationId: createSession, tags: [Auth] } }

  # Organizations
  /orgs: { get: { operationId: listOrgs }, post: { operationId: createOrg, tags: [Organizations] } }
  /orgs/{orgId}: { get: { operationId: getOrg }, patch: { operationId: updateOrg }, delete: { operationId: deleteOrg, tags: [Organizations] } }
  /orgs/{orgId}/members: { get: { operationId: listMembers }, post: { operationId: addMember, tags: [Organizations] } }
  /orgs/{orgId}/teams: { get: { operationId: listTeams }, post: { operationId: createTeam, tags: [Organizations] } }

  # Projects
  /orgs/{orgId}/projects: { get: { operationId: listProjects }, post: { operationId: createProject, tags: [Projects] } }
  /projects/{projectId}: { get: { operationId: getProject }, patch: { operationId: updateProject }, delete: { operationId: deleteProject, tags: [Projects] } }
  /projects/{projectId}/branches: { get: { operationId: listBranches, tags: [Projects] } }

  # Agents
  /projects/{projectId}/agents: { get: { operationId: listAgents }, post: { operationId: createAgent, tags: [Agents] } }
  /projects/{projectId}/agents/{id}: { get: { operationId: getAgent }, patch: { operationId: updateAgent }, delete: { operationId: deleteAgent, tags: [Agents] } }
  /projects/{projectId}/agents/{id}/logs: { get: { operationId: getAgentLogs, tags: [Agents] } }

  # Tasks
  /projects/{projectId}/tasks: { get: { operationId: listTasks }, post: { operationId: createTask, tags: [Tasks] } }
  /projects/{projectId}/tasks/{id}: { get: { operationId: getTask }, patch: { operationId: updateTask }, delete: { operationId: deleteTask, tags: [Tasks] } }

  # Workflows
  /workflows/executions: { get: { operationId: listExecutions }, post: { operationId: startExecution, tags: [Workflows] } }
  /workflows/executions/{id}: { get: { operationId: getExecution }, delete: { operationId: cancelExecution, tags: [Workflows] } }
  /workflows/executions/{id}/signal: { post: { operationId: sendSignal, tags: [Workflows] } }

  # Memory
  /projects/{projectId}/memory/store: { post: { operationId: storeMemory, tags: [Memory] } }
  /projects/{projectId}/memory/search: { post: { operationId: searchMemory, tags: [Memory] } }
  /projects/{projectId}/memory/{id}: { get: { operationId: getMemory }, delete: { operationId: deleteMemory, tags: [Memory] } }

  # Sandboxes
  /sandboxes: { get: { operationId: listSandboxes }, post: { operationId: createSandbox, tags: [Sandboxes] } }
  /sandboxes/{id}: { get: { operationId: getSandbox }, patch: { operationId: updateSandbox }, delete: { operationId: destroySandbox, tags: [Sandboxes] } }
  /sandboxes/{id}/execute: { post: { operationId: executeCommand, tags: [Sandboxes] } }

  # Inference
  /inference/chat/completions: { post: { operationId: chatCompletion, tags: [Inference] } }
  /inference/embeddings: { post: { operationId: createEmbedding, tags: [Inference] } }

  # Observability
  /orgs/{orgId}/traces: { get: { operationId: listTraces, tags: [Observability] } }
  /orgs/{orgId}/metrics: { get: { operationId: queryMetrics, tags: [Observability] } }
  /orgs/{orgId}/logs: { get: { operationId: queryLogs }, post: { operationId: ingestLogs, tags: [Observability] } }

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key
```

---

## WebSocket API

### Connection Handshake

```
GET wss://rt.aasop.io/v1/connect
```

**Connection Parameters (query string):**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `token` | string | Yes | JWT access token or session token |
| `client_id` | string | Yes | Unique client identifier (UUID) |
| `protocol_version` | string | Yes | WebSocket protocol version (`1.0`) |
| `compress` | boolean | No | Enable per-message deflate (default: true) |

**Connection Response:**
```json
{
  "type": "connection_established",
n  "connection_id": "conn_abc123",
  "server_time": "2025-01-15T12:00:00Z",
  "heartbeat_interval_ms": 30000,
  "max_message_size_bytes": 1048576,
  "supported_features": ["presence", "typing", "cursor_sync", "voice"]
}
```

### Message Protocol

All messages are JSON with type discrimination:

```typescript
// Base message type
interface WebSocketMessage {
  id: string;           // Client-generated message ID
  type: string;         // Message type discriminator
  timestamp: string;    // ISO 8601 timestamp
  seq: number;          // Monotonic sequence number
}

// Client -> Server message types
type ClientMessage =
  | SubscribeMessage
  | UnsubscribeMessage
  | PresenceUpdateMessage
  | ActionMessage
  | PingMessage;

// Server -> Client message types
type ServerMessage =
  | EventMessage
  | SubscriptionConfirmedMessage
  | PresenceStateMessage
  | ErrorMessage
  | PongMessage;
```

### Subscribe Message (Client -> Server)

```typescript
interface SubscribeMessage extends WebSocketMessage {
  type: "subscribe";
  channel: string;          // Channel pattern, e.g., "project:123:*"
  filters?: Record<string, unknown>;
  history?: {               // Request historical messages
    count: number;          // Max history messages (default: 0)
    since?: string;         // ISO timestamp
  };
}

// Example:
{
  "id": "msg_001",
  "type": "subscribe",
  "timestamp": "2025-01-15T12:00:00Z",
  "seq": 1,
  "channel": "project:abc123:agents:*",
  "filters": { "status": ["working", "error"] },
  "history": { "count": 10 }
}
```

### Subscription Confirmed (Server -> Client)

```typescript
interface SubscriptionConfirmedMessage extends WebSocketMessage {
  type: "subscription_confirmed";
  subscription_id: string;
  channel: string;
  filter_match_count?: number; // Approximate matching events
}
```

### Event Message (Server -> Client)

```typescript
interface EventMessage extends WebSocketMessage {
  type: "event";
  channel: string;
  event_type: string;
  payload: unknown;
  metadata: {
    source: string;        // Service that produced the event
    trace_id: string;
    original_timestamp: string;
  };
}

// Example: Agent state change event
{
  "id": "evt_789",
  "type": "event",
  "timestamp": "2025-01-15T12:01:00Z",
  "seq": 42,
  "channel": "project:abc123:agents:agent_456",
  "event_type": "agent.state_changed",
  "payload": {
    "agent_id": "agent_456",
    "previous_status": "idle",
    "current_status": "working",
    "current_task": "Implementing auth middleware",
    "progress_percent": 15
  },
  "metadata": {
    "source": "agent-orchestrator",
    "trace_id": "trace_xyz789",
    "original_timestamp": "2025-01-15T12:00:59.995Z"
  }
}
```

### Presence Update (Client -> Server)

```typescript
interface PresenceUpdateMessage extends WebSocketMessage {
  type: "presence_update";
  channel: string;
  status: "online" | "away" | "busy" | "offline";
  payload?: Record<string, unknown>;
}
```

### Presence State (Server -> Client)

```typescript
interface PresenceStateMessage extends WebSocketMessage {
  type: "presence_state";
  channel: string;
  users: Array<{
    user_id: string;
    status: string;
    payload?: Record<string, unknown>;
    joined_at: string;
  }>;
}
```

### Ping/Pong (Heartbeat)

```typescript
interface PingMessage extends WebSocketMessage {
  type: "ping";
}

interface PongMessage extends WebSocketMessage {
  type: "pong";
  server_time: string;
  connections_active: number;
}
```

### Error Message (Server -> Client)

```typescript
interface ErrorMessage extends WebSocketMessage {
  type: "error";
  code: string;
  message: string;
  recoverable: boolean;
  original_message_id?: string;
}

// Example:
{
  "id": "err_001",
  "type": "error",
  "timestamp": "2025-01-15T12:02:00Z",
  "seq": 0,
  "code": "RATE_LIMITED",
  "message": "Too many subscription requests. Rate limit: 10/min.",
  "recoverable": true,
  "original_message_id": "msg_005"
}
```

### Channel Patterns

| Channel Pattern | Description | Events |
|-----------------|-------------|--------|
| `user:{userId}` | Personal user channel | Notifications, mentions |
| `org:{orgId}:*` | Organization-wide | Member changes, billing alerts |
| `project:{projectId}:*` | Project events | All project activity |
| `project:{projectId}:agents:*` | Agent events | State changes, logs |
| `project:{projectId}:tasks:*` | Task events | Status changes, assignments |
| `project:{projectId}:files:*` | File events | Edits, saves, sync |
| `project:{projectId}:voice` | Voice channel | Audio data, transcripts |
| `presence:project:{projectId}` | Presence info | Online users, cursors |

### Backpressure Handling

The WebSocket implementation uses a multi-level backpressure strategy:

1. **Client-Level Backpressure:**
   - Client maintains a sliding window of unacknowledged messages (default: 100)
   - When window is full, client pauses processing and sends `flow_control: pause`
   - Server stops sending non-critical events until `flow_control: resume`

2. **Server-Level Backpressure:**
   - Server tracks per-connection event queue depth (max: 1000 events)
   - When queue exceeds 80% capacity, server drops non-critical events (presence updates, typing indicators)
   - Critical events (agent state changes, task completions) are never dropped
   - Server sends `backpressure_warning` event when queue > 50%

3. **Channel-Level Throttling:**
   - High-frequency channels (presence, cursor sync) use adaptive throttling
   - Events coalesced: multiple rapid updates merged into latest state
   - Configurable throttle intervals per channel type

4. **Reconnection Strategy:**
   - Exponential backoff: 1s, 2s, 4s, 8s, max 30s
   - Resume with `last_seq` parameter to receive missed events
   - Event history retained for 5 minutes per channel

---

## Server-Sent Events (SSE) API

### Streaming Endpoints

```
GET /v1/inference/chat/completions?stream=true    # Chat completion stream
GET /v1/projects/:id/agents/:id/logs/stream       # Agent log stream
GET /v1/workflows/executions/:id/stream           # Workflow execution stream
GET /v1/sandboxes/:id/logs/stream                 # Sandbox log stream
GET /v1/realtime/events                           # General event stream
```

### Event Format

SSE events follow the standard format with custom event types:

```
event: message
data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1698352765,"model":"gpt-4","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}

event: message
data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1698352765,"model":"gpt-4","choices":[{"index":0,"delta":{"content":" world"},"finish_reason":null}]}

event: message
data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1698352765,"model":"gpt-4","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}

event: done
data: [DONE]
```

### SSE Event Types

| Event Type | Description | When Sent |
|------------|-------------|-----------|
| `message` | Standard data chunk | Per token/log entry/event |
| `error` | Error occurred | On stream error |
| `done` | Stream complete | Normal completion |
| `heartbeat` | Keep-alive ping | Every 15 seconds |
| `metadata` | Additional metadata | Start of stream |

### Metadata Event (First Event)

```
event: metadata
data: {"request_id":"req_abc123","model":"gpt-4o","estimated_tokens":150,"trace_id":"trace_xyz789"}
```

### Reconnection Handling

**Headers:**

| Header | Description |
|--------|-------------|
| `Last-Event-ID` | Client sends last received event ID for resume |
| `Cache-Control` | `no-cache` (required) |
| `Accept` | `text/event-stream` (required) |

**Reconnection Behavior:**
1. Client disconnects (network issue, etc.)
2. Client reconnects with `Last-Event-ID: {last_event_id}` header
3. Server replays missed events from buffer (retained for 5 minutes)
4. If event ID too old, server sends `error` event with `code: EVENTS_EXPIRED`
5. Client must perform full refresh if events expired

**Error Recovery:**
```
event: error
data: {"code":"EVENTS_EXPIRED","message":"Events older than event_123 have expired. Please perform a full refresh.","recoverable":false}
```

---

## MCP Compatibility Layer

### MCP Server Implementation

The platform exposes an **MCP (Model Context Protocol) server** endpoint at:

```
POST /v1/mcp/sse          # SSE endpoint for MCP clients
GET  /v1/mcp/sse          # SSE connection endpoint
```

#### Capability Advertisement

On connection, the server advertises:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": { "listChanged": true },
      "resources": { "subscribe": true, "listChanged": true },
      "prompts": { "listChanged": true },
      "logging": {},
      "completion": {}
    },
    "serverInfo": {
      "name": "aasop-mcp-server",
      "version": "1.0.0"
    }
  }
}
```

#### Tool Registration Protocol

Platform capabilities exposed as MCP tools:

| MCP Tool Name | Description | Platform Capability |
|---------------|-------------|-------------------|
| `aasop_create_agent` | Create a coding agent instance | Agent Management |
| `aasop_assign_task` | Assign a task to an agent | Task Management |
| `aasop_search_memory` | Search project memory | Memory Operations |
| `aasop_store_memory` | Store information in memory | Memory Operations |
| `aasop_execute_sandbox` | Execute code in sandbox | Sandbox Operations |
| `aasop_start_workflow` | Start a workflow execution | Workflow Management |
| `aasop_search_codebase` | Search project codebase | Code Intelligence |
| `aasop_get_project_status` | Get project overview | Project Management |
| `aasop_run_tests` | Run test suite | Sandbox + CI/CD |
| `aasop_deploy` | Deploy application | Deployment |

**Tool Schema Example (`aasop_create_agent`):**
```json
{
  "name": "aasop_create_agent",
  "description": "Create and launch an autonomous coding agent for a specific task",
  "inputSchema": {
    "type": "object",
    "properties": {
      "project_id": { "type": "string", "description": "Target project ID" },
      "agent_type": { "type": "string", "description": "Agent type (e.g., 'code_reviewer', 'feature_developer')" },
      "task_description": { "type": "string", "description": "Detailed task description" },
      "priority": { "type": "string", "enum": ["low", "normal", "high", "critical"], "default": "normal" }
    },
    "required": ["project_id", "agent_type", "task_description"]
  }
}
```

#### Resource Management

Resources expose project data:

| Resource URI | Description |
|--------------|-------------|
| `aasop://projects/{id}` | Project metadata |
| `aasop://projects/{id}/agents` | Agent instances |
| `aasop://projects/{id}/tasks` | Task list |
| `aasop://projects/{id}/memory` | Memory entries |
| `aasop://projects/{id}/codebase` | File tree |
| `aasop://agents/{id}/logs` | Agent logs |
| `aasop://workflows/{id}/status` | Workflow status |

#### Prompt Templates

Exposed as MCP prompts:

| Prompt Name | Description |
|-------------|-------------|
| `code_review` | Structured code review template |
| `bug_analysis` | Bug investigation framework |
| `refactor_plan` | Refactoring planning template |
| `test_generation` | Test case generation prompt |
| `architecture_review` | Architecture evaluation framework |

---

## Item 27: Voice System Architecture

### System Overview

The Voice System enables natural language interaction with the Autonomous Agentic Software Organization Platform. It supports real-time bidirectional audio communication, allowing users to create agents, assign tasks, query status, and receive updates entirely through voice.

### Architecture Diagram

```
+-----------------------------------------------------------------------------+
|                          VOICE SYSTEM ARCHITECTURE                          |
+-----------------------------------------------------------------------------+
|                                                                             |
|  +------------------+     +------------------+     +----------------------+ |
|  |   CLIENT LAYER   |     |  PIPELINE LAYER  |     |   ORCHESTRATION      | |
|  |                  |     |                  |     |   LAYER              | |
|  | +--------------+ |     | +--------------+ |     | +------------------+ | |
|  | | Push-to-Talk | |     | | Audio Stream | |     | | Intent Recognition| | |
|  | | WebRTC       |------>| | Capture      | |     | | Slot Filling      | | |
|  | | VAD          | |     | | (LiveKit)    | |     | | Context Mgmt      | | |
|  | +--------------+ |     | +--------------+ |     | | Multi-turn Dialog | | |
|  | +--------------+ |     | +--------------+ |     | +------------------+ | |
|  | | Visual       | |     | | STT Pipeline | |     | +------------------+ | |
|  | | Feedback     |<------| | (Deepgram)   | |     | | Action Mapping    | | |
|  | | Transcript   | |     | +--------------+ |     | | Confirmation Flows| | |
|  | +--------------+ |     | +--------------+ |     | | Task Execution    | | |
|  +------------------+     | | NLU Engine   | |     | +------------------+ | |
|                           | +--------------+ |     +----------------------+ |
|                           | +--------------+ |              |               |
|                           | | TTS Pipeline | |              v               |
|                           | | (ElevenLabs) | |     +----------------------+ |
|                           | +--------------+ |     |   PLATFORM CORE      | |
|                           +------------------+     |                      | |
|                                                     | +----------------+   | |
|                           +------------------+     | | Agent Manager  |   | |
|                           |  MEMORY LAYER  |     | | Task Manager   |   | |
|                           |                |<---->| | Workflow Engine|   | |
|                           | +----------+   |     | | Memory System  |   | |
|                           | | Session  |   |     | +----------------+   | |
|                           | | Context  |   |     +----------------------+ |
|                           | +----------+   |                               |
|                           | +----------+   |     +----------------------+ |
|                           | | Cross-   |   |     |   NOTIFICATION       | |
|                           | | Session  |   |     |   LAYER              | |
|                           | | Memory   |   |     |                      | |
|                           | +----------+   |     | +----------------+   | |
|                           +------------------+     | | Voice Callbacks|   | |
|                                                    | | Push Notifs    |   | |
|                                                    | +----------------+   | |
|                                                    +----------------------+ |
+-----------------------------------------------------------------------------+
```

### Speech-to-Text Pipeline

#### STT Architecture

```
Audio Input -> VAD -> Noise Suppression -> Streaming STT -> Diarization -> Transcript
```

#### 1. Voice Activity Detection (VAD)

| Parameter | Value | Description |
|-----------|-------|-------------|
| Engine | Silero VAD v4.0 | On-device, lightweight |
| Threshold | 0.5 | Probability threshold for speech detection |
| Min Speech Duration | 250ms | Ignore shorter segments |
| Min Silence Duration | 500ms | Segment boundary detection |
| Padding | 300ms | Pre/post speech padding |

**Implementation:**
```typescript
interface VADConfig {
  engine: "silero" | "webrtc" | "custom";
  threshold: number;
  minSpeechDurationMs: number;
  minSilenceDurationMs: number;
  paddingMs: number;
  sampleRate: 16000 | 24000 | 48000;
  frameDurationMs: 30;
}

class VoiceActivityDetector {
  process(audioFrame: Float32Array): {
    isSpeech: boolean;
    speechStart?: number;
    speechEnd?: number;
    confidence: number;
  };
}
```

#### 2. Real-time Streaming STT

**Primary Provider: Deepgram Nova-2**

| Feature | Configuration |
|---------|--------------|
| Model | `nova-2-general` |
| Streaming | Yes, <300ms latency |
| Interim Results | Enabled (for visual feedback) |
| Punctuation | Automatic |
| Profanity Filter | Context-dependent |
| Named Entity Recognition | Enabled |
| Smart Format | Dates, times, currencies |
| Multilingual | 30+ languages |
| Diarization | 2-10 speakers |

**Fallback Provider: Whisper V3 (Local via vLLM)**

| Scenario | Fallback Trigger |
|----------|-----------------|
| Deepgram outage | Automatic after 2 failed connections |
| Privacy requirement | On-premise deployment |
| Cost optimization | High-volume batch processing |
| Custom vocabulary | Fine-tuned Whisper model |

**Connection Manager:**
```typescript
interface STTConnectionConfig {
  primary: {
    provider: "deepgram";
    apiKey: string;
    model: string;
    endpoint?: string;
  };
  fallback?: {
    provider: "whisper" | "deepgram_backup";
    config: Record<string, unknown>;
  };
  failoverThreshold: number; // Failed requests before failover
  reconnectStrategy: "exponential_backoff" | "fixed_interval";
}

class STTStreamManager {
  // Manages WebSocket connection to STT provider
  // Handles reconnection, failover, and audio chunking
  async startStream(config: StreamConfig): Promise<STTStream>;
  async finalizeStream(): Promise<TranscriptSegment[]>;
}
```

#### 3. Speaker Diarization

```typescript
interface DiarizationConfig {
  minSpeakers: number;
  maxSpeakers: number;
  language: string;
  sampleRate: number;
}

interface DiarizedSegment {
  speaker: string;        // "SPEAKER_00", "SPEAKER_01", etc.
  start: number;          // Start time in seconds
  end: number;            // End time in seconds
  text: string;
  confidence: number;
}

// Post-processing: Identify speakers by platform context
interface SpeakerIdentification {
  diarizedSegment: DiarizedSegment;
  platformIdentity?: {
    userId: string;
    name: string;
    confidence: number;
  };
}
```

#### 4. Language Detection

- **Primary:** Deepgram built-in language detection
- **Auto-switch:** Seamless language switching mid-conversation
- **Supported Languages:** 30+ including EN, ES, FR, DE, JA, ZH, KO, PT, IT, NL, PL, RU, HI, AR

---

### Conversational Orchestration

#### Intent Recognition System

The NLU engine uses a hybrid approach combining rule-based patterns with LLM-based classification:

**Intent Taxonomy:**

| Intent Category | Examples | Confidence Threshold |
|-----------------|----------|---------------------|
| **Agent Management** | "Create a coding agent", "Stop the bug fix agent" | 0.85 |
| **Task Assignment** | "Assign auth bug to Agent-7", "Create a task to refactor payments" | 0.90 |
| **Status Query** | "What's the status of the deployment?", "Show me active agents" | 0.80 |
| **Code Operations** | "Review the auth module", "Run tests for the API" | 0.88 |
| **Navigation** | "Show me project settings", "Go to the workflow dashboard" | 0.75 |
| **Memory Query** | "What did we decide about the database?", "Find my notes on auth" | 0.82 |
| **Workflow Control** | "Start the deploy workflow", "Pause the CI pipeline" | 0.85 |
| **General Chat** | "Hello", "Thank you", "Help me with..." | 0.60 |

**Intent Recognition Pipeline:**
```typescript
interface IntentRecognitionConfig {
  // Rule-based patterns (fast path)
  patterns: Array<{
    intent: string;
    regex: RegExp;
    slots: string[];
    priority: number;
  }>;

  // LLM-based classification (fallback / complex queries)
  llmConfig: {
    model: string;
    temperature: number;
    fewShotExamples: FewShotExample[];
  };

  // Hybrid scoring
  ruleWeight: number;    // 0.3
  llmWeight: number;     // 0.7
  confidenceThreshold: number;
}

interface RecognizedIntent {
  intent: string;
  confidence: number;
  slots: Slot[];
  method: "rule" | "llm" | "hybrid";
  rawInput: string;
  processedAt: string;
}
```

#### Slot Filling

**Entity Types:**

| Slot Type | Examples | Extraction Method |
|-----------|----------|-------------------|
| `agent_type` | "code reviewer", "feature developer" | Fuzzy match against registered types |
| `agent_id` | "Agent-7", "the auth agent" | Reference resolution + fuzzy match |
| `project_id` | "Project Alpha", "the frontend project" | Context + fuzzy match |
| `task_type` | "bug", "feature", "refactor" | Direct mapping |
| `priority` | "urgent", "low priority", "ASAP" | Keyword mapping |
| `file_path` | "the auth module", "src/services/auth.ts" | Codebase context + fuzzy match |
| `branch` | "main branch", "the feature branch" | Git branch list |
| `user` | "assign to John", "ask Sarah" | Org member list |
| `datetime` | "in 2 hours", "tomorrow at 3pm" | Date parser (chrono-node) |
| `query` | "Find notes about auth" | Free text extraction |

**Slot Filling Dialog Manager:**
```typescript
interface SlotFillingState {
  intent: string;
  requiredSlots: SlotDefinition[];
  filledSlots: Map<string, SlotValue>;
  missingSlots: SlotDefinition[];
  turns: number;
  maxTurns: number;
}

class SlotFillingManager {
  // Tracks required slots and prompts user for missing information
  async processInput(
    input: string,
    currentState: SlotFillingState
  ): Promise<{
    complete: boolean;
    prompt?: string;       // Question to ask user for missing slot
    action?: PlatformAction; // Ready to execute
  }>;
}
```

#### Context Management

```typescript
interface ConversationContext {
  sessionId: string;
  // Short-term context (current conversation)
  shortTerm: {
    recentMessages: Message[];     // Last 20 messages
    currentIntent?: string;
    pendingSlots: SlotDefinition[];
    pendingAction?: PlatformAction;
    referencedEntities: Map<string, EntityReference>; // "the auth agent" -> agent_123
  };

  // Medium-term context (this session)
  mediumTerm: {
    actionsTaken: ActionRecord[];
    topicsDiscussed: string[];
    projectsAccessed: string[];
    agentsInteracted: string[];
  };

  // Long-term context (across sessions)
  longTerm: {
    userPreferences: UserPreferences;
    frequentlyUsedCommands: CommandFrequency[];
    voiceProfile: VoiceProfile;
  };
}
```

**Reference Resolution:**
- Anaphora resolution: "the agent" -> last mentioned agent
- Discourse history: "that task" -> last discussed task
- Visual context: "this file" -> currently open file in UI
- Project context: defaults to active project

---

### Text-to-Speech Pipeline

#### TTS Architecture

**Primary: ElevenLabs Turbo v2.5**

| Feature | Configuration |
|---------|--------------|
| Model | `eleven_turbo_v2_5` |
| Latency | ~250ms first byte |
| Streaming | Chunked delivery |
| Languages | 32 languages |
| Voice Cloning | Custom voice creation |
| Emotion Control | Stability + similarity + style |
| SSML | Full support |

**Fallback: Cartesia Sonic**

| Scenario | Fallback Trigger |
|----------|-----------------|
| ElevenLabs outage | Automatic failover |
| Cost optimization | Batch announcements |
| Specific voice needs | Voice library preference |

**Local Fallback: Piper TTS (on-premise)**

#### Voice Configuration

```typescript
interface TTSConfig {
  provider: "elevenlabs" | "cartesia" | "piper";
  voice: {
    id: string;           // Voice identifier
    name?: string;
    gender?: "male" | "female" | "neutral";
    accent?: string;
    language?: string;
  };
  speed: number;          // 0.5 - 2.0, default 1.0
  stability: number;      // 0.0 - 1.0, default 0.5
  similarityBoost: number; // 0.0 - 1.0, default 0.75
  style: number;          // 0.0 - 1.0, default 0.0
  model: string;
  streaming: boolean;
}

// Platform voice presets
const VOICE_PRESETS = {
  default: { voiceId: "XB0fDUnXU5powFXDhCwa", speed: 1.0 },
  agent_status: { voiceId: "XB0fDUnXU5powFXDhCwa", speed: 1.1 },
  urgent: { voiceId: "XB0fDUnXU5powFXDhCwa", speed: 1.2, stability: 0.3 },
  calm: { voiceId: "XB0fDUnXU5powFXDhCwa", speed: 0.9, stability: 0.8 },
};
```

#### Interruption Handling

```typescript
interface InterruptionConfig {
  // Voice Activity Detection on user channel
  userVAD: {
    enabled: boolean;
    threshold: number;
    debounceMs: number;
  };

  // Interruption behavior
  behavior: "stop_immediately" | "finish_sentence" | "acknowledge_then_stop";

  // Barge-in phrases
  bargeInPhrases: string[]; // ["stop", "wait", "hold on", "cancel"]

  // Graceful stop
  stopAcknowledgment: string; // "Okay, I'll stop."
}

class InterruptionHandler {
  // Monitors user audio while TTS is playing
  // Triggers stop when user starts speaking
  async handleInterruption(
    userAudioStream: AudioStream,
    currentTTS: TTSStream
  ): Promise<InterruptionResult>;
}
```

---

### Real-time Audio Pipeline

#### LiveKit Agents Integration

```typescript
interface LiveKitVoiceConfig {
  room: {
    name: string;
    options: {
      autoSubscribe: boolean;
      dynacast: boolean;
      adaptiveStream: boolean;
    };
  };
  audio: {
    sampleRate: 24000;
    channelCount: 1;
    codec: "opus" | "pcm";
    bitrate: 32000;
    dtx: boolean;          // Discontinuous transmission
  };
  agent: {
    sttProvider: "deepgram" | "whisper";
    llmProvider: "openai" | "anthropic";
    ttsProvider: "elevenlabs" | "cartesia";
    vadEnabled: boolean;
    interruptEnabled: boolean;
  };
}
```

**Audio Processing Chain:**

```
Mic Input -> AEC (Acoustic Echo Cancellation) -> NS (Noise Suppression)
  -> AGC (Automatic Gain Control) -> VAD -> Encoder (Opus) -> LiveKit Room

LiveKit Room -> Decoder -> Jitter Buffer -> Playout Buffer -> Speaker
```

#### Audio Quality Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| Sample Rate | 24kHz | Optimal for speech |
| Bitrate | 32kbps | Opus compressed |
| Frame Size | 20ms | Low latency |
| Jitter Buffer | Adaptive | 50-200ms |
| Packet Loss Concealment | Enabled | Opus built-in PLC |
| AEC | LiveKit built-in | Echo cancellation |
| NS | RNNoise | Neural noise suppression |

---

### Voice Commands

#### Command Parsing Pipeline

```
Speech -> STT -> NLU (Intent + Slots) -> Validation -> Confirmation -> Execution
```

#### Command Categories

**Agent Management Commands:**

| Command Pattern | Action | Parameters |
|-----------------|--------|------------|
| "Create a [type] agent to [task]" | Create agent | agent_type, task_description |
| "Stop agent [name/id]" | Terminate agent | agent_id |
| "Pause agent [name/id]" | Pause agent | agent_id |
| "Resume agent [name/id]" | Resume agent | agent_id |
| "What's agent [name/id] doing?" | Agent status | agent_id |
| "Clone agent [name/id]" | Clone agent | agent_id |

**Task Commands:**

| Command Pattern | Action | Parameters |
|-----------------|--------|------------|
| "Create a [type] task: [description]" | Create task | task_type, title, description |
| "Assign task [id] to [agent/user]" | Assign task | task_id, assignee |
| "Mark task [id] as [status]" | Update task | task_id, status |
| "What's the status of task [id]?" | Task status | task_id |
| "Show my tasks" | List tasks | user_id (implicit) |

**Code Commands:**

| Command Pattern | Action | Parameters |
|-----------------|--------|------------|
| "Review [file/module]" | Code review | file_path |
| "Run tests for [module]" | Run tests | target |
| "Find bugs in [file]" | Bug analysis | file_path |
| "Refactor [file] to [pattern]" | Refactoring | file_path, target_pattern |
| "Generate tests for [file]" | Test generation | file_path |

**Navigation Commands:**

| Command Pattern | Action |
|-----------------|--------|
| "Show me [project]" | Navigate to project |
| "Go to [agent/task/workflow] [id]" | Navigate to entity |
| "Show the dashboard" | Navigate to dashboard |
| "Show me settings" | Navigate to settings |

#### Confirmation Flows

```typescript
type ConfirmationRequired =
  | "agent_create"      // Creating agents
  | "agent_terminate"   // Stopping agents
  | "task_delete"       // Deleting tasks
  | "deployment"        // Production deployments
  | "cost_over_threshold" // Actions costing >$10
  | "schema_migration"  // Database migrations
  | "destructive_operation"; // Deletes, overwrites

interface ConfirmationFlow {
  action: PlatformAction;
  riskLevel: "low" | "medium" | "high" | "critical";
  confirmationRequired: boolean;

  // Voice confirmation
  speakSummary: string;    // "You want to deploy the auth service to production."
  speakImpact: string;     // "This will affect live users."
  askConfirm: string;      // "Say 'confirm' to proceed, or 'cancel' to abort."

  // Visual confirmation (if UI active)
  modalTitle: string;
  modalBody: string;
  confirmButton: string;
  cancelButton: string;
}
```

---

### Voice-Driven Task Assignment

#### End-to-End Flow: "Create a coding agent to fix the auth bug"

```
Step 1: STT
  Input: "Create a coding agent to fix the auth bug"
  Output: Transcript with confidence 0.98

Step 2: Intent Recognition
  Intent: "agent_create" (confidence: 0.97)
  Slots:
    - agent_type: "coding" (confidence: 0.95)
    - task_description: "fix the auth bug" (confidence: 0.98)

Step 3: Slot Enrichment
  - agent_type "coding" -> fuzzy match -> "feature_developer" (from org agent types)
  - "auth bug" -> search memory + task DB -> finds task T-142 "Auth middleware fails on JWT expiry"
  - task linked automatically

Step 4: Confirmation
  TTS: "I'll create a feature developer agent assigned to task T-142 'Auth middleware fails on
        JWT expiry' in project Auth Service. This will use approximately $2 of compute.
        Say 'confirm' to proceed."

Step 5: Execution (on confirmation)
  API: POST /v1/projects/auth-service/agents
  Body: { agent_type_id: "feature_developer", task_description: "Fix auth middleware JWT expiry bug" }

Step 6: Status Update
  TTS: "Agent 'Dev-7' has been created and is starting work on the JWT bug.
        I'll keep you updated on progress."

Step 7: Async Monitoring
  Agent progress events -> Voice notification when complete or blocked
  TTS: "Agent Dev-7 has completed the JWT fix and opened pull request #234.
        Would you like me to review it?"
```

#### Voice Task Parser

```typescript
interface VoiceTaskParser {
  // Main entry point
  async parseVoiceCommand(
    transcript: string,
    context: ConversationContext
  ): Promise<ParsedCommand>;
}

interface ParsedCommand {
  intent: string;
  confidence: number;
  slots: Map<string, SlotValue>;
  resolvedEntities: ResolvedEntity[];
  requiresConfirmation: boolean;
  confirmationLevel: "none" | "inform" | "confirm" | "critical";
  platformAction?: PlatformAction;
  response: {
    acknowledgment: string;   // "I'll create a coding agent for that."
    confirmation?: string;    // "Should I proceed?"
    result?: string;          // "Done! Agent Dev-7 is working on it."
  };
}
```

---

### Conversation Memory

#### Voice Session Context

```typescript
interface VoiceSession {
  id: string;
  userId: string;
  startedAt: string;
  endedAt?: string;
  status: "active" | "paused" | "ended";

  // Conversation transcript
  messages: VoiceMessage[];

  // Context references
  activeProject?: string;
  activeAgent?: string;
  activeTask?: string;
  activeFile?: string;

  // Pending operations
  pendingConfirmations: PendingConfirmation[];

  // Performance metrics
  sttLatencyAvg: number;
  llmLatencyAvg: number;
  ttsLatencyAvg: number;
  interruptionCount: number;
}

interface VoiceMessage {
  id: string;
  timestamp: string;
  speaker: "user" | "assistant" | "system";
  text: string;
  audioDurationMs?: number;
  metadata: {
    sttConfidence?: number;
    intent?: string;
    actionTaken?: string;
  };
}
```

#### Cross-Session Memory

Voice interactions are stored in the platform memory system:

| Memory Type | Content | Scope | Retention |
|-------------|---------|-------|-----------|
| Command History | Commands issued via voice | User | 90 days |
| Preference Learning | Corrections, preferences | User | Persistent |
| Entity References | "the auth agent" -> agent_123 | Project | Session + 7 days |
| Conversation Summaries | Key decisions, outcomes | Project | 1 year |
| Voice Profile | Speaking pace, accent | User | Persistent |

---

### Voice UI Integration

#### Interaction Modes

**1. Push-to-Talk (Default):**
- User holds spacebar or clicks microphone button
- Visual indicator: Pulsing microphone icon
- Audio feedback: Start tone (soft beep), end tone
- Timeout: Auto-release after 30 seconds of silence

**2. Always-Listening (Optional):**
- Wake word: "Hey AASOP" or customizable
- Visual indicator: Persistent ambient microphone icon
- Privacy: Local VAD, no audio leaves device until wake word detected
- Power: Optimized for minimal battery/CPU impact

**3. Hands-Free (Voice-Activated):**
- Continuous listening with voice activity detection
- Barge-in support: Speak anytime to interrupt
- Context-aware: Only active during work hours (configurable)

#### Visual Feedback Components

```typescript
interface VoiceUIState {
  // Current state
  status: "idle" | "listening" | "processing" | "speaking" | "error";

  // Listening state
  listening: {
    volumeLevel: number;      // 0-100 for visualizer
    speechDetected: boolean;
    elapsedMs: number;
  };

  // Processing state
  processing: {
    stage: "stt" | "nlu" | "action" | "tts";
    progressPercent: number;
  };

  // Transcript display
  transcript: {
    userText: string;         // What user said (live)
    assistantText: string;    // What assistant is saying
    interimText: string;      // STT interim results
  };

  // Suggestions
  suggestions: string[];      // "Try: 'Show me active agents'"

  // Errors
  error?: {
    code: string;
    message: string;
    recoverable: boolean;
  };
}
```

#### Voice UI Components

| Component | Description |
|-----------|-------------|
| `VoiceOrb` | Central circular indicator (idle: gray, listening: pulsing blue, processing: spinning, speaking: waveform) |
| `TranscriptPanel` | Scrollable transcript showing user/assistant turns |
| `SuggestionBar` | Contextual command suggestions |
| `VolumeVisualizer` | Real-time audio level indicator |
| `StatusBadge` | Current mode indicator (PTT, Listening, Muted) |
| `ConfirmationModal` | Visual confirmation for high-risk actions |

---

## Item 28: MCP/A2A Integration Strategy

### System Overview

The platform implements both **MCP (Model Context Protocol)** and **A2A (Agent-to-Agent)** protocols to enable seamless interoperability with external tools, agents, and platforms. The integration strategy follows a **"protocol-native with translation layer"** approach.

### MCP Server Implementation

#### Server Architecture

```
+-------------------------------------------------------------------+
|                    MCP SERVER IMPLEMENTATION                       |
+-------------------------------------------------------------------+
|                                                                    |
|  +----------------+  +----------------+  +-------------------+    |
|  | Transport Layer |  | Protocol Layer |  | Application Layer |    |
|  |                |  |                |  |                   |    |
|  | - stdio        |->| - JSON-RPC 2.0 |->| - Tool Registry   |    |
|  | - SSE (HTTP)   |  | - MCP Schema   |  | - Resource Mgr    |    |
|  | - WebSocket    |  | - Capabilities |  | - Prompt Handler  |    |
|  +----------------+  +----------------+  +-------------------+    |
|                                              |                    |
|                                              v                    |
|  +-----------------------------------------------------------+   |
|  |              INTERNAL PLATFORM SERVICES                    |   |
|  |  Agent Mgr | Task Mgr | Memory | Sandbox | Workflow | Git  |   |
|  +-----------------------------------------------------------+   |
+-------------------------------------------------------------------+
```

#### Transport Implementations

| Transport | Endpoint | Use Case |
|-----------|----------|----------|
| **stdio** | N/A (process spawn) | Local CLI tools, IDE extensions |
| **SSE** | `GET /v1/mcp/sse` | Web-based clients, remote connections |
| **WebSocket** | `wss://api.aasop.io/v1/mcp` | Real-time bidirectional |

#### Tool Registry

```typescript
interface MCPToolRegistry {
  // Tool registration
  async registerTool(tool: MCPToolDefinition): Promise<void>;
  async unregisterTool(name: string): Promise<void>;
  async listTools(): Promise<MCPToolDefinition[]>;

  // Tool execution
  async executeTool(
    name: string,
    args: Record<string, unknown>,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult>;
}

interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  annotations?: {
    title?: string;
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  };
  // Platform-specific
  platformMapping: {
    internalEndpoint: string;
    authRequired: boolean;
    rateLimitKey: string;
  };
}
```

**Registered MCP Tools (25 total):**

| # | Tool Name | Description | Internal Endpoint |
|---|-----------|-------------|-------------------|
| 1 | `agent_create` | Create autonomous agent | `POST /agents` |
| 2 | `agent_terminate` | Stop agent instance | `DELETE /agents/:id` |
| 3 | `agent_status` | Get agent status | `GET /agents/:id` |
| 4 | `agent_list` | List agents in project | `GET /agents` |
| 5 | `task_create` | Create new task | `POST /tasks` |
| 6 | `task_assign` | Assign task to agent/user | `PATCH /tasks/:id` |
| 7 | `task_status` | Get task status | `GET /tasks/:id` |
| 8 | `task_list` | List tasks | `GET /tasks` |
| 9 | `memory_search` | Semantic memory search | `POST /memory/search` |
| 10 | `memory_store` | Store in memory | `POST /memory/store` |
| 11 | `sandbox_execute` | Execute in sandbox | `POST /sandboxes/:id/execute` |
| 12 | `sandbox_create` | Create sandbox | `POST /sandboxes` |
| 13 | `workflow_start` | Start workflow | `POST /workflows/executions` |
| 14 | `workflow_status` | Get workflow status | `GET /workflows/executions/:id` |
| 15 | `code_search` | Search codebase | Internal search service |
| 16 | `code_review` | Request code review | Internal review service |
| 17 | `test_run` | Run tests | `POST /sandboxes/:id/execute` |
| 18 | `deploy` | Deploy application | Internal deploy service |
| 19 | `project_status` | Get project overview | `GET /projects/:id` |
| 20 | `inference_chat` | Chat completion | `POST /inference/chat/completions` |
| 21 | `file_read` | Read file contents | `GET /sandboxes/:id/files/:path` |
| 22 | `file_write` | Write file contents | `POST /sandboxes/:id/files/:path` |
| 23 | `git_commit` | Create git commit | Internal git service |
| 24 | `git_branch` | List/manage branches | Internal git service |
| 25 | `pr_create` | Create pull request | Internal git service |

#### Resource Providers

```typescript
interface MCPResourceProvider {
  // Resource templates expose platform data
  async listResources(): Promise<MCPResource[]>;
  async readResource(uri: string): Promise<ResourceContent>;
  async subscribeToResource(uri: string): Promise<void>;
}

// Resource URI Patterns
const RESOURCE_TEMPLATES = [
  { uri: "aasop://projects/{projectId}", mimeType: "application/json" },
  { uri: "aasop://projects/{projectId}/agents", mimeType: "application/json" },
  { uri: "aasop://projects/{projectId}/tasks", mimeType: "application/json" },
  { uri: "aasop://projects/{projectId}/memory?query={query}", mimeType: "application/json" },
  { uri: "aasop://projects/{projectId}/files/{path}", mimeType: "text/plain" },
  { uri: "aasop://projects/{projectId}/codebase?query={query}", mimeType: "application/json" },
  { uri: "aasop://agents/{agentId}/logs", mimeType: "text/plain" },
  { uri: "aasop://agents/{agentId}/thoughts", mimeType: "application/json" },
  { uri: "aasop://workflows/{executionId}/status", mimeType: "application/json" },
  { uri: "aasop://workflows/{executionId}/history", mimeType: "application/json" },
];
```

#### Prompt Handlers

```typescript
interface MCPPromptHandler {
  async listPrompts(): Prompt[];
  async getPrompt(name: string, arguments?: Record<string, string>): Promise<PromptMessage[]>;
}

// Available Prompts
const PROMPTS = [
  {
    name: "code_review",
    description: "Perform a comprehensive code review",
    arguments: [
      { name: "file_path", description: "Path to file to review", required: true },
      { name: "focus", description: "Review focus: security, performance, style, all", required: false },
    ],
  },
  {
    name: "bug_analysis",
    description: "Analyze a bug and propose fixes",
    arguments: [
      { name: "bug_description", description: "Description of the bug", required: true },
      { name: "error_logs", description: "Relevant error logs", required: false },
    ],
  },
  {
    name: "refactor_plan",
    description: "Create a refactoring plan",
    arguments: [
      { name: "target", description: "Component to refactor", required: true },
      { name: "goal", description: "Refactoring goal", required: true },
    ],
  },
  {
    name: "test_generation",
    description: "Generate comprehensive tests",
    arguments: [
      { name: "target", description: "Function/module to test", required: true },
      { name: "test_types", description: "unit, integration, e2e", required: false },
    ],
  },
  {
    name: "architecture_review",
    description: "Review system architecture",
    arguments: [
      { name: "component", description: "Component to review", required: true },
    ],
  },
  {
    name: "deployment_checklist",
    description: "Pre-deployment verification checklist",
    arguments: [
      { name: "service", description: "Service to deploy", required: true },
      { name: "environment", description: "Target environment", required: true },
    ],
  },
];
```

#### Capability Advertisement

```typescript
const MCP_SERVER_CAPABILITIES = {
  protocolVersion: "2024-11-05",
  capabilities: {
    tools: {
      listChanged: true,    // Tools can be added/removed dynamically
    },
    resources: {
      subscribe: true,       // Clients can subscribe to resource changes
      listChanged: true,
    },
    prompts: {
      listChanged: false,    // Static prompt list
    },
    logging: {},             // Server can send log messages
    completion: {},          // Argument completion supported
  },
  serverInfo: {
    name: "aasop-mcp-server",
    version: "1.0.0",
    vendor: "AASOP",
  },
};
```

---

### MCP Client Support

#### External MCP Client

The platform acts as an MCP client to connect to external MCP servers:

```typescript
interface MCPClientManager {
  // Connection management
  async connectServer(config: MCPServerConfig): Promise<MCPConnection>;
  async disconnectServer(serverId: string): Promise<void>;
  async listConnectedServers(): Promise<MCPServerInfo[]>;

  // Tool discovery and execution
  async discoverTools(serverId: string): Promise<ExternalTool[]>;
  async executeExternalTool(
    serverId: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<ToolResult>;

  // Resource access
  async readExternalResource(serverId: string, uri: string): Promise<ResourceContent>;
  async subscribeToExternalResource(serverId: string, uri: string): Promise<void>;
}

interface MCPServerConfig {
  id: string;
  name: string;
  transport: {
    type: "stdio" | "sse" | "websocket";
    // For stdio
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    // For sse/websocket
    url?: string;
    headers?: Record<string, string>;
  };
  auth?: {
    type: "bearer" | "api_key" | "oauth";
    credentials: Record<string, string>;
  };
  capabilities?: {
    tools?: boolean;
    resources?: boolean;
    prompts?: boolean;
  };
  timeoutMs: number;
  retryPolicy: {
    maxRetries: number;
    backoffMs: number;
  };
}
```

#### Dynamic Tool Loading

When an external MCP server is connected, its tools are dynamically loaded into the platform:

```
1. User configures external MCP server (e.g., Stripe MCP, GitHub MCP)
2. Platform connects and discovers tools
3. Tools are registered with namespacing: `{serverId}_{toolName}`
4. Agents can use these tools in their workflows
5. Usage tracked and billed appropriately
```

| External MCP Server | Tools Exposed | Use Case |
|---------------------|--------------|----------|
| GitHub MCP | repo management, PR creation, issue tracking | Code repository operations |
| Stripe MCP | payment processing, customer management | Billing integration |
| Slack MCP | messaging, channel management | Team notifications |
| Figma MCP | design file access, comment management | Design handoff |
| Notion MCP | page creation, database queries | Documentation |
| Linear MCP | issue tracking, project management | Task synchronization |

---

### A2A Protocol Implementation

#### Agent Discovery

```typescript
interface A2AAgentDiscovery {
  // Agent Card - Advertises capabilities
  async getAgentCard(agentUrl: string): Promise<AgentCard>;

  // Registry - Platform agent directory
  async registerAgent(agentCard: AgentCard): Promise<void>;
  async searchAgents(query: AgentSearchQuery): Promise<AgentCard[]>;
}

interface AgentCard {
  name: string;
  description: string;
  url: string;              // A2A endpoint URL
  provider: {
    organization: string;
    url: string;
  };
  version: string;
  authentication: {
    schemes: string[];      // "OAuth2", "APIKey", "None"
    credentials?: Record<string, string>;
  };
  defaultInputModes: string[];   // "text", "file", "json"
  defaultOutputModes: string[];
  capabilities: {
    streaming: boolean;
    pushNotifications: boolean;
    stateTransitionHistory: boolean;
  };
  skills: Array<{
    id: string;
    name: string;
    description: string;
    tags: string[];
    examples: string[];
    inputModes?: string[];
    outputModes?: string[];
  }>;
}
```

#### Capability Negotiation

```typescript
interface A2ACapabilityNegotiation {
  // Before task delegation, negotiate capabilities
  async negotiate(
    agentCard: AgentCard,
    requirements: TaskRequirements
  ): Promise<NegotiationResult>;
}

interface TaskRequirements {
  inputModes: string[];         // Required input modes
  outputModes: string[];        // Required output modes
  skills: string[];             // Required skill IDs
  constraints: {
    maxLatencyMs?: number;
    requiresStreaming?: boolean;
    requiresPushNotifications?: boolean;
  };
}

interface NegotiationResult {
  compatible: boolean;
  agreedModes: {
    input: string[];
    output: string[];
  };
  estimatedLatencyMs: number;
  limitations: string[];        // Any negotiated limitations
}
```

#### Task Delegation

```typescript
interface A2ATaskDelegation {
  // Send task to external agent
  async sendTask(request: TaskSendRequest): Promise<Task>;

  // Get task status
  async getTask(taskId: string): Promise<Task>;

  // Cancel task
  async cancelTask(taskId: string): Promise<Task>;

  // Set up push notifications
  async subscribeToTask(taskId: string, webhookUrl: string): Promise<void>;
}

interface TaskSendRequest {
  id: string;                   // Task ID (client-generated)
  sessionId?: string;           // Optional session grouping
  acceptedOutputModes?: string[];
  skill?: string;              // Target skill ID
  message: Message;

  // Push notification config
  pushNotification?: {
    url: string;
    authentication?: {
      scheme: string;
      credentials: string;
    };
  };

  // Platform metadata
  metadata?: {
    sourceAgent: string;
    priority: "low" | "normal" | "high" | "critical";
    deadline?: string;
    callbackUrl?: string;
  };
}

interface Task {
  id: string;
  sessionId?: string;
  status: TaskState;
  acceptedOutputModes?: string[];
  history: Message[];
  artifacts?: Artifact[];
  metadata?: Record<string, unknown>;
  // Platform extensions
  platformData?: {
    latencyMs: number;
    costUsd?: number;
    tokensUsed?: number;
  };
}

type TaskState =
  | "submitted"      // Task received, not yet processing
  | "working"        // Agent actively working
  | "input-required" // Agent needs more information
  | "completed"      // Task finished successfully
  | "canceled"       // Task was canceled
  | "failed";        // Task failed

interface Message {
  role: "user" | "agent";
  parts: Part[];
  metadata?: Record<string, unknown>;
}

type Part =
  | { type: "text"; text: string }
  | { type: "file"; file: { name?: string; mimeType?: string; bytes?: string; uri?: string } }
  | { type: "data"; data: Record<string, unknown> }
  | { type: "tool_request"; toolRequest: { name: string; id: string; arguments?: Record<string, unknown> } }
  | { type: "tool_response"; toolResponse: { name: string; id: string; result?: unknown; error?: string } };

interface Artifact {
  name?: string;
  description?: string;
  parts: Part[];
  index?: number;
  append?: boolean;
  lastChunk?: boolean;
  metadata?: Record<string, unknown>;
}
```

#### Message Passing Flow

```
+--------+     +------------------+     +------------------+     +--------+
| Agent A |---->| A2A Client Layer |---->| Transport Layer  |---->| Agent B |
| (Platform)    | (AASOP)          |     | (HTTP/SSE/WS)    |     | (External)
+--------+     +------------------+     +------------------+     +--------+
     |                |                         |                    |
     |  1. createTask()                        |                    |
     |------------->|                          |                    |
     |                |  2. HTTP POST /a2a/tasks |                    |
     |                |------------------------->|                    |
     |                |                          |  3. Process task   |
     |                |                          |------------------->|
     |                |                          |                    |
     |                |  4. Task accepted (202)  |                    |
     |                |<-------------------------|                    |
     |  5. Task ID    |                          |                    |
     |<---------------|                          |                    |
     |                |                          |                    |
     |                |  6. SSE stream / status  |  7. Work completes |
     |                |<-------------------------|<-------------------|
     |  8. Updates    |                          |                    |
     |<---------------|                          |                    |
     |                |                          |                    |
     |                |  9. Get artifacts        |                    |
     |                |------------------------->|------------------->|
     |  10. Results   |                          |                    |
     |<---------------|                          |                    |
```

---

### Interoperability Layer

#### Protocol Translation

```typescript
interface ProtocolTranslator {
  // Internal <-> MCP
  internalToMCPtool(tool: InternalTool): MCPToolDefinition;
  mcpToInternalTool(mcpTool: MCPToolDefinition): InternalTool;

  // Internal <-> A2A
  internalActionToA2ATask(action: PlatformAction): TaskSendRequest;
  a2ATaskToInternalAction(task: Task): PlatformAction;

  // MCP <-> A2A (direct bridging)
  mcpToolToA2ASkill(mcpTool: MCPToolDefinition): Skill;
  a2aSkillToMCPTool(skill: Skill): MCPToolDefinition;
}
```

**Translation Mappings:**

| Internal Concept | MCP Equivalent | A2A Equivalent |
|-----------------|----------------|----------------|
| Agent | Tool (`agent_create`) | Agent Card + Task |
| Task | Resource (`task://{id}`) | Task object |
| Workflow | Tool (`workflow_start`) | Task with streaming |
| Memory | Resource (`memory://{id}`) | Artifact |
| Sandbox | Tool (`sandbox_execute`) | Task with file parts |
| File | Resource (`file://{path}`) | File part |
| Log | Resource (`logs://{id}`) | Text artifact |

#### Unified Message Envelope

```typescript
interface UnifiedMessage {
  // Protocol-agnostic envelope
  envelope: {
    version: "1.0.0";
    messageId: string;
    timestamp: string;
    sourceProtocol: "internal" | "mcp" | "a2a";
    targetProtocol: "internal" | "mcp" | "a2a";
  };

  // Sender/receiver
  routing: {
    from: EntityReference;
    to: EntityReference;
    replyTo?: string;
    correlationId?: string;
  };

  // Payload (protocol-specific)
  payload: {
    type: "tool_call" | "tool_result" | "task_request" | "task_response"
        | "resource_request" | "resource_response" | "notification";
    data: unknown;
  };

  // Cross-protocol metadata
  metadata: {
    auth: AuthContext;
    trace: TraceContext;
    priority: "low" | "normal" | "high" | "critical";
    ttlSeconds: number;
  };
}
```

---

### External Tool Integration

#### IDE Integrations

| IDE | Integration Type | Features | Protocol |
|-----|-----------------|----------|----------|
| **VS Code** | Extension | Inline agents, code lens, sidebar | LSP + MCP |
| **Cursor** | MCP Server | Composer integration, agent commands | MCP |
| **Windsurf** | Plugin | Cascade integration, file operations | MCP |
| **JetBrains** | Plugin | Tool window, gutter icons, intentions | LSP + MCP |
| **Vim/Neovim** | Plugin | Command-line agents, buffer integration | MCP (stdio) |
| **Emacs** | Package | Comint integration, org-mode support | MCP (stdio) |

**VS Code Extension Features:**
- Tree view of agents and tasks
- Code lens for "Review with Agent" / "Explain this"
- Status bar showing active agent count
- Command palette integration (`AASOP: Create Agent`, `AASOP: Search Memory`)
- Webview panel for agent monitoring
- Real-time collaboration cursors via WebSocket

#### CLI Tool

```bash
# Authentication
aasop auth login                    # OAuth device flow
aasop auth status                   # Show auth status
aasop auth logout                   # Clear credentials

# Projects
aasop projects list                 # List projects
aasop projects create "My Project"  # Create project
aasop projects switch <id>          # Set default project

# Agents
aasop agents list                   # List agents
aasop agents create --type code --task "Fix auth bug"  # Create agent
aasop agents logs <id>              # Stream agent logs
aasop agents status <id>            # Get agent status

# Tasks
aasop tasks list                    # List tasks
aasop tasks create "Fix auth bug"   # Create task
aasop tasks assign <id> --agent <agent-id>  # Assign task

# Memory
aasop memory search "auth decisions" # Search memory
aasop memory store "Decision: use JWT" # Store in memory

# Voice
aasop voice start                   # Start voice session
aasop voice status                  # Voice session status

# MCP
aasop mcp connect <server-config>   # Connect MCP server
aasop mcp list                      # List connected servers
aasop mcp tools                     # List available tools
```

#### CI/CD Tool Integration

| Platform | Integration | Features |
|----------|------------|----------|
| **GitHub Actions** | Official action | Trigger agents on PR, report status |
| **GitLab CI** | Custom integration | Pipeline-native agent execution |
| **CircleCI** | Orb | Agent orchestration in CI pipelines |
| **Jenkins** | Plugin | Build-step agents, pipeline DSL |
| **ArgoCD** | Webhook + API | GitOps-driven agent deployment |
| **Terraform** | Provider | Infrastructure agent provisioning |

**GitHub Action Example:**
```yaml
- uses: aasop/platform-action@v1
  with:
    api-key: ${{ secrets.AASOP_API_KEY }}
    project: "my-project"
    agent-type: "code-reviewer"
    trigger: "pull_request"
    config: |
      focus_areas: ["security", "performance"]
      auto_approve_minor: true
      comment_on_pr: true
```

---

### Third-Party Agent Communication

#### Message Envelope Standard

```typescript
interface AgentMessageEnvelope {
  // Standard header
  header: {
    version: "1.0.0";
    messageId: string;
    timestamp: string;
    messageType: "request" | "response" | "notification" | "error";
    protocol: "a2a" | "mcp" | "internal" | "custom";
  };

  // Sender/receiver identity
  identity: {
    from: {
      agentId: string;
      platform: string;        // "aasop", "openai", "anthropic", etc.
      endpoint?: string;        // Callback URL
      publicKey?: string;       // For message verification
    };
    to: {
      agentId: string;
      platform: string;
      endpoint?: string;
    };
  };

  // Authentication
  auth: {
    scheme: "jwt" | "hmac" | "mTLS" | "api_key";
    token: string;
    expiresAt: string;
  };

  // Message body
  body: {
    intent: string;
    payload: unknown;
    attachments?: Array<{
      name: string;
      type: string;
      content: string;          // Base64 encoded
      size: number;
    }>;
  };

  // QoS
  qos: {
    priority: "low" | "normal" | "high" | "critical";
    ttlSeconds: number;
    deliveryGuarantee: "at_most_once" | "at_least_once" | "exactly_once";
    retryPolicy?: {
      maxRetries: number;
      backoffMs: number;
    };
  };

  // Signature
  signature: {
    algorithm: "ed25519" | "rsa-sha256";
    value: string;
  };
}
```

#### Authentication Methods

| Method | Use Case | Implementation |
|--------|----------|---------------|
| **JWT** | Platform-to-platform | RS256, JWKS endpoint |
| **HMAC** | Trusted agent pairs | Shared secret, SHA-256 |
| **mTLS** | Enterprise integrations | X.509 certificates |
| **API Key** | Simple integrations | Scoped, rotated keys |
| **OAuth 2.0** | Public agent marketplaces | Standard OAuth flow |

#### Rate Limiting for External Agents

```typescript
interface AgentRateLimitConfig {
  // Per-agent limits
  requestsPerMinute: number;
  tokensPerMinute: number;
  concurrentTasks: number;

  // Burst handling
  burstAllowance: number;
  burstWindowSeconds: number;

  // Cost limits
  maxCostPerHour: number;
  maxCostPerDay: number;

  // Throttling
  throttleBehavior: "delay" | "reject" | "queue";
  queueMaxDepth: number;
}
```

---

### Memory System Integration

#### External Memory Providers

| Provider | Integration | Protocol | Use Case |
|----------|------------|----------|----------|
| **Mem0** | API Client | REST | User preference memory |
| **Zep** | Embedded | Library | Conversation memory |
| **LangMem** | MCP Server | MCP | LangGraph memory |
| **Chroma** | Direct | Native | Vector storage |
| **Pinecone** | API Client | REST | Managed vector DB |
| **Weaviate** | API Client | GraphQL | Semantic search |

#### Memory Sharing Protocol

```typescript
interface MemorySharingProtocol {
  // Share memory between agents (same or different platforms)
  async shareMemory(request: MemoryShareRequest): Promise<MemoryShareResult>;

  // Query shared memory
  async querySharedMemory(query: SharedMemoryQuery): Promise<MemoryEntry[]>;

  // Revoke shared access
  async revokeAccess(memoryId: string, targetAgent: string): Promise<void>;
}

interface MemoryShareRequest {
  memoryIds: string[];
  sourceAgent: string;
  targetAgents: string[];
  accessLevel: "read" | "write" | "admin";
  scope: "session" | "project" | "organization";
  expiresAt?: string;
  filter?: {
    types?: string[];
    minConfidence?: number;
    tags?: string[];
  };
}
```

---

### Version Compatibility

#### Protocol Versioning Strategy

```
Protocol Version: {major}.{minor}.{patch}

Major: Breaking changes - incompatible wire format
Minor: New features - backward compatible additions
Patch: Bug fixes - no functional changes
```

#### MCP Version Compatibility

| MCP Protocol | Platform Support | Status |
|-------------|-----------------|--------|
| 2024-11-05 | Full | Current |
| 2025-03-26 | Full | Supported (latest) |

```typescript
interface MCPVersionNegotiation {
  // Client sends supported versions
  // Server picks highest compatible
  async negotiateVersion(
    clientVersions: string[]
  ): Promise<{
    agreedVersion: string;
    deprecatedFeatures: string[];
    upcomingChanges: string[];
  }>;
}
```

#### A2A Version Compatibility

| A2A Version | Support Level |
|-------------|--------------|
| 1.0 | Full (current) |

#### Deprecation Strategy

```typescript
interface DeprecationPolicy {
  // Deprecation timeline
  announcement: string;      // Date deprecation announced
  deprecation: string;       // Date feature marked deprecated
  removal: string;           // Date feature removed

  // Migration support
  migrationGuide: string;    // URL to migration documentation
  compatibilityShim: boolean; // Whether shim provided
  shimExpiry: string;        // When shim removed

  // Communication
  apiWarnings: boolean;      // Include Sunset header
  clientNotifications: boolean; // Notify connected clients
  adminAlerts: boolean;      // Alert organization admins
}
```

| Phase | Duration | Actions |
|-------|----------|---------|
| Announcement | 0 days | Blog post, changelog, documentation |
| Grace Period | 90 days | `Sunset` header in responses, warning logs |
| Deprecation | 180 days | Shim layer active, migration tools provided |
| Removal | 365 days | Feature removed, hard errors |

---

## Item 36: Recommended OSS Integrations

### Integration Evaluation Framework

Each integration is evaluated on:

| Criterion | Weight | Description |
|-----------|--------|-------------|
| **Production Readiness** | 25% | Stability, testing, enterprise features |
| **Community Health** | 20% | Contributors, issue resolution, releases |
| **Strategic Alignment** | 20% | Fits platform architecture and roadmap |
| **Maintenance Burden** | 15% | Operational complexity, upgrade effort |
| **Integration Depth** | 10% | How deeply integrated into platform |
| **License Compatibility** | 10% | License fits commercial use |

---

### Workflow/Scheduling

#### Temporal (Primary)

| Attribute | Value |
|-----------|-------|
| **Project** | temporalio/temporal |
| **Purpose** | Durable workflow execution, saga patterns, state machines |
| **Integration Depth** | Core infrastructure - workflow engine backbone |
| **Alternative Considered** | Apache Airflow, Cadence, Netflix Conductor |
| **Justification** | Temporal provides exactly-once execution semantics, built-in saga compensation, and native support for long-running workflows (days/weeks). Its TypeScript SDK is first-class, enabling workflows to be authored in the same language as the rest of the platform. Cadence was considered (Temporal's predecessor) but Temporal has superseded it with better documentation and cloud offerings. Airflow was rejected due to its DAG-centric model being less suitable for dynamic agent workflows. |
| **License** | MIT |
| **Production Readiness** | Enterprise-grade (used by Netflix, Stripe, Datadog) |
| **Community** | Very active - 11,000+ GitHub stars, weekly releases |
| **Integration Pattern** | Embedded server + SDK, Cloud option available |
| **Maintenance Burden** | Medium - requires cluster management unless using Cloud |

```yaml
integration:
  type: core_infrastructure
  deployment: embedded_cluster  # or temporal_cloud
  sdk: temporalio/sdk-typescript
  version_pinning: "~1.10"
  upgrade_policy: quarterly_after_testing
  monitoring: native_otel_integration
```

#### Apache Airflow (Optional/Secondary)

| Attribute | Value |
|-----------|-------|
| **Project** | apache/airflow |
| **Purpose** | Complex ETL pipelines, scheduled data processing |
| **Integration Depth** | Optional - specific batch processing use cases |
| **Justification** | Used only for data pipeline workflows that don't require the durability guarantees of Temporal. Integrated via MCP tool, not as core infrastructure. |
| **License** | Apache 2.0 |
| **Decision** | **Optional** - Include for data-heavy organizations |

---

### Distributed Computing

#### Ray (Primary)

| Attribute | Value |
|-----------|-------|
| **Project** | ray-project/ray |
| **Purpose** | Massively parallel agent execution, distributed inference, cluster scaling |
| **Integration Depth** | Core infrastructure - compute fabric |
| **Alternative Considered** | Apache Spark, Dask, Kubernetes Jobs |
| **Justification** | Ray is purpose-built for ML/AI workloads with excellent Python ecosystem integration. Its actor model maps perfectly to autonomous agents (each agent = actor). Ray Serve provides model serving, Ray Data handles batch processing. Spark was rejected due to JVM complexity and poor Python ergonomics for agent workloads. Dask was a close second but lacks the comprehensive ecosystem (Serve, Train, Tune) that Ray provides. |
| **License** | Apache 2.0 |
| **Production Readiness** | Enterprise-grade (used by Uber, Shopify, Instacart) |
| **Community** | Very active - 35,000+ GitHub stars, strong ecosystem |
| **Integration Pattern** | Ray Cluster + Ray Serve for model inference |

```yaml
integration:
  type: core_infrastructure
  deployment: ray_cluster_on_k8s
  components:
    - ray_core: agent distribution
    - ray_serve: model serving
    - ray_data: batch inference
  version_pinning: "~2.39"
  autoscaling: enabled
  gpu_support: native
```

#### Dask (Optional)

| Attribute | Value |
|-----------|-------|
| **Project** | dask/dask |
| **Purpose** | Lightweight parallel computing, dataframe operations |
| **Integration Depth** | Optional - data processing tasks |
| **Justification** | Lighter alternative to Ray for simple parallelization. Can be used alongside Ray for data-heavy agent tasks. |
| **Decision** | **Optional** - Include for data processing agents |

---

### Message Queue

#### NATS JetStream (Primary)

| Attribute | Value |
|-----------|-------|
| **Project** | nats-io/nats-server |
| **Purpose** | Event streaming, agent communication, job distribution |
| **Integration Depth** | Core infrastructure - message backbone |
| **Alternative Considered** | Apache Kafka, Redis Streams, RabbitMQ |
| **Justification** | NATS JetStream provides the best balance of simplicity, performance, and features for our use case. It supports at-least-once delivery, durable streams, consumer groups, and key-value storage - all with a single binary and simple operation. Kafka was rejected due to operational complexity (ZooKeeper/KRaft, partition management). Redis Streams lacks durability guarantees. RabbitMQ's AMQP model is less suitable for event streaming. NATS also has excellent WebSocket support for client connections. |
| **License** | Apache 2.0 |
| **Production Readiness** | Enterprise-grade, CNCF sandbox |
| **Community** | Active - 15,000+ stars, commercial support (Synadia) |

```yaml
integration:
  type: core_infrastructure
  deployment: nats_cluster_on_k8s
  features:
    - jetstream: durable_streams
    - leafnodes: edge_deployment
    - websocket_gateway: client_connections
  version_pinning: "~2.10"
```

#### Apache Kafka (Optional)

| Attribute | Value |
|-----------|-------|
| **Project** | apache/kafka |
| **Purpose** | High-throughput event streaming, audit logs |
| **Integration Depth** | Optional - specific high-throughput use cases |
| **Justification** | Considered for organizations already running Kafka. Provides higher throughput than NATS for specific use cases. |
| **Decision** | **Optional** - Support as alternative, default to NATS |

---

### Vector Database

#### Qdrant (Primary)

| Attribute | Value |
|-----------|-------|
| **Project** | qdrant/qdrant |
| **Purpose** | Vector storage for semantic memory, code embeddings, document search |
| **Integration Depth** | Core infrastructure - memory vector store |
| **Alternative Considered** | Milvus, Weaviate, pgvector, Pinecone |
| **Justification** | Qdrant offers the best self-hosted vector database experience with minimal operational overhead (single binary), excellent Rust-based performance, and rich filtering capabilities. It supports payload-based filtering crucial for multi-tenant memory storage. Milvus requires more complex deployment (multiple components). Weaviate has GraphQL complexity. pgvector is excellent for simple cases but doesn't scale as well for large vector workloads. Pinecone is managed-only (vendor lock-in). |
| **License** | Apache 2.0 |
| **Production Readiness** | Enterprise-ready, managed cloud available |
| **Community** | Active - 21,000+ stars, growing rapidly |

```yaml
integration:
  type: core_infrastructure
  deployment: qdrant_cluster_on_k8s
  distance_metric: cosine
  indexing: hnsw
  quantization: scalar  # for memory efficiency
  version_pinning: "~1.12"
```

#### pgvector (Secondary)

| Attribute | Value |
|-----------|-------|
| **Project** | pgvector/pgvector |
| **Purpose** | Simple vector operations alongside relational data |
| **Integration Depth** | Secondary - metadata + simple vectors |
| **Justification** | Used for simple vector needs where data already lives in PostgreSQL. Stores user preferences, small embedding caches. Not suitable for large-scale semantic search. |

#### Milvus (Optional)

| Attribute | Value |
|-----------|-------|
| **Project** | milvus-io/milvus |
| **Purpose** | Large-scale vector search, GPU index building |
| **Integration Depth** | Optional - enterprise deployments with massive vector counts |
| **Justification** | Best for billion-scale vector workloads with GPU acceleration. More complex deployment than Qdrant. |
| **Decision** | **Optional** - Enterprise tier only |

---

### Observability

#### OpenTelemetry (Primary)

| Attribute | Value |
|-----------|-------|
| **Project** | open-telemetry/opentelemetry-collector |
| **Purpose** | Distributed tracing, metrics collection, log correlation |
| **Integration Depth** | Core infrastructure - instrumentation standard |
| **Alternative Considered** | Jaeger directly, StatsD, custom tracing |
| **Justification** | OpenTelemetry is the industry standard for observability instrumentation. It provides vendor-neutral APIs for traces, metrics, and logs. The Collector enables flexible pipeline configuration for processing and exporting telemetry. All platform services instrumented with OTel SDKs. |
| **License** | Apache 2.0 |
| **Integration Pattern** | OTel SDKs in all services + Collector deployment |

```yaml
integration:
  type: core_infrastructure
  sdks:
    - opentelemetry-js for Node.js services
    - opentelemetry-python for agent runtimes
    - opentelemetry-rust for performance-critical components
  collector:
    deployment: daemonset_on_k8s
    processors: batch, memory_limiter, resource
    exporters: prometheus, jaeger, otlp
```

#### Prometheus + Grafana (Primary)

| Attribute | Value |
|-----------|-------|
| **Projects** | prometheus/prometheus, grafana/grafana |
| **Purpose** | Metrics storage, visualization, alerting |
| **Integration Depth** | Core infrastructure - monitoring stack |
| **Alternative Considered** | Datadog, New Relic, VictoriaMetrics |
| **Justification** | Prometheus is the CNCF-standard metrics database with excellent query language (PromQL). Grafana provides best-in-class visualization. Both are OSS-native and integrate seamlessly with Kubernetes. VictoriaMetrics considered as higher-performance alternative but Prometheus is sufficient for most deployments. |
| **License** | Apache 2.0 |

#### Langfuse (Primary)

| Attribute | Value |
|-----------|-------|
| **Project** | langfuse/langfuse |
| **Purpose** | LLM tracing, prompt management, cost tracking |
| **Integration Depth** | Deep integration - all LLM calls traced |
| **Alternative Considered** | Weights & Biases, MLflow, HoneyHive |
| **Justification** | Langfuse is purpose-built for LLM observability with features specifically designed for agent workflows: trace visualization, prompt versioning, cost tracking per call, evaluation scoring. Self-hostable (critical for data privacy). Native OpenTelemetry integration. |
| **License** | MIT (open core) |

```yaml
integration:
  type: deep_integration
  deployment: self_hosted
  features:
    - llm_tracing: all_inference_calls
    - prompt_management: versioned_prompts
    - cost_tracking: per_org_per_project
    - evaluations: automated_scoring
  version_pinning: "~3.0"
```

#### PostHog (Primary)

| Attribute | Value |
|-----------|-------|
| **Project** | PostHog/posthog |
| **Purpose** | Product analytics, feature flags, session recording |
| **Integration Depth** | Medium - analytics and experimentation |
| **Alternative Considered** | Amplitude, Mixpanel, LaunchDarkly |
| **Justification** | PostHog provides comprehensive product analytics with the advantage of being self-hostable. Feature flags enable gradual rollout of agent capabilities. Session recording helps understand user interaction patterns. Open source core with optional paid features. |
| **License** | MIT |

---

### Realtime

#### LiveKit (Primary)

| Attribute | Value |
|-----------|-------|
| **Project** | livekit/livekit |
| **Purpose** | Real-time audio/video streaming, voice agent infrastructure |
| **Integration Depth** | Core infrastructure - voice and collaboration backbone |
| **Alternative Considered** | Mediasoup, Jitsi, 100ms, Daily.co |
| **Justification** | LiveKit is purpose-built for real-time AI applications with excellent WebRTC infrastructure, built-in E2EE, and first-class support for AI agents (LiveKit Agents framework). It handles the complexity of WebRTC signaling, media routing, and scaling. The Agents framework provides the scaffolding for voice AI pipelines (STT -> LLM -> TTS). Mediasoup is more flexible but requires more custom development. Jitsi is too meeting-focused. |
| **License** | Apache 2.0 |
| **Production Readiness** | Enterprise-grade (used by OpenAI, Character.AI, Spotify) |
| **Community** | Very active - 11,000+ stars, rapid development |

```yaml
integration:
  type: core_infrastructure
  deployment: livekit_cloud or self_hosted
  components:
    - livekit_server: media_routing
    - livekit_agents: voice_ai_pipeline
    - egress: recording
  version_pinning: "~1.8"
```

#### Socket.io (Secondary)

| Attribute | Value |
|-----------|-------|
| **Project** | socketio/socket.io |
| **Purpose** | WebSocket fallback, realtime events, presence |
| **Integration Depth** | Medium - general realtime communication |
| **Alternative Considered** | SockJS, WS (native), SSE only |
| **Justification** | Socket.io provides robust fallback mechanisms (long-polling for networks blocking WebSocket) and room-based broadcasting ideal for project-specific real-time updates. Used for non-voice real-time features (collaboration cursors, status updates, typing indicators). Native WS used for high-frequency voice data. |
| **License** | MIT |

---

### ML Inference

#### vLLM (Primary)

| Attribute | Value |
|-----------|-------|
| **Project** | vllm-project/vllm |
| **Purpose** | High-throughput LLM serving, self-hosted model inference |
| **Integration Depth** | Core infrastructure - inference engine |
| **Alternative Considered** | TensorRT-LLM, TGI, SGLang, llama.cpp |
| **Justification** | vLLM offers state-of-the-art serving throughput via PagedAttention memory management. Supports 50+ model architectures, tensor parallelism, pipeline parallelism, and speculative decoding. Continuous batching maximizes GPU utilization. Best balance of performance, compatibility, and community for production serving. TensorRT-LLM offers slightly better performance but requires TensorRT ecosystem lock-in. TGI is simpler but less performant. |
| **License** | Apache 2.0 |
| **Production Readiness** | Production-ready (used by Roblox, DoorDash, Shopify) |
| **Community** | Very active - 35,000+ stars, rapid iteration |

```yaml
integration:
  type: core_infrastructure
  deployment: kubernetes_with_gpu_nodes
  features:
    - paged_attention: memory_efficiency
    - continuous_batching: throughput
    - speculative_decoding: latency_reduction
    - tensor_parallelism: multi_gpu
    - lora_adapters: fine_tuned_models
  model_support: 50+ architectures
  version_pinning: "~0.6"
```

#### SGLang (Secondary)

| Attribute | Value |
|-----------|-------|
| **Project** | sgl-project/sglang |
| **Purpose** | Structured generation, fast inference for specific workloads |
| **Integration Depth** | Medium - structured output inference |
| **Justification** | SGLang excels at structured generation (JSON mode, constrained decoding) with RadixAttention for automatic KV cache reuse. Used as secondary inference engine when structured outputs are primary requirement. |
| **License** | Apache 2.0 |

#### llama.cpp (Secondary)

| Attribute | Value |
|-----------|-------|
| **Project** | ggerganov/llama.cpp |
| **Purpose** | Edge deployment, CPU inference, quantized models |
| **Integration Depth** | Medium - edge and cost-optimized inference |
| **Justification** | Essential for running models on CPU-only nodes, edge deployments, and highly cost-sensitive workloads. Supports extensive quantization (Q4_K_M, Q5_K_M, IQ4_XS). Used as fallback when GPU resources are unavailable. |
| **License** | MIT |

#### Text Generation Inference (TGI) - Optional

| Attribute | Value |
|-----------|-------|
| **Project** | huggingface/text-generation-inference |
| **Purpose** | HuggingFace-native model serving |
| **Integration Depth** | Optional - HF ecosystem integration |
| **Justification** | Best integration with HuggingFace Hub. Simpler deployment than vLLM for HF models. Less performant but easier to operate. |
| **Decision** | **Optional** - For HF-centric deployments |

---

### API Gateway

#### Kong (Primary)

| Attribute | Value |
|-----------|-------|
| **Project** | Kong/kong |
| **Purpose** | API gateway, rate limiting, auth, request routing |
| **Integration Depth** | Core infrastructure - API edge |
| **Alternative Considered** | Traefik, Envoy, NGINX Ingress |
| **Justification** | Kong provides the most comprehensive plugin ecosystem for API management. Key plugins: rate limiting (multi-tier), JWT validation, OIDC, request/response transformation, caching. Lua-based plugin system enables custom logic. Kong Manager provides good UI for configuration. Traefik is simpler but less feature-rich for API management specifically. |
| **License** | Apache 2.0 |

```yaml
integration:
  type: core_infrastructure
  deployment: kong_on_k8s
  plugins:
    - rate-limiting: tier_based
    - jwt: token_validation
    - key-auth: api_key_auth
    - oauth2: oauth_flows
    - request-transformer: header_injection
    - prometheus: metrics
    - proxy-cache: response_caching
    - cors: cross_origin
  version_pinning: "~3.8"
```

#### Traefik (Secondary)

| Attribute | Value |
|-----------|-------|
| **Project** | traefik/traefik |
| **Purpose** | Ingress controller, service mesh edge |
| **Integration Depth** | Medium - Kubernetes ingress |
| **Justification** | Excellent Kubernetes integration with automatic service discovery. Used as ingress controller alongside Kong. Dynamic configuration via CRDs. Native Let's Encrypt support. |
| **License** | MIT |

---

### Auth

#### Keycloak (Primary - Self-Hosted)

| Attribute | Value |
|-----------|-------|
| **Project** | keycloak/keycloak |
| **Purpose** | Identity and access management, SSO, federation |
| **Integration Depth** | Core infrastructure - auth provider |
| **Alternative Considered** | Auth0 (managed), Okta, Casdoor, Authentik |
| **Justification** | Keycloak provides enterprise-grade IAM with comprehensive features: SAML/OIDC support, social login, LDAP/AD federation, multi-tenancy via realms, fine-grained authorization policies. Self-hosting provides data sovereignty. Large community and proven at scale. Auth0 considered as managed alternative but rejected due to cost at scale and vendor lock-in concerns. |
| **License** | Apache 2.0 |

```yaml
integration:
  type: core_infrastructure
  deployment: keycloak_on_k8s
  features:
    - realms: org_isolation
    - identity_providers: oauth_saml_ldap
    - user_federation: active_directory
    - authorization_services: fine_grained_policies
    - admin_console: ui_management
  version_pinning: "~25.0"
```

#### Auth0 (Alternative - Managed)

| Attribute | Value |
|-----------|-------|
| **Project** | auth0.com (managed) |
| **Purpose** | Managed authentication service |
| **Integration Depth** | Alternative to Keycloak |
| **Justification** | Recommended for teams without IAM operational expertise. Faster time-to-market. Higher cost at scale ($0.02-0.05 per MAU). Good for initial launch, migrate to Keycloak when scale justifies the operational investment. |
| **Decision** | **Alternative** - For initial launch or small teams |

---

### Storage

#### MinIO (Primary)

| Attribute | Value |
|-----------|-------|
| **Project** | minio/minio |
| **Purpose** | Object storage, artifact storage, file uploads |
| **Integration Depth** | Core infrastructure - blob storage |
| **Alternative Considered** | Ceph, SeaweedFS, cloud-native (S3/GCS) |
| **Justification** | MinIO provides S3-compatible object storage with excellent Kubernetes integration (operator available). Used for: sandbox file snapshots, build artifacts, user uploads, model weights cache. Erasure coding provides durability. Ceph is more powerful but significantly more complex to operate. SeaweedFS is lighter but less mature. |
| **License** | AGPL v3 (open core with commercial features) |

```yaml
integration:
  type: core_infrastructure
  deployment: minio_operator_on_k8s
  features:
    - erasure_coding: data_durability
    - bucket_replication: cross_cluster
    - lifecycle_management: automatic_cleanup
    - encryption: sse_s3
  version_pinning: "~2024.11"
```

#### Ceph (Optional)

| Attribute | Value |
|-----------|-------|
| **Project** | ceph/ceph |
| **Purpose** | Unified storage (block, file, object) |
| **Integration Depth** | Optional - large-scale deployments |
| **Justification** | Unified storage solution for organizations wanting block (PVCs), file (shared filesystem), and object storage in one platform. Significant operational expertise required. |
| **Decision** | **Optional** - Enterprise on-premise deployments |

---

### Search

#### Meilisearch (Primary)

| Attribute | Value |
|-----------|-------|
| **Project** | meilisearch/meilisearch |
| **Purpose** | Full-text search, typo-tolerant search, faceted search |
| **Integration Depth** | Core infrastructure - search engine |
| **Alternative Considered** | Elasticsearch, Typesense, Sonic |
| **Justification** | Meilisearch provides an outstanding developer experience with instant search, typo tolerance, faceting, and synonym support - all with a simple API and single binary deployment. Much easier to operate than Elasticsearch. Used for: task search, documentation search, agent marketplace search, code search (combined with tree-sitter). |
| **License** | MIT |

```yaml
integration:
  type: core_infrastructure
  deployment: meilisearch_on_k8s
  features:
    - typo_tolerance: enabled
    - faceted_search: status_priority_assignee
    - synonyms: custom_mappings
    - highlighting: search_results
  version_pinning: "~1.11"
```

#### Elasticsearch (Secondary)

| Attribute | Value |
|-----------|-------|
| **Project** | elastic/elasticsearch |
| **Purpose** | Complex search, log analytics, aggregations |
| **Integration Depth** | Medium - log search and complex analytics |
| **Justification** | Used for log analytics (via Filebeat) and complex aggregation queries that Meilisearch doesn't support. Also serves as secondary search for advanced use cases. |
| **License** | Elastic License / SSPL (not OSS) |
| **Decision** | Use OpenSearch fork if strict OSS required |

---

### Code Intelligence

#### Tree-sitter (Primary)

| Attribute | Value |
|-----------|-------|
| **Project** | tree-sitter/tree-sitter |
| **Purpose** | Parsing, syntax highlighting, code structure analysis |
| **Integration Depth** | Deep integration - all code operations |
| **Alternative Considered** | LSP directly, ANTLR, custom parsers |
| **Justification** | Tree-sitter provides fast, incremental parsing for 100+ languages with robust error recovery. Critical for: code understanding, symbol extraction, scope analysis, diff parsing. The grammar ecosystem is extensive. Used in combination with LSP for semantic analysis. |
| **License** | MIT |

```yaml
integration:
  type: deep_integration
  usage:
    - code_parsing: syntax_trees
    - symbol_extraction: definitions_references
    - scope_analysis: variable_context
    - diff_parsing: change_analysis
  grammars: 100+ languages via npm packages
```

#### LSP (Language Server Protocol) (Primary)

| Attribute | Value |
|-----------|-------|
| **Project** | microsoft/language-server-protocol |
| **Purpose** | Semantic code intelligence, completions, diagnostics |
| **Integration Depth** | Deep integration - code understanding |
| **Justification** | LSP provides standardized access to language-specific intelligence: go-to-definition, find-references, completions, diagnostics, refactoring. The platform connects to language servers for each project language to provide deep code understanding to agents. |
| **License** | MIT |

---

### Terminal

#### xterm.js (Primary)

| Attribute | Value |
|-----------|-------|
| **Project** | xtermjs/xterm.js |
| **Purpose** | In-browser terminal emulator, shell sessions |
| **Integration Depth** | Deep integration - web IDE terminal |
| **Alternative Considered** | hterm, ttyd (server-side), custom implementation |
| **Justification** | xterm.js is the industry standard for browser-based terminals (used by VS Code, GitHub Codespaces, Jupyter). Provides full terminal emulation, WebGL rendering, addon ecosystem (fit, web-links, search, unicode). Essential for the web-based IDE component. |
| **License** | MIT |

```yaml
integration:
  type: deep_integration
  addons:
    - xterm-addon-fit: terminal_resizing
    - xterm-addon-web-links: clickable_urls
    - xterm-addon-search: find_in_terminal
    - xterm-addon-webgl: gpu_accelerated_rendering
  backend: websocket_shell_session
```

---

### Complete OSS Integration Summary Table

| Category | Primary | Secondary | Optional |
|----------|---------|-----------|----------|
| Workflow | Temporal | - | Airflow |
| Distributed Computing | Ray | Dask | - |
| Message Queue | NATS JetStream | - | Kafka |
| Vector Database | Qdrant | pgvector | Milvus |
| Observability | OpenTelemetry + Prometheus + Grafana + Langfuse + PostHog | - | - |
| Realtime | LiveKit | Socket.io | - |
| ML Inference | vLLM | SGLang, llama.cpp | TGI |
| API Gateway | Kong | Traefik | - |
| Auth | Keycloak | - | Auth0 (managed) |
| Storage | MinIO | - | Ceph |
| Search | Meilisearch | Elasticsearch | - |
| Code Intelligence | Tree-sitter + LSP | - | - |
| Terminal | xterm.js | - | - |

---

## Item 37: Build-vs-Buy Analysis

### Analysis Methodology

For each component, we analyze three options:

| Dimension | Build | Buy (SaaS) | Hybrid |
|-----------|-------|-----------|--------|
| **Effort** | Engineering months | Integration weeks | Customized integration |
| **Time to Market** | Long | Short | Medium |
| **Risk** | Technical, execution | Vendor, lock-in | Both, mitigated |
| **Long-term Cost** | Engineering + maintenance | Recurring subscription | Combined |
| **Customization** | Unlimited | Limited | Moderate |
| **Data Control** | Full | Vendor-dependent | Partial |

---

### Workflow Engine

| Dimension | Assessment |
|-----------|-----------|
| **Build** | 12-18 engineering months. Build a durable execution engine with exactly-once semantics, saga compensation, state persistence, worker distribution. High technical risk - distributed systems are hard. |
| **Buy - Temporal Cloud** | $0.0005/workflow execution + $50/month per 100K actions. Instant deployment. No operational burden. Managed upgrades. |
| **Buy - Self-hosted Temporal** | Open source (MIT). 2-3 months setup. Requires operational expertise. Ongoing cluster maintenance. |
| **Hybrid** | Self-hosted Temporal core + custom DSL for agent-specific workflows. |

**Recommendation: BUY (Self-hosted Temporal)**

**Justification:** Temporal is purpose-built for exactly this use case. Building a durable workflow engine would take 12-18 months with significant technical risk. Temporal's open-source offering provides full capability without vendor lock-in. The saga pattern support is critical for agent workflows that need compensation. Self-hosting provides data control while the Cloud option exists for organizations preferring managed.

**Decision Criteria:**
- If team has <3 distributed systems engineers -> Temporal Cloud
- If data residency required -> Self-hosted Temporal
- Reversal condition: If Temporal changes license or pricing >10x, evaluate Netflix Conductor

---

### Message Queue

| Dimension | Assessment |
|-----------|-----------|
| **Build** | 6-9 engineering months. Build event streaming with persistence, consumer groups, at-least-once delivery. Moderate risk - well-understood domain. |
| **Buy - Confluent Cloud (Kafka)** | $0.10/GB ingested + $0.02/hour per CKU. Managed Kafka. |
| **Buy - NATS Cloud (Synadia)** | Usage-based, ~$100-500/month for typical workloads. |
| **Hybrid** | NATS JetStream self-hosted + cloud backup. |

**Recommendation: BUY (Self-hosted NATS JetStream)**

**Justification:** NATS JetStream provides 95% of Kafka's features with 10% of the operational complexity. Single binary, no ZooKeeper, no KRaft. Consumer groups, durable streams, exactly-once semantics all included. Self-hosting on Kubernetes is straightforward with the NATS operator. The operational burden is minimal compared to Kafka.

**Decision Criteria:**
- Default to self-hosted NATS
- If organization already has Kafka expertise -> use existing Kafka
- If >100K messages/second sustained -> consider Kafka
- Reversal condition: If NATS doesn't scale to required throughput, migrate to Kafka

---

### Vector Database

| Dimension | Assessment |
|-----------|-----------|
| **Build** | 3-6 engineering months for basic HNSW + metadata filtering. 12+ months for production-grade with distributed scaling. |
| **Buy - Pinecone** | $0.10 per 1M vectors/month (Starter). $70-350/month (Standard). Fully managed. |
| **Buy - Weaviate Cloud** | ~$0.05/1M vectors + query costs. Good performance. |
| **Hybrid** | Qdrant self-hosted with cloud option for disaster recovery. |

**Recommendation: BUY (Self-hosted Qdrant)**

**Justification:** Qdrant provides excellent vector search with minimal operational overhead. Building a vector DB would require deep expertise in approximate nearest neighbor algorithms and distributed systems. Pinecone is excellent but represents vendor lock-in for a core data store. Qdrant's single-binary deployment and Kubernetes operator make self-hosting practical. Managed Qdrant Cloud available as migration path.

**Decision Criteria:**
- Default to self-hosted Qdrant
- If <100K vectors and minimal ops -> Pinecone for speed
- If already using PostgreSQL heavily -> pgvector for simplicity
- Reversal condition: If vector count exceeds 1B, evaluate Milvus

---

### Observability

| Dimension | Assessment |
|-----------|-----------|
| **Build** | 6-12 months for basic tracing/metrics. Infinite scope for advanced features. |
| **Buy - Datadog** | $70/host/month + $1.50M custom metrics + $1.27M spans. Comprehensive but expensive. |
| **Buy - New Relic** | ~$49/host/month. Good APM features. |
| **Hybrid** | OSS stack (Prometheus + Grafana + Jaeger + Langfuse) + managed backup. |

**Recommendation: HYBRID (OSS core + selective SaaS)**

**Justification:** The OSS observability stack (Prometheus + Grafana + Jaeger + OpenTelemetry) is production-grade and used by Fortune 500 companies. Langfuse is purpose-built for LLM observability. This provides 80% of Datadog's functionality at 10% of the cost. For specific advanced features (synthetic monitoring, advanced anomaly detection), supplement with Datadog or New Relic.

**Stack:**
- Metrics: Prometheus + Grafana (self-hosted)
- Traces: Jaeger or Grafana Tempo (self-hosted)
- Logs: Loki or Elasticsearch (self-hosted)
- LLM tracing: Langfuse (self-hosted)
- Product analytics: PostHog (self-hosted)

**Decision Criteria:**
- Default to full OSS stack
- If team lacks observability expertise -> Datadog for first 6 months, migrate to OSS
- Reversal condition: If operational burden exceeds 0.5 FTE, consider Datadog

---

### Auth/SSO

| Dimension | Assessment |
|-----------|-----------|
| **Build** | 6-12 months for OAuth, SAML, LDAP, MFA, session management. High security risk if done wrong. |
| **Buy - Auth0** | $23-245/month for 10K MAU. Scales to millions. Comprehensive features. |
| **Buy - Okta/WorkOS** | Enterprise-focused. $2-15/user/month. |
| **Hybrid** | Keycloak self-hosted + Auth0 fallback. |

**Recommendation: BUY (Keycloak self-hosted)**

**Justification:** Authentication is security-critical and shouldn't be built in-house unless absolutely necessary. Keycloak provides enterprise-grade IAM (OAuth, SAML, LDAP, MFA, fine-grained authz) with 10+ years of production use. Self-hosting provides data control. The operational burden is moderate (PostgreSQL backend, HA setup). For initial launch with <1000 users, Auth0 provides faster time-to-market.

**Decision Criteria:**
- Phase 1 (<1000 users): Auth0 for speed
- Phase 2 (>1000 users): Migrate to Keycloak
- Enterprise requirement: Keycloak from day 1
- Reversal condition: If Keycloak maintenance >0.5 FTE, evaluate managed alternatives

---

### Realtime

| Dimension | Assessment |
|-----------|-----------|
| **Build** | 6-9 months for WebRTC infrastructure, SFU, signaling, media routing. High complexity. |
| **Buy - LiveKit Cloud** | $0.0018/participant-minute. ~$78/month for 1000 participant-hours. |
| **Buy - 100ms** | $4/1000 participant-minutes. Competitor to LiveKit. |
| **Hybrid** | LiveKit self-hosted + cloud burst. |

**Recommendation: BUY (LiveKit Cloud initially, self-host at scale)**

**Justification:** WebRTC infrastructure is notoriously complex to build and operate. LiveKit provides the most mature open-source WebRTC infrastructure with specific support for AI agents. LiveKit Cloud provides instant scaling without operational burden. Self-hosting option provides cost savings at scale (>10K participant-hours/month) and data control.

**Decision Criteria:**
- Phase 1: LiveKit Cloud
- Scale threshold: Self-host when >$2000/month on Cloud
- Reversal condition: If LiveKit pricing changes, evaluate 100ms or Daily.co

---

### Voice

| Dimension | Assessment |
|-----------|-----------|
| **Build** | 18-24 months for STT + TTS + NLU + conversational AI. Requires ML expertise. |
| **Buy - Deepgram (STT)** | $0.0043/minute (Nova-2). Highly accurate, low latency. |
| **Buy - ElevenLabs (TTS)** | $5/month (Starter) - $330/month (Business). Best quality voices. |
| **Hybrid** | Deepgram + ElevenLabs for production, Whisper local for fallback/privacy. |

**Recommendation: BUY (Hybrid: Deepgram + ElevenLabs + local Whisper fallback)**

**Justification:** Voice AI is a specialized domain requiring significant ML expertise and infrastructure. Deepgram provides the best STT accuracy/latency tradeoff. ElevenLabs provides industry-leading voice quality. Both offer competitive pricing. Local Whisper via Whisper.cpp or vLLM provides privacy fallback and cost optimization for high-volume scenarios.

**Architecture:**
- STT: Deepgram (primary) -> Whisper local (fallback)
- TTS: ElevenLabs (primary) -> Cartesia (secondary) -> Piper TTS (local fallback)
- NLU/Conversational: Built on top of LLM (GPT-4o/Claude) + custom intent recognition
- Pipeline: LiveKit Agents framework orchestrates STT->LLM->TTS

**Decision Criteria:**
- Default to Deepgram + ElevenLabs
- If privacy required (healthcare, finance) -> Whisper local + Piper TTS
- Reversal condition: If voice costs exceed 30% of inference budget, increase local processing

---

### Sandbox

| Dimension | Assessment |
|-----------|-----------|
| **Build** | 6-9 months for container orchestration, security isolation, file system, networking. Complex security requirements. |
| **Buy - E2B** | $0.05/minute sandbox runtime. Purpose-built for AI code execution. |
| **Buy - Modal** | Usage-based, serverless containers. Good for bursts. |
| **Hybrid** | Self-hosted Kubernetes sandbox + E2B for overflow. |

**Recommendation: HYBRID (Self-hosted primary, E2B for burst/spikes)**

**Justification:** Sandboxes require careful security isolation but are well-understood technology (containers + gVisor/Firecracker). Self-hosting on Kubernetes with gVisor runtime provides cost-effective isolation. E2B provides excellent developer experience and instant scaling for burst workloads. The hybrid approach optimizes cost while maintaining availability.

**Architecture:**
- Primary: Self-hosted Kubernetes + gVisor runtime
- Secondary: E2B for instant scaling and overflow
- Container runtime: gVisor for security, Firecracker for density
- Image management: Custom sandbox images cached on nodes

**Decision Criteria:**
- Default to self-hosted
- Burst to E2B when queue depth >threshold
- Reversal condition: If sandbox security requirements exceed gVisor capabilities, evaluate E2B fully managed

---

### CI/CD

| Dimension | Assessment |
|-----------|-----------|
| **Build** | 3-6 months for pipeline engine, artifact management, runner orchestration. |
| **Buy - GitHub Actions** | $0.008/minute (Linux), included minutes with GitHub Teams ($4/user/mo) |
| **Buy - CircleCI** | $15/month (Starter) - custom (Scale). Good performance. |
| **Hybrid** | GitHub Actions for standard CI, custom runners for GPU/agent workloads. |

**Recommendation: BUY (GitHub Actions + self-hosted runners)**

**Justification:** GitHub Actions provides the best integration with the primary code repository platform. Self-hosted runners (on Kubernetes) handle GPU-intensive and agent-specific workloads. No point building a CI/CD system when excellent options exist. The focus should be on CI/CD *for agents* (agent-driven deployments), not replacing CI/CD itself.

**Decision Criteria:**
- Standard CI: GitHub Actions
- GPU/agent workloads: Self-hosted runners
- If not using GitHub: GitLab CI or CircleCI
- Reversal condition: N/A - CI/CD is a commodity

---

### Secrets Management

| Dimension | Assessment |
|-----------|-----------|
| **Build** | 3-6 months for encryption, rotation, access control, audit logging. Security-critical. |
| **Buy - HashiCorp Vault** | Open source + Enterprise ($0). Industry standard. |
| **Buy - AWS Secrets Manager** | $0.40/secret/month. AWS-native. |
| **Buy - 1Password Secrets Automation** | $19.99/user/month (Business). Developer-friendly. |
| **Hybrid** | Vault self-hosted + cloud provider integration. |

**Recommendation: BUY (HashiCorp Vault self-hosted)**

**Justification:** HashiCorp Vault is the industry standard for secrets management with comprehensive features: dynamic secrets, automatic rotation, encryption-as-a-service, PKI, multiple auth methods. Open source with no licensing costs. Building secrets management in-house is a security risk. Vault's Kubernetes integration (CSI driver, injector) is excellent.

**Decision Criteria:**
- Default to Vault self-hosted
- If on AWS exclusively -> AWS Secrets Manager for simplicity
- Reversal condition: If Vault operational burden exceeds 0.25 FTE, evaluate managed HCP Vault

---

### Billing

| Dimension | Assessment |
|-----------|-----------|
| **Build** | 3-6 months for metering, invoicing, payment processing, reporting. |
| **Buy - Stripe** | 2.9% + $0.30/transaction. Industry standard. |
| **Buy - Chargebee** | $249-$549/month. Subscription management focused. |
| **Buy - Metronome** | Usage-based pricing specialist. Enterprise pricing. |
| **Hybrid** | Stripe for payments + custom metering. |

**Recommendation: BUY (Stripe + custom metering)**

**Justification:** Billing is complex (tax, compliance, invoicing, dunning) but well-solved by Stripe. Custom metering layer tracks resource usage (compute minutes, tokens, storage) and feeds into Stripe for billing. This hybrid provides flexibility in pricing models while leveraging Stripe's proven infrastructure.

**Architecture:**
- Metering: Custom service tracking all billable events
- Pricing: Custom rules engine for tiered/usage-based pricing
- Payments: Stripe (PCI compliance handled)
- Invoicing: Stripe Billing
- Reporting: Custom + Stripe Dashboard

**Decision Criteria:**
- Default to Stripe
- If complex subscription logic -> Chargebee for subscriptions + Stripe for payments
- Reversal condition: N/A - Stripe is the standard

---

### Monitoring/Alerting

| Dimension | Assessment |
|-----------|-----------|
| **Build** | 3-6 months for metric collection, alerting rules, notification routing, dashboards. |
| **Buy - PagerDuty** | $29-$99/user/month. Incident management leader. |
| **Buy - Opsgenie** | $9-$29/user/month (Atlassian). Good Jira integration. |
| **Hybrid** | Prometheus Alertmanager + PagerDuty for escalation. |

**Recommendation: HYBRID (Prometheus + Grafana + PagerDuty)**

**Justification:** Prometheus provides excellent metric collection and alerting rules. Alertmanager handles notification routing. PagerDuty provides on-call management and incident escalation workflows that are difficult to build. Grafana provides visualization. This combination is used by thousands of production systems.

**Architecture:**
- Metrics: Prometheus
- Alerting: Prometheus Alertmanager
- Visualization: Grafana
- Incident Management: PagerDuty (or Opsgenie)
- On-call: PagerDuty schedules

**Decision Criteria:**
- Default to full stack
- If no on-call rotation needed -> skip PagerDuty, use Slack notifications
- Reversal condition: If team grows >50 engineers, invest in full PagerDuty

---

### Build-vs-Buy Summary Matrix

| Component | Recommendation | Build Effort | Buy Cost/Month | Key Factor |
|-----------|---------------|--------------|----------------|------------|
| Workflow Engine | **Buy** (Temporal) | 12-18 mo | Self-hosted: ~$500 | Core differentiator Temporal, not building it |
| Message Queue | **Buy** (NATS) | 6-9 mo | Self-hosted: ~$200 | Commodity infrastructure |
| Vector DB | **Buy** (Qdrant) | 6-12 mo | Self-hosted: ~$300 | Specialized database |
| Observability | **Hybrid** (OSS + selective SaaS) | Infinite | $500-2000 | OSS stack is production-grade |
| Auth/SSO | **Buy** (Keycloak) | 6-12 mo | Self-hosted: ~$400 | Security-critical, don't build |
| Realtime | **Buy** (LiveKit) | 6-9 mo | Cloud: ~$500 | Complex WebRTC infrastructure |
| Voice | **Buy** (Deepgram + ElevenLabs) | 18-24 mo | ~$500-2000 | Specialized ML domain |
| Sandbox | **Hybrid** (Self-hosted + E2B) | 6-9 mo | ~$1000 | Security + cost optimization |
| CI/CD | **Buy** (GitHub Actions) | 3-6 mo | ~$200 | Commodity, use best tool |
| Secrets Mgmt | **Buy** (Vault) | 3-6 mo | Self-hosted: $0 | Security-critical, don't build |
| Billing | **Buy** (Stripe) | 3-6 mo | 2.9% + $0.30 | Compliance complexity |
| Monitoring | **Hybrid** (Prometheus + PagerDuty) | 3-6 mo | ~$500 | Best of both worlds |

### Total Analysis Summary

| Category | Count |
|----------|-------|
| **Build** | 0 components |
| **Buy (Self-hosted OSS)** | 8 components |
| **Buy (SaaS)** | 2 components |
| **Hybrid** | 2 components |

**Key Insight:** For an infrastructure-heavy platform like AASOP, the optimal strategy is **self-hosted open source for core infrastructure** (providing control, customization, and predictable costs) with **managed SaaS for specialized services** (where operational expertise is scarce or time-to-market is critical).

**Phase Strategy:**
- **Phase 1 (Launch):** Use managed services for speed (Temporal Cloud, LiveKit Cloud, Auth0)
- **Phase 2 (Scale):** Migrate to self-hosted OSS for cost control (Temporal OSS, Keycloak, self-hosted LiveKit)
- **Phase 3 (Optimize):** Hybrid approach with custom optimizations where competitive advantage exists

---

## Appendix A: Glossary

| Term | Definition |
|------|-----------|
| **A2A** | Agent-to-Agent protocol (Google) for agent communication |
| **MCP** | Model Context Protocol (Anthropic) for tool/resource integration |
| **STT** | Speech-to-Text |
| **TTS** | Text-to-Speech |
| **VAD** | Voice Activity Detection |
| **SFU** | Selective Forwarding Unit (WebRTC media routing) |
| **DSL** | Domain Specific Language |
| **Saga** | Distributed transaction pattern with compensation |
| **OTel** | OpenTelemetry |
| **gVisor** | Userspace kernel for container sandboxing |
| **HNSW** | Hierarchical Navigable Small World (vector indexing) |

## Appendix B: Decision Reversal Conditions

| Decision | Reversal Trigger | Alternative |
|----------|-----------------|-------------|
| Temporal self-hosted | Maintenance >1 FTE | Temporal Cloud |
| NATS JetStream | Throughput >100K msg/s | Apache Kafka |
| Qdrant self-hosted | Vectors >1B | Milvus or Pinecone |
| Keycloak | Maintenance >0.5 FTE | Auth0 |
| LiveKit Cloud | Cost >$3000/mo | Self-hosted LiveKit |
| Deepgram STT | Cost >30% of inference budget | Whisper local |
| OSS observability | Maintenance >0.5 FTE | Datadog |

## Appendix C: Vendor Contact & Pricing Reference

| Vendor | Pricing Page | Enterprise Contact |
|--------|-------------|-------------------|
| Temporal | temporal.io/cloud/pricing | sales@temporal.io |
| Deepgram | deepgram.com/pricing | sales@deepgram.com |
| ElevenLabs | elevenlabs.io/pricing | sales@elevenlabs.io |
| LiveKit | livekit.io/cloud/pricing | sales@livekit.io |
| Qdrant | qdrant.tech/pricing | sales@qdrant.tech |
| Langfuse | langfuse.com/pricing | support@langfuse.com |
| Stripe | stripe.com/pricing | N/A (self-serve) |

---

*Document generated for the Autonomous Agentic Software Organization Platform. Version 1.0.0.*
