"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgentStore } from "@/store/useAgentStore";
import { cn, formatRelativeTime } from "@/lib/utils";
import { Bot, Cpu, MemoryStick, ArrowRight } from "lucide-react";
import Link from "next/link";

const statusConfig = {
  online: { label: "Online", color: "bg-emerald-500", text: "text-emerald-400", bg: "bg-emerald-500/10" },
  offline: { label: "Offline", color: "bg-gray-500", text: "text-gray-400", bg: "bg-gray-500/10" },
  busy: { label: "Busy", color: "bg-amber-500", text: "text-amber-400", bg: "bg-amber-500/10" },
  error: { label: "Error", color: "bg-red-500", text: "text-red-400", bg: "bg-red-500/10" },
  idle: { label: "Idle", color: "bg-blue-500", text: "text-blue-400", bg: "bg-blue-500/10" },
};

export function AgentStatusGrid() {
  const { agents, isLoading } = useAgentStore();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          Agent Status
        </CardTitle>
        <Link
          href="/agents"
          className="text-xs text-primary flex items-center gap-1 hover:underline"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {agents.slice(0, 6).map((agent) => {
          const status = statusConfig[agent.status];
          return (
            <Link
              key={agent.id}
              href={`/agents/${agent.id}`}
              className={cn(
                "group flex items-center gap-3 rounded-xl border border-border bg-card/50 p-3 transition-all duration-200 hover:border-primary/30 hover:bg-card hover:shadow-sm"
              )}
            >
              <div className="relative">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className={cn("text-xs font-bold", status.bg, status.text)}>
                    {agent.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className={cn("absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background", status.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{agent.name}</p>
                  <Badge variant={agent.status === "online" ? "success" : agent.status === "busy" ? "warning" : agent.status === "error" ? "error" : "secondary"} size="sm">
                    {status.label}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Cpu className="h-3 w-3" />{agent.model}
                  </span>
                  <span>{formatRelativeTime(agent.lastActive)}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
