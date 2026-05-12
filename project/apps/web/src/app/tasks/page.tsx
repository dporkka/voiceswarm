"use client";

import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KanbanSquare, Plus, Filter } from "lucide-react";
import { useTaskStore } from "@/store/useTaskStore";

export default function TasksPage() {
  const { tasks } = useTaskStore();

  const counts = {
    pending: tasks.filter((t) => t.status === "pending").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    reviewing: tasks.filter((t) => t.status === "reviewing").length,
    completed: tasks.filter((t) => t.status === "completed").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <KanbanSquare className="h-6 w-6 text-primary" />
            Task Board
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage tasks across your agent fleet
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-1" />
            Filter
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            New Task
          </Button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
          <span className="text-muted-foreground">Pending:</span>
          <span className="font-semibold">{counts.pending}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
          <span className="text-muted-foreground">In Progress:</span>
          <span className="font-semibold">{counts.in_progress}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-purple-500" />
          <span className="text-muted-foreground">Reviewing:</span>
          <span className="font-semibold">{counts.reviewing}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <span className="text-muted-foreground">Completed:</span>
          <span className="font-semibold">{counts.completed}</span>
        </div>
      </div>

      <KanbanBoard />
    </div>
  );
}
