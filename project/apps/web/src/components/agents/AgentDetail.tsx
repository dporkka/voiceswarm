"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, formatRelativeTime, formatNumber, formatCurrency } from "@/lib/utils";
import { statusColors } from "@/lib/theme";
import {
  Bot, Cpu, MemoryStick, Clock, Zap, MessageSquare,
  BarChart3, FileText, Settings2,
} from "lucide-react";
import type { Agent } from "./AgentCard";
import { AgentLogs } from "./AgentLogs";

interface AgentDetailProps {
  agent: Agent;
}

export function AgentDetail({ agent }: AgentDetailProps) {
  const status = statusColors[agent.status];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className={cn("text-lg font-bold", status.bg, status.text)}>
                <Bot className="h-8 w-8" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold">{agent.name}</h1>
                <Badge variant={agent.status === "online" ? "success" : agent.status === "busy" ? "warning" : agent.status === "error" ? "error" : "secondary"}>
                  <span className={cn("h-2 w-2 rounded-full mr-1.5", status.dot)} />
                  {agent.status}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1">{agent.description}</p>
              <div className="flex items-center gap-4 mt-3 text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Cpu className="h-4 w-4" />{agent.model}
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-4 w-4" />Last active {formatRelativeTime(agent.lastActive)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Tasks Completed", value: formatNumber(agent.tasksCompleted), icon: MessageSquare },
          { label: "Tokens Used Today", value: formatNumber(agent.tokensUsed), icon: MemoryStick },
          { label: "Cost Today", value: formatCurrency(agent.costToday), icon: BarChart3 },
          { label: "Capabilities", value: agent.capabilities.length.toString(), icon: Zap },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <stat.icon className="h-4 w-4" />
                <span className="text-xs">{stat.label}</span>
              </div>
              <p className="text-xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="capabilities" className="w-full">
        <TabsList>
          <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
        </TabsList>
        <TabsContent value="capabilities" className="mt-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-2">
                {agent.capabilities.map((cap) => (
                  <Badge key={cap} variant="default" size="lg">{cap}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="performance" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Performance Metrics</CardTitle>
              <CardDescription>Coming soon - performance analytics</CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>
        <TabsContent value="configuration" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Agent Configuration</CardTitle>
              <CardDescription>Model: {agent.model}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">ID</p>
                  <p className="font-mono">{agent.id}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <p>{agent.type}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Model</p>
                  <p>{agent.model}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="capitalize">{agent.status}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Logs */}
      <AgentLogs agentId={agent.id} />
    </div>
  );
}
