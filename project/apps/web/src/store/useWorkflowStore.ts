"use client";

import { create } from "zustand";

export type WFNodeType = "start" | "agent" | "task" | "decision" | "parallel" | "end";
export type WFStatus = "idle" | "running" | "completed" | "failed" | "paused";

export interface WorkflowNode {
  id: string;
  type: WFNodeType;
  label: string;
  description: string;
  status: "idle" | "running" | "completed" | "failed";
  x: number;
  y: number;
  agentId?: string;
  config?: Record<string, string>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  condition?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  status: WFStatus;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  createdAt: Date;
  updatedAt: Date;
}

interface WorkflowState {
  workflows: Workflow[];
  selectedWorkflowId: string | null;
  isLoading: boolean;
  setSelectedWorkflow: (id: string | null) => void;
  addWorkflow: (workflow: Workflow) => void;
  updateWorkflow: (id: string, updates: Partial<Workflow>) => void;
  updateNodeStatus: (workflowId: string, nodeId: string, status: WorkflowNode["status"]) => void;
  removeWorkflow: (id: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useWorkflowStore = create<WorkflowState>()((set) => ({
  workflows: [],
  selectedWorkflowId: null,
  isLoading: false,
  setSelectedWorkflow: (id) => set({ selectedWorkflowId: id }),
  addWorkflow: (workflow) =>
    set((state) => ({ workflows: [...state.workflows, workflow] })),
  updateWorkflow: (id, updates) =>
    set((state) => ({
      workflows: state.workflows.map((w) =>
        w.id === id ? { ...w, ...updates, updatedAt: new Date() } : w
      ),
    })),
  updateNodeStatus: (workflowId, nodeId, status) =>
    set((state) => ({
      workflows: state.workflows.map((w) =>
        w.id === workflowId
          ? {
              ...w,
              nodes: w.nodes.map((n) => (n.id === nodeId ? { ...n, status } : n)),
              updatedAt: new Date(),
            }
          : w
      ),
    })),
  removeWorkflow: (id) =>
    set((state) => ({ workflows: state.workflows.filter((w) => w.id !== id) })),
  setLoading: (loading) => set({ isLoading: loading }),
}));
