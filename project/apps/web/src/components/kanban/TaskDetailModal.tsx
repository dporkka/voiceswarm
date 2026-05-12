"use client";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { cn, formatDate, formatRelativeTime } from "@/lib/utils";
import { priorityColors } from "@/lib/theme";
import { Clock, User, Tag, MessageSquare, GitBranch } from "lucide-react";
import type { Task } from "./KanbanBoard";

interface TaskDetailModalProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
}

export function TaskDetailModal({ task, open, onClose }: TaskDetailModalProps) {
  if (!task) return null;

  const priority = priorityColors[task.priority];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={task.priority}>{task.priority}</Badge>
            <Badge variant="secondary">{task.status.replace("_", " ")}</Badge>
          </div>
          <DialogTitle className="mt-2">{task.title}</DialogTitle>
          <DialogDescription>{task.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-4">
            {task.assignee && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <User className="h-4 w-4" />
                <span>@{task.assignee}</span>
              </div>
            )}
            {task.estimatedHours && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{task.estimatedHours}h estimated</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {task.tags.map((tag) => (
              <Badge key={tag} variant="secondary" size="sm">
                <Tag className="h-3 w-3 mr-1" />
                {tag}
              </Badge>
            ))}
          </div>

          <Separator />

          <div className="text-xs text-muted-foreground space-y-1">
            <p>Created: {formatDate(task.createdAt)}</p>
            <p>Updated: {formatDate(task.updatedAt)}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button>Edit Task</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
