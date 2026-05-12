"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { cn, formatRelativeTime } from "@/lib/utils";
import { statusColors } from "@/lib/theme";
import {
  Bot, Cpu, Clock, Zap, MessageSquare, MoreHorizontal,
  Pause, Play, RotateCcw, Power,
} from "lucide-react";
import Link from "next/link";

export interface Agent {
  id: string;
  name: string;
  type: string;
  model: string;
  status: "online" | "offline" | "busy" | "error" | "idle";
  description: string;
  capabilities: string[];
  lastActive: Date;
  tasksCompleted: number;
  tokensUsed: number;
  costToday: number;
}

interface AgentCardProps {
  agent: Agent;
  compact?: boolean;
}

export function AgentCard({ agent, compact = false }: AgentCardProps) {
  const status = statusColors[agent.status];

  return (
    <Link href={`/agents/${agent.id}`}>
      <Card
        hover
        className={cn(
          "group cursor-pointer transition-all duration-200",
          agent.status === "error" && "border-red-500/30",
          agent.status === "busy" && "border-amber-500/20",
        )}
      >
        <CardContent className={cn("p-4", compact && "p-3")}>
          <div className="flex items-start gap-3">
            <Avatar className={cn("shrink-0", compact ? "h-8 w-8" : "h-10 w-10")}>
              <AvatarFallback className={cn("text-xs font-bold", status.bg, status.text)}>
                <Bot className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className={cn("font-semibold truncate", compact ? "text-sm" : "text-base")}>
                  {agent.name}
                </h3>
                <Badge variant={agent.status === "online" ? "success" : agent.status === "busy" ? "warning" : agent.status === "error" ? "error" : "secondary"} size="sm">
                  <span className={cn("h-1.5 w-1.5 rounded-full mr-1", status.dot)} />
                  {agent.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{agent.description}</p>
            </div>
          </div>

          {!compact && (
            <>
              <Separator className="my-3" />
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Cpu className="h-3 w-3" />
                  <span className="truncate">{agent.model}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Zap className="h-3 w-3" />
                  <span>{agent.capabilities[0]}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{formatRelativeTime(agent.lastActive)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <MessageSquare className="h-3 w-3" />
                  <span>{agent.tasksCompleted} tasks</span>
                </div>
              </div>
              <div className="flex items-center gap-1 mt-3 flex-wrap">
                {agent.capabilities.slice(0, 3).map((cap) => (
                  <Badge key={cap} variant="secondary" size="sm">{cap}</Badge>
                ))}
                {agent.capabilities.length > 3 && (
                  <Badge variant="secondary" size="sm">+{agent.capabilities.length - 3}</Badge>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
