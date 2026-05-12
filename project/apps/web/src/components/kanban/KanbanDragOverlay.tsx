"use client";

import { Badge } from "@/components/ui/badge";
import { cn, truncate } from "@/lib/utils";
import { priorityColors } from "@/lib/theme";
import { GripVertical } from "lucide-react";
import type { Task } from "./KanbanBoard";

interface KanbanDragOverlayProps {
  task: Task;
}

export function KanbanDragOverlay({ task }: KanbanDragOverlayProps) {
  const priority = priorityColors[task.priority];

  return (
    <div className="w-[280px] rounded-lg border border-primary/30 bg-card p-3 shadow-xl shadow-primary/10 rotate-2 scale-105 cursor-grabbing">
      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
        <Badge variant={task.priority} size="sm">
          {task.priority}
        </Badge>
        {task.assignee && (
          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
            @{task.assignee}
          </span>
        )}
      </div>
      <h4 className="text-sm font-medium">{task.title}</h4>
      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
        {task.description}
      </p>
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        {task.tags.map((tag) => (
          <span key={tag} className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
