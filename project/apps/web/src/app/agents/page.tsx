"use client";

import { useState } from "react";
import { useAgentStore } from "@/store/useAgentStore";
import { AgentList } from "@/components/agents/AgentList";
import { AgentCard } from "@/components/agents/AgentCard";
import { AgentTypes } from "@/components/agents/AgentTypes";
import { CreateAgentModal } from "@/components/agents/CreateAgentModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  Bot, Plus, LayoutGrid, List, BarChart3,
} from "lucide-react";

export default function AgentsPage() {
  const { agents } = useAgentStore();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [createOpen, setCreateOpen] = useState(false);

  const statusCounts = {
    online: agents.filter((a) => a.status === "online").length,
    busy: agents.filter((a) => a.status === "busy").length,
    idle: agents.filter((a) => a.status === "idle").length,
    error: agents.filter((a) => a.status === "error").length,
    offline: agents.filter((a) => a.status === "offline").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            Agent Fleet
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage and monitor your autonomous agents
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Create Agent
        </Button>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {([
          { key: "online", label: "Online", color: "bg-emerald-500", text: "text-emerald-400" },
          { key: "busy", label: "Busy", color: "bg-amber-500", text: "text-amber-400" },
          { key: "idle", label: "Idle", color: "bg-blue-500", text: "text-blue-400" },
          { key: "error", label: "Error", color: "bg-red-500", text: "text-red-400" },
          { key: "offline", label: "Offline", color: "bg-gray-500", text: "text-gray-400" },
        ] as const).map((s) => (
          <Card key={s.key} className="cursor-pointer hover:border-primary/30 transition-colors">
            <CardContent className="p-3 flex items-center gap-3">
              <div className={cn("h-3 w-3 rounded-full", s.color)} />
              <div>
                <p className="text-lg font-bold">{statusCounts[s.key as keyof typeof statusCounts]}</p>
                <p className={cn("text-xs", s.text)}>{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main content */}
      <Tabs defaultValue="agents" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="agents">All Agents</TabsTrigger>
            <TabsTrigger value="types">Agent Types</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-1">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="icon-sm"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="icon-sm"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <TabsContent value="agents" className="mt-0">
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          ) : (
            <AgentList agents={agents} />
          )}
        </TabsContent>

        <TabsContent value="types" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Available Agent Types</CardTitle>
            </CardHeader>
            <CardContent>
              <AgentTypes />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CreateAgentModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
