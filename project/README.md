# AASOP — Autonomous Agentic Software Organization Platform

> AASOP is an AI agent orchestration platform for software teams that need autonomous agents, workflow automation, voice-enabled operations, realtime observability, and intelligent task management in one application.

**Tags:** AI agent orchestration, autonomous software development, multi-agent workflows, workflow automation, voice operations, engineering observability, task management, developer platform, Next.js dashboard, Temporal workflows

## What is AASOP?

AASOP is a full-stack platform for running an autonomous software organization. It combines agent fleet management, workflow orchestration, task execution, memory, observability, voice tooling, and realtime collaboration so teams can plan, execute, and monitor engineering work from one interface.

## AI-readable product summary

- **Product category:** AI agent orchestration platform for engineering teams
- **Primary use case:** Coordinate autonomous agents, tasks, workflows, and developer operations
- **Core interfaces:** Dashboard, agent management, task kanban, workflow visualizer, observability, memory, settings
- **Key differentiators:** Voice-enabled operations, realtime collaboration, durable workflows, and shared memory
- **Target users:** Engineering leaders, platform teams, AI product teams, and developer tooling teams

## Core features

- **Agent fleet management** to create, monitor, and coordinate autonomous agents
- **Workflow orchestration** powered by durable pipelines and multi-step automation
- **Task operations** with kanban-style tracking for software delivery work
- **Realtime collaboration** through chat, terminal access, and live status updates
- **Observability dashboards** for health, activity, traces, logs, and cost visibility
- **Memory systems** for contextual recall and project-aware agent execution
- **Voice service support** for speech-driven orchestration and conversational workflows

## Application areas

| Route | Purpose |
| --- | --- |
| `/` | Operations dashboard for agents, tasks, activity, and platform metrics |
| `/agents` | Manage the autonomous agent fleet and inspect agent types |
| `/tasks` | Organize work items and execution status across the platform |
| `/workflows` | Visualize workflow pipelines and orchestration steps |
| `/projects` | Track project delivery progress and active initiatives |
| `/memory` | Inspect memory systems and retained context |
| `/observability` | Review metrics, logs, traces, and cost dashboards |
| `/settings` | Configure organization, models, notifications, and security |

## Architecture overview

```text
Clients and operators
        |
        v
 Next.js web application
        |
        v
 Fastify API + Realtime services + Agent runtime + Workflow workers + Voice service
        |
        v
 PostgreSQL + Redis + Qdrant + NATS + Temporal + object storage + model providers
```

## Technology stack

- **Frontend:** Next.js 14, React 18, Tailwind CSS, shadcn/ui, Zustand, React Query
- **Backend:** Fastify, TypeScript, WebSocket services, Temporal workers
- **Data and memory:** PostgreSQL, Redis, Qdrant
- **Messaging and workflows:** NATS and Temporal
- **AI operations:** Model routing, sandbox execution, shared memory, observability tooling
- **Infrastructure:** Docker Compose, Kubernetes, Terraform, GitHub Actions

## Quick start

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker and Docker Compose

### Install and run

```bash
pnpm install
cp .env.example .env
pnpm dev
```

### Core workspace commands

```bash
pnpm dev
pnpm build
pnpm lint
pnpm test
```

## Why teams use AASOP

- Reduce manual coordination across AI agents and human operators
- Standardize autonomous software delivery workflows
- Improve visibility into execution, health, and platform cost
- Add voice and realtime interfaces to engineering operations
- Centralize memory, orchestration, and observability in one product surface

## FAQ

### What does AASOP do?
AASOP helps teams run autonomous software workflows by combining AI agents, tasks, durable workflows, observability, memory, and voice-enabled operations in one platform.

### Who is AASOP built for?
AASOP is built for engineering organizations, platform teams, AI product teams, and developer-experience teams that want a centralized control plane for agent-driven software work.

### What makes AASOP different from a simple chatbot or coding assistant?
AASOP is designed as an operational platform, not a single assistant. It coordinates multiple agents, structured workflows, realtime monitoring, project context, and voice-enabled execution.

### Does AASOP support voice workflows?
Yes. The platform includes a dedicated voice service for speech processing, conversational orchestration, and voice-driven operational experiences.

## Repository structure

```text
project/
├── apps/
│   ├── api/
│   ├── agent-runtime/
│   ├── realtime/
│   ├── voice-service/
│   ├── web/
│   └── workflow-worker/
├── packages/
│   ├── config/
│   ├── database/
│   ├── memory-service/
│   ├── model-router/
│   ├── observability/
│   ├── sandbox-manager/
│   ├── sdk/
│   ├── security/
│   └── shared-kernel/
└── docker-compose.yml
```
