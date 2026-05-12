"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { cn, formatRelativeTime, truncate } from "@/lib/utils";
import { priorityColors } from "@/lib/theme";
import { GripVertical, Clock, MessageSquare } from "lucide-react";
import type { Task } from "./KanbanBoard";

interface KanbanCardProps {
  task: Task;
}

export function KanbanCard({ task }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { type: "Task", task } });

  const priority = priorityColors[task.priority];

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-lg border border-border bg-card p-3 cursor-grab active:cursor-grabbing transition-shadow",
        "hover:shadow-md hover:border-primary/20",
        isDragging && "opacity-30 rotate-2 scale-105 shadow-xl"
      )}
    >
      <div className="flex items-start gap-1">
        <div
          className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
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
          <h4 className="text-sm font-medium leading-snug">{task.title}</h4>
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
          <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatRelativeTime(task.updatedAt)}
            </span>
            {task.estimatedHours && (
              <span>{task.estimatedHours}h est.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
