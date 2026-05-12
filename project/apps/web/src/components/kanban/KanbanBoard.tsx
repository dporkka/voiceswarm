"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";
import { KanbanDragOverlay } from "./KanbanDragOverlay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type TaskPriority = "low" | "medium" | "high" | "critical";
export type TaskStatus = "pending" | "in_progress" | "reviewing" | "completed";

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

const initialTasks: Task[] = [
  { id: "task-1", title: "Refactor auth middleware", description: "Move auth logic to separate service layer", status: "in_progress", priority: "high", assignee: "refactoring-agent", tags: ["backend", "auth"], createdAt: new Date(Date.now() - 86400000), updatedAt: new Date() },
  { id: "task-2", title: "Add unit tests for payment", description: "Cover payment flow with 90%+ test coverage", status: "pending", priority: "critical", assignee: "test-writer", tags: ["testing", "payments"], createdAt: new Date(Date.now() - 172800000), updatedAt: new Date() },
  { id: "task-3", title: "Review PR #234", description: "Code review for new feature branch", status: "reviewing", priority: "medium", assignee: "code-reviewer", tags: ["review"], createdAt: new Date(Date.now() - 43200000), updatedAt: new Date() },
  { id: "task-4", title: "Update API docs", description: "Document new endpoints in OpenAPI format", status: "completed", priority: "low", assignee: "docs-agent", tags: ["docs"], createdAt: new Date(Date.now() - 259200000), updatedAt: new Date() },
  { id: "task-5", title: "Optimize database queries", description: "Add indexes and optimize slow queries", status: "in_progress", priority: "high", assignee: "refactoring-agent", tags: ["database", "perf"], createdAt: new Date(Date.now() - 64800000), updatedAt: new Date() },
  { id: "task-6", title: "Set up CI pipeline", description: "Configure GitHub Actions for automated testing", status: "pending", priority: "medium", assignee: "deploy-agent", tags: ["ci-cd"], createdAt: new Date(Date.now() - 129600000), updatedAt: new Date() },
  { id: "task-7", title: "Security audit", description: "Run security scan on dependencies", status: "reviewing", priority: "critical", assignee: "code-reviewer", tags: ["security"], createdAt: new Date(Date.now() - 21600000), updatedAt: new Date() },
  { id: "task-8", title: "Migrate to TypeScript", description: "Convert remaining JS files to TS", status: "completed", priority: "medium", assignee: "refactoring-agent", tags: ["typescript"], createdAt: new Date(Date.now() - 345600000), updatedAt: new Date() },
];

const columns: { id: TaskStatus; title: string; color: string }[] = [
  { id: "pending", title: "Pending", color: "bg-blue-500" },
  { id: "in_progress", title: "In Progress", color: "bg-amber-500" },
  { id: "reviewing", title: "Reviewing", color: "bg-purple-500" },
  { id: "completed", title: "Completed", color: "bg-emerald-500" },
];

export function KanbanBoard() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (over) {
      const overId = over.id as string;
      if (columns.some((c) => c.id === overId)) {
        setDragOverColumn(overId as TaskStatus);
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setDragOverColumn(null);

    if (!over) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    const overId = over.id as string;
    const overColumn = columns.find((c) => c.id === overId);

    if (overColumn) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === activeTask.id
            ? { ...t, status: overColumn.id, updatedAt: new Date() }
            : t
        )
      );
    }
  };

  const filteredTasks = tasks.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()))
  );

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />New Task
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {columns.map((col) => (
            <KanbanColumn
              key={col.id}
              id={col.id}
              title={col.title}
              color={col.color}
              tasks={filteredTasks.filter((t) => t.status === col.id)}
              isOver={dragOverColumn === col.id}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask && <KanbanDragOverlay task={activeTask} />}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
