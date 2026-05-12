"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatRelativeTime } from "@/lib/utils";
import {
  Bot,
  CheckCircle2,
  AlertCircle,
  GitBranch,
  MessageSquare,
  Terminal,
  ArrowRight,
} from "lucide-react";

interface Activity {
  id: string;
  type: "agent" | "task" | "workflow" | "message" | "terminal" | "error";
  title: string;
  description: string;
  timestamp: Date;
  agent?: string;
}

const activities: Activity[] = [
  {
    id: "1",
    type: "agent",
    title: "Code Review Agent started",
    description: "Analyzing PR #234 for repository aasop/core",
    timestamp: new Date(Date.now() - 120000),
    agent: "code-reviewer",
  },
  {
    id: "2",
    type: "task",
    title: "Task completed",
    description: "Refactored authentication middleware",
    timestamp: new Date(Date.now() - 300000),
    agent: "refactoring-agent",
  },
  {
    id: "3",
    type: "workflow",
    title: "CI/CD Pipeline triggered",
    description: "Build #892 started for main branch",
    timestamp: new Date(Date.now() - 600000),
  },
  {
    id: "4",
    type: "message",
    title: "Orchestrator assigned task",
    description: "Created 3 subtasks for feature implementation",
    timestamp: new Date(Date.now() - 900000),
    agent: "orchestrator",
  },
  {
    id: "5",
    type: "error",
    title: "Test Agent failed",
    description: "Integration test timeout in payment-service",
    timestamp: new Date(Date.now() - 1200000),
    agent: "test-agent",
  },
  {
    id: "6",
    type: "terminal",
    title: "Deployment completed",
    description: "aasop-api v2.1.0 deployed to production",
    timestamp: new Date(Date.now() - 1800000),
  },
  {
    id: "7",
    type: "task",
    title: "Code review approved",
    description: "PR #231 approved with 2 comments",
    timestamp: new Date(Date.now() - 2400000),
    agent: "code-reviewer",
  },
];

const typeConfig = {
  agent: { icon: Bot, color: "text-primary", bg: "bg-primary/10" },
  task: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  workflow: { icon: GitBranch, color: "text-blue-400", bg: "bg-blue-500/10" },
  message: { icon: MessageSquare, color: "text-purple-400", bg: "bg-purple-500/10" },
  terminal: { icon: Terminal, color: "text-gray-400", bg: "bg-gray-500/10" },
  error: { icon: AlertCircle, color: "text-red-400", bg: "bg-red-500/10" },
};

export function ActivityFeed() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Terminal className="h-4 w-4 text-primary" />
          Activity Feed
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            Live
            <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-0">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" />

          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {activities.map((activity) => {
              const config = typeConfig[activity.type];
              const Icon = config.icon;

              return (
                <div key={activity.id} className="relative flex gap-3 group">
                  {/* Icon */}
                  <div className={cn("relative z-10 flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full border-2 border-background", config.bg)}>
                    <Icon className={cn("h-4 w-4", config.color)} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{activity.title}</p>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                      {activity.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-muted-foreground">
                        {formatRelativeTime(activity.timestamp)}
                      </span>
                      {activity.agent && (
                        <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                          {activity.agent}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
