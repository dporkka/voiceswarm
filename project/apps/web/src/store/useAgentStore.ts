"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Agent {
  id: string;
  name: string;
  type: string;
  model: string;
  status: "online" | "offline" | "busy" | "error" | "idle";
  description: string;
  capabilities: string[];
  lastActive: Date;
  tasksCompleted: number;
  tokensUsed: number;
  costToday: number;
}

interface AgentState {
  agents: Agent[];
  selectedAgentId: string | null;
  isLoading: boolean;
  error: string | null;
  setSelectedAgent: (id: string | null) => void;
  updateAgentStatus: (id: string, status: Agent["status"]) => void;
  addAgent: (agent: Agent) => void;
  removeAgent: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const defaultAgents: Agent[] = [
  {
    id: "orchestrator",
    name: "Orchestrator",
    type: "orchestrator",
    model: "claude-sonnet-4-20250514",
    status: "online",
    description: "Coordinates multi-agent workflows and delegates tasks",
    capabilities: ["Task delegation", "Workflow management", "Agent coordination", "Priority scheduling"],
    lastActive: new Date(),
    tasksCompleted: 142,
    tokensUsed: 452300,
    costToday: 4.23,
  },
  {
    id: "code-reviewer",
    name: "Code Reviewer",
    type: "code-review",
    model: "claude-sonnet-4-20250514",
    status: "busy",
    description: "Analyzes code for quality, security, and best practices",
    capabilities: ["Code analysis", "Security review", "Style checking", "PR review"],
    lastActive: new Date(Date.now() - 300000),
    tasksCompleted: 89,
    tokensUsed: 234500,
    costToday: 3.12,
  },
  {
    id: "test-writer",
    name: "Test Writer",
    type: "test-writer",
    model: "claude-haiku-3-20250708",
    status: "idle",
    description: "Generates unit, integration, and e2e tests",
    capabilities: ["Test generation", "Coverage analysis", "Mock creation"],
    lastActive: new Date(Date.now() - 1200000),
    tasksCompleted: 56,
    tokensUsed: 89100,
    costToday: 0.45,
  },
  {
    id: "refactoring",
    name: "Refactoring Agent",
    type: "refactor",
    model: "claude-sonnet-4-20250514",
    status: "online",
    description: "Improves code quality through automated refactoring",
    capabilities: ["Code cleanup", "Pattern detection", "Optimization", "Modernization"],
    lastActive: new Date(Date.now() - 180000),
    tasksCompleted: 34,
    tokensUsed: 167800,
    costToday: 1.67,
  },
  {
    id: "docs-agent",
    name: "Documentation Agent",
    type: "docs",
    model: "claude-haiku-3-20250708",
    status: "offline",
    description: "Generates and maintains documentation",
    capabilities: ["Doc generation", "API docs", "README updates"],
    lastActive: new Date(Date.now() - 7200000),
    tasksCompleted: 23,
    tokensUsed: 45600,
    costToday: 0.89,
  },
  {
    id: "deploy-agent",
    name: "Deployment Agent",
    type: "deploy",
    model: "claude-haiku-3-20250708",
    status: "error",
    description: "Manages deployment pipelines and infrastructure",
    capabilities: ["CI/CD", "Infrastructure", "Rollback"],
    lastActive: new Date(Date.now() - 1800000),
    tasksCompleted: 45,
    tokensUsed: 23400,
    costToday: 0.11,
  },
];

export const useAgentStore = create<AgentState>()(
  persist(
    (set) => ({
      agents: defaultAgents,
      selectedAgentId: null,
      isLoading: false,
      error: null,
      setSelectedAgent: (id) => set({ selectedAgentId: id }),
      updateAgentStatus: (id, status) =>
        set((state) => ({
          agents: state.agents.map((a) =>
            a.id === id ? { ...a, status, lastActive: new Date() } : a
          ),
        })),
      addAgent: (agent) =>
        set((state) => ({ agents: [...state.agents, agent] })),
      removeAgent: (id) =>
        set((state) => ({ agents: state.agents.filter((a) => a.id !== id) })),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
    }),
    {
      name: "aasop-agents",
      partialize: (state) => ({ agents: state.agents }),
    }
  )
);
