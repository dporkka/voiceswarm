# Autonomous Agentic Software Organization Platform
## Architecture Reference: Data Layer, Agent Runtime, Workflow Engine & Memory System

**Document Version:** 1.0  
**Status:** Production-Grade Architecture Specification  
**Classification:** Internal — Engineering Reference  

---

## Table of Contents

1. [Item 6: Database Schema](#item-6-database-schema)
   - Users & Organizations
   - Projects & Workspaces
   - Agents
   - Tasks
   - Workflows
   - Memory
   - Code
   - Models
   - Sandbox
   - Observability
   - Security
   - Billing
   - Realtime
   - Vector Schema (Qdrant)
   - Redis Key Patterns
   - Graph Schema
2. [Item 7: Agent Lifecycle Architecture](#item-7-agent-lifecycle-architecture)
3. [Item 8: Workflow Engine Architecture](#item-8-workflow-engine-architecture)
4. [Item 11: Memory Architecture](#item-11-memory-architecture)

---

## Item 6: Database Schema

### Overview

The data layer employs a **multi-modal persistence strategy** optimized for the distinct access patterns of an autonomous agentic platform. PostgreSQL (via Neon serverless) serves as the primary transactional store for structured relational data. Qdrant handles vector search for semantic memory and code embeddings. Redis/Dragonfly provides sub-millisecond caching, pub/sub, session state, and distributed locking. An optional graph database (Neo4j or Apache AGE within Postgres) models agent relationship graphs.

**Design Principles:**
- **Domain-Driven Partitioning:** Each subdomain owns its schema; cross-domain access flows through APIs.
- **Write-Optimized, Read-Optimized Dual Paths:** Hot read paths use materialized views + Redis; writes go direct to Postgres.
- **Temporal Decoupling:** Workflow tables are append-only; current state is a projection.
- **Scale Targets:** 10K+ organizations, 100K+ agents, 10M+ tasks/day, 1B+ memory chunks, 100M+ observability events/day.

---

### 6.1 Users & Organizations

**Purpose:** Identity, access management, multi-tenancy, and team collaboration primitives. Every table is scoped to `organization_id` for row-level security.

#### Table: `users`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY` | Unique user identifier |
| `email` | `VARCHAR(255)` | `UNIQUE NOT NULL` | Login email |
| `display_name` | `VARCHAR(100)` | `NOT NULL` | Human-readable name |
| `avatar_url` | `TEXT` | | Profile picture |
| `auth_provider` | `VARCHAR(50)` | `NOT NULL DEFAULT 'email'` | `email`, `github`, `google`, `sso` |
| `auth_subject` | `VARCHAR(255)` | `UNIQUE` | External auth provider subject ID |
| `password_hash` | `VARCHAR(255)` | | Bcrypt hash (null for SSO) |
| `role` | `VARCHAR(50)` | `NOT NULL DEFAULT 'member'` | `superadmin`, `admin`, `member`, `viewer` |
| `preferences` | `JSONB` | `NOT NULL DEFAULT '{}'` | Theme, notifications, defaults |
| `last_login_at` | `TIMESTAMPTZ` | | Last successful authentication |
| `login_count` | `INTEGER` | `NOT NULL DEFAULT 0` | Total login count |
| `mfa_enabled` | `BOOLEAN` | `NOT NULL DEFAULT FALSE` | Multi-factor auth status |
| `mfa_secret` | `VARCHAR(255)` | | Encrypted TOTP secret |
| `is_active` | `BOOLEAN` | `NOT NULL DEFAULT TRUE` | Soft delete flag |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Record creation |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | Last modification |

**Indexes:**
```sql
CREATE UNIQUE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_auth_provider_subject ON users(auth_provider, auth_subject);
CREATE INDEX idx_users_role ON users(role) WHERE role = 'superadmin';
CREATE INDEX idx_users_created_at ON users(created_at);
```

**Estimated Rows:** 1M (across platform)

#### Table: `organizations`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY` | Organization ID (tenant boundary) |
| `slug` | `VARCHAR(100)` | `UNIQUE NOT NULL` | URL-friendly identifier |
| `name` | `VARCHAR(200)` | `NOT NULL` | Display name |
| `description` | `TEXT` | | Org description |
| `avatar_url` | `TEXT` | | Organization logo |
| `tier` | `VARCHAR(50)` | `NOT NULL DEFAULT 'free'` | `free`, `pro`, `team`, `enterprise` |
| `settings` | `JSONB` | `NOT NULL DEFAULT '{}'` | Org-wide configuration |
| `max_agents` | `INTEGER` | `NOT NULL DEFAULT 5` | Agent limit per tier |
| `max_workflows` | `INTEGER` | `NOT NULL DEFAULT 50` | Workflow limit per tier |
| `max_memory_gb` | `DECIMAL(10,2)` | `NOT NULL DEFAULT 1.0` | Memory quota (GB) |
| `billing_email` | `VARCHAR(255)` | | Invoice recipient |
| `billing_provider` | `VARCHAR(50)` | | `stripe`, `invoice` |
| `billing_customer_id` | `VARCHAR(255)` | | External billing provider customer ID |
| `subscription_status` | `VARCHAR(50)` | `NOT NULL DEFAULT 'active'` | `active`, `trialing`, `past_due`, `cancelled` |
| `feature_flags` | `JSONB` | `NOT NULL DEFAULT '{}'` | A/B features, early access |
| `csp_config` | `JSONB` | `NOT NULL DEFAULT '{}'` | Content security policy |
| `is_active` | `BOOLEAN` | `NOT NULL DEFAULT TRUE` | Soft delete |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Indexes:**
```sql
CREATE UNIQUE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_tier ON organizations(tier);
CREATE INDEX idx_organizations_billing ON organizations(billing_customer_id) WHERE billing_customer_id IS NOT NULL;
```

**Estimated Rows:** 10K

#### Table: `organization_members`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY` | Membership record ID |
| `organization_id` | `UUID` | `NOT NULL REFERENCES organizations(id) ON DELETE CASCADE` | |
| `user_id` | `UUID` | `NOT NULL REFERENCES users(id) ON DELETE CASCADE` | |
| `role` | `VARCHAR(50)` | `NOT NULL DEFAULT 'member'` | `owner`, `admin`, `member`, `viewer` |
| `permissions` | `JSONB` | `NOT NULL DEFAULT '[]'` | Granular permission overrides |
| `joined_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |
| `invited_by` | `UUID` | `REFERENCES users(id)` | Who invited this member |
| `last_active_at` | `TIMESTAMPTZ` | | Last activity timestamp |
| `status` | `VARCHAR(50)` | `NOT NULL DEFAULT 'active'` | `active`, `suspended`, `pending` |

**Indexes:**
```sql
CREATE UNIQUE INDEX idx_org_members_user_org ON organization_members(organization_id, user_id);
CREATE INDEX idx_org_members_org ON organization_members(organization_id);
CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_org_members_role ON organization_members(organization_id, role);
```

**Estimated Rows:** 50K

#### Table: `teams`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY` | |
| `organization_id` | `UUID` | `NOT NULL REFERENCES organizations(id) ON DELETE CASCADE` | |
| `slug` | `VARCHAR(100)` | `NOT NULL` | Unique within org |
| `name` | `VARCHAR(200)` | `NOT NULL` | Display name |
| `description` | `TEXT` | | |
| `color` | `VARCHAR(7)` | | Hex color for UI |
| `settings` | `JSONB` | `NOT NULL DEFAULT '{}'` | Team-specific config |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Indexes:**
```sql
CREATE UNIQUE INDEX idx_teams_org_slug ON teams(organization_id, slug);
CREATE INDEX idx_teams_org ON teams(organization_id);
```

**Estimated Rows:** 25K

#### Table: `team_members`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY` | |
| `team_id` | `UUID` | `NOT NULL REFERENCES teams(id) ON DELETE CASCADE` | |
| `user_id` | `UUID` | `NOT NULL REFERENCES users(id) ON DELETE CASCADE` | |
| `role` | `VARCHAR(50)` | `NOT NULL DEFAULT 'member'` | `lead`, `member` |
| `added_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Indexes:**
```sql
CREATE UNIQUE INDEX idx_team_members_team_user ON team_members(team_id, user_id);
CREATE INDEX idx_team_members_team ON team_members(team_id);
```

**Estimated Rows:** 75K

#### Table: `invitations`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY` | |
| `organization_id` | `UUID` | `NOT NULL REFERENCES organizations(id) ON DELETE CASCADE` | |
| `email` | `VARCHAR(255)` | `NOT NULL` | Invitee email |
| `role` | `VARCHAR(50)` | `NOT NULL DEFAULT 'member'` | Proposed role |
| `invited_by` | `UUID` | `NOT NULL REFERENCES users(id)` | |
| `token` | `VARCHAR(255)` | `UNIQUE NOT NULL` | Secure invitation token |
| `expires_at` | `TIMESTAMPTZ` | `NOT NULL` | Token expiration |
| `accepted_at` | `TIMESTAMPTZ` | | When accepted |
| `status` | `VARCHAR(50)` | `NOT NULL DEFAULT 'pending'` | `pending`, `accepted`, `expired`, `revoked` |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Indexes:**
```sql
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_org ON invitations(organization_id);
CREATE INDEX idx_invitations_email ON invitations(email);
```

**Estimated Rows:** 20K

---

### 6.2 Projects & Workspaces

#### Table: `projects`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY` | |
| `organization_id` | `UUID` | `NOT NULL REFERENCES organizations(id) ON DELETE CASCADE` | |
| `slug` | `VARCHAR(100)` | `NOT NULL` | Unique within org |
| `name` | `VARCHAR(200)` | `NOT NULL` | Display name |
| `description` | `TEXT` | | |
| `status` | `VARCHAR(50)` | `NOT NULL DEFAULT 'active'` | `active`, `archived`, `deleted` |
| `visibility` | `VARCHAR(50)` | `NOT NULL DEFAULT 'private'` | `private`, `organization`, `public` |
| `default_branch` | `VARCHAR(100)` | `NOT NULL DEFAULT 'main'` | |
| `language` | `VARCHAR(50)` | | Primary programming language |
| `framework` | `VARCHAR(100)` | | Detected framework |
| `settings` | `JSONB` | `NOT NULL DEFAULT '{}'` | CI/CD config, lint rules, etc. |
| `metadata` | `JSONB` | `NOT NULL DEFAULT '{}'` | Detected project structure |
| `created_by` | `UUID` | `NOT NULL REFERENCES users(id)` | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Indexes:**
```sql
CREATE UNIQUE INDEX idx_projects_org_slug ON projects(organization_id, slug);
CREATE INDEX idx_projects_org ON projects(organization_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_visibility ON projects(visibility);
CREATE INDEX idx_projects_created_by ON projects(created_by);
```

**Estimated Rows:** 50K

#### Table: `workspaces`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY` | |
| `project_id` | `UUID` | `NOT NULL REFERENCES projects(id) ON DELETE CASCADE` | |
| `name` | `VARCHAR(200)` | `NOT NULL` | Workspace name |
| `description` | `TEXT` | | |
| `type` | `VARCHAR(50)` | `NOT NULL DEFAULT 'development'` | `development`, `production`, `review`, `experiment` |
| `git_branch` | `VARCHAR(255)` | | Associated branch |
| `git_commit` | `VARCHAR(40)` | | HEAD commit SHA |
| `environment_vars` | `JSONB` | `NOT NULL DEFAULT '{}'` | Encrypted env vars |
| `resource_config` | `JSONB` | `NOT NULL DEFAULT '{}'` | CPU, memory, disk |
| `status` | `VARCHAR(50)` | `NOT NULL DEFAULT 'active'` | `active`, `hibernated`, `archived` |
| `last_synced_at` | `TIMESTAMPTZ` | | Last git sync |
| `created_by` | `UUID` | `NOT NULL REFERENCES users(id)` | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Indexes:**
```sql
CREATE INDEX idx_workspaces_project ON workspaces(project_id);
CREATE INDEX idx_workspaces_type ON workspaces(type);
CREATE INDEX idx_workspaces_status ON workspaces(status);
CREATE INDEX idx_workspaces_branch ON workspaces(git_branch);
```

**Estimated Rows:** 100K

#### Table: `repositories`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY` | |
| `project_id` | `UUID` | `NOT NULL REFERENCES projects(id) ON DELETE CASCADE` | |
| `provider` | `VARCHAR(50)` | `NOT NULL` | `github`, `gitlab`, `bitbucket`, `internal` |
| `external_id` | `VARCHAR(255)` | | Repository ID from provider |
| `full_name` | `VARCHAR(500)` | `NOT NULL` | `owner/repo` |
| `clone_url` | `TEXT` | `NOT NULL` | HTTPS/SSH clone URL |
| `default_branch` | `VARCHAR(100)` | `NOT NULL DEFAULT 'main'` | |
| `is_private` | `BOOLEAN` | `NOT NULL DEFAULT TRUE` | |
| `webhook_secret` | `VARCHAR(255)` | | HMAC secret for webhooks |
| `last_synced_at` | `TIMESTAMPTZ` | | |
| `sync_status` | `VARCHAR(50)` | `NOT NULL DEFAULT 'pending'` | `pending`, `syncing`, `synced`, `error` |
| `commit_count` | `INTEGER` | `NOT NULL DEFAULT 0` | Cached count |
| `size_bytes` | `BIGINT` | `NOT NULL DEFAULT 0` | Repository size |
| `metadata` | `JSONB` | `NOT NULL DEFAULT '{}'` | Topics, license, etc. |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Indexes:**
```sql
CREATE UNIQUE INDEX idx_repos_project_provider_external ON repositories(project_id, provider, external_id);
CREATE INDEX idx_repos_provider_external ON repositories(provider, external_id);
CREATE INDEX idx_repos_sync_status ON repositories(sync_status);
CREATE INDEX idx_repos_project ON repositories(project_id);
```

**Estimated Rows:** 50K

#### Table: `branches`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY` | |
| `repository_id` | `UUID` | `NOT NULL REFERENCES repositories(id) ON DELETE CASCADE` | |
| `name` | `VARCHAR(255)` | `NOT NULL` | Branch name |
| `commit_sha` | `VARCHAR(40)` | `NOT NULL` | HEAD commit |
| `commit_message` | `TEXT` | | HEAD commit message |
| `commit_author` | `VARCHAR(255)` | | HEAD commit author |
| `commit_date` | `TIMESTAMPTZ` | | HEAD commit timestamp |
| `ahead_by` | `INTEGER` | `NOT NULL DEFAULT 0` | Commits ahead of default |
| `behind_by` | `INTEGER` | `NOT NULL DEFAULT 0` | Commits behind default |
| `is_protected` | `BOOLEAN` | `NOT NULL DEFAULT FALSE` | Branch protection status |
| `is_default` | `BOOLEAN` | `NOT NULL DEFAULT FALSE` | Is default branch |
| `last_pushed_at` | `TIMESTAMPTZ` | | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Indexes:**
```sql
CREATE UNIQUE INDEX idx_branches_repo_name ON branches(repository_id, name);
CREATE INDEX idx_branches_repo ON branches(repository_id);
CREATE INDEX idx_branches_commit ON branches(commit_sha);
```

**Estimated Rows:** 250K

---

### 6.3 Agents

#### Table: `agent_types`

Defines the taxonomy of agent roles in the system. Agent types are the "classes" from which agent instances are instantiated.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY` | |
| `name` | `VARCHAR(100)` | `UNIQUE NOT NULL` | `coding`, `planning`, `reviewing`, `debugging`, `research`, `coordination`, `memory`, `routing` |
| `description` | `TEXT` | | Human-readable description |
| `category` | `VARCHAR(50)` | `NOT NULL` | `executor`, `planner`, `analyzer`, `coordinator`, `specialist` |
| `capabilities` | `JSONB` | `NOT NULL DEFAULT '[]'` | List of capability IDs |
| `default_config` | `JSONB` | `NOT NULL DEFAULT '{}'` | Default parameters (model, temperature, etc.) |
| `required_permissions` | `JSONB` | `NOT NULL DEFAULT '[]'` | RBAC permissions needed |
| `icon` | `VARCHAR(100)` | | UI icon identifier |
| `is_system` | `BOOLEAN` | `NOT NULL DEFAULT FALSE` | Built-in vs custom |
| `is_active` | `BOOLEAN` | `NOT NULL DEFAULT TRUE` | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Indexes:**
```sql
CREATE UNIQUE INDEX idx_agent_types_name ON agent_types(name);
CREATE INDEX idx_agent_types_category ON agent_types(category);
```

**Estimated Rows:** 50 (small, mostly static)

#### Table: `agent_definitions`

Templates that define reusable agent configurations. Users create definitions ("templates") and launch instances from them.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY` | |
| `organization_id` | `UUID` | `NOT NULL REFERENCES organizations(id) ON DELETE CASCADE` | |
| `name` | `VARCHAR(200)` | `NOT NULL` | Template name |
| `description` | `TEXT` | | |
| `agent_type_id` | `UUID` | `NOT NULL REFERENCES agent_types(id)` | Base type |
| `version` | `INTEGER` | `NOT NULL DEFAULT 1` | Template version |
| `is_latest` | `BOOLEAN` | `NOT NULL DEFAULT TRUE` | Is latest version |
| `model_config_id` | `UUID` | `REFERENCES model_configs(id)` | Default model to use |
| `system_prompt` | `TEXT` | | Base system prompt |
| `prompt_templates` | `JSONB` | `NOT NULL DEFAULT '{}'` | Named prompt templates |
| `tools` | `JSONB` | `NOT NULL DEFAULT '[]'` | Available tool IDs |
| `tool_configs` | `JSONB` | `NOT NULL DEFAULT '{}'` | Per-tool parameters |
| `memory_config` | `JSONB` | `NOT NULL DEFAULT '{}'` | Memory system settings |
| `max_iterations` | `INTEGER` | `NOT NULL DEFAULT 50` | Max thinking iterations |
| `max_tokens_per_request` | `INTEGER` | `NOT NULL DEFAULT 8192` | Token budget |
| `temperature` | `DECIMAL(3,2)` | `NOT NULL DEFAULT 0.7` | LLM temperature |
| `top_p` | `DECIMAL(3,2)` | `NOT NULL DEFAULT 1.0` | Nucleus sampling |
| `resource_limits` | `JSONB` | `NOT NULL DEFAULT '{}'` | CPU, memory, disk limits |
| `timeout_seconds` | `INTEGER` | `NOT NULL DEFAULT 300` | Execution timeout |
| `retry_policy` | `JSONB` | `NOT NULL DEFAULT '{}'` | Retry configuration |
| `environment_vars` | `JSONB` | `NOT NULL DEFAULT '{}'` | Agent-specific env |
| `labels` | `JSONB` | `NOT NULL DEFAULT '[]'` | Tags for filtering |
| `created_by` | `UUID` | `NOT NULL REFERENCES users(id)` | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Indexes:**
```sql
CREATE INDEX idx_agent_defs_org ON agent_definitions(organization_id);
CREATE INDEX idx_agent_defs_type ON agent_definitions(agent_type_id);
CREATE INDEX idx_agent_defs_latest ON agent_definitions(organization_id, is_latest);
CREATE INDEX idx_agent_defs_labels ON agent_definitions USING GIN(labels);
```

**Estimated Rows:** 25K

#### Table: `agent_instances`

Runtime records of executing agents. This is the "process table" of the agent runtime.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY` | Instance ID |
| `organization_id` | `UUID` | `NOT NULL REFERENCES organizations(id) ON DELETE CASCADE` | |
| `agent_definition_id` | `UUID` | `NOT NULL REFERENCES agent_definitions(id)` | Source template |
| `name` | `VARCHAR(200)` | `NOT NULL` | Instance display name |
| `status` | `VARCHAR(50)` | `NOT NULL DEFAULT 'created'` | See state machine below |
| `current_task_id` | `UUID` | | Currently assigned task |
| `current_workspace_id` | `UUID` | `REFERENCES workspaces(id)` | Active workspace |
| `current_branch` | `VARCHAR(255)` | | Active git branch |
| `runtime_host` | `VARCHAR(255)` | | Host/container running the agent |
| `runtime_pid` | `INTEGER` | | Process ID |
| `runtime_version` | `VARCHAR(50)` | | Runtime version hash |
| `session_context` | `JSONB` | `NOT NULL DEFAULT '{}'` | Active variables, context |
| `memory_state` | `JSONB` | `NOT NULL DEFAULT '{}'` | Working memory snapshot |
| `tool_state` | `JSONB` | `NOT NULL DEFAULT '{}'` | Tool call history |
| `llm_call_count` | `INTEGER` | `NOT NULL DEFAULT 0` | Total LLM calls |
| `token_usage_input` | `BIGINT` | `NOT NULL DEFAULT 0` | Input tokens consumed |
| `token_usage_output` | `BIGINT` | `NOT NULL DEFAULT 0` | Output tokens consumed |
| `cost_usd` | `DECIMAL(12,6)` | `NOT NULL DEFAULT 0` | Accumulated cost |
| `started_at` | `TIMESTAMPTZ` | | When instance started |
| `completed_at` | `TIMESTAMPTZ` | | When instance finished |
| `heartbeat_at` | `TIMESTAMPTZ` | | Last health ping |
| `ttl_seconds` | `INTEGER` | `NOT NULL DEFAULT 3600` | Max idle time before termination |
| `error_count` | `INTEGER` | `NOT NULL DEFAULT 0` | Consecutive errors |
| `labels` | `JSONB` | `NOT NULL DEFAULT '[]'` | Runtime labels |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Indexes:**
```sql
CREATE INDEX idx_agent_instances_org ON agent_instances(organization_id);
CREATE INDEX idx_agent_instances_def ON agent_instances(agent_definition_id);
CREATE INDEX idx_agent_instances_status ON agent_instances(status);
CREATE INDEX idx_agent_instances_task ON agent_instances(current_task_id);
CREATE INDEX idx_agent_instances_heartbeat ON agent_instances(heartbeat_at);
CREATE INDEX idx_agent_instances_workspace ON agent_instances(current_workspace_id);
CREATE INDEX idx_agent_instances_org_status ON agent_instances(organization_id, status);
```

**Estimated Rows:** 100K (at steady state)

#### Table: `agent_states`

Append-only log of all agent state transitions. Provides full audit trail of agent lifecycle.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `BIGSERIAL` | `PRIMARY KEY` | |
| `agent_instance_id` | `UUID` | `NOT NULL REFERENCES agent_instances(id) ON DELETE CASCADE` | |
| `previous_status` | `VARCHAR(50)` | | Prior state |
| `new_status` | `VARCHAR(50)` | `NOT NULL` | New state |
| `reason` | `TEXT` | | Human-readable transition reason |
| `triggered_by` | `VARCHAR(50)` | | `user`, `system`, `agent`, `scheduler`, `health_check` |
| `context` | `JSONB` | `NOT NULL DEFAULT '{}'` | Additional transition context |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Partitioning:** Partitioned by `RANGE (created_at)` — monthly partitions. Retain 6 months hot, archive to S3 after 1 year.

**Indexes:**
```sql
CREATE INDEX idx_agent_states_agent ON agent_states(agent_instance_id);
CREATE INDEX idx_agent_states_created ON agent_states(created_at);
CREATE INDEX idx_agent_states_agent_created ON agent_states(agent_instance_id, created_at);
```

**Estimated Rows:** 10M/month

#### Table: `agent_capabilities`

Registry of capabilities that agents can possess. Enables dynamic capability discovery.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY` | |
| `name` | `VARCHAR(100)` | `UNIQUE NOT NULL` | `code_read`, `code_write`, `test_run`, `debug`, `deploy`, `review`, `plan`, `communicate` |
| `description` | `TEXT` | | |
| `category` | `VARCHAR(50)` | `NOT NULL` | `file`, `shell`, `git`, `llm`, `api`, `browser` |
| `input_schema` | `JSONB` | `NOT NULL` | JSON Schema for inputs |
| `output_schema` | `JSONB` | `NOT NULL` | JSON Schema for outputs |
| `required_tools` | `JSONB` | `NOT NULL DEFAULT '[]'` | Tool IDs needed |
| `is_active` | `BOOLEAN` | `NOT NULL DEFAULT TRUE` | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Estimated Rows:** 100

---

### 6.4 Tasks

#### Table: `tasks`

The central work-item table. Tasks represent units of work assigned to agents. Supports nested subtasks via `parent_task_id`.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY` | |
| `organization_id` | `UUID` | `NOT NULL REFERENCES organizations(id) ON DELETE CASCADE` | |
| `project_id` | `UUID` | `REFERENCES projects(id) ON DELETE SET NULL` | |
| `workspace_id` | `UUID` | `REFERENCES workspaces(id) ON DELETE SET NULL` | |
| `parent_task_id` | `UUID` | `REFERENCES tasks(id) ON DELETE CASCADE` | For subtasks |
| `created_by` | `UUID` | `NOT NULL REFERENCES users(id)` | Human or system creator |
| `assigned_to` | `UUID` | `REFERENCES agent_instances(id) ON DELETE SET NULL` | Assigned agent |
| `title` | `VARCHAR(500)` | `NOT NULL` | Task title |
| `description` | `TEXT` | | Detailed description |
| `type` | `VARCHAR(50)` | `NOT NULL DEFAULT 'coding'` | `coding`, `review`, `debug`, `plan`, `test`, `deploy`, `research`, `communicate` |
| `status` | `VARCHAR(50)` | `NOT NULL DEFAULT 'pending'` | `pending`, `queued`, `assigned`, `in_progress`, `paused`, `completed`, `failed`, `cancelled` |
| `priority` | `INTEGER` | `NOT NULL DEFAULT 3` | 1=critical, 5=low |
| `complexity_score` | `DECIMAL(4,2)` | | AI-estimated complexity |
| `estimated_duration_seconds` | `INTEGER` | | Predicted duration |
| `actual_duration_seconds` | `INTEGER` | | Actual time spent |
| `progress_percent` | `INTEGER` | `NOT NULL DEFAULT 0` | 0-100 completion |
| `input_data` | `JSONB` | `NOT NULL DEFAULT '{}'` | Task inputs (file paths, requirements) |
| `output_data` | `JSONB` | `NOT NULL DEFAULT '{}'` | Task outputs (results, artifacts) |
| `requirements` | `JSONB` | `NOT NULL DEFAULT '[]'` | Acceptance criteria |
| `git_context` | `JSONB` | `NOT NULL DEFAULT '{}'` | Branch, commit, files |
| `agent_context` | `JSONB` | `NOT NULL DEFAULT '{}'` | Agent-specific context |
| `error_info` | `JSONB` | `NOT NULL DEFAULT '{}'` | Last error details |
| `retry_count` | `INTEGER` | `NOT NULL DEFAULT 0` | Number of retries |
| `max_retries` | `INTEGER` | `NOT NULL DEFAULT 3` | Max retry attempts |
| `started_at` | `TIMESTAMPTZ` | | |
| `completed_at` | `TIMESTAMPTZ` | | |
| `due_at` | `TIMESTAMPTZ` | | Deadline |
| `labels` | `JSONB` | `NOT NULL DEFAULT '[]'` | Tags |
| `metadata` | `JSONB` | `NOT NULL DEFAULT '{}'` | Extensible metadata |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Partitioning:** Partitioned by `LIST (organization_id)` using declarative partitioning. Up to 10K partitions supported via pg_partman.

**Indexes:**
```sql
CREATE INDEX idx_tasks_org ON tasks(organization_id);
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_parent ON tasks(parent_task_id);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_type ON tasks(type);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_due ON tasks(due_at);
CREATE INDEX idx_tasks_org_status ON tasks(organization_id, status);
CREATE INDEX idx_tasks_labels ON tasks USING GIN(labels);
CREATE INDEX idx_tasks_created ON tasks(created_at);
CREATE INDEX idx_tasks_git ON tasks USING GIN(git_context);
```

**Estimated Rows:** 50M (across all orgs, growing)

#### Table: `subtasks`

Explicit subtask decomposition for complex tasks. Provides fine-grained tracking.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY` | |
| `task_id` | `UUID` | `NOT NULL REFERENCES tasks(id) ON DELETE CASCADE` | Parent task |
| `sequence` | `INTEGER` | `NOT NULL` | Order within parent |
| `title` | `VARCHAR(500)` | `NOT NULL` | |
| `description` | `TEXT` | | |
| `status` | `VARCHAR(50)` | `NOT NULL DEFAULT 'pending'` | |
| `assigned_to` | `UUID` | `REFERENCES agent_instances(id)` | |
| `input_data` | `JSONB` | `NOT NULL DEFAULT '{}'` | |
| `output_data` | `JSONB` | `NOT NULL DEFAULT '{}'` | |
| `dependencies` | `JSONB` | `NOT NULL DEFAULT '[]'` | IDs of prerequisite subtasks |
| `started_at` | `TIMESTAMPTZ` | | |
| `completed_at` | `TIMESTAMPTZ` | | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Indexes:**
```sql
CREATE INDEX idx_subtasks_task ON subtasks(task_id);
CREATE INDEX idx_subtasks_status ON subtasks(status);
CREATE INDEX idx_subtasks_assigned ON subtasks(assigned_to);
```

**Estimated Rows:** 150M

#### Table: `task_dependencies`

DAG tracking for task dependencies. Enables topological scheduling.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY` | |
| `task_id` | `UUID` | `NOT NULL REFERENCES tasks(id) ON DELETE CASCADE` | Dependent task |
| `depends_on_task_id` | `UUID` | `NOT NULL REFERENCES tasks(id) ON DELETE CASCADE` | Prerequisite |
| `dependency_type` | `VARCHAR(50)` | `NOT NULL DEFAULT 'finish_to_start'` | `finish_to_start`, `start_to_start`, `finish_to_finish`, `start_to_finish` |
| `is_blocking` | `BOOLEAN` | `NOT NULL DEFAULT TRUE` | Hard vs soft dependency |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Indexes:**
```sql
CREATE UNIQUE INDEX idx_task_deps_pair ON task_dependencies(task_id, depends_on_task_id);
CREATE INDEX idx_task_deps_task ON task_dependencies(task_id);
CREATE INDEX idx_task_deps_depends ON task_dependencies(depends_on_task_id);
```

**Estimated Rows:** 25M

#### Table: `task_assignments`

Audit log of all task assignments (who/what/when).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `BIGSERIAL` | `PRIMARY KEY` | |
| `task_id` | `UUID` | `NOT NULL REFERENCES tasks(id) ON DELETE CASCADE` | |
| `agent_instance_id` | `UUID` | `NOT NULL REFERENCES agent_instances(id)` | |
| `assigned_by` | `VARCHAR(50)` | `NOT NULL` | `scheduler`, `user`, `orchestrator`, `agent` |
| `assignment_reason` | `TEXT` | | Why this assignment was made |
| `context` | `JSONB` | `NOT NULL DEFAULT '{}'` | Scores, rationale |
| `started_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |
| `ended_at` | `TIMESTAMPTZ` | | When unassigned |
| `outcome` | `VARCHAR(50)` | | `completed`, `failed`, `reassigned`, `timeout` |

**Partitioning:** Monthly by `started_at`.

**Indexes:**
```sql
CREATE INDEX idx_task_assignments_task ON task_assignments(task_id);
CREATE INDEX idx_task_assignments_agent ON task_assignments(agent_instance_id);
CREATE INDEX idx_task_assignments_started ON task_assignments(started_at);
```

**Estimated Rows:** 5M/month

#### Table: `task_history`

Append-only changelog for tasks. Every mutation is recorded.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `BIGSERIAL` | `PRIMARY KEY` | |
| `task_id` | `UUID` | `NOT NULL REFERENCES tasks(id) ON DELETE CASCADE` | |
| `field` | `VARCHAR(100)` | `NOT NULL` | Changed field |
| `old_value` | `JSONB` | | Previous value |
| `new_value` | `JSONB` | | New value |
| `changed_by` | `UUID` | `REFERENCES users(id)` | Who changed |
| `changed_by_agent` | `UUID` | `REFERENCES agent_instances(id)` | Which agent changed |
| `reason` | `TEXT` | | Change reason |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Partitioning:** Monthly by `created_at`.

**Indexes:**
```sql
CREATE INDEX idx_task_history_task ON task_history(task_id);
CREATE INDEX idx_task_history_created ON task_history(created_at);
```

**Estimated Rows:** 20M/month

---

### 6.5 Workflows

#### Table: `workflow_definitions`

Reusable workflow blueprints. Defines the directed graph of activities, their transitions, and configuration.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY` | |
| `organization_id` | `UUID` | `NOT NULL REFERENCES organizations(id) ON DELETE CASCADE` | |
| `name` | `VARCHAR(200)` | `NOT NULL` | Workflow name |
| `description` | `TEXT` | | |
| `version` | `INTEGER` | `NOT NULL DEFAULT 1` | Semantic version |
| `is_latest` | `BOOLEAN` | `NOT NULL DEFAULT TRUE` | |
| `dsl_definition` | `JSONB` | `NOT NULL` | Workflow DSL (nodes, edges) |
| `temporal_workflow_type` | `VARCHAR(200)` | `NOT NULL` | Registered Temporal workflow type name |
| `input_schema` | `JSONB` | `NOT NULL DEFAULT '{}'` | Expected inputs |
| `output_schema` | `JSONB` | `NOT NULL DEFAULT '{}'` | Expected outputs |
| `variables` | `JSONB` | `NOT NULL DEFAULT '{}'` | Workflow variables |
| `trigger_config` | `JSONB` | `NOT NULL DEFAULT '{}'` | Webhook, cron, event triggers |
| `timeout_policy` | `JSONB` | `NOT NULL DEFAULT '{}'` | Overall timeout config |
| `retry_policy` | `JSONB` | `NOT NULL DEFAULT '{}'` | Default retry config |
| `concurrency_policy` | `VARCHAR(50)` | `NOT NULL DEFAULT 'allow_multiple'` | `allow_multiple`, `serial`, `cancel_existing` |
| `scheduling_rules` | `JSONB` | `NOT NULL DEFAULT '[]'` | When to auto-run |
| `notification_config` | `JSONB` | `NOT NULL DEFAULT '{}'` | Alert settings |
| `labels` | `JSONB` | `NOT NULL DEFAULT '[]'` | |
| `created_by` | `UUID` | `NOT NULL REFERENCES users(id)` | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Indexes:**
```sql
CREATE INDEX idx_workflow_defs_org ON workflow_definitions(organization_id);
CREATE INDEX idx_workflow_defs_name ON workflow_definitions(organization_id, name);
CREATE INDEX idx_workflow_defs_temporal ON workflow_definitions(temporal_workflow_type);
CREATE INDEX idx_workflow_defs_latest ON workflow_definitions(organization_id, is_latest);
```

**Estimated Rows:** 50K

#### Table: `workflow_instances`

A running or completed workflow execution. Maps 1:1 with a Temporal workflow execution.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY` | Our ID |
| `temporal_workflow_id` | `VARCHAR(255)` | `UNIQUE NOT NULL` | Temporal workflow ID |
| `temporal_run_id` | `VARCHAR(255)` | | Temporal run ID (changes on continue-as-new) |
| `organization_id` | `UUID` | `NOT NULL REFERENCES organizations(id) ON DELETE CASCADE` | |
| `workflow_definition_id` | `UUID` | `NOT NULL REFERENCES workflow_definitions(id)` | Source definition |
| `project_id` | `UUID` | `REFERENCES projects(id)` | |
| `name` | `VARCHAR(500)` | `NOT NULL` | Instance display name |
| `status` | `VARCHAR(50)` | `NOT NULL DEFAULT 'pending'` | `pending`, `running`, `completed`, `failed`, `cancelled`, `timed_out`, `continued` |
| `input` | `JSONB` | `NOT NULL DEFAULT '{}'` | Workflow inputs |
| `output` | `JSONB` | `NOT NULL DEFAULT '{}'` | Workflow outputs |
| `current_node_id` | `VARCHAR(100)` | | Currently executing node |
| `progress_percent` | `INTEGER` | `NOT NULL DEFAULT 0` | |
| `started_at` | `TIMESTAMPTZ` | | |
| `completed_at` | `TIMESTAMPTZ` | | |
| `duration_ms` | `BIGINT` | | Wall-clock duration |
| `attempt_count` | `INTEGER` | `NOT NULL DEFAULT 1` | Execution attempts |
| `cancel_reason` | `TEXT` | | If cancelled |
| `cancelled_by` | `UUID` | `REFERENCES users(id)` | |
| `error_info` | `JSONB` | `NOT NULL DEFAULT '{}'` | Last error |
| `labels` | `JSONB` | `NOT NULL DEFAULT '[]'` | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Partitioning:** Monthly by `created_at`.

**Indexes:**
```sql
CREATE UNIQUE INDEX idx_workflow_instances_temporal ON workflow_instances(temporal_workflow_id);
CREATE INDEX idx_workflow_instances_org ON workflow_instances(organization_id);
CREATE INDEX idx_workflow_instances_def ON workflow_instances(workflow_definition_id);
CREATE INDEX idx_workflow_instances_status ON workflow_instances(status);
CREATE INDEX idx_workflow_instances_project ON workflow_instances(project_id);
CREATE INDEX idx_workflow_instances_created ON workflow_instances(created_at);
```

**Estimated Rows:** 5M/month

#### Table: `workflow_executions`

Individual activity/step executions within a workflow. Provides granular observability.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY` | |
| `workflow_instance_id` | `UUID` | `NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE` | |
| `node_id` | `VARCHAR(100)` | `NOT NULL` | Node in the workflow graph |
| `node_type` | `VARCHAR(50)` | `NOT NULL` | `activity`, `decision`, `parallel`, `subworkflow`, `sleep`, `signal` |
| `activity_type` | `VARCHAR(200)` | | Temporal activity type name |
| `status` | `VARCHAR(50)` | `NOT NULL DEFAULT 'pending'` | `pending`, `scheduled`, `running`, `completed`, `failed`, `cancelled` |
| `input` | `JSONB` | `NOT NULL DEFAULT '{}'` | Activity input |
| `output` | `JSONB` | `NOT NULL DEFAULT '{}'` | Activity output |
| `error` | `JSONB` | `NOT NULL DEFAULT '{}'` | Error details |
| `retry_count` | `INTEGER` | `NOT NULL DEFAULT 0` | |
| `scheduled_at` | `TIMESTAMPTZ` | | |
| `started_at` | `TIMESTAMPTZ` | | |
| `completed_at` | `TIMESTAMPTZ` | | |
| `duration_ms` | `BIGINT` | | |
| `worker_id` | `VARCHAR(255)` | | Temporal worker that executed |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Partitioning:** Monthly by `created_at`.

**Indexes:**
```sql
CREATE INDEX idx_workflow_execs_instance ON workflow_executions(workflow_instance_id);
CREATE INDEX idx_workflow_execs_node ON workflow_executions(node_id);
CREATE INDEX idx_workflow_execs_status ON workflow_executions(status);
CREATE INDEX idx_workflow_execs_created ON workflow_executions(created_at);
CREATE INDEX idx_workflow_execs_activity ON workflow_executions(activity_type);
```

**Estimated Rows:** 50M/month

#### Table: `workflow_events`

Event stream for workflows. Signals, callbacks, timer fires, etc.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `BIGSERIAL` | `PRIMARY KEY` | |
| `workflow_instance_id` | `UUID` | `NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE` | |
| `event_type` | `VARCHAR(100)` | `NOT NULL` | `signal`, `timer`, `callback`, `child_complete`, `cancel`, `query` |
| `event_name` | `VARCHAR(200)` | | Signal name, timer ID |
| `payload` | `JSONB` | `NOT NULL DEFAULT '{}'` | Event data |
| `sequence` | `BIGINT` | `NOT NULL` | Order within workflow |
| `processed_at` | `TIMESTAMPTZ` | | When event was handled |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Partitioning:** Monthly by `created_at`.

**Indexes:**
```sql
CREATE INDEX idx_workflow_events_instance ON workflow_events(workflow_instance_id);
CREATE INDEX idx_workflow_events_type ON workflow_events(event_type);
CREATE INDEX idx_workflow_events_created ON workflow_events(created_at);
```

**Estimated Rows:** 100M/month

---

### 6.6 Memory

#### Table: `memory_chunks`

Atomic units of memory content. Chunks are the base unit for embedding, retrieval, and context assembly.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY` | |
| `organization_id` | `UUID` | `NOT NULL REFERENCES organizations(id) ON DELETE CASCADE` | |
| `memory_type` | `VARCHAR(50)` | `NOT NULL` | `semantic`, `episodic`, `procedural`, `project`, `task`, `conversation` |
| `source_type` | `VARCHAR(50)` | `NOT NULL` | `task`, `conversation`, `code`, `document`, `agent_output`, `user_input`, `system` |
| `source_id` | `UUID` | | ID of the source record |
| `content` | `TEXT` | `NOT NULL` | Raw text content |
| `content_hash` | `VARCHAR(64)` | `NOT NULL` | SHA-256 of content (dedup) |
| `token_count` | `INTEGER` | `NOT NULL` | Approximate token count |
| `metadata` | `JSONB` | `NOT NULL DEFAULT '{}'` | Source-specific metadata |
| `embedding_id` | `UUID` | | Reference to embedding record |
| `chunk_index` | `INTEGER` | `NOT NULL DEFAULT 0` | Position in source document |
| `parent_chunk_id` | `UUID` | `REFERENCES memory_chunks(id)` | Hierarchical chunks |
| `agent_id` | `UUID` | `REFERENCES agent_instances(id)` | Owning agent |
| `project_id` | `UUID` | `REFERENCES projects(id)` | Scoped project |
| `conversation_id` | `UUID` | `REFERENCES conversations(id)` | Scoped conversation |
| `access_level` | `VARCHAR(50)` | `NOT NULL DEFAULT 'private'` | `private`, `shared`, `public` |
| `relevance_score` | `DECIMAL(5,4)` | | Cached relevance |
| `access_count` | `INTEGER` | `NOT NULL DEFAULT 0` | Times retrieved |
| `last_accessed_at` | `TIMESTAMPTZ` | | |
| `ttl_seconds` | `INTEGER` | | Auto-expiry (null = never) |
| `expires_at` | `TIMESTAMPTZ` | | Computed expiry |
| `is_compressed` | `BOOLEAN` | `NOT NULL DEFAULT FALSE` | Was compacted |
| `compression_source_ids` | `JSONB` | `NOT NULL DEFAULT '[]'` | Source chunks if compressed |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Partitioning:** Partitioned by `LIST (memory_type)` first, then sub-partitioned monthly by `created_at`. Hot partitions: `conversation`, `task`. Warm: `semantic`, `project`. Cold archive: `episodic`.

**Indexes:**
```sql
CREATE INDEX idx_memory_chunks_org ON memory_chunks(organization_id);
CREATE INDEX idx_memory_chunks_type ON memory_chunks(memory_type);
CREATE INDEX idx_memory_chunks_source ON memory_chunks(source_type, source_id);
CREATE INDEX idx_memory_chunks_agent ON memory_chunks(agent_id);
CREATE INDEX idx_memory_chunks_project ON memory_chunks(project_id);
CREATE INDEX idx_memory_chunks_conversation ON memory_chunks(conversation_id);
CREATE INDEX idx_memory_chunks_access ON memory_chunks(access_level);
CREATE INDEX idx_memory_chunks_hash ON memory_chunks(content_hash);
CREATE INDEX idx_memory_chunks_expires ON memory_chunks(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_memory_chunks_created ON memory_chunks(created_at);
CREATE INDEX idx_memory_chunks_metadata ON memory_chunks USING GIN(metadata);
```

**Estimated Rows:** 1B+ (largest table, heavily partitioned)

#### Table: `memory_embeddings`

Stores Qdrant point IDs and metadata. Actual vectors live in Qdrant; this is the reference table.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY` | Matches Qdrant point ID |
| `memory_chunk_id` | `UUID` | `NOT NULL REFERENCES memory_chunks(id) ON DELETE CASCADE` | |
| `organization_id` | `UUID` | `NOT NULL REFERENCES organizations(id) ON DELETE CASCADE` | |
| `model_name` | `VARCHAR(100)` | `NOT NULL` | Embedding model used |
| `model_version` | `VARCHAR(50)` | `NOT NULL` | Model version |
| `vector_dimension` | `INTEGER` | `NOT NULL` | Typically 768, 1024, or 1536 |
| `qdrant_collection` | `VARCHAR(100)` | `NOT NULL` | Which Qdrant collection |
| `distance_metric` | `VARCHAR(20)` | `NOT NULL DEFAULT 'cosine'` | `cosine`, `euclidean`, `dot` |
| `metadata` | `JSONB` | `NOT NULL DEFAULT '{}'` | Payload mirrored from Qdrant |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Indexes:**
```sql
CREATE UNIQUE INDEX idx_embeddings_chunk ON memory_embeddings(memory_chunk_id);
CREATE INDEX idx_embeddings_org ON memory_embeddings(organization_id);
CREATE INDEX idx_embeddings_model ON memory_embeddings(model_name);
CREATE INDEX idx_embeddings_collection ON memory_embeddings(qdrant_collection);
CREATE INDEX idx_embeddings_metadata ON memory_embeddings USING GIN(metadata);
```

**Estimated Rows:** 1B+ (1:1 with memory_chunks)

#### Table: `memory_indices`

Named, pre-configured search indices over memory collections. Enables project-specific or task-specific search spaces.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY` | |
| `organization_id` | `UUID` | `NOT NULL REFERENCES organizations(id) ON DELETE CASCADE` | |
| `name` | `VARCHAR(200)` | `NOT NULL` | Index name |
| `description` | `TEXT` | | |
| `memory_types` | `JSONB` | `NOT NULL` | Which memory types to include |
| `filter_config` | `JSONB` | `NOT NULL DEFAULT '{}'` | Qdrant filter conditions |
| `embedding_model` | `VARCHAR(100)` | `NOT NULL` | Model for queries |
| `reranker_config` | `JSONB` | `NOT NULL DEFAULT '{}'` | Cross-encoder settings |
| `top_k_default` | `INTEGER` | `NOT NULL DEFAULT 10` | Default result count |
| `is_active` | `BOOLEAN` | `NOT NULL DEFAULT TRUE` | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Indexes:**
```sql
CREATE INDEX idx_memory_indices_org ON memory_indices(organization_id);
```

**Estimated Rows:** 10K

#### Table: `conversations`

Conversation containers for human-agent and agent-agent interactions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY` | |
| `organization_id` | `UUID` | `NOT NULL REFERENCES organizations(id) ON DELETE CASCADE` | |
| `project_id` | `UUID` | `REFERENCES projects(id)` | |
| `workspace_id` | `UUID` | `REFERENCES workspaces(id)` | |
| `title` | `VARCHAR(500)` | `NOT NULL` | Auto-generated or user-set |
| `type` | `VARCHAR(50)` | `NOT NULL DEFAULT 'human_agent'` | `human_agent`, `agent_agent`, `agent_team`, `review` |
| `status` | `VARCHAR(50)` | `NOT NULL DEFAULT 'active'` | `active`, `archived`, `deleted` |
| `participant_ids` | `JSONB` | `NOT NULL DEFAULT '[]'` | Agent and user IDs |
| `context_summary` | `TEXT` | | Rolling summary |
| `message_count` | `INTEGER` | `NOT NULL DEFAULT 0` | Cached count |
| `token_count` | `INTEGER` | `NOT NULL DEFAULT 0` | Total tokens |
| `metadata` | `JSONB` | `NOT NULL DEFAULT '{}'` | |
| `started_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |
| `last_message_at` | `TIMESTAMPTZ` | | |
| `archived_at` | `TIMESTAMPTZ` | | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Indexes:**
```sql
CREATE INDEX idx_conversations_org ON conversations(organization_id);
CREATE INDEX idx_conversations_project ON conversations(project_id);
CREATE INDEX idx_conversations_type ON conversations(type);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversations_participants ON conversations USING GIN(participant_ids);
CREATE INDEX idx_conversations_last_msg ON conversations(last_message_at);
```

**Estimated Rows:** 5M

#### Table: `messages`

Individual messages within conversations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY` | |
| `conversation_id` | `UUID` | `NOT NULL REFERENCES conversations(id) ON DELETE CASCADE` | |
| `parent_message_id` | `UUID` | `REFERENCES messages(id)` | Threading |
| `sender_type` | `VARCHAR(50)` | `NOT NULL` | `user`, `agent`, `system`, `tool` |
| `sender_id` | `UUID` | | User or agent ID |
| `role` | `VARCHAR(50)` | `NOT NULL` | `user`, `assistant`, `system`, `tool` |
| `content` | `TEXT` | `NOT NULL` | Message body |
| `content_blocks` | `JSONB` | `NOT NULL DEFAULT '[]'` | Structured blocks (text, code, image) |
| `tool_calls` | `JSONB` | `NOT NULL DEFAULT '[]'` | LLM tool invocations |
| `tool_results` | `JSONB` | `NOT NULL DEFAULT '[]'` | Tool outputs |
| `thinking_content` | `TEXT` | | Chain-of-thought / reasoning |
| `model_used` | `VARCHAR(100)` | | Which LLM generated this |
| `token_count_input` | `INTEGER` | | Input tokens |
| `token_count_output` | `INTEGER` | | Output tokens |
| `cost_usd` | `DECIMAL(12,8)` | | Message cost |
| `latency_ms` | `INTEGER` | | Generation latency |
| `feedback` | `JSONB` | `NOT NULL DEFAULT '{}'` | Thumbs up/down, comments |
| `is_visible` | `BOOLEAN` | `NOT NULL DEFAULT TRUE` | Hidden system messages |
| `metadata` | `JSONB` | `NOT NULL DEFAULT '{}'` | |
| `sequence` | `INTEGER` | `NOT NULL` | Order in conversation |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Partitioning:** Monthly by `created_at`.

**Indexes:**
```sql
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_sender ON messages(sender_type, sender_id);
CREATE INDEX idx_messages_parent ON messages(parent_message_id);
CREATE INDEX idx_messages_sequence ON messages(conversation_id, sequence);
CREATE INDEX idx_messages_created ON messages(created_at);
CREATE INDEX idx_messages_model ON messages(model_used);
```

**Estimated Rows:** 500M (largest content table, heavily partitioned)

#### Table: `summaries`

Hierarchical summarization of conversations and memory collections.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY` | |
| `source_type` | `VARCHAR(50)` | `NOT NULL` | `conversation`, `memory_collection`, `task`, `code_review` |
| `source_id` | `UUID` | `NOT NULL` | Source record |
| `summary_type` | `VARCHAR(50)` | `NOT NULL` | `rolling`, `final`, `hierarchical`, `topic` |
| `content` | `TEXT` | `NOT NULL` | Summary text |
| `original_token_count` | `INTEGER` | `NOT NULL` | Tokens before summarization |
| `summary_token_count` | `INTEGER` | `NOT NULL` | Tokens after summarization |
| `model_used` | `VARCHAR(100)` | | Summarization model |
| `coverage_percent` | `DECIMAL(5,2)` | | How much of source was covered |
| `key_points` | `JSONB` | `NOT NULL DEFAULT '[]'` | Extracted key points |
| `metadata` | `JSONB` | `NOT NULL DEFAULT '{}'` | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Indexes:**
```sql
CREATE INDEX idx_summaries_source ON summaries(source_type, source_id);
CREATE INDEX idx_summaries_type ON summaries(summary_type);
```

**Estimated Rows:** 25M


---

### 6.7 Code

#### Table: `code_snapshots`

Point-in-time captures of repository state for agent consumption. Prevents agents from seeing mid-edit inconsistent states.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY` | |
| `organization_id` | `UUID` | `NOT NULL REFERENCES organizations(id) ON DELETE CASCADE` | |
| `project_id` | `UUID` | `NOT NULL REFERENCES projects(id) ON DELETE CASCADE` | |
| `repository_id` | `UUID` | `NOT NULL REFERENCES repositories(id) ON DELETE CASCADE` | |
| `branch_id` | `UUID` | `NOT NULL REFERENCES branches(id) ON DELETE CASCADE` | |
| `commit_sha` | `VARCHAR(40)` | `NOT NULL` | Git commit hash |
| `snapshot_type` | `VARCHAR(50)` | `NOT NULL DEFAULT 'full'` | `full`, `incremental`, `workspace` |
| `file_count` | `INTEGER` | `NOT NULL DEFAULT 0` | |
| `total_lines` | `INTEGER` | `NOT NULL DEFAULT 0` | |
| `total_size_bytes` | `BIGINT` | `NOT NULL DEFAULT 0` | |
| `file_manifest` | `JSONB` | `NOT NULL DEFAULT '[]'` | List of files with hashes |
| `language_stats` | `JSONB` | `NOT NULL DEFAULT '{}'` | Lines per language |
| `dependency_graph` | `JSONB` | `NOT NULL DEFAULT '{}'` | Parsed imports/requires |
| `embedding_status` | `VARCHAR(50)` | `NOT NULL DEFAULT 'pending'` | `pending`, `processing`, `completed`, `error` |
| `created_by` | `UUID` | `NOT NULL REFERENCES users(id)` | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Indexes:**
```sql
CREATE INDEX idx_code_snapshots_org ON code_snapshots(organization_id);
CREATE INDEX idx_code_snapshots_repo ON code_snapshots(repository_id);
CREATE INDEX idx_code_snapshots_branch ON code_snapshots(branch_id);
CREATE INDEX idx_code_snapshots_commit ON code_snapshots(commit_sha);
CREATE INDEX idx_code_snapshots_project ON code_snapshots(project_id);
CREATE INDEX idx_code_snapshots_embedding ON code_snapshots(embedding_status);
```

**Estimated Rows:** 5M

#### Table: `code_reviews`

Structured code review records, both human and AI-generated.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY` | |
| `organization_id` | `UUID` | `NOT NULL REFERENCES organizations(id) ON DELETE CASCADE` | |
| `project_id` | `UUID` | `NOT NULL REFERENCES projects(id) ON DELETE CASCADE` | |
| `repository_id` | `UUID` | `NOT NULL REFERENCES repositories(id) ON DELETE CASCADE` | |
| `code_snapshot_id` | `UUID` | `NOT NULL REFERENCES code_snapshots(id)` | Reviewed snapshot |
| `pull_request_id` | `UUID` | `REFERENCES pull_requests(id)` | Associated PR |
| `title` | `VARCHAR(500)` | `NOT NULL` | Review title |
| `reviewer_type` | `VARCHAR(50)` | `NOT NULL` | `agent`, `user`, `hybrid` |
| `reviewer_id` | `UUID` | | Agent or user ID |
| `status` | `VARCHAR(50)` | `NOT NULL DEFAULT 'in_progress'` | `in_progress`, `completed`, `dismissed` |
| `summary` | `TEXT` | | Overall assessment |
| `issues_found` | `JSONB` | `NOT NULL DEFAULT '[]'` | Structured findings |
| `suggestions` | `JSONB` | `NOT NULL DEFAULT '[]'` | Improvement suggestions |
| `security_findings` | `JSONB` | `NOT NULL DEFAULT '[]'` | Security-specific issues |
| `performance_notes` | `JSONB` | `NOT NULL DEFAULT '[]'` | Performance observations |
| `scores` | `JSONB` | `NOT NULL DEFAULT '{}'` | Category scores (readability, security, etc.) |
| `metadata` | `JSONB` | `NOT NULL DEFAULT '{}'` | |
| `started_at` | `TIMESTAMPTZ` | | |
| `completed_at` | `TIMESTAMPTZ` | | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Indexes:**
```sql
CREATE INDEX idx_code_reviews_org ON code_reviews(organization_id);
CREATE INDEX idx_code_reviews_project ON code_reviews(project_id);
CREATE INDEX idx_code_reviews_repo ON code_reviews(repository_id);
CREATE INDEX idx_code_reviews_snapshot ON code_reviews(code_snapshot_id);
CREATE INDEX idx_code_reviews_reviewer ON code_reviews(reviewer_type, reviewer_id);
CREATE INDEX idx_code_reviews_status ON code_reviews(status);
CREATE INDEX idx_code_reviews_pr ON code_reviews(pull_request_id);
```

**Estimated Rows:** 2M

#### Table: `pull_requests`

Pull request tracking with agent assistance metadata.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY` | |
| `organization_id` | `UUID` | `NOT NULL REFERENCES organizations(id) ON DELETE CASCADE` | |
| `project_id` | `UUID` | `NOT NULL REFERENCES projects(id) ON DELETE CASCADE` | |
| `repository_id` | `UUID` | `NOT NULL REFERENCES repositories(id) ON DELETE CASCADE` | |
| `external_id` | `VARCHAR(255)` | | PR number from provider |
| `provider` | `VARCHAR(50)` | `NOT NULL` | `github`, `gitlab`, `bitbucket` |
| `title` | `VARCHAR(500)` | `NOT NULL` | PR title |
| `description` | `TEXT` | | PR body |
| `source_branch` | `VARCHAR(255)` | `NOT NULL` | Feature branch |
| `target_branch` | `VARCHAR(255)` | `NOT NULL` | Base branch |
| `author_id` | `UUID` | `REFERENCES users(id)` | Human author |
| `author_agent_id` | `UUID` | `REFERENCES agent_instances(id)` | Agent author |
| `status` | `VARCHAR(50)` | `NOT NULL DEFAULT 'open'` | `open`, `draft`, `merged`, `closed` |
| `merge_status` | `VARCHAR(50)` | | `clean`, `blocked`, `dirty`, `unstable` |
| `is_draft` | `BOOLEAN` | `NOT NULL DEFAULT FALSE` | |
| `review_decision` | `VARCHAR(50)` | | `approved`, `changes_requested`, `pending` |
| `agent_assisted` | `BOOLEAN` | `NOT NULL DEFAULT FALSE` | Was an agent involved |
| `agent_contributions` | `JSONB` | `NOT NULL DEFAULT '[]'` | What the agent did |
| `commit_count` | `INTEGER` | `NOT NULL DEFAULT 0` | |
| `file_count` | `INTEGER` | `NOT NULL DEFAULT 0` | Changed files |
| `additions` | `INTEGER` | `NOT NULL DEFAULT 0` | Lines added |
| `deletions` | `INTEGER` | `NOT NULL DEFAULT 0` | Lines deleted |
| `checks_status` | `VARCHAR(50)` | | `passing`, `failing`, `pending` |
| `metadata` | `JSONB` | `NOT NULL DEFAULT '{}'` | |
| `opened_at` | `TIMESTAMPTZ` | | |
| `merged_at` | `TIMESTAMPTZ` | | |
| `closed_at` | `TIMESTAMPTZ` | | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Indexes:**
```sql
CREATE INDEX idx_prs_org ON pull_requests(organization_id);
CREATE INDEX idx_prs_project ON pull_requests(project_id);
CREATE INDEX idx_prs_repo ON pull_requests(repository_id);
CREATE INDEX idx_prs_status ON pull_requests(status);
CREATE INDEX idx_prs_author ON pull_requests(author_id);
CREATE INDEX idx_prs_agent ON pull_requests(author_agent_id);
CREATE INDEX idx_prs_provider_external ON pull_requests(provider, external_id);
CREATE INDEX idx_prs_branches ON pull_requests(source_branch, target_branch);
```

**Estimated Rows:** 5M

#### Table: `patches`

Individual patches/diffs within a pull request or code change.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY` | |
| `pull_request_id` | `UUID` | `NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE` | |
| `file_path` | `TEXT` | `NOT NULL` | File being changed |
| `patch_type` | `VARCHAR(50)` | `NOT NULL` | `added`, `modified`, `deleted`, `renamed` |
| `old_path` | `TEXT` | | For renames |
| `old_sha` | `VARCHAR(64)` | | Old blob hash |
| `new_sha` | `VARCHAR(64)` | | New blob hash |
| `diff_text` | `TEXT` | `NOT NULL` | Unified diff |
| `old_start` | `INTEGER` | | Old hunk start line |
| `old_lines` | `INTEGER` | | Old hunk line count |
| `new_start` | `INTEGER` | | New hunk start line |
| `new_lines` | `INTEGER` | | New hunk line count |
| `additions` | `INTEGER` | `NOT NULL DEFAULT 0` | |
| `deletions` | `INTEGER` | `NOT NULL DEFAULT 0` | |
| `is_binary` | `BOOLEAN` | `NOT NULL DEFAULT FALSE` | |
| `agent_generated` | `BOOLEAN` | `NOT NULL DEFAULT FALSE` | |
| `agent_id` | `UUID` | `REFERENCES agent_instances(id)` | |
| `metadata` | `JSONB` | `NOT NULL DEFAULT '{}'` | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Indexes:**
```sql
CREATE INDEX idx_patches_pr ON patches(pull_request_id);
CREATE INDEX idx_patches_file ON patches(file_path);
CREATE INDEX idx_patches_type ON patches(patch_type);
CREATE INDEX idx_patches_agent ON patches(agent_id);
```

**Estimated Rows:** 50M

#### Table: `lint_results`

Static analysis results from linters, formatters, and style checkers.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY` | |
| `organization_id` | `UUID` | `NOT NULL REFERENCES organizations(id) ON DELETE CASCADE` | |
| `project_id` | `UUID` | `NOT NULL REFERENCES projects(id) ON DELETE CASCADE` | |
| `repository_id` | `UUID` | `NOT NULL REFERENCES repositories(id)` | |
| `code_snapshot_id` | `UUID` | `NOT NULL REFERENCES code_snapshots(id)` | |
| `tool_name` | `VARCHAR(100)` | `NOT NULL` | `eslint`, `pylint`, `prettier`, `black`, `rustfmt` |
| `tool_version` | `VARCHAR(50)` | | |
| `file_path` | `TEXT` | `NOT NULL` | |
| `line_number` | `INTEGER` | | |
| `column_number` | `INTEGER` | | |
| `severity` | `VARCHAR(20)` | `NOT NULL` | `error`, `warning`, `info`, `hint` |
| `rule_id` | `VARCHAR(200)` | | Lint rule code |
| `message` | `TEXT` | `NOT NULL` | Human-readable message |
| `suggestion` | `TEXT` | | Auto-fix suggestion |
| `can_fix` | `BOOLEAN` | `NOT NULL DEFAULT FALSE` | Is auto-fixable |
| `fixed_by` | `UUID` | `REFERENCES agent_instances(id)` | Agent that fixed |
| `fixed_at` | `TIMESTAMPTZ` | | When fixed |
| `metadata` | `JSONB` | `NOT NULL DEFAULT '{}'` | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Partitioning:** Monthly by `created_at`.

**Indexes:**
```sql
CREATE INDEX idx_lint_results_org ON lint_results(organization_id);
CREATE INDEX idx_lint_results_snapshot ON lint_results(code_snapshot_id);
CREATE INDEX idx_lint_results_file ON lint_results(file_path);
CREATE INDEX idx_lint_results_severity ON lint_results(severity);
CREATE INDEX idx_lint_results_tool ON lint_results(tool_name);
CREATE INDEX idx_lint_results_created ON lint_results(created_at);
```

**Estimated Rows:** 500M

#### Table: `test_results`

Test execution results.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY` | |
| `organization_id` | `UUID` | `NOT NULL REFERENCES organizations(id) ON DELETE CASCADE` | |
| `project_id` | `UUID` | `NOT NULL REFERENCES projects(id) ON DELETE CASCADE` | |
| `repository_id` | `UUID` | `NOT NULL REFERENCES repositories(id)` | |
| `code_snapshot_id` | `UUID` | `NOT NULL REFERENCES code_snapshots(id)` | |
| `test_suite` | `VARCHAR(255)` | `NOT NULL` | Suite name |
| `test_name` | `VARCHAR(500)` | `NOT NULL` | Test identifier |
| `test_path` | `TEXT` | `NOT NULL` | File path |
| `status` | `VARCHAR(50)` | `NOT NULL` | `passed`, `failed`, `skipped`, `error`, `flaky` |
| `duration_ms` | `INTEGER` | `NOT NULL` | Execution time |
| `error_message` | `TEXT` | | Failure details |
| `stack_trace` | `TEXT` | | Stack trace on failure |
| `stdout` | `TEXT` | | Test output |
| `stderr` | `TEXT` | | Error output |
| `retry_count` | `INTEGER` | `NOT NULL DEFAULT 0` | |
| `is_flaky` | `BOOLEAN` | `NOT NULL DEFAULT FALSE` | Detected as flaky |
| `metadata` | `JSONB` | `NOT NULL DEFAULT '{}'` | |
| `executed_at` | `TIMESTAMPTZ` | `NOT NULL` | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Partitioning:** Monthly by `executed_at`.

**Indexes:**
```sql
CREATE INDEX idx_test_results_org ON test_results(organization_id);
CREATE INDEX idx_test_results_snapshot ON test_results(code_snapshot_id);
CREATE INDEX idx_test_results_status ON test_results(status);
CREATE INDEX idx_test_results_suite ON test_results(test_suite);
CREATE INDEX idx_test_results_executed ON test_results(executed_at);
CREATE INDEX idx_test_results_flaky ON test_results(is_flaky) WHERE is_flaky = TRUE;
```

**Estimated Rows:** 2B (very large, heavily partitioned, archived aggressively)

---

### 6.8 Models

#### Table: `model_providers`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY` | |
| `name` | `VARCHAR(100)` | `UNIQUE NOT NULL` | `openai`, `anthropic`, `google`, `cohere`, `local`, `custom` |
| `display_name` | `VARCHAR(200)` | `NOT NULL` | Human-readable |
| `api_base_url` | `TEXT` | `NOT NULL` | Base URL for API calls |
| `auth_type` | `VARCHAR(50)` | `NOT NULL DEFAULT 'api_key'` | `api_key`, `oauth`, `iam`, `none` |
| `supported_features` | `JSONB` | `NOT NULL DEFAULT '[]'` | `streaming`, `function_calling`, `vision`, `json_mode` |
| `rate_limits` | `JSONB` | `NOT NULL DEFAULT '{}'` | RPM, TPM limits |
| `cost_config` | `JSONB` | `NOT NULL DEFAULT '{}'` | Pricing per 1K tokens |
| `is_active` | `BOOLEAN` | `NOT NULL DEFAULT TRUE` | |
| `is_local` | `BOOLEAN` | `NOT NULL DEFAULT FALSE` | Self-hosted |
| `health_status` | `VARCHAR(50)` | `NOT NULL DEFAULT 'unknown'` | `healthy`, `degraded`, `unhealthy` |
| `last_health_check` | `TIMESTAMPTZ` | | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Estimated Rows:** 20

#### Table: `model_configs`

Specific model configurations (e.g., `gpt-4-turbo`, `claude-3-5-sonnet`).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY` | |
| `provider_id` | `UUID` | `NOT NULL REFERENCES model_providers(id)` | |
| `model_id` | `VARCHAR(100)` | `NOT NULL` | Provider's model identifier |
| `display_name` | `VARCHAR(200)` | `NOT NULL` | Human-readable |
| `version` | `VARCHAR(50)` | | Model version hash |
| `model_type` | `VARCHAR(50)` | `NOT NULL` | `chat`, `completion`, `embedding`, `image`, `audio`, `moderation` |
| `capabilities` | `JSONB` | `NOT NULL DEFAULT '[]'` | `code`, `reasoning`, `vision`, `long_context`, `tools` |
| `context_window` | `INTEGER` | `NOT NULL` | Max input tokens |
| `max_output_tokens` | `INTEGER` | `NOT NULL` | Max output tokens |
| `input_cost_per_1k` | `DECIMAL(10,6)` | `NOT NULL DEFAULT 0` | Input pricing |
| `output_cost_per_1k` | `DECIMAL(10,6)` | `NOT NULL DEFAULT 0` | Output pricing |
| `supported_languages` | `JSONB` | `NOT NULL DEFAULT '[]'` | Best language support |
| `latency_profile` | `JSONB` | `NOT NULL DEFAULT '{}'` | p50, p99 latency benchmarks |
| `quality_scores` | `JSONB` | `NOT NULL DEFAULT '{}'` | Benchmark scores |
| `parameters` | `JSONB` | `NOT NULL DEFAULT '{}'` | Default generation params |
| `is_active` | `BOOLEAN` | `NOT NULL DEFAULT TRUE` | |
| `is_deprecated` | `BOOLEAN` | `NOT NULL DEFAULT FALSE` | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Indexes:**
```sql
CREATE INDEX idx_model_configs_provider ON model_configs(provider_id);
CREATE INDEX idx_model_configs_type ON model_configs(model_type);
CREATE INDEX idx_model_configs_active ON model_configs(is_active);
```

**Estimated Rows:** 100

#### Table: `routing_rules`

Declarative rules for model selection. Evaluated in priority order.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY` | |
| `organization_id` | `UUID` | `NOT NULL REFERENCES organizations(id) ON DELETE CASCADE` | |
| `name` | `VARCHAR(200)` | `NOT NULL` | Rule name |
| `priority` | `INTEGER` | `NOT NULL DEFAULT 100` | Lower = higher priority |
| `is_active` | `BOOLEAN` | `NOT NULL DEFAULT TRUE` | |
| `conditions` | `JSONB` | `NOT NULL` | Matching conditions |
| `action` | `JSONB` | `NOT NULL` | Model selection action |
| `fallback_models` | `JSONB` | `NOT NULL DEFAULT '[]'` | Fallback chain |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Indexes:**
```sql
CREATE INDEX idx_routing_rules_org ON routing_rules(organization_id);
CREATE INDEX idx_routing_rules_priority ON routing_rules(organization_id, priority);
CREATE INDEX idx_routing_rules_active ON routing_rules(is_active);
```

**Estimated Rows:** 5K

#### Table: `inference_requests`

Log of all LLM inference calls. Critical for cost tracking, observability, and optimization.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY` | |
| `organization_id` | `UUID` | `NOT NULL REFERENCES organizations(id) ON DELETE CASCADE` | |
| `project_id` | `UUID` | `REFERENCES projects(id)` | |
| `agent_instance_id` | `UUID` | `REFERENCES agent_instances(id)` | |
| `task_id` | `UUID` | `REFERENCES tasks(id)` | |
| `model_config_id` | `UUID` | `NOT NULL REFERENCES model_configs(id)` | |
| `request_type` | `VARCHAR(50)` | `NOT NULL` | `chat`, `completion`, `embedding`, `function` |
| `status` | `VARCHAR(50)` | `NOT NULL DEFAULT 'pending'` | `pending`, `queued`, `running`, `completed`, `failed`, `cached` |
| `messages` | `JSONB` | `NOT NULL DEFAULT '[]'` | Request messages (truncated if huge) |
| `prompt_text` | `TEXT` | | Raw prompt (for completions) |
| `tools_available` | `JSONB` | `NOT NULL DEFAULT '[]'` | Available tools |
| `tool_calls` | `JSONB` | `NOT NULL DEFAULT '[]'` | Tool calls in response |
| `parameters` | `JSONB` | `NOT NULL DEFAULT '{}'` | temperature, max_tokens, etc. |
| `token_count_input` | `INTEGER` | `NOT NULL DEFAULT 0` | Input tokens |
| `token_count_output` | `INTEGER` | `NOT NULL DEFAULT 0` | Output tokens |
| `cost_usd` | `DECIMAL(12,8)` | `NOT NULL DEFAULT 0` | Computed cost |
| `latency_ms` | `INTEGER` | | End-to-end latency |
| `ttft_ms` | `INTEGER` | | Time to first token |
| `streaming` | `BOOLEAN` | `NOT NULL DEFAULT FALSE` | Was streaming |
| `cached` | `BOOLEAN` | `NOT NULL DEFAULT FALSE` | Response from cache |
| `cache_hit_level` | `VARCHAR(20)` | | `exact`, `semantic`, `none` |
| `error_info` | `JSONB` | `NOT NULL DEFAULT '{}'` | Error details |
| `routing_path` | `JSONB` | `NOT NULL DEFAULT '[]'` | Which models were tried |
| `request_hash` | `VARCHAR(64)` | | For deduplication |
| `metadata` | `JSONB` | `NOT NULL DEFAULT '{}'` | |
| `requested_at` | `TIMESTAMPTZ` | `NOT NULL` | |
| `started_at` | `TIMESTAMPTZ` | | |
| `completed_at` | `TIMESTAMPTZ` | | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Partitioning:** Monthly by `created_at`.

**Indexes:**
```sql
CREATE INDEX idx_inference_org ON inference_requests(organization_id);
CREATE INDEX idx_inference_agent ON inference_requests(agent_instance_id);
CREATE INDEX idx_inference_model ON inference_requests(model_config_id);
CREATE INDEX idx_inference_status ON inference_requests(status);
CREATE INDEX idx_inference_task ON inference_requests(task_id);
CREATE INDEX idx_inference_type ON inference_requests(request_type);
CREATE INDEX idx_inference_created ON inference_requests(created_at);
CREATE INDEX idx_inference_cached ON inference_requests(cached) WHERE cached = TRUE;
CREATE INDEX idx_inference_request_hash ON inference_requests(request_hash);
```

**Estimated Rows:** 500M/month

#### Table: `inference_responses`

Full response storage for replay, audit, and training data.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY` | |
| `inference_request_id` | `UUID` | `NOT NULL REFERENCES inference_requests(id) ON DELETE CASCADE` | |
| `response_text` | `TEXT` | `NOT NULL` | Full response |
| `response_json` | `JSONB` | | Structured response |
| `finish_reason` | `VARCHAR(50)` | | `stop`, `length`, `tool_calls`, `content_filter` |
| `usage_stats` | `JSONB` | `NOT NULL DEFAULT '{}'` | Detailed token usage |
| `model_version` | `VARCHAR(50)` | | Actual model version |
| `metadata` | `JSONB` | `NOT NULL DEFAULT '{}'` | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Partitioning:** Monthly by `created_at`.

**Indexes:**
```sql
CREATE INDEX idx_inference_responses_request ON inference_responses(inference_request_id);
CREATE INDEX idx_inference_responses_created ON inference_responses(created_at);
```

**Estimated Rows:** 500M/month

---

### 6.9 Sandbox

#### Table: `sandboxes`

Container/VM environments for secure code execution.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY` | |
| `organization_id` | `UUID` | `NOT NULL REFERENCES organizations(id) ON DELETE CASCADE` | |
| `name` | `VARCHAR(200)` | `NOT NULL` | Sandbox identifier |
| `type` | `VARCHAR(50)` | `NOT NULL DEFAULT 'container'` | `container`, `vm`, `firecracker`, ` kata` |
| `runtime` | `VARCHAR(100)` | `NOT NULL` | `docker`, `gvisor`, `kata`, `firecracker` |
| `image` | `VARCHAR(255)` | `NOT NULL` | Base image |
| `status` | `VARCHAR(50)` | `NOT NULL DEFAULT 'creating'` | `creating`, `ready`, `running`, `paused`, `stopped`, `error` |
| `resource_allocation` | `JSONB` | `NOT NULL DEFAULT '{}'` | CPU, memory, disk allocated |
| `resource_usage` | `JSONB` | `NOT NULL DEFAULT '{}'` | Current utilization |
| `network_config` | `JSONB` | `NOT NULL DEFAULT '{}'` | Network policies |
| `volume_mounts` | `JSONB` | `NOT NULL DEFAULT '[]'` | Mounted volumes |
| `environment_vars` | `JSONB` | `NOT NULL DEFAULT '{}'` | Sandbox env |
| `agent_instance_id` | `UUID` | `REFERENCES agent_instances(id)` | Owning agent |
| `task_id` | `UUID` | `REFERENCES tasks(id)` | Current task |
| `workspace_id` | `UUID` | `REFERENCES workspaces(id)` | Linked workspace |
| `repository_id` | `UUID` | `REFERENCES repositories(id)` | Checked-out repo |
| `branch` | `VARCHAR(255)` | | Active branch |
| `commit_sha` | `VARCHAR(40)` | | Checked-out commit |
| `ttl_seconds` | `INTEGER` | `NOT NULL DEFAULT 3600` | Auto-terminate TTL |
| `expires_at` | `TIMESTAMPTZ` | | Computed expiry |
| `last_activity_at` | `TIMESTAMPTZ` | | Last execution |
| `exit_code` | `INTEGER` | | On termination |
| `error_info` | `JSONB` | `NOT NULL DEFAULT '{}'` | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Indexes:**
```sql
CREATE INDEX idx_sandboxes_org ON sandboxes(organization_id);
CREATE INDEX idx_sandboxes_status ON sandboxes(status);
CREATE INDEX idx_sandboxes_agent ON sandboxes(agent_instance_id);
CREATE INDEX idx_sandboxes_task ON sandboxes(task_id);
CREATE INDEX idx_sandboxes_expires ON sandboxes(expires_at);
CREATE INDEX idx_sandboxes_workspace ON sandboxes(workspace_id);
```

**Estimated Rows:** 50K

#### Table: `sandbox_executions`

Individual command executions within sandboxes.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY` | |
| `sandbox_id` | `UUID` | `NOT NULL REFERENCES sandboxes(id) ON DELETE CASCADE` | |
| `command` | `TEXT` | `NOT NULL` | Executed command |
| `command_type` | `VARCHAR(50)` | `NOT NULL` | `shell`, `python`, `node`, `test`, `build`, `git` |
| `working_directory` | `TEXT` | | CWD |
| `environment` | `JSONB` | `NOT NULL DEFAULT '{}'` | Env at execution |
| `stdin` | `TEXT` | | Input piped |
| `stdout` | `TEXT` | | Standard output |
| `stderr` | `TEXT` | | Standard error |
| `exit_code` | `INTEGER` | | Exit status |
| `status` | `VARCHAR(50)` | `NOT NULL DEFAULT 'running'` | `running`, `completed`, `failed`, `timeout`, `killed` |
| `duration_ms` | `INTEGER` | | Execution time |
| `memory_peak_mb` | `INTEGER` | | Peak memory |
| `cpu_time_ms` | `INTEGER` | | CPU time |
| `file_changes` | `JSONB` | `NOT NULL DEFAULT '[]'` | Files modified |
| `is_interactive` | `BOOLEAN` | `NOT NULL DEFAULT FALSE` | PTY session |
| `triggered_by` | `VARCHAR(50)` | | `agent`, `user`, `system` |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Partitioning:** Monthly by `created_at`.

**Indexes:**
```sql
CREATE INDEX idx_sandbox_execs_sandbox ON sandbox_executions(sandbox_id);
CREATE INDEX idx_sandbox_execs_type ON sandbox_executions(command_type);
CREATE INDEX idx_sandbox_execs_status ON sandbox_executions(status);
CREATE INDEX idx_sandbox_execs_created ON sandbox_executions(created_at);
```

**Estimated Rows:** 500M/month

#### Table: `sandbox_logs`

Structured log output from sandbox executions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `BIGSERIAL` | `PRIMARY KEY` | |
| `sandbox_id` | `UUID` | `NOT NULL REFERENCES sandboxes(id) ON DELETE CASCADE` | |
| `execution_id` | `UUID` | `NOT NULL REFERENCES sandbox_executions(id) ON DELETE CASCADE` | |
| `log_level` | `VARCHAR(20)` | `NOT NULL` | `debug`, `info`, `warn`, `error`, `fatal` |
| `source` | `VARCHAR(100)` | | Logger name |
| `message` | `TEXT` | `NOT NULL` | Log message |
| `metadata` | `JSONB` | `NOT NULL DEFAULT '{}'` | Structured fields |
| `timestamp` | `TIMESTAMPTZ` | `NOT NULL` | Log timestamp |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Partitioning:** Monthly by `timestamp`.

**Indexes:**
```sql
CREATE INDEX idx_sandbox_logs_sandbox ON sandbox_logs(sandbox_id);
CREATE INDEX idx_sandbox_logs_execution ON sandbox_logs(execution_id);
CREATE INDEX idx_sandbox_logs_level ON sandbox_logs(log_level);
CREATE INDEX idx_sandbox_logs_timestamp ON sandbox_logs(timestamp);
```

**Estimated Rows:** 5B (very large, aggressively archived)

#### Table: `resource_quotas`

Per-organization resource limits and current utilization.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY` | |
| `organization_id` | `UUID` | `NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE` | |
| `max_agents` | `INTEGER` | `NOT NULL DEFAULT 5` | |
| `max_concurrent_executions` | `INTEGER` | `NOT NULL DEFAULT 10` | |
| `max_cpu_cores` | `DECIMAL(10,2)` | `NOT NULL DEFAULT 4.0` | |
| `max_memory_gb` | `DECIMAL(10,2)` | `NOT NULL DEFAULT 16.0` | |
| `max_storage_gb` | `DECIMAL(10,2)` | `NOT NULL DEFAULT 100.0` | |
| `max_requests_per_minute` | `INTEGER` | `NOT NULL DEFAULT 60` | |
| `max_tokens_per_day` | `BIGINT` | `NOT NULL DEFAULT 1000000` | |
| `max_workflows` | `INTEGER` | `NOT NULL DEFAULT 50` | |
| `max_sandboxes` | `INTEGER` | `NOT NULL DEFAULT 10` | |
| `current_usage` | `JSONB` | `NOT NULL DEFAULT '{}'` | Real-time utilization |
| `alert_thresholds` | `JSONB` | `NOT NULL DEFAULT '{}'` | When to alert |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Estimated Rows:** 10K

---

### 6.10 Observability

#### Table: `traces`

Distributed trace roots. Each trace represents one end-to-end operation.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY` | Trace ID |
| `organization_id` | `UUID` | `NOT NULL REFERENCES organizations(id) ON DELETE CASCADE` | |
| `name` | `VARCHAR(255)` | `NOT NULL` | Operation name |
| `service` | `VARCHAR(100)` | `NOT NULL` | Originating service |
| `status` | `VARCHAR(20)` | `NOT NULL DEFAULT 'ok'` | `ok`, `error`, `cancelled` |
| `duration_ms` | `INTEGER` | | Total duration |
| `span_count` | `INTEGER` | `NOT NULL DEFAULT 0` | Number of spans |
| `attributes` | `JSONB` | `NOT NULL DEFAULT '{}'` | Key-value attributes |
| `started_at` | `TIMESTAMPTZ` | `NOT NULL` | |
| `ended_at` | `TIMESTAMPTZ` | | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Partitioning:** Daily by `started_at`.

**Indexes:**
```sql
CREATE INDEX idx_traces_org ON traces(organization_id);
CREATE INDEX idx_traces_name ON traces(name);
CREATE INDEX idx_traces_service ON traces(service);
CREATE INDEX idx_traces_status ON traces(status);
CREATE INDEX idx_traces_started ON traces(started_at);
CREATE INDEX idx_traces_attributes ON traces USING GIN(attributes);
```

**Estimated Rows:** 100M/day

#### Table: `spans`

Individual spans within traces.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY` | Span ID |
| `trace_id` | `UUID` | `NOT NULL REFERENCES traces(id) ON DELETE CASCADE` | Parent trace |
| `parent_span_id` | `UUID` | `REFERENCES spans(id)` | Hierarchical |
| `name` | `VARCHAR(255)` | `NOT NULL` | Span name |
| `kind` | `VARCHAR(20)` | `NOT NULL DEFAULT 'internal'` | `server`, `client`, `producer`, `consumer`, `internal` |
| `service` | `VARCHAR(100)` | `NOT NULL` | |
| `status` | `VARCHAR(20)` | `NOT NULL DEFAULT 'ok'` | |
| `duration_ms` | `INTEGER` | | |
| `attributes` | `JSONB` | `NOT NULL DEFAULT '{}'` | |
| `events` | `JSONB` | `NOT NULL DEFAULT '[]'` | Timed events |
| `links` | `JSONB` | `NOT NULL DEFAULT '[]'` | Cross-trace links |
| `started_at` | `TIMESTAMPTZ` | `NOT NULL` | |
| `ended_at` | `TIMESTAMPTZ` | | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Partitioning:** Daily by `started_at`.

**Indexes:**
```sql
CREATE INDEX idx_spans_trace ON spans(trace_id);
CREATE INDEX idx_spans_parent ON spans(parent_span_id);
CREATE INDEX idx_spans_name ON spans(name);
CREATE INDEX idx_spans_service ON spans(service);
CREATE INDEX idx_spans_started ON spans(started_at);
CREATE INDEX idx_spans_attributes ON spans USING GIN(attributes);
```

**Estimated Rows:** 1B/day

#### Table: `metrics`

Time-series metrics. Uses TimescaleDB hypertable.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `BIGSERIAL` | | Auto |
| `organization_id` | `UUID` | `NOT NULL` | |
| `name` | `VARCHAR(255)` | `NOT NULL` | Metric name |
| `value` | `DECIMAL(20,6)` | `NOT NULL` | Metric value |
| `labels` | `JSONB` | `NOT NULL DEFAULT '{}'` | Dimensions |
| `timestamp` | `TIMESTAMPTZ` | `NOT NULL` | |

**Hypertable:** `metrics` partitioned by `timestamp` with 1-hour chunks. Retention: 7 days hot, 30 days warm, 1 year compressed.

**Indexes:**
```sql
CREATE INDEX idx_metrics_name ON metrics(name);
CREATE INDEX idx_metrics_labels ON metrics USING GIN(labels);
CREATE INDEX idx_metrics_timestamp ON metrics(timestamp);
```

**Estimated Rows:** 10B+ (TimescaleDB handles this)

#### Table: `logs`

Structured application logs. Uses TimescaleDB hypertable.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `BIGSERIAL` | | |
| `organization_id` | `UUID` | `NOT NULL` | |
| `timestamp` | `TIMESTAMPTZ` | `NOT NULL` | |
| `level` | `VARCHAR(20)` | `NOT NULL` | `debug`, `info`, `warn`, `error`, `fatal` |
| `service` | `VARCHAR(100)` | `NOT NULL` | |
| `source` | `VARCHAR(255)` | | File/function |
| `message` | `TEXT` | `NOT NULL` | |
| `attributes` | `JSONB` | `NOT NULL DEFAULT '{}'` | Structured data |
| `trace_id` | `UUID` | | Correlation |
| `span_id` | `UUID` | | Correlation |

**Hypertable:** 1-hour chunks. Retention: 3 days hot, 14 days warm, 90 days compressed.

**Indexes:**
```sql
CREATE INDEX idx_logs_timestamp ON logs(timestamp);
CREATE INDEX idx_logs_level ON logs(level);
CREATE INDEX idx_logs_service ON logs(service);
CREATE INDEX idx_logs_trace ON logs(trace_id);
CREATE INDEX idx_logs_attributes ON logs USING GIN(attributes);
```

**Estimated Rows:** 100B+ (very large, aggressive retention)

#### Table: `events`

Business and system events.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `BIGSERIAL` | `PRIMARY KEY` | |
| `organization_id` | `UUID` | `NOT NULL REFERENCES organizations(id) ON DELETE CASCADE` | |
| `event_type` | `VARCHAR(100)` | `NOT NULL` | `agent.created`, `task.completed`, `pr.merged` |
| `event_category` | `VARCHAR(50)` | `NOT NULL` | `agent`, `task`, `workflow`, `code`, `system` |
| `severity` | `VARCHAR(20)` | `NOT NULL DEFAULT 'info'` | `debug`, `info`, `warn`, `error`, `critical` |
| `actor_type` | `VARCHAR(50)` | | `user`, `agent`, `system` |
| `actor_id` | `UUID` | | |
| `resource_type` | `VARCHAR(50)` | | `task`, `agent`, `project` |
| `resource_id` | `UUID` | | |
| `message` | `TEXT` | `NOT NULL` | Human-readable |
| `data` | `JSONB` | `NOT NULL DEFAULT '{}'` | Full event payload |
| `metadata` | `JSONB` | `NOT NULL DEFAULT '{}'` | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Partitioning:** Daily by `created_at`.

**Indexes:**
```sql
CREATE INDEX idx_events_org ON events(organization_id);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_category ON events(event_category);
CREATE INDEX idx_events_severity ON events(severity);
CREATE INDEX idx_events_actor ON events(actor_type, actor_id);
CREATE INDEX idx_events_resource ON events(resource_type, resource_id);
CREATE INDEX idx_events_created ON events(created_at);
```

**Estimated Rows:** 500M/day

#### Table: `alerts`

Alert records with state machine.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY` | |
| `organization_id` | `UUID` | `NOT NULL REFERENCES organizations(id) ON DELETE CASCADE` | |
| `name` | `VARCHAR(255)` | `NOT NULL` | Alert rule name |
| `severity` | `VARCHAR(20)` | `NOT NULL` | `critical`, `warning`, `info` |
| `status` | `VARCHAR(50)` | `NOT NULL DEFAULT 'firing'` | `firing`, `acknowledged`, `resolved`, `suppressed` |
| `summary` | `TEXT` | `NOT NULL` | Short description |
| `description` | `TEXT` | | Long description |
| `source` | `VARCHAR(100)` | `NOT NULL` | Originating system |
| `labels` | `JSONB` | `NOT NULL DEFAULT '{}'` | Alert dimensions |
| `value` | `DECIMAL(20,6)` | | Metric value that triggered |
| `threshold` | `DECIMAL(20,6)` | | Configured threshold |
| `runbook_url` | `TEXT` | | Runbook link |
| `resolved_at` | `TIMESTAMPTZ` | | |
| `resolved_by` | `UUID` | `REFERENCES users(id)` | |
| `acknowledged_at` | `TIMESTAMPTZ` | | |
| `acknowledged_by` | `UUID` | `REFERENCES users(id)` | |
| `notification_sent` | `JSONB` | `NOT NULL DEFAULT '[]'` | Notification channels used |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Indexes:**
```sql
CREATE INDEX idx_alerts_org ON alerts(organization_id);
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_source ON alerts(source);
CREATE INDEX idx_alerts_created ON alerts(created_at);
CREATE INDEX idx_alerts_labels ON alerts USING GIN(labels);
```

**Estimated Rows:** 10M


---

### 6.11 Security

#### Table: `audit_logs`

Immutable audit trail for compliance and forensics.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `BIGSERIAL` | `PRIMARY KEY` | |
| `organization_id` | `UUID` | `NOT NULL REFERENCES organizations(id) ON DELETE CASCADE` | |
| `event_type` | `VARCHAR(100)` | `NOT NULL` | `login`, `logout`, `action`, `access`, `change`, `delete` |
| `event_category` | `VARCHAR(50)` | `NOT NULL` | `auth`, `data`, `system`, `admin` |
| `severity` | `VARCHAR(20)` | `NOT NULL DEFAULT 'info'` | `debug`, `info`, `warn`, `error`, `critical` |
| `actor_type` | `VARCHAR(50)` | `NOT NULL` | `user`, `agent`, `system`, `api_key`, `integration` |
| `actor_id` | `UUID` | | |
| `actor_name` | `VARCHAR(255)` | | Denormalized for queryability |
| `actor_ip` | `INET` | | Source IP |
| `actor_user_agent` | `TEXT` | | |
| `action` | `VARCHAR(100)` | `NOT NULL` | `create`, `read`, `update`, `delete`, `execute`, `approve` |
| `resource_type` | `VARCHAR(100)` | `NOT NULL` | `task`, `agent`, `project`, `workflow`, `user` |
| `resource_id` | `UUID` | | |
| `resource_name` | `VARCHAR(500)` | | Denormalized |
| `previous_state` | `JSONB` | | Before change |
| `new_state` | `JSONB` | | After change |
| `change_summary` | `TEXT` | | Human-readable diff |
| `request_id` | `UUID` | | Correlation ID |
| `session_id` | `UUID` | | Session correlation |
| `success` | `BOOLEAN` | `NOT NULL` | Was action permitted |
| `denial_reason` | `TEXT` | | If denied, why |
| `metadata` | `JSONB` | `NOT NULL DEFAULT '{}'` | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Partitioning:** Monthly by `created_at`. Retain 1 year hot, archive 7 years cold.

**Indexes:**
```sql
CREATE INDEX idx_audit_org ON audit_logs(organization_id);
CREATE INDEX idx_audit_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_actor ON audit_logs(actor_type, actor_id);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_created ON audit_logs(created_at);
CREATE INDEX idx_audit_request ON audit_logs(request_id);
CREATE INDEX idx_audit_session ON audit_logs(session_id);
CREATE INDEX idx_audit_severity ON audit_logs(severity);
```

**Estimated Rows:** 100M/month

#### Table: `permissions`

Granular permission definitions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY` | |
| `name` | `VARCHAR(100)` | `UNIQUE NOT NULL` | `task:create`, `agent:execute`, `project:delete` |
| `description` | `TEXT` | | |
| `resource_type` | `VARCHAR(50)` | `NOT NULL` | `task`, `agent`, `project`, `workflow`, `user`, `organization` |
| `action` | `VARCHAR(50)` | `NOT NULL` | `create`, `read`, `update`, `delete`, `execute`, `admin` |
| `is_system` | `BOOLEAN` | `NOT NULL DEFAULT FALSE` | Built-in |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Estimated Rows:** 200

#### Table: `roles`

Role definitions with permission sets.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY` | |
| `organization_id` | `UUID` | `NOT NULL REFERENCES organizations(id) ON DELETE CASCADE` | Null = system role |
| `name` | `VARCHAR(100)` | `NOT NULL` | Role name |
| `description` | `TEXT` | | |
| `permissions` | `JSONB` | `NOT NULL DEFAULT '[]'` | Permission IDs |
| `inherits_from` | `UUID` | `REFERENCES roles(id)` | Role hierarchy |
| `is_system` | `BOOLEAN` | `NOT NULL DEFAULT FALSE` | |
| `is_default` | `BOOLEAN` | `NOT NULL DEFAULT FALSE` | Auto-assigned |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Indexes:**
```sql
CREATE INDEX idx_roles_org ON roles(organization_id);
CREATE INDEX idx_roles_system ON roles(is_system);
```

**Estimated Rows:** 1K

#### Table: `api_keys`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY` | |
| `organization_id` | `UUID` | `NOT NULL REFERENCES organizations(id) ON DELETE CASCADE` | |
| `name` | `VARCHAR(200)` | `NOT NULL` | Key name |
| `key_prefix` | `VARCHAR(20)` | `NOT NULL` | First 8 chars for display |
| `key_hash` | `VARCHAR(255)` | `UNIQUE NOT NULL` | Argon2 hash |
| `permissions` | `JSONB` | `NOT NULL DEFAULT '[]'` | Scoped permissions |
| `rate_limit` | `INTEGER` | `NOT NULL DEFAULT 100` | Requests per minute |
| `usage_count` | `BIGINT` | `NOT NULL DEFAULT 0` | Total calls |
| `last_used_at` | `TIMESTAMPTZ` | | |
| `expires_at` | `TIMESTAMPTZ` | | |
| `created_by` | `UUID` | `NOT NULL REFERENCES users(id)` | |
| `is_active` | `BOOLEAN` | `NOT NULL DEFAULT TRUE` | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Indexes:**
```sql
CREATE INDEX idx_api_keys_org ON api_keys(organization_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_active ON api_keys(is_active);
CREATE INDEX idx_api_keys_expires ON api_keys(expires_at);
```

**Estimated Rows:** 50K

#### Table: `sessions`

User and agent sessions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY` | Session ID |
| `organization_id` | `UUID` | `NOT NULL REFERENCES organizations(id) ON DELETE CASCADE` | |
| `session_type` | `VARCHAR(50)` | `NOT NULL` | `user`, `agent`, `api`, `webhook` |
| `user_id` | `UUID` | `REFERENCES users(id)` | For user sessions |
| `agent_instance_id` | `UUID` | `REFERENCES agent_instances(id)` | For agent sessions |
| `api_key_id` | `UUID` | `REFERENCES api_keys(id)` | For API sessions |
| `auth_method` | `VARCHAR(50)` | `NOT NULL` | `password`, `sso`, `api_key`, `token` |
| `ip_address` | `INET` | | |
| `user_agent` | `TEXT` | | |
| `device_info` | `JSONB` | `NOT NULL DEFAULT '{}'` | Parsed device |
| `location` | `JSONB` | `NOT NULL DEFAULT '{}'` | Geo location |
| `status` | `VARCHAR(50)` | `NOT NULL DEFAULT 'active'` | `active`, `expired`, `revoked`, `terminated` |
| `started_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |
| `last_activity_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |
| `expires_at` | `TIMESTAMPTZ` | `NOT NULL` | |
| `ended_at` | `TIMESTAMPTZ` | | |
| `metadata` | `JSONB` | `NOT NULL DEFAULT '{}'` | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Indexes:**
```sql
CREATE INDEX idx_sessions_org ON sessions(organization_id);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_agent ON sessions(agent_instance_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
CREATE INDEX idx_sessions_activity ON sessions(last_activity_at);
```

**Estimated Rows:** 500K

#### Table: `access_policies`

Fine-grained access policies (ABAC/RBAC hybrid).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY` | |
| `organization_id` | `UUID` | `NOT NULL REFERENCES organizations(id) ON DELETE CASCADE` | |
| `name` | `VARCHAR(200)` | `NOT NULL` | Policy name |
| `description` | `TEXT` | | |
| `effect` | `VARCHAR(20)` | `NOT NULL DEFAULT 'allow'` | `allow`, `deny` |
| `subjects` | `JSONB` | `NOT NULL DEFAULT '[]'` | Who (roles, users, agents) |
| `resources` | `JSONB` | `NOT NULL DEFAULT '[]'` | What (types, IDs, tags) |
| `actions` | `JSONB` | `NOT NULL DEFAULT '[]'` | Which actions |
| `conditions` | `JSONB` | `NOT NULL DEFAULT '{}'` | When (time, IP, etc.) |
| `priority` | `INTEGER` | `NOT NULL DEFAULT 100` | Evaluation order |
| `is_active` | `BOOLEAN` | `NOT NULL DEFAULT TRUE` | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Indexes:**
```sql
CREATE INDEX idx_access_policies_org ON access_policies(organization_id);
CREATE INDEX idx_access_policies_active ON access_policies(is_active);
```

**Estimated Rows:** 5K

---

### 6.12 Billing

#### Table: `usage_records`

Granular usage records for billing calculation.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `BIGSERIAL` | `PRIMARY KEY` | |
| `organization_id` | `UUID` | `NOT NULL REFERENCES organizations(id) ON DELETE CASCADE` | |
| `project_id` | `UUID` | `REFERENCES projects(id)` | |
| `resource_type` | `VARCHAR(50)` | `NOT NULL` | `llm_tokens`, `compute`, `storage`, `bandwidth`, `agent_runtime` |
| `resource_subtype` | `VARCHAR(100)` | | `gpt-4`, `sandbox_cpu`, `vector_storage` |
| `quantity` | `DECIMAL(20,8)` | `NOT NULL` | Usage amount |
| `unit` | `VARCHAR(50)` | `NOT NULL` | `tokens`, `seconds`, `gb-hours`, `requests` |
| `cost_per_unit` | `DECIMAL(20,10)` | `NOT NULL` | Rate at time of usage |
| `total_cost_usd` | `DECIMAL(20,10)` | `NOT NULL` | Computed cost |
| `agent_instance_id` | `UUID` | `REFERENCES agent_instances(id)` | |
| `task_id` | `UUID` | `REFERENCES tasks(id)` | |
| `workflow_instance_id` | `UUID` | `REFERENCES workflow_instances(id)` | |
| `metadata` | `JSONB` | `NOT NULL DEFAULT '{}'` | |
| `period_start` | `TIMESTAMPTZ` | `NOT NULL` | Billing period start |
| `period_end` | `TIMESTAMPTZ` | `NOT NULL` | Billing period end |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Partitioning:** Monthly by `period_start`.

**Indexes:**
```sql
CREATE INDEX idx_usage_org ON usage_records(organization_id);
CREATE INDEX idx_usage_project ON usage_records(project_id);
CREATE INDEX idx_usage_resource ON usage_records(resource_type);
CREATE INDEX idx_usage_period ON usage_records(period_start);
CREATE INDEX idx_usage_agent ON usage_records(agent_instance_id);
CREATE INDEX idx_usage_task ON usage_records(task_id);
CREATE INDEX idx_usage_org_period ON usage_records(organization_id, period_start);
```

**Estimated Rows:** 500M/month

#### Table: `quotas`

Configurable quotas and current utilization.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY` | |
| `organization_id` | `UUID` | `NOT NULL REFERENCES organizations(id) ON DELETE CASCADE` | |
| `quota_type` | `VARCHAR(100)` | `NOT NULL` | `agents`, `workflows`, `tokens`, `compute`, `storage` |
| `limit_value` | `DECIMAL(20,4)` | `NOT NULL` | Maximum allowed |
| `current_value` | `DECIMAL(20,4)` | `NOT NULL DEFAULT 0` | Current usage |
| `unit` | `VARCHAR(50)` | `NOT NULL` | Unit of measurement |
| `period` | `VARCHAR(50)` | `NOT NULL` | `daily`, `monthly`, `total` |
| `reset_at` | `TIMESTAMPTZ` | | When counter resets |
| `alert_threshold` | `DECIMAL(5,2)` | `NOT NULL DEFAULT 0.80` | Percentage at which to alert |
| `hard_limit` | `BOOLEAN` | `NOT NULL DEFAULT TRUE` | Enforce or just warn |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Indexes:**
```sql
CREATE INDEX idx_quotas_org ON quotas(organization_id);
CREATE INDEX idx_quotas_type ON quotas(quota_type);
```

**Estimated Rows:** 100K

#### Table: `billing_events`

Lifecycle events for billing (invoice generation, payment, etc.).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `BIGSERIAL` | `PRIMARY KEY` | |
| `organization_id` | `UUID` | `NOT NULL REFERENCES organizations(id) ON DELETE CASCADE` | |
| `event_type` | `VARCHAR(100)` | `NOT NULL` | `invoice.created`, `payment.succeeded`, `quota.exceeded` |
| `amount_usd` | `DECIMAL(20,10)` | | |
| `currency` | `VARCHAR(3)` | `NOT NULL DEFAULT 'USD'` | |
| `description` | `TEXT` | | |
| `external_id` | `VARCHAR(255)` | | Stripe invoice ID, etc. |
| `metadata` | `JSONB` | `NOT NULL DEFAULT '{}'` | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Partitioning:** Monthly.

**Indexes:**
```sql
CREATE INDEX idx_billing_events_org ON billing_events(organization_id);
CREATE INDEX idx_billing_events_type ON billing_events(event_type);
CREATE INDEX idx_billing_events_created ON billing_events(created_at);
```

**Estimated Rows:** 1M/month

#### Table: `cost_allocations`

Cost attribution to specific resources (projects, agents, workflows).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `BIGSERIAL` | `PRIMARY KEY` | |
| `organization_id` | `UUID` | `NOT NULL REFERENCES organizations(id) ON DELETE CASCADE` | |
| `usage_record_id` | `BIGINT` | `NOT NULL REFERENCES usage_records(id)` | |
| `allocation_type` | `VARCHAR(50)` | `NOT NULL` | `project`, `agent`, `task`, `workflow`, `team` |
| `allocated_to_id` | `UUID` | `NOT NULL` | ID of the target |
| `allocated_to_name` | `VARCHAR(255)` | | Denormalized name |
| `percentage` | `DECIMAL(5,2)` | `NOT NULL` | Allocation percent |
| `amount_usd` | `DECIMAL(20,10)` | `NOT NULL` | Cost share |
| `metadata` | `JSONB` | `NOT NULL DEFAULT '{}'` | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Partitioning:** Monthly.

**Indexes:**
```sql
CREATE INDEX idx_cost_alloc_org ON cost_allocations(organization_id);
CREATE INDEX idx_cost_alloc_usage ON cost_allocations(usage_record_id);
CREATE INDEX idx_cost_alloc_target ON cost_allocations(allocation_type, allocated_to_id);
```

**Estimated Rows:** 1B/month

---

### 6.13 Realtime

#### Table: `realtime_sessions`

Live collaboration and voice session tracking.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY` | Session ID |
| `organization_id` | `UUID` | `NOT NULL REFERENCES organizations(id) ON DELETE CASCADE` | |
| `project_id` | `UUID` | `REFERENCES projects(id)` | |
| `type` | `VARCHAR(50)` | `NOT NULL` | `voice`, `chat`, `collaboration`, `screen_share` |
| `status` | `VARCHAR(50)` | `NOT NULL DEFAULT 'active'` | `active`, `paused`, `ended`, `expired` |
| `created_by` | `UUID` | `NOT NULL REFERENCES users(id)` | |
| `metadata` | `JSONB` | `NOT NULL DEFAULT '{}'` | ICE servers, region, etc. |
| `started_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |
| `ended_at` | `TIMESTAMPTZ` | | |
| `duration_ms` | `INTEGER` | | Computed duration |
| `participant_count` | `INTEGER` | `NOT NULL DEFAULT 0` | Max participants |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Indexes:**
```sql
CREATE INDEX idx_rt_sessions_org ON realtime_sessions(organization_id);
CREATE INDEX idx_rt_sessions_project ON realtime_sessions(project_id);
CREATE INDEX idx_rt_sessions_type ON realtime_sessions(type);
CREATE INDEX idx_rt_sessions_status ON realtime_sessions(status);
CREATE INDEX idx_rt_sessions_started ON realtime_sessions(started_at);
```

**Estimated Rows:** 1M

#### Table: `presences`

Online presence tracking - lightweight, high-churn table.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY` | |
| `organization_id` | `UUID` | `NOT NULL REFERENCES organizations(id) ON DELETE CASCADE` | |
| `entity_type` | `VARCHAR(50)` | `NOT NULL` | `user`, `agent` |
| `entity_id` | `UUID` | `NOT NULL` | |
| `status` | `VARCHAR(50)` | `NOT NULL DEFAULT 'online'` | `online`, `away`, `busy`, `offline` |
| `activity` | `VARCHAR(255)` | | What they are doing |
| `current_task_id` | `UUID` | | |
| `current_project_id` | `UUID` | | |
| `metadata` | `JSONB` | `NOT NULL DEFAULT '{}'` | Client capabilities |
| `last_seen_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Indexes:**
```sql
CREATE INDEX idx_presences_org ON presences(organization_id);
CREATE INDEX idx_presences_entity ON presences(entity_type, entity_id);
CREATE INDEX idx_presences_status ON presences(status);
CREATE INDEX idx_presences_project ON presences(current_project_id);
CREATE INDEX idx_presences_seen ON presences(last_seen_at);
```

**Estimated Rows:** 50K (volatile, TTL 5 minutes)

#### Table: `subscriptions`

Realtime event subscriptions (WebSocket, SSE topics).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PRIMARY KEY` | |
| `session_id` | `UUID` | `NOT NULL` | Connection ID |
| `organization_id` | `UUID` | `NOT NULL REFERENCES organizations(id) ON DELETE CASCADE` | |
| `user_id` | `UUID` | `REFERENCES users(id)` | Subscriber |
| `channel` | `VARCHAR(255)` | `NOT NULL` | Channel/topic name |
| `filter` | `JSONB` | `NOT NULL DEFAULT '{}'` | Event filter |
| `metadata` | `JSONB` | `NOT NULL DEFAULT '{}'` | |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |
| `expires_at` | `TIMESTAMPTZ` | `NOT NULL` | TTL |

**Indexes:**
```sql
CREATE INDEX idx_subscriptions_session ON subscriptions(session_id);
CREATE INDEX idx_subscriptions_channel ON subscriptions(channel);
CREATE INDEX idx_subscriptions_org ON subscriptions(organization_id);
CREATE INDEX idx_subscriptions_expires ON subscriptions(expires_at);
```

**Estimated Rows:** 200K

#### Table: `activity_feeds`

Activity stream for project dashboards.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `BIGSERIAL` | `PRIMARY KEY` | |
| `organization_id` | `UUID` | `NOT NULL REFERENCES organizations(id) ON DELETE CASCADE` | |
| `project_id` | `UUID` | `NOT NULL REFERENCES projects(id) ON DELETE CASCADE` | |
| `actor_type` | `VARCHAR(50)` | `NOT NULL` | `user`, `agent`, `system` |
| `actor_id` | `UUID` | | |
| `actor_name` | `VARCHAR(255)` | | Denormalized |
| `verb` | `VARCHAR(100)` | `NOT NULL` | `created`, `completed`, `merged`, `commented` |
| `object_type` | `VARCHAR(100)` | `NOT NULL` | `task`, `pr`, `agent`, `workflow` |
| `object_id` | `UUID` | `NOT NULL` | |
| `object_name` | `VARCHAR(500)` | | |
| `message` | `TEXT` | `NOT NULL` | Rendered message |
| `data` | `JSONB` | `NOT NULL DEFAULT '{}'` | Full event data |
| `is_read` | `BOOLEAN` | `NOT NULL DEFAULT FALSE` | |
| `read_by` | `JSONB` | `NOT NULL DEFAULT '[]'` | User IDs who read |
| `importance` | `VARCHAR(20)` | `NOT NULL DEFAULT 'normal'` | `low`, `normal`, `high` |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()` | |

**Partitioning:** Daily by `created_at`.

**Indexes:**
```sql
CREATE INDEX idx_activity_org ON activity_feeds(organization_id);
CREATE INDEX idx_activity_project ON activity_feeds(project_id);
CREATE INDEX idx_activity_actor ON activity_feeds(actor_type, actor_id);
CREATE INDEX idx_activity_object ON activity_feeds(object_type, object_id);
CREATE INDEX idx_activity_created ON activity_feeds(created_at);
CREATE INDEX idx_activity_read ON activity_feeds(is_read) WHERE is_read = FALSE;
```

**Estimated Rows:** 50M/day

---

### 6.14 Vector Schema (Qdrant)

Qdrant is the dedicated vector database for semantic memory, code embeddings, and similarity search. It operates alongside PostgreSQL, with the relational system owning metadata and Qdrant owning vector search.

#### Collections

| Collection | Dimensions | Distance | Description |
|------------|-----------|----------|-------------|
| `memory_semantic` | 1536 | Cosine | General semantic memory chunks |
| `memory_code` | 768 | Cosine | Code embeddings (smaller, specialized) |
| `memory_conversation` | 1536 | Cosine | Conversation history embeddings |
| `memory_project` | 1536 | Cosine | Project-specific knowledge |
| `code_snippets` | 768 | Cosine | Code snippet search |
| `agent_skills` | 768 | Cosine | Procedural memory / skill vectors |
| `documentation` | 1536 | Cosine | Doc embeddings for RAG |

#### Payload Schema (per point)

```json
{
  "chunk_id": "uuid - links to memory_chunks",
  "organization_id": "uuid - RLS filter",
  "memory_type": "string - semantic|code|conversation|project",
  "source_type": "string - task|conversation|code|document",
  "source_id": "uuid - source record",
  "agent_id": "uuid - owning agent",
  "project_id": "uuid - scoped project",
  "conversation_id": "uuid - scoped conversation",
  "task_id": "uuid - scoped task",
  "created_at": "integer - Unix timestamp",
  "token_count": "integer - chunk size",
  "access_level": "string - private|shared|public",
  "relevance_score": "float - cached relevance",
  "metadata": "object - flexible key-value"
}
```

#### Indexing Strategy

```yaml
hnsw_config:
  m: 16
  ef_construct: 200
  ef: 100
  full_scan_threshold: 10000
  max_indexing_threads: 8

payload_indexes:
  - field: organization_id
    type: keyword
  - field: memory_type
    type: keyword
  - field: source_type
    type: keyword
  - field: agent_id
    type: keyword
  - field: project_id
    type: keyword
  - field: conversation_id
    type: keyword
  - field: created_at
    type: integer
  - field: access_level
    type: keyword
  - field: relevance_score
    type: float
```

#### Multi-Tenancy Strategy

Use payload-based filtering with `organization_id` as a mandatory payload field on every point. Query patterns always include:

```python
client.search(
    collection_name="memory_semantic",
    query_vector=embedding,
    query_filter=models.Filter(
        must=[
            models.FieldCondition(
                key="organization_id",
                match=models.MatchValue(value=org_id)
            ),
            models.FieldCondition(
                key="access_level",
                match=models.MatchAny(any=["public", "shared"])
            ),
            models.FieldCondition(
                key="created_at",
                range=models.Range(gte=seven_days_ago)
            )
        ]
    ),
    limit=10,
    with_payload=True
)
```

**Sharding:** Per-collection, hash-based sharding on `chunk_id` across Qdrant cluster nodes.
**Replication:** Factor of 3 for availability.
**Snapshots:** Daily incremental to S3.

---

### 6.15 Redis Key Patterns and Data Structures

Redis serves as the hot-path cache, pub/sub bus, session store, distributed lock provider, and rate limiter.

#### Key Patterns

```
# Session store (Hash)
session:{session_id} -> Hash { user_id, org_id, status, expires_at }
TTL: 24 hours

# Agent heartbeat (String with TTL)
agent:{agent_id}:heartbeat -> "{timestamp, status, host}"
TTL: 2 minutes (refreshed by agent ping)

# Agent state cache (Hash)
agent:{agent_id}:state -> Hash { status, task_id, workspace_id, context }
TTL: 1 hour

# Task queue (Sorted Set - priority queue)
queue:org:{org_id}:pending -> ZSet [ {score: priority+timestamp, member: task_id} ]
queue:org:{org_id}:type:{type} -> ZSet [ filtered by type ]

# Task state cache (Hash)
task:{task_id}:state -> Hash { status, assigned_to, progress, started_at }
TTL: 24 hours after completion

# Presence (Hash with TTL)
presence:org:{org_id}:{entity_type}:{entity_id} -> Hash { status, activity, last_seen }
TTL: 5 minutes (refreshed on activity)

# Rate limiting (Sliding window - String counters)
ratelimit:org:{org_id}:{resource} -> "{window_start}:{count}"
TTL: window size (e.g., 1 minute)

# Rate limiting (Token bucket - Hash)
ratelimit:bucket:org:{org_id}:api -> Hash { tokens, last_refill, capacity }
TTL: 1 hour

# Distributed locks (String with NX + TTL)
lock:{resource_name} -> "{owner_id}:{timestamp}"
TTL: 30 seconds (auto-release on crash)

# Workflow signals (List - FIFO)
signals:workflow:{workflow_id} -> List [ signal_json, ... ]
TTL: 7 days

# Pub/Sub channels
pubsub:org:{org_id}:events          -> Organization events
pubsub:org:{org_id}:agents          -> Agent state changes
pubsub:org:{org_id}:tasks           -> Task updates
pubsub:project:{project_id}:code    -> Code changes
pubsub:user:{user_id}:notifications -> User notifications
pubsub:workflow:{workflow_id}       -> Workflow events

# Realtime presence (Hash)
room:{room_id}:participants -> Hash { user_id -> { joined_at, status, cursor_position } }
TTL: 1 hour

# Cache layer (String / JSON)
cache:api:{endpoint_hash} -> "{json_response}"
TTL: 5 minutes - 1 hour (configurable)

cache:project:{project_id}:structure -> "{file_tree_json}"
TTL: 1 hour

cache:agent:{agent_id}:memory:recent -> "{recent_chunks_json}"
TTL: 10 minutes

# Leaderboards / Counters (Sorted Set)
leaderboard:org:{org_id}:agent:tasks_completed -> ZSet [ agent_id -> count ]
leaderboard:org:{org_id}:agent:tokens_used -> ZSet [ agent_id -> tokens ]

# Feature flags (Hash per org)
features:org:{org_id} -> Hash { flag_name -> enabled(bool) }
TTL: 5 minutes (refreshed periodically)

# Orchestration state (Hash)
orchestrator:org:{org_id}:scheduler -> Hash { last_run, active_agents, queue_depth }
TTL: 1 hour

# Embedding cache (String)
embedding:hash:{content_sha256} -> "{embedding_json}"
TTL: 7 days
```

#### Data Structures Summary

| Use Case | Structure | TTL | Scale Estimate |
|----------|-----------|-----|---------------|
| Sessions | Hash | 24h | 500K keys |
| Agent heartbeats | String | 2m | 100K keys (volatile) |
| Task queues | Sorted Set | Persistent | 50K queues |
| Rate limiting | Hash/String | 1m-1h | 1M keys (volatile) |
| Presence | Hash | 5m | 50K keys (volatile) |
| Distributed locks | String | 30s | 10K keys (volatile) |
| Pub/Sub | Channel | N/A | 10K channels |
| Cache | String | 5m-1h | 5M keys |
| Feature flags | Hash | 5m | 10K keys |
| Embedding cache | String | 7d | 50M keys |

---

### 6.16 Graph Schema (Neo4j / Apache AGE)

An optional graph layer models agent relationships, knowledge graphs, and dependency networks that are difficult to express relationally.

#### Nodes

```cypher
// Agent node
(:Agent {
  id: uuid,
  instance_id: uuid,
  name: string,
  type: string,
  status: string,
  organization_id: uuid,
  capabilities: [string],
  created_at: datetime
})

// Task node
(:Task {
  id: uuid,
  title: string,
  type: string,
  status: string,
  priority: integer,
  organization_id: uuid,
  project_id: uuid
})

// Knowledge node (from memory)
(:Knowledge {
  id: uuid,
  chunk_id: uuid,
  content_summary: string,
  memory_type: string,
  embedding_id: uuid,
  source_type: string,
  created_at: datetime
})

// CodeEntity node
(:CodeEntity {
  id: uuid,
  name: string,
  entity_type: string,
  file_path: string,
  language: string,
  repository_id: uuid,
  start_line: integer,
  end_line: integer
})

// User node
(:User {
  id: uuid,
  name: string,
  email: string,
  organization_id: uuid,
  role: string
})
```

#### Relationships

```cypher
// Agent delegation
(a:Agent)-[:DELEGATED_TO { task_id: uuid, timestamp: datetime, reason: string }]->(b:Agent)

// Agent collaboration
(a:Agent)-[:COLLABORATES_WITH { project_id: uuid, since: datetime }]->(b:Agent)

// Task assignment
(a:Agent)-[:ASSIGNED_TO { assigned_at: datetime, reason: string }]->(t:Task)

// Task dependency
(t1:Task)-[:DEPENDS_ON { dependency_type: string }]->(t2:Task)

// Knowledge relevance
(a:Agent)-[:ACCESSED { timestamp: datetime, relevance_score: float }]->(k:Knowledge)

// Knowledge similarity (pre-computed)
(k1:Knowledge)-[:SEMANTICALLY_SIMILAR { score: float }]->(k2:Knowledge)

// Code dependency
(e1:CodeEntity)-[:CALLS { line: integer }]->(e2:CodeEntity)
(e1:CodeEntity)-[:IMPORTS]->(e2:CodeEntity)
(e1:CodeEntity)-[:CONTAINS]->(e2:CodeEntity)

// Code to knowledge link
(e:CodeEntity)-[:DOCUMENTED_BY]->(k:Knowledge)

// User to agent ownership
(u:User)-[:OWNS { created_at: datetime }]->(a:Agent)

// Task to knowledge
(t:Task)-[:REQUIRES_KNOWLEDGE]->(k:Knowledge)

// Agent capability
(a:Agent)-[:HAS_CAPABILITY { level: string }]->(c:Capability)
```

#### Query Patterns

```cypher
// Find agents with similar knowledge access patterns
MATCH (a1:Agent)-[:ACCESSED]->(k:Knowledge)<-[:ACCESSED]-(a2:Agent)
WHERE a1.id = $agent_id AND a1 <> a2
RETURN a2.id, a2.name, count(k) as shared_knowledge
ORDER BY shared_knowledge DESC
LIMIT 10

// Find task dependency chain
MATCH path = (t:Task)-[:DEPENDS_ON*]->(dep:Task)
WHERE t.id = $task_id
RETURN dep.id, dep.title, length(path) as depth
ORDER BY depth

// Find code impact graph
MATCH (changed:CodeEntity { name: $function_name })-[:CALLS*0..5]->(impacted:CodeEntity)
RETURN impacted.name, impacted.file_path, impacted.entity_type

// Recommend knowledge for agent based on task similarity
MATCH (a:Agent)-[:ASSIGNED_TO]->(t:Task)
WHERE a.id = $agent_id
MATCH (similar_task:Task)-[:REQUIRES_KNOWLEDGE]->(k:Knowledge)
WHERE similar_task.type = t.type AND similar_task.status = 'completed'
RETURN k.id, k.content_summary, count(*) as relevance
ORDER BY relevance DESC
LIMIT 20
```

#### Implementation Notes

- **Apache AGE** (Postgres extension) is preferred over separate Neo4j to avoid operational complexity.
- Graph is populated asynchronously via change data capture (CDC) from Postgres.
- Write to graph is eventual consistency (~1 second lag acceptable).
- Graph queries are used for recommendations and analytics, not for transactional operations.



---

### 7.12 Agent Concurrency Control and Rate Limiting

#### Per-Agent Concurrency

```python
class AgentRateLimiter:
    def __init__(self, agent_id: UUID):
        self.agent_id = agent_id
        self.redis_key = f"ratelimit:bucket:agent:{agent_id}"

    async def acquire(self, tokens: int = 1) -> bool:
        # Lua script for atomic token bucket - executed atomically in Redis
        lua_script = (
            "local key = KEYS[1]; "
            "local tokens_requested = tonumber(ARGV[1]); "
            "local capacity = tonumber(ARGV[2]); "
            "local refill_rate = tonumber(ARGV[3]); "
            "local now = tonumber(ARGV[4]); "
            "local bucket = redis.call('HMGET', key, 'tokens', 'last_refill'); "
            "local tokens = tonumber(bucket[1]) or capacity; "
            "local last_refill = tonumber(bucket[2]) or now; "
            "local elapsed = now - last_refill; "
            "local refill = elapsed * refill_rate; "
            "tokens = math.min(capacity, tokens + refill); "
            "if tokens >= tokens_requested then "
            "  tokens = tokens - tokens_requested; "
            "  redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now); "
            "  redis.call('EXPIRE', key, 3600); "
            "  return 1; "
            "else "
            "  redis.call('HSET', key, 'last_refill', now); "
            "  return 0; "
            "end"
        )
        return await redis.eval(
            lua_script, [self.redis_key],
            [tokens, CAPACITY, REFILL_RATE, time.time()]
        )
```

#### Rate Limit Dimensions

| Dimension | Default Limit | Burst | Scope |
|-----------|-------------|-------|-------|
| LLM requests | 60/min | 120 | Per agent |
| LLM tokens | 100K/min | 200K | Per agent |
| File reads | 1000/min | 2000 | Per agent |
| File writes | 100/min | 200 | Per agent |
| Shell commands | 30/min | 60 | Per agent |
| Git operations | 20/min | 40 | Per agent |
| API calls | 300/min | 600 | Per agent |
| Tool calls | 120/min | 240 | Per agent |
| Memory searches | 200/min | 400 | Per agent |

#### Distributed Concurrency

```python
async def with_distributed_lock(
    resource: str,
    agent_id: UUID,
    timeout: timedelta = timedelta(seconds=30)
):
    lock_key = f"lock:{resource}"
    lock_value = f"{agent_id}:{time.time()}"

    acquired = await redis.set(
        lock_key, lock_value,
        nx=True, px=int(timeout.total_seconds() * 1000)
    )
    if not acquired:
        raise ConcurrencyError(f"Resource {resource} is locked")
    try:
        yield
    finally:
        # Safe unlock (only if we own it)
        unlock_script = (
            "if redis.call('get', KEYS[1]) == ARGV[1] then "
            "  return redis.call('del', KEYS[1]); "
            "else "
            "  return 0; "
            "end"
        )
        await redis.eval(unlock_script, [lock_key], [lock_value])
```

---

### 7.13 Agent Data Model Summary

The agent lifecycle architecture is built on the following core data model, implemented in the PostgreSQL schema (see Item 6):

**Core Entities:**
- `agent_types` — Taxonomy of agent roles (coding, planning, reviewing, etc.)
- `agent_definitions` — Reusable configuration templates
- `agent_instances` — Runtime agent processes
- `agent_states` — Append-only state transition log
- `agent_capabilities` — Registry of available capabilities

**Key Relationships:**
- Agent Definition -> Agent Type (many-to-one)
- Agent Instance -> Agent Definition (many-to-one)
- Agent Instance -> Task (one-to-one, current task)
- Agent Instance -> User (created_by)
- Agent Instance -> Organization (tenant boundary)
- Agent Capability -> Agent Type (many-to-many)

**Lifecycle Events:**
Every state transition generates an event:
- `agent.created` — New agent instantiated
- `agent.configured` — Configuration applied
- `agent.started` — Agent began running
- `task.assigned` — Task assigned to agent
- `agent.executing` — Began task execution
- `agent.paused` — Execution suspended
- `agent.completed` — Task finished
- `agent.failed` — Execution failed
- `agent.recovered` — After crash recovery
- `agent.upgraded` — Definition updated
- `agent.delegated` — Subtask delegated
- `agent.archived` — Agent terminated



---

## Item 8: Workflow Engine Architecture

### Overview

The workflow engine is built on **Temporal**, a durable execution platform that provides fault-tolerant stateful workflow orchestration. Temporal guarantees that workflows complete exactly once, survive process crashes, and maintain full execution history for replay and debugging.

**Why Temporal:**
- **Durable Execution:** Workflows survive worker crashes, network partitions, and datacenter failures.
- **Deterministic Replay:** Full history enables debugging by replaying exact execution sequence.
- **Built-in Timeouts:** Automatic timeout handling at workflow and activity levels.
- **Signals and Queries:** External interaction model for human-in-the-loop and status checks.
- **Child Workflows:** Composable, hierarchical workflow decomposition.
- **Versioning:** Safe deployment of workflow changes without breaking in-flight executions.

---

### 8.1 Workflow Types

#### Type 1: Sequential Workflow

Execute activities one after another. The simplest pattern.

```python
@workflow.defn
class SequentialAgentWorkflow:
    @workflow.run
    async def run(self, input_data: dict) -> dict:
        # Step 1: Analyze task
        analysis = await workflow.execute_activity(
            analyze_task,
            input_data,
            start_to_close_timeout=timedelta(minutes=2)
        )

        # Step 2: Plan approach
        plan = await workflow.execute_activity(
            create_plan,
            analysis,
            start_to_close_timeout=timedelta(minutes=2)
        )

        # Step 3: Execute plan steps
        for step in plan.steps:
            result = await workflow.execute_activity(
                execute_step,
                step,
                start_to_close_timeout=timedelta(minutes=5)
            )
            await workflow.execute_activity(
                save_progress,
                {"step_id": step.id, "result": result},
                start_to_close_timeout=timedelta(seconds=30)
            )

        # Step 4: Validate results
        validation = await workflow.execute_activity(
            validate_results,
            {"plan": plan, "results": results},
            start_to_close_timeout=timedelta(minutes=2)
        )

        return {"status": "completed", "validation": validation}
```

#### Type 2: Parallel Workflow

Execute independent activities concurrently.

```python
@workflow.defn
class ParallelReviewWorkflow:
    @workflow.run
    async def run(self, pull_request: dict) -> dict:
        results = await asyncio.gather(
            workflow.execute_activity(
                review_code_quality, pull_request,
                start_to_close_timeout=timedelta(minutes=3)),
            workflow.execute_activity(
                review_security, pull_request,
                start_to_close_timeout=timedelta(minutes=3)),
            workflow.execute_activity(
                review_performance, pull_request,
                start_to_close_timeout=timedelta(minutes=3)),
            workflow.execute_activity(
                review_tests, pull_request,
                start_to_close_timeout=timedelta(minutes=3)),
        )

        quality, security, performance, tests = results

        summary = await workflow.execute_activity(
            aggregate_reviews,
            {"quality": quality, "security": security,
             "performance": performance, "tests": tests},
            start_to_close_timeout=timedelta(minutes=1)
        )

        return summary
```

#### Type 3: Conditional Workflow

Branch based on activity results or external signals.

```python
@workflow.defn
class ConditionalDeployWorkflow:
    @workflow.run
    async def run(self, deploy_request: dict) -> dict:
        test_results = await workflow.execute_activity(
            run_test_suite, deploy_request,
            start_to_close_timeout=timedelta(minutes=10)
        )

        if test_results.pass_rate < 0.95:
            await workflow.execute_activity(
                notify_deployment_blocked,
                {"reason": "tests_failed", "results": test_results},
                start_to_close_timeout=timedelta(seconds=30)
            )
            return {"status": "blocked", "reason": "insufficient_test_coverage"}

        security_scan = await workflow.execute_activity(
            run_security_scan, deploy_request,
            start_to_close_timeout=timedelta(minutes=5)
        )

        if security_scan.critical_issues > 0:
            await workflow.execute_activity(
                request_human_approval,
                {"type": "security_override", "scan": security_scan},
                start_to_close_timeout=timedelta(seconds=30)
            )

            approval = await workflow.wait_for_signal(
                "human_approval",
                timeout=timedelta(hours=24)
            )
            if not approval.approved:
                return {"status": "rejected", "reason": "security_denied"}

        deployment = await workflow.execute_activity(
            execute_deployment, deploy_request,
            start_to_close_timeout=timedelta(minutes=15)
        )

        return {"status": "deployed", "deployment": deployment}
```

#### Type 4: Loop Workflow

Iterative execution with convergence criteria.

```python
@workflow.defn
class IterativeCodingWorkflow:
    @workflow.run
    async def run(self, task: dict) -> dict:
        context = {"attempt": 0, "task": task, "success": False}

        while context["attempt"] < MAX_ITERATIONS and not context["success"]:
            context["attempt"] += 1

            code_result = await workflow.execute_activity(
                generate_code, context,
                start_to_close_timeout=timedelta(minutes=5)
            )

            await workflow.execute_activity(
                write_code_to_sandbox, code_result,
                start_to_close_timeout=timedelta(minutes=1)
            )

            test_result = await workflow.execute_activity(
                run_tests_in_sandbox, code_result,
                start_to_close_timeout=timedelta(minutes=5)
            )

            context["last_tests"] = test_result

            if test_result.all_passed:
                context["success"] = True
            else:
                context["errors"] = test_result.failures

            workflow.heartbeat(f"attempt_{context['attempt']}")

        return {
            "status": "completed" if context["success"] else "max_iterations_reached",
            "attempts": context["attempt"],
            "final_code": code_result
        }
```

#### Type 5: Human-in-the-Loop Workflow

Pause for human input at critical decision points.

```python
@workflow.defn
class HumanInTheLoopWorkflow:
    @workflow.run
    async def run(self, request: dict) -> dict:
        draft = await workflow.execute_activity(
            create_proposal, request,
            start_to_close_timeout=timedelta(minutes=5)
        )

        await workflow.execute_activity(
            submit_for_review,
            {"draft": draft, "reviewer_ids": request["reviewers"]},
            start_to_close_timeout=timedelta(seconds=30)
        )

        feedback = await workflow.wait_for_signal(
            "human_feedback",
            timeout=timedelta(hours=48)
        )

        if feedback.decision == "approve":
            result = await workflow.execute_activity(
                implement_proposal, draft,
                start_to_close_timeout=timedelta(minutes=10)
            )
        elif feedback.decision == "request_changes":
            revised = await workflow.execute_activity(
                revise_proposal,
                {"draft": draft, "feedback": feedback.comments},
                start_to_close_timeout=timedelta(minutes=5)
            )
            result = await self._resubmit_for_review(revised)
        else:
            result = {"status": "rejected", "reason": feedback.reason}

        return result
```

---

### 8.2 Activity Design Patterns

#### Idempotency Pattern

Every activity must be idempotent for safe retries.

```python
@activity.defn
async def write_code_to_sandbox(code_request: dict) -> dict:
    idempotency_key = (
        activity.info().workflow_run_id + ":" + str(activity.info().attempt)
    )

    cached = await check_idempotency_cache(idempotency_key)
    if cached:
        return cached.result

    sandbox = await get_sandbox(code_request["sandbox_id"])
    result = await sandbox.write_file(
        path=code_request["file_path"],
        content=code_request["content"],
        idempotency_key=idempotency_key
    )

    await cache_idempotency_result(idempotency_key, result)
    return result
```

#### Heartbeating Pattern

Long-running activities must heartbeat to prevent timeout.

```python
@activity.defn
async def run_test_suite(test_config: dict) -> dict:
    activity.heartbeat("started")

    test_runner = TestRunner(test_config)
    all_results = []

    for i, test in enumerate(test_config["tests"]):
        result = await test_runner.run(test)
        all_results.append(result)

        if i % 5 == 0:
            activity.heartbeat({
                "progress": i / len(test_config["tests"]),
                "completed_tests": i,
                "passed": sum(1 for r in all_results if r.passed),
                "failed": sum(1 for r in all_results if not r.passed)
            })

    activity.heartbeat("completed")
    return {"results": all_results, "summary": summarize(all_results)}
```

#### Rate Limiting Pattern

```python
@activity.defn
async def call_llm_with_rate_limit(request: dict) -> dict:
    model = request["model"]
    limiter = RateLimiter(
        key=f"llm:{model}",
        rpm=MODEL_RATE_LIMITS[model]["requests_per_minute"],
        tpm=MODEL_RATE_LIMITS[model]["tokens_per_minute"]
    )

    await limiter.acquire(tokens=request.get("estimated_tokens", 1000))

    try:
        response = await llm_client.complete(request)
        return response
    except RateLimitError:
        raise ActivityError("Rate limited", retry=True)
```

---

### 8.3 Saga Pattern for Distributed Transactions

```python
@dataclass
class SagaStep:
    name: str
    action: Callable
    compensation: Callable
    action_args: dict

@workflow.defn
class CodeChangeSagaWorkflow:
    @workflow.run
    async def run(self, change_request: dict) -> dict:
        saga = SagaExecutor()

        saga.add_step(SagaStep(
            name="create_branch",
            action=create_branch,
            compensation=delete_branch,
            action_args={"repo": change_request["repo"],
                         "branch": change_request["branch"]}
        ))

        saga.add_step(SagaStep(
            name="write_code",
            action=write_code_changes,
            compensation=revert_code_changes,
            action_args={"changes": change_request["changes"]}
        ))

        saga.add_step(SagaStep(
            name="run_linter",
            action=run_linter,
            compensation=None,
            action_args={"files": change_request["files"]}
        ))

        saga.add_step(SagaStep(
            name="run_tests",
            action=run_tests,
            compensation=None,
            action_args={"test_pattern": change_request["test_pattern"]}
        ))

        saga.add_step(SagaStep(
            name="create_pull_request",
            action=create_pull_request,
            compensation=close_pull_request,
            action_args={"title": change_request["title"]}
        ))

        try:
            result = await saga.execute()
            return {"status": "success", "steps": result}
        except SagaExecutionError as e:
            return {"status": "failed", "failed_step": e.step_name,
                    "compensations_run": e.compensations_executed}
```

---

### 8.4 Workflow Versioning Strategy

```python
@workflow.defn
class VersionedAgentWorkflow:
    @workflow.run
    async def run(self, input_data: dict) -> dict:
        if workflow.patched("add-security-scan"):
            security_result = await workflow.execute_activity(
                run_security_scan, input_data,
                start_to_close_timeout=timedelta(minutes=5)
            )
        else:
            security_result = None

        code_result = await workflow.execute_activity(
            generate_code, input_data,
            start_to_close_timeout=timedelta(minutes=5)
        )

        if workflow.patched("parallel-test-execution"):
            test_result = await self._run_tests_parallel(code_result)
        else:
            test_result = await workflow.execute_activity(
                run_tests_sequential, code_result,
                start_to_close_timeout=timedelta(minutes=10)
            )

        return {"code": code_result, "tests": test_result,
                "security": security_result}
```

**Versioning Rules:**
1. Always use `workflow.patched()` for behavioral changes.
2. Never change existing activity signatures; add new activities instead.
3. Keep patches in code forever (no-ops after deployment).
4. Use `workflow.deprecate_patch()` after all old workflows complete.

---

### 8.5 Signal and Query Handlers

```python
@workflow.defn
class SignalDrivenWorkflow:
    def __init__(self):
        self._human_approval = None
        self._status = "running"
        self._progress = 0.0
        self._messages = []

    @workflow.run
    async def run(self, task: dict) -> dict:
        while self._progress < 1.0:
            if self._status == "awaiting_approval":
                await workflow.wait_condition(
                    lambda: self._human_approval is not None,
                    timeout=timedelta(hours=24)
                )
                if self._human_approval == "reject":
                    return {"status": "rejected"}
                self._status = "running"

            result = await workflow.execute_activity(
                execute_work_chunk,
                {"task": task, "progress": self._progress},
                start_to_close_timeout=timedelta(minutes=5)
            )
            self._progress = result["new_progress"]
            self._messages.append(result["message"])

        return {"status": "completed", "messages": self._messages}

    @workflow.signal
    async def human_approval(self, decision: str):
        self._human_approval = decision

    @workflow.signal
    async def status_update(self, update: dict):
        self._messages.append(update["message"])
        if update.get("status"):
            self._status = update["status"]

    @workflow.query
    def get_status(self) -> dict:
        return {
            "status": self._status,
            "progress": self._progress,
            "messages": self._messages[-10:]
        }

    @workflow.query
    def get_progress(self) -> float:
        return self._progress
```

---

### 8.6 Child Workflow Patterns

#### Fan-Out with Child Workflows

```python
@workflow.defn
class ParentOrchestrationWorkflow:
    @workflow.run
    async def run(self, project_request: dict) -> dict:
        work_streams = await workflow.execute_activity(
            decompose_project, project_request,
            start_to_close_timeout=timedelta(minutes=2)
        )

        child_handles = []
        for stream in work_streams:
            handle = await workflow.start_child_workflow(
                AgentExecutionWorkflow.run,
                stream,
                id=f"{workflow.info().run_id}-stream-{stream['id']}",
                parent_close_policy=ParentClosePolicy.ABANDON
            )
            child_handles.append(handle)

        results = await asyncio.gather(*[
            handle.result(timeout=timedelta(hours=2))
            for handle in child_handles
        ], return_exceptions=True)

        summary = await workflow.execute_activity(
            aggregate_stream_results,
            {"streams": work_streams, "results": results},
            start_to_close_timeout=timedelta(minutes=2)
        )

        return summary
```

---

### 8.7 Cron Workflow Support

```python
@workflow.defn
class ScheduledHealthCheckWorkflow:
    @workflow.run
    async def run(self) -> None:
        agents = await workflow.execute_activity(
            get_all_agents, {},
            start_to_close_timeout=timedelta(minutes=1)
        )

        for agent in agents:
            await workflow.execute_activity(
                health_check_agent, agent["id"],
                start_to_close_timeout=timedelta(seconds=30)
            )

        workflow.continue_as_new()

# Start with cron schedule
await temporal_client.start_workflow(
    ScheduledHealthCheckWorkflow.run,
    id="health-check-scheduler",
    task_queue="main",
    cron_schedule="*/15 * * * *"
)
```

---

### 8.8 Event-Driven Workflow Triggers

```python
async def handle_github_webhook(event: dict) -> dict:
    if event["action"] == "opened" and event["pull_request"]:
        handle = await temporal_client.start_workflow(
            PullRequestReviewWorkflow.run,
            {"pr": event["pull_request"], "trigger": "webhook"},
            id=f"pr-review-{event['pull_request']['id']}",
            task_queue="main"
        )
        return {"workflow_id": handle.id}
```

---

### 8.9 Human Approval Workflows

```python
@workflow.defn
class ApprovalGatedWorkflow:
    @workflow.run
    async def run(self, request: dict) -> dict:
        proposal = await workflow.execute_activity(
            create_proposal, request,
            start_to_close_timeout=timedelta(minutes=5)
        )

        approval_id = await workflow.execute_activity(
            create_approval_request,
            {"proposal": proposal,
             "approvers": request["required_approvers"]},
            start_to_close_timeout=timedelta(seconds=30)
        )

        approval = await self._wait_for_approval(
            approval_id=approval_id,
            initial_timeout=timedelta(hours=4),
            escalation_timeout=timedelta(hours=24),
            escalation_contacts=request["escalation_contacts"]
        )

        if not approval:
            return {"status": "timeout", "proposal": proposal}

        if approval["decision"] == "approved":
            result = await workflow.execute_activity(
                implement_proposal, proposal,
                start_to_close_timeout=timedelta(minutes=10)
            )
            return {"status": "implemented", "result": result}
        else:
            return {"status": "rejected", "reason": approval["reason"]}

    async def _wait_for_approval(self, approval_id: str,
                                  initial_timeout: timedelta,
                                  escalation_timeout: timedelta,
                                  escalation_contacts: list) -> Optional[dict]:
        try:
            return await workflow.wait_for_signal(
                "approval_decision",
                timeout=initial_timeout
            )
        except TimeoutError:
            await workflow.execute_activity(
                escalate_approval,
                {"approval_id": approval_id,
                 "contacts": escalation_contacts},
                start_to_close_timeout=timedelta(seconds=30)
            )
        try:
            return await workflow.wait_for_signal(
                "approval_decision",
                timeout=escalation_timeout
            )
        except TimeoutError:
            return None

    @workflow.signal
    async def approval_decision(self, decision: dict):
        self._approval_decision = decision
```

---

### 8.10 Timeout and Retry Policies

```python
retry_policy = RetryPolicy(
    initial_interval=timedelta(seconds=1),
    backoff_coefficient=2.0,
    maximum_interval=timedelta(minutes=1),
    maximum_attempts=5,
    non_retryable_error_types=["ValidationError", "PermissionError"]
)

timeout_policy = {
    "execution_timeout": timedelta(hours=2),
    "run_timeout": timedelta(hours=1),
    "activity_timeout": timedelta(minutes=5)
}

result = await workflow.execute_activity(
    risky_operation,
    args,
    start_to_close_timeout=timedelta(minutes=5),
    retry_policy=retry_policy,
    heartbeat_timeout=timedelta(seconds=30)
)
```

---

### 8.11 Workflow Replay and Debugging

```python
def replay_workflow(history_file: str):
    with open(history_file) as f:
        history = json.load(f)

    replayer = WorkflowReplayer(
        workflows=[AgentExecutionWorkflow],
        activities=ACTIVITIES
    )

    result = replayer.replay_workflow(history)
    print(f"Replay successful. Final result: {result}")
    return result

async def export_workflow_history(workflow_id: str) -> dict:
    handle = temporal_client.get_workflow_handle(workflow_id)
    history = await handle.fetch_history()
    return history.to_json()
```

---

### 8.12 Workflow Metrics and Observability

| Metric | Type | Description |
|--------|------|-------------|
| `temporal_workflow_start` | Counter | Workflow executions started |
| `temporal_workflow_completed` | Counter | Successful completions |
| `temporal_workflow_failed` | Counter | Failed executions |
| `temporal_workflow_timeout` | Counter | Timed out workflows |
| `temporal_activity_execution_latency` | Histogram | Activity execution time |
| `temporal_activity_failure` | Counter | Activity failures |
| `temporal_task_schedule_to_start_latency` | Histogram | Queue wait time |
| `temporal_worker_task_slots_available` | Gauge | Available worker capacity |

---

### 8.13 Deployment Topology

```
                    +-------------------+
                    |  Temporal Server   |
                    |  (3-node cluster)  |
                    |                   |
                    |  - Frontend       |
                    |  - Matching       |
                    |  - History        |
                    |  - Worker Service  |
                    +---------+---------+
                              |
              +---------------+---------------+
              |               |               |
    +---------v------+ +------v------+ +-----v--------+
    |  Worker Pool 1 | | Worker Pool2| | Worker Pool3 |
    |  (Agent tasks) | | (Code tasks)| | (Review tasks)|
    |  10 workers    | | 10 workers  | | 10 workers   |
    |  max 100 conc  | | max 100 conc| | max 100 conc |
    +----------------+ +-------------+ +--------------+
```

**Worker Configuration:**
```yaml
workers:
  agent_pool:
    task_queue: "agent-execution"
    max_concurrent_activities: 100
    max_concurrent_workflows: 50
    heartbeat:
      default_heartbeat_throttle_interval: 10s

  code_pool:
    task_queue: "code-execution"
    max_concurrent_activities: 50
    max_concurrent_workflows: 25

  review_pool:
    task_queue: "code-review"
    max_concurrent_activities: 30
    max_concurrent_workflows: 15

  orchestration_pool:
    task_queue: "orchestration"
    max_concurrent_activities: 20
    max_concurrent_workflows: 50
```

**Task Queue Routing:**

| Workflow Type | Task Queue | Worker Pool |
|--------------|-----------|-------------|
| `AgentExecutionWorkflow` | `agent-execution` | Agent Pool |
| `CodeChangeWorkflow` | `code-execution` | Code Pool |
| `CodeReviewWorkflow` | `code-review` | Review Pool |
| `OrchestrationWorkflow` | `orchestration` | Orchestration Pool |
| `DeployWorkflow` | `deployment` | Deploy Pool |



---

## Item 11: Memory Architecture

### Overview

The memory system is the cognitive substrate of the platform. Just as human cognition relies on multiple specialized memory systems (short-term working memory, long-term semantic memory, episodic experience), the platform implements a **multi-tier memory architecture** that gives agents contextual awareness, learning capability, and coherent behavior across sessions.

**Design Principles:**
- **Separation of Concerns:** Each memory tier serves a distinct purpose with optimized storage and retrieval.
- **Unified Query Interface:** Agents query memory through a single API regardless of underlying tier.
- **Automatic Lifecycle Management:** Memories are created, compacted, decayed, and archived without manual intervention.
- **Privacy by Default:** Memories are scoped to their owner agent unless explicitly shared.

---

### 11.1 Memory Tier Architecture

```
+-------------------------------------------------------------------+
|                        MEMORY ARCHITECTURE                         |
+-------------------------------------------------------------------+
|                                                                    |
|  +------------------+                                             |
|  |  WORKING MEMORY   |  Short-term, volatile, active context      |
|  |  (Redis + Local)  |  ~4K-32K tokens, LRU eviction              |
|  +--------+---------+                                             |
|           |                                                        |
|  +--------v---------+                                             |
|  |  TASK MEMORY      |  Current task context, subtask progress     |
|  |  (PostgreSQL)     |  Intermediate results, scratchpad           |
|  +--------+---------+                                             |
|           |                                                        |
|  +--------v---------+                                             |
|  |  CONVERSATION     |  Chat history, message threading            |
|  |  MEMORY           |  Context window management                   |
|  |  (PostgreSQL)     |  Rolling summarization                       |
|  +--------+---------+                                             |
|           |                                                        |
|  +--------v---------+                                             |
|  |  SEMANTIC MEMORY  |  Vector-based knowledge storage             |
|  |  (Qdrant)         |  Similarity search, metadata filtering       |
|  +--------+---------+                                             |
|           |                                                        |
|  +--------v---------+                                             |
|  |  EPISODIC MEMORY  |  Time-series experience log                 |
|  |  (PostgreSQL)     |  Event sequences, outcomes                   |
|  +--------+---------+                                             |
|           |                                                        |
|  +--------v---------+                                             |
|  |  PROJECT MEMORY   |  Repository embeddings, decisions           |
|  |  (Qdrant + PgSQL) |  Code patterns, team conventions             |
|  +--------+---------+                                             |
|           |                                                        |
|  +--------v---------+                                             |
|  |  PROCEDURAL       |  Agent skills, tool patterns                |
|  |  MEMORY           |  Reusable workflows                          |
|  |  (Qdrant + PgSQL) |  Learned heuristics                          |
|  +------------------+                                             |
|                                                                    |
+-------------------------------------------------------------------+
```

---

### 11.2 Semantic Memory

Semantic memory stores factual knowledge, concepts, and relationships as dense vector embeddings in Qdrant.

#### Storage Model

```python
@dataclass
class SemanticMemoryEntry:
    chunk_id: UUID
    content: str
    embedding: list[float]
    memory_type: str
    source_type: str
    source_id: UUID
    organization_id: UUID
    agent_id: Optional[UUID]
    project_id: Optional[UUID]
    metadata: dict
    relevance_score: float
    access_level: str
    created_at: datetime
```

#### Ingestion Pipeline

```
Raw Content -> Chunk -> Embed -> Store in Qdrant + Index in PostgreSQL
```

```python
async def ingest_semantic_memory(
    content: str,
    source: MemorySource,
    config: MemoryConfig
) -> list[SemanticMemoryEntry]:
    # 1. Chunk content
    chunks = chunk_content(
        content,
        strategy=config.chunking_strategy,  # "fixed", "semantic", "recursive"
        chunk_size=config.chunk_size,       # 512-1024 tokens
        overlap=config.chunk_overlap        # 10-20%
    )

    entries = []
    for i, chunk in enumerate(chunks):
        # 2. Generate embedding
        embedding = await embedding_model.embed(chunk.content)

        # 3. Deduplicate
        similar = await qdrant.search(
            collection="memory_semantic",
            vector=embedding,
            limit=1,
            score_threshold=0.98
        )
        if similar and similar[0].score > 0.98:
            continue

        # 4. Store in Qdrant
        entry = SemanticMemoryEntry(
            chunk_id=uuid4(),
            content=chunk.content,
            embedding=embedding,
            memory_type="semantic",
            source_type=source.type,
            source_id=source.id,
            organization_id=source.org_id,
            agent_id=source.agent_id,
            project_id=source.project_id,
            metadata={"chunk_index": i, "total_chunks": len(chunks)},
            relevance_score=0.0,
            access_level=source.access_level,
            created_at=datetime.utcnow()
        )

        await qdrant.upsert("memory_semantic", [PointStruct(
            id=str(entry.chunk_id),
            vector=embedding,
            payload=entry.to_payload()
        )])

        # 5. Index in PostgreSQL
        await postgres.execute(
            "INSERT INTO memory_chunks (id, content, ...) VALUES (...)",
            entry.to_db()
        )
        entries.append(entry)

    return entries
```

#### Retrieval Pipeline

```python
async def retrieve_semantic_memory(
    query: str,
    agent_id: UUID,
    filters: MemoryFilters,
    config: RetrievalConfig
) -> list[MemoryResult]:
    # 1. Embed query
    query_embedding = await embedding_model.embed(query)

    # 2. Vector search
    candidates = await qdrant.search(
        collection="memory_semantic",
        vector=query_embedding,
        limit=config.vector_top_k,
        query_filter=build_qdrant_filter(filters)
    )

    # 3. Re-ranking
    if config.use_reranker:
        scored = await reranker.rerank(
            query=query,
            documents=[c.payload["content"] for c in candidates],
            top_k=config.rerank_top_k
        )
        candidates = [candidates[s.index] for s in scored]

    # 4. Access check and return
    results = []
    for candidate in candidates:
        if await check_access(agent_id, candidate.payload):
            results.append(MemoryResult.from_candidate(candidate))
    return results[:config.final_top_k]
```

#### Chunking Strategies

| Strategy | Description | Best For |
|----------|-------------|----------|
| **Fixed** | Fixed token count per chunk | Uniform content |
| **Semantic** | Split at semantic boundaries | Documents |
| **Recursive** | Hierarchical splitting | Code, structured text |
| **Sliding Window** | Overlapping windows | Streaming content |

---

### 11.3 Episodic Memory

Episodic memory records time-ordered sequences of events, experiences, and outcomes.

```python
@dataclass
class EpisodicMemoryEntry:
    event_id: UUID
    agent_id: UUID
    timestamp: datetime
    event_type: str           # "task_started", "task_completed", "error", "decision"
    episode_sequence: int
    episode_id: UUID
    content: str
    context: dict
    outcome: str              # "success", "failure", "partial"
    lesson: Optional[str]
    embedding: Optional[list[float]]
```

#### Reflection and Lesson Extraction

```python
async def reflect_on_episode(episode_id: UUID) -> list[str]:
    events = await postgres.fetch(
        "SELECT * FROM episodic_memory WHERE episode_id = $1 ORDER BY episode_sequence",
        episode_id
    )

    summary = await llm.complete(
        prompt=REFLECTION_PROMPT.format(
            events=format_events(events),
            outcome=events[-1].outcome
        )
    )

    lessons = parse_lessons(summary)

    for lesson in lessons:
        await ingest_semantic_memory(
            content=lesson,
            source=MemorySource(type="reflection", id=episode_id)
        )

    return lessons
```

---

### 11.4 Project Memory

| Component | Storage | Description |
|-----------|---------|-------------|
| **Repository Embeddings** | Qdrant (memory_code) | Vector index of all code files |
| **Architecture Decisions** | PostgreSQL + Qdrant | ADRs with embeddings |
| **Code Patterns** | Qdrant | Common idioms and patterns |
| **Team Conventions** | PostgreSQL | Style guides, review preferences |
| **Dependency Graph** | PostgreSQL (JSONB) | Module relationships |

```python
async def ingest_project_memory(project_id: UUID) -> None:
    project = await get_project(project_id)

    # 1. Index code files
    files = await get_repository_files(project.repository_id)
    for file in files:
        content = await read_file(file.path)
        embedding = await code_embedding_model.embed(content)
        await qdrant.upsert("memory_code", [{
            "id": str(uuid4()),
            "vector": embedding,
            "payload": {
                "file_path": file.path,
                "language": file.language,
                "project_id": str(project_id)
            }
        }])

    # 2. Store architecture decisions
    adrs = await find_architecture_decisions(project)
    for adr in adrs:
        await ingest_semantic_memory(content=adr.content, source=adr.source)

    # 3. Learn code patterns from merged PRs
    merged_prs = await get_merged_pull_requests(project_id, limit=100)
    for pr in merged_prs:
        patterns = await extract_patterns(pr)
        for pattern in patterns:
            await qdrant.upsert("code_patterns", [{
                "id": str(uuid4()),
                "vector": pattern.embedding,
                "payload": {"pattern": pattern.description, "project_id": str(project_id)}
            }])
```

---

### 11.5 Task Memory

```python
@dataclass
class TaskMemory:
    task_id: UUID
    agent_id: UUID
    original_requirements: str
    current_plan: list[PlanStep]
    completed_steps: list[CompletedStep]
    intermediate_results: dict[str, Any]
    scratchpad: str
    context_window: list[Message]
    relevant_memories: list[UUID]
    file_context: list[str]

    async def save(self):
        await redis.hset(f"task_memory:{self.task_id}", mapping=self.to_json())
        await postgres.execute(
            "UPDATE tasks SET agent_context = $1 WHERE id = $2",
            self.to_json(), self.task_id
        )
```

---

### 11.6 Conversation Memory

```python
class ConversationMemory:
    def __init__(self, max_tokens: int = 16000):
        self.max_tokens = max_tokens
        self.messages: list[Message] = []
        self.summaries: list[Summary] = []

    async def add_message(self, message: Message):
        self.messages.append(message)
        await self._manage_context_window()

    async def _manage_context_window(self):
        total_tokens = sum(m.token_count for m in self.messages)
        if total_tokens > self.max_tokens:
            messages_to_summarize = []
            token_count = 0
            while self.messages and token_count < self.max_tokens * 0.3:
                msg = self.messages.pop(0)
                messages_to_summarize.append(msg)
                token_count += msg.token_count

            summary = await llm.complete(
                prompt=SUMMARIZE_PROMPT.format(
                    messages=format_messages(messages_to_summarize)
                ),
                max_tokens=500
            )
            self.summaries.append(Summary(content=summary))

    def get_context_for_llm(self) -> list[Message]:
        context = []
        for summary in self.summaries:
            context.append(Message(role="system", content=f"Previous: {summary.content}"))
        context.extend(self.messages)
        return context
```

---

### 11.7 Procedural Memory

```python
@dataclass
class ProceduralMemoryEntry:
    skill_id: UUID
    name: str
    description: str
    trigger_patterns: list[str]
    steps: list[SkillStep]
    success_rate: float
    usage_count: int
    embedding: list[float]

async def learn_skill(
    agent_id: UUID,
    successful_sequence: list[Action]
) -> ProceduralMemoryEntry:
    skill_description = await llm.complete(
        prompt=SKILL_ABSTRACTION_PROMPT.format(
            actions=format_actions(successful_sequence)
        )
    )
    embedding = await embedding_model.embed(skill_description)

    skill = ProceduralMemoryEntry(
        skill_id=uuid4(),
        name=generate_skill_name(skill_description),
        description=skill_description,
        trigger_patterns=extract_trigger_patterns(successful_sequence),
        success_rate=1.0,
        usage_count=1,
        embedding=embedding
    )

    await qdrant.upsert("agent_skills", [{
        "id": str(skill.skill_id),
        "vector": embedding,
        "payload": skill.to_payload()
    }])
    return skill
```

---

### 11.8 Working Memory

```python
@dataclass
class WorkingMemory:
    agent_id: UUID
    active_variables: dict[str, Any]
    current_focus: str
    recent_actions: list[Action]
    active_files: list[str]
    current_goal: str
    retrieved_context: list[MemoryChunk]
    conversation_buffer: list[Message]
    tool_results: list[ToolResult]

    def to_context_string(self) -> str:
        parts = []
        if self.current_goal:
            parts.append(f"Current Goal: {self.current_goal}")
        if self.active_variables:
            parts.append(f"Variables: {json.dumps(self.active_variables)}")
        if self.active_files:
            parts.append(f"Open Files: {', '.join(self.active_files)}")
        return "\n".join(parts)

    async def update(self, update: WorkingMemoryUpdate):
        if update.new_variable:
            self.active_variables.update(update.new_variable)
        if update.new_focus:
            self.current_focus = update.new_focus
        await redis.setex(
            f"working_memory:{self.agent_id}", WORKING_MEMORY_TTL, self.serialize()
        )
```

---

### 11.9 Memory Ingestion Pipeline

```
+----------+    +---------+    +----------+    +---------+    +--------+
|  Source   |--->| Chunk   |--->| Embed    |--->| Store   |--->| Index  |
|  Content  |    | Engine  |    | Model    |    | Layer   |    | Layer  |
+----------+    +---------+    +----------+    +---------+    +--------+
```

```python
async def ingest_memory_pipeline(
    source: MemorySource,
    content: str,
    config: IngestionConfig
) -> list[MemoryEntry]:
    # Phase 1: Preprocessing
    content = preprocess_content(content, config)

    # Phase 2: Chunking
    chunks = chunker.chunk(content, strategy=config.strategy, size=config.size)

    # Phase 3: Embedding (batch)
    entries = []
    for i in range(0, len(chunks), 32):
        batch = chunks[i:i+32]
        embeddings = await embedding_model.embed_batch([c.content for c in batch])
        for chunk, embedding in zip(batch, embeddings):
            entries.append(MemoryEntry(
                chunk_id=uuid4(), content=chunk.content,
                embedding=embedding, source=source
            ))

    # Phase 4: Deduplication
    entries = await deduplicate_entries(entries)

    # Phase 5: Dual write
    await write_to_qdrant(entries)
    await write_to_postgres(entries)

    return entries
```

---

### 11.10 Retrieval Pipeline (Multi-Stage)

```
+-----------+     +----------------+     +---------------+     +--------+
|  Query    |     |  Stage 1:      |     |  Stage 2:     |     | Stage 3|
|  Analysis |---->|  Vector Search |---->|  Re-ranking   |---->| Filter |
|           |     |  (top-100)     |     |  (top-20)     |     | (top-10|
+-----------+     +----------------+     +---------------+     +--------+
```

```python
async def multi_stage_retrieval(
    query: str,
    agent_id: UUID,
    context: RetrievalContext
) -> list[RetrievalResult]:
    # Stage 0: Query understanding
    intent = await parse_query_intent(query)

    # Stage 1: Parallel vector search across collections
    all_candidates = []
    for collection in intent.target_collections:
        results = await qdrant.search(
            collection=collection,
            vector=await embed_query(query),
            limit=intent.vector_top_k,
            query_filter=build_filter(agent_id)
        )
        all_candidates.extend(results)

    # Stage 2: Re-ranking
    if context.use_reranker:
        reranked = await reranker.rerank(
            query=query,
            documents=[c.payload["content"] for c in all_candidates],
            top_k=context.rerank_top_k
        )
        candidates = [all_candidates[r.index] for r in reranked]
    else:
        candidates = sorted(all_candidates, key=lambda x: x.score, reverse=True)

    # Stage 3: Filtering
    results = []
    seen = set()
    for c in candidates:
        h = hash(c.payload["content"])
        if h in seen:
            continue
        seen.add(h)
        if await check_access(agent_id, c.payload):
            results.append(MemoryResult.from_candidate(c))
    return results[:context.final_top_k]
```

---

### 11.11 Memory Compaction and Summarization

```python
async def compact_memory(agent_id: UUID, config: CompactionConfig) -> CompactionReport:
    report = CompactionReport()

    # Find old, low-access chunks
    old_chunks = await postgres.fetch(
        "SELECT * FROM memory_chunks WHERE agent_id = $1 "
        "AND created_at < NOW() - INTERVAL '7 days' "
        "AND is_compressed = FALSE AND access_count < 5 "
        "ORDER BY access_count ASC, created_at ASC LIMIT $2",
        agent_id, config.batch_size
    )

    by_source = group_by_source(old_chunks)
    for source_id, chunks in by_source.items():
        combined = "\n\n".join(c.content for c in chunks)
        summary = await llm.complete(
            prompt=COMPACTION_PROMPT.format(content=combined),
            max_tokens=1000
        )
        await replace_chunks_with_summary(chunks, summary)
        report.chunks_compacted += len(chunks)

    # Archive very old entries
    archived = await postgres.execute(
        "UPDATE memory_chunks SET is_archived = TRUE WHERE agent_id = $1 "
        "AND created_at < NOW() - INTERVAL '30 days' AND access_count < 2",
        agent_id
    )
    report.entries_archived = archived
    return report
```

---

### 11.12 Memory Decay and TTL Policies

```python
MEMORY_TTL_POLICIES = {
    "working_memory": {
        "ttl_seconds": 3600,
        "eviction": "lru"
    },
    "conversation_memory": {
        "ttl_days": 7,
        "summarize_after": 50,
        "archive_after_days": 30
    },
    "task_memory": {
        "ttl_days": 30,
        "compact_after_days": 7,
        "archive_after_days": 90
    },
    "semantic_memory": {
        "ttl_days": 365,
        "decay_function": "exponential",
        "decay_half_life_days": 30,
        "archive_after_days": 365
    },
    "episodic_memory": {
        "ttl_days": 90,
        "extract_lessons": True,
        "archive_after_days": 180
    },
    "project_memory": {
        "ttl_days": None,
        "refresh_on_access": True,
        "reindex_after_days": 7
    },
    "procedural_memory": {
        "ttl_days": None,
        "success_rate_threshold": 0.3,
        "archive_after_failures": 10
    }
}
```

---

### 11.13 Context Window Management

```python
class ContextWindowManager:
    def __init__(self, max_tokens: int = 128000):
        self.max_tokens = max_tokens
        self.reserved = {
            "system": 2000, "working": 2000, "tools": 3000,
            "response": 4000, "overhead": 1000
        }
        self.available = max_tokens - sum(self.reserved.values())

    async def assemble_context(self, query, task, conversation, memories) -> str:
        parts = []
        used = 0

        # System prompt
        parts.append(await self.get_system_prompt())
        used += self.reserved["system"]

        # Working memory
        parts.append(task.to_working_memory())
        used += self.reserved["working"]

        # Task memory (summarized if too large)
        task_ctx = task.to_context_string()
        task_tok = estimate_tokens(task_ctx)
        if task_tok > self.available * 0.2:
            task_ctx = await summarize(task_ctx, max_tokens=int(self.available * 0.2))
        parts.append(task_ctx)
        used += estimate_tokens(task_ctx)

        # Conversation (truncated oldest first)
        conv = conversation.get_context_for_llm()
        conv_tok = sum(estimate_tokens(m.content) for m in conv)
        while conv_tok > self.available * 0.3 and conv:
            conv_tok -= estimate_tokens(conv.pop(0).content)
        parts.extend(format_messages(conv))
        used += conv_tok

        # Retrieved memories (prioritized by relevance)
        mem_budget = self.available - used
        selected = []
        for mem in sorted(memories, key=lambda x: x.score, reverse=True):
            mtok = estimate_tokens(mem.content)
            if mtok <= mem_budget:
                selected.append(mem)
                mem_budget -= mtok
            else:
                summary = await summarize(mem.content, max_tokens=mem_budget)
                if estimate_tokens(summary) <= mem_budget:
                    selected.append(MemoryResult(content=f"[Summary] {summary}"))
                break

        if selected:
            parts.append("## Relevant Context\n")
            for i, m in enumerate(selected):
                parts.append(f"[{i+1}] {m.content}")

        return "\n\n".join(parts)
```

---

### 11.14 Cross-Memory Search (Unified Query Interface)

```python
@dataclass
class UnifiedMemoryQuery:
    query: str
    agent_id: UUID
    memory_types: list[str] = None
    top_k: int = 10
    recency_weight: float = 0.2
    relevance_weight: float = 0.8

class UnifiedMemoryInterface:
    def __init__(self):
        self.retrievers = {
            "semantic": SemanticMemoryRetriever(),
            "episodic": EpisodicMemoryRetriever(),
            "project": ProjectMemoryRetriever(),
            "task": TaskMemoryRetriever(),
            "conversation": ConversationMemoryRetriever(),
            "procedural": ProceduralMemoryRetriever()
        }

    async def search(self, query: UnifiedMemoryQuery) -> UnifiedMemoryResult:
        start = time.time()
        tiers = query.memory_types or list(self.retrievers.keys())

        # Parallel search
        tier_results = {}
        for tier in tiers:
            try:
                tier_results[tier] = await self.retrievers[tier].search(
                    query.query, query.agent_id, top_k=query.top_k * 2
                )
            except Exception as e:
                logger.warning(f"Search failed for tier {tier}: {e}")
                tier_results[tier] = []

        # Reciprocal Rank Fusion
        fused = self._rrf_fusion(tier_results, query.recency_weight, query.relevance_weight)
        elapsed = int((time.time() - start) * 1000)

        return UnifiedMemoryResult(
            results=fused[:query.top_k],
            by_tier={t: r[:5] for t, r in tier_results.items()},
            total_found=sum(len(r) for r in tier_results.values()),
            query_time_ms=elapsed
        )

    def _rrf_fusion(self, tier_results, recency_w, relevance_w):
        from collections import defaultdict
        scores = defaultdict(float)
        for tier, results in tier_results.items():
            weight = TIER_WEIGHTS.get(tier, 1.0)
            for rank, r in enumerate(results):
                rrf = 1.0 / (60 + rank + 1)
                age = hours_since(r.created_at)
                recency = max(0, 1.0 - age / 168)
                scores[r.chunk_id] += rrf * weight * (relevance_w + recency_w * recency)

        seen = set()
        fused = []
        for cid in sorted(scores, key=scores.get, reverse=True):
            if cid in seen:
                continue
            for results in tier_results.values():
                for r in results:
                    if r.chunk_id == cid:
                        seen.add(cid)
                        fused.append(r)
                        break
        return fused
```

---

### 11.15 Memory Sharing Between Agents

```python
class MemorySharingService:
    async def share_memory(
        self,
        owner_agent_id: UUID,
        target_agent_ids: list[UUID],
        memory_chunk_ids: list[UUID],
        share_level: str
    ) -> ShareResult:
        for chunk_id in memory_chunk_ids:
            chunk = await get_memory_chunk(chunk_id)
            if chunk.agent_id != owner_agent_id:
                raise PermissionError(f"Agent {owner_agent_id} does not own {chunk_id}")

            for target in target_agent_ids:
                await postgres.execute(
                    "INSERT INTO memory_shares (chunk_id, owner_agent_id, "
                    "target_agent_id, share_level, created_at) "
                    "VALUES ($1, $2, $3, $4, NOW()) ON CONFLICT DO NOTHING",
                    chunk_id, owner_agent_id, target, share_level
                )

            await qdrant.set_payload("memory_semantic", [str(chunk_id)],
                {"access_level": "shared"})

        return ShareResult(chunks_shared=len(memory_chunk_ids))

    async def get_shared_memory(self, agent_id: UUID, query: str, top_k=10):
        shared_ids = await postgres.fetch(
            "SELECT chunk_id FROM memory_shares WHERE target_agent_id = $1",
            agent_id
        )
        embedding = await embedding_model.embed(query)
        results = await qdrant.search(
            collection="memory_semantic",
            vector=embedding,
            limit=top_k,
            query_filter=Filter(must=[
                FieldCondition(key="chunk_id",
                    match=MatchAny(any=[str(c) for c in shared_ids]))
            ])
        )
        return [MemoryResult.from_point(r) for r in results]
```

---

### 11.16 Memory Persistence and Durability

#### Persistence Levels

| Level | Storage | Durability | Latency | Use Case |
|-------|---------|-----------|---------|----------|
| **L0: Local** | Agent heap | None | <1us | Hot variables |
| **L1: Redis** | Memory + AOF | Configurable | <1ms | Working memory |
| **L2: PostgreSQL** | Disk + WAL | Immediate | 1-10ms | Task, conversation |
| **L3: Qdrant** | Disk + Replication | Configurable | 5-50ms | Semantic vectors |
| **L4: Object Storage** | S3 | Permanent | 100ms-1s | Archive |

#### Durability Guarantees

```python
async def persist_memory_with_guarantee(memory, durability_level):
    if durability_level == "immediate":
        await postgres.execute("INSERT INTO memory_chunks ...", memory.to_db())
        await qdrant.upsert("memory_semantic", [memory.to_point()])
    elif durability_level == "eventual":
        await event_bus.publish("memory.persist", memory.serialize())
    elif durability_level == "cached":
        await redis.setex(f"memory:{memory.chunk_id}", TTL, memory.serialize())
```

---

### 11.17 Memory Architecture Summary

| Tier | Storage | Primary Use | Access Pattern | Scale Target |
|------|---------|-------------|---------------|-------------|
| **Working** | Redis | Active context | Read/write heavy | 100K entries |
| **Task** | PostgreSQL | Execution state | Read/write | 50M entries |
| **Conversation** | PostgreSQL | Chat history | Append, range scan | 500M messages |
| **Semantic** | Qdrant | Knowledge retrieval | Vector search | 1B vectors |
| **Episodic** | PostgreSQL | Experience log | Time-series | 100M events |
| **Project** | Qdrant + PgSQL | Project knowledge | Vector + structured | 100M vectors |
| **Procedural** | Qdrant + PgSQL | Skills | Vector search | 1M skills |

**Key Design Decisions:**
1. Dual-write Qdrant + PostgreSQL for vector + metadata consistency
2. Payload-based multi-tenancy in Qdrant
3. Automatic compaction for older memories
4. Unified retrieval interface with RRF fusion
5. Context window budget management with reserved allocations

---

*End of Architecture Specification*
