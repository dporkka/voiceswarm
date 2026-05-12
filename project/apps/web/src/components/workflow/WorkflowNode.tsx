"use client";

import { cn } from "@/lib/utils";
import { statusColors } from "@/lib/theme";
import {
  Play, Bot, CheckCircle2, AlertCircle, GitBranch, Layers, Flag,
} from "lucide-react";
import type { WFNode } from "./WorkflowCanvas";

interface WorkflowNodeProps {
  node: WFNode;
  onMouseDown: (e: React.MouseEvent) => void;
  isDragging: boolean;
}

const nodeTypeConfig = {
  start: { icon: Play, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
  agent: { icon: Bot, color: "text-primary", bg: "bg-primary/10", border: "border-primary/30" },
  task: { icon: CheckCircle2, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30" },
  decision: { icon: GitBranch, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  parallel: { icon: Layers, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30" },
  end: { icon: Flag, color: "text-gray-400", bg: "bg-gray-500/10", border: "border-gray-500/30" },
};

const statusConfig = {
  idle: "border-border bg-card",
  running: "border-primary/50 bg-card shadow-lg shadow-primary/10",
  completed: "border-emerald-500/30 bg-card",
  failed: "border-red-500/30 bg-card",
};

export function WorkflowNode({ node, onMouseDown, isDragging }: WorkflowNodeProps) {
  const config = nodeTypeConfig[node.type];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "absolute flex items-center gap-2.5 rounded-xl border px-4 py-3 shadow-md cursor-grab select-none transition-shadow min-w-[160px] max-w-[200px]",
        statusConfig[node.status],
        isDragging && "cursor-grabbing shadow-xl scale-105 z-50",
        "hover:shadow-lg hover:border-primary/30"
      )}
      style={{ left: node.x, top: node.y, transform: "translate(-50%, -50%)" }}
      onMouseDown={onMouseDown}
    >
      <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", config.bg)}>
        <Icon className={cn("h-4 w-4", config.color)} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{node.label}</p>
        <p className="text-[10px] text-muted-foreground truncate">{node.description}</p>
      </div>
      {node.status === "running" && (
        <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary animate-pulse" />
      )}
    </div>
  );
}
