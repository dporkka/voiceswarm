"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TaskStatus = "pending" | "in_progress" | "reviewing" | "completed";
export type TaskPriority = "low" | "medium" | "high" | "critical";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  estimatedHours?: number;
}

interface TaskState {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  moveTask: (taskId: string, newStatus: TaskStatus) => void;
  addTask: (task: Task) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  removeTask: (taskId: string) => void;
  setLoading: (loading: boolean) => void;
}

const defaultTasks: Task[] = [
  {
    id: "task-1",
    title: "Refactor auth middleware",
    description: "Move auth logic to separate service layer",
    status: "in_progress",
    priority: "high",
    assignee: "refactoring-agent",
    tags: ["backend", "auth"],
    createdAt: new Date(Date.now() - 86400000),
    updatedAt: new Date(),
  },
  {
    id: "task-2",
    title: "Add unit tests for payment",
    description: "Cover payment flow with 90%+ test coverage",
    status: "pending",
    priority: "critical",
    assignee: "test-writer",
    tags: ["testing", "payments"],
    createdAt: new Date(Date.now() - 172800000),
    updatedAt: new Date(),
  },
  {
    id: "task-3",
    title: "Review PR #234",
    description: "Code review for new feature branch",
    status: "reviewing",
    priority: "medium",
    assignee: "code-reviewer",
    tags: ["review"],
    createdAt: new Date(Date.now() - 43200000),
    updatedAt: new Date(),
  },
  {
    id: "task-4",
    title: "Update API docs",
    description: "Document new endpoints in OpenAPI format",
    status: "completed",
    priority: "low",
    assignee: "docs-agent",
    tags: ["docs"],
    createdAt: new Date(Date.now() - 259200000),
    updatedAt: new Date(),
  },
  {
    id: "task-5",
    title: "Optimize database queries",
    description: "Add indexes and optimize slow queries",
    status: "in_progress",
    priority: "high",
    assignee: "refactoring-agent",
    tags: ["database", "perf"],
    createdAt: new Date(Date.now() - 64800000),
    updatedAt: new Date(),
  },
  {
    id: "task-6",
    title: "Set up CI pipeline",
    description: "Configure GitHub Actions for automated testing",
    status: "pending",
    priority: "medium",
    assignee: "deploy-agent",
    tags: ["ci-cd"],
    createdAt: new Date(Date.now() - 129600000),
    updatedAt: new Date(),
  },
  {
    id: "task-7",
    title: "Security audit",
    description: "Run security scan on dependencies",
    status: "reviewing",
    priority: "critical",
    assignee: "code-reviewer",
    tags: ["security"],
    createdAt: new Date(Date.now() - 21600000),
    updatedAt: new Date(),
  },
  {
    id: "task-8",
    title: "Migrate to TypeScript",
    description: "Convert remaining JS files to TS",
    status: "completed",
    priority: "medium",
    assignee: "refactoring-agent",
    tags: ["typescript"],
    createdAt: new Date(Date.now() - 345600000),
    updatedAt: new Date(),
  },
];

export const useTaskStore = create<TaskState>()(
  persist(
    (set) => ({
      tasks: defaultTasks,
      isLoading: false,
      error: null,
      moveTask: (taskId, newStatus) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId ? { ...t, status: newStatus, updatedAt: new Date() } : t
          ),
        })),
      addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
      updateTask: (taskId, updates) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId ? { ...t, ...updates, updatedAt: new Date() } : t
          ),
        })),
      removeTask: (taskId) =>
        set((state) => ({ tasks: state.tasks.filter((t) => t.id !== taskId) })),
      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: "aasop-tasks",
      partialize: (state) => ({ tasks: state.tasks }),
    }
  )
);
