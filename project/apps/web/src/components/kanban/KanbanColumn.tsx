"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { KanbanCard } from "./KanbanCard";
import { cn } from "@/lib/utils";
import type { Task } from "./KanbanBoard";

interface KanbanColumnProps {
  id: string;
  title: string;
  color: string;
  tasks: Task[];
  isOver: boolean;
}

export function KanbanColumn({ id, title, color, tasks, isOver }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col rounded-xl border border-border bg-muted/20 min-h-[200px] transition-colors",
        isOver && "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
      )}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className={cn("h-2.5 w-2.5 rounded-full", color)} />
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>
      <div className="flex-1 p-3 space-y-2">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <KanbanCard key={task.id} task={task} />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="text-center py-8 text-xs text-muted-foreground">
            Drop tasks here
          </div>
        )}
      </div>
    </div>
  );
}
