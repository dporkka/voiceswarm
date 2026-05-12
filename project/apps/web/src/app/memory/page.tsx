"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { cn, formatRelativeTime } from "@/lib/utils";
import { Brain, Search, Database, Zap, FileText, Trash2 } from "lucide-react";

interface MemoryEntry {
  id: string;
  type: "conversation" | "code" | "document" | "metric";
  agent: string;
  content: string;
  tokens: number;
  timestamp: Date;
}

const memories: MemoryEntry[] = [
  { id: "m1", type: "conversation", agent: "orchestrator", content: "Task decomposition for PR #234: identified 5 subtasks across 3 agents", tokens: 1420, timestamp: new Date(Date.now() - 300000) },
  { id: "m2", type: "code", agent: "code-reviewer", content: "Review context for auth/middleware.ts: identified 3 security issues, suggested 2 optimizations", tokens: 2340, timestamp: new Date(Date.now() - 600000) },
  { id: "m3", type: "document", agent: "docs-agent", content: "API documentation for /api/v1/workflows endpoints with examples", tokens: 890, timestamp: new Date(Date.now() - 900000) },
  { id: "m4", type: "metric", agent: "orchestrator", content: "Performance baseline: avg inference latency 142ms, token throughput 52k/min", tokens: 320, timestamp: new Date(Date.now() - 1200000) },
  { id: "m5", type: "conversation", agent: "test-writer", content: "Test generation context for payment-service: coverage 87% -> 94%", tokens: 1870, timestamp: new Date(Date.now() - 1800000) },
  { id: "m6", type: "code", agent: "refactoring-agent", content: "Refactoring plan for database layer: 12 queries optimized, 3 indexes added", tokens: 1560, timestamp: new Date(Date.now() - 2400000) },
];

const typeConfig = {
  conversation: { icon: Brain, color: "text-primary", bg: "bg-primary/10" },
  code: { icon: FileText, color: "text-blue-400", bg: "bg-blue-500/10" },
  document: { icon: FileText, color: "text-purple-400", bg: "bg-purple-500/10" },
  metric: { icon: Zap, color: "text-amber-400", bg: "bg-amber-500/10" },
};

export default function MemoryPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            Memory Store
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Inspect agent memory and context windows
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search memories..." className="pl-9 h-9 w-64" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Database className="h-4 w-4" />
              <span className="text-xs">Total Memories</span>
            </div>
            <p className="text-2xl font-bold">{memories.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Zap className="h-4 w-4" />
              <span className="text-xs">Total Tokens Stored</span>
            </div>
            <p className="text-2xl font-bold">{(memories.reduce((a, m) => a + m.tokens, 0) / 1000).toFixed(1)}k</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Brain className="h-4 w-4" />
              <span className="text-xs">Active Agents</span>
            </div>
            <p className="text-2xl font-bold">{new Set(memories.map((m) => m.agent)).size}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Memory Entries</CardTitle>
          <CardDescription>Recent agent memory and context entries</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {memories.map((memory) => {
            const config = typeConfig[memory.type];
            const Icon = config.icon;
            return (
              <div
                key={memory.id}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-xl border border-border bg-card/50 hover:bg-card hover:border-primary/20 transition-all group"
                )}
              >
                <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", config.bg)}>
                  <Icon className={cn("h-4 w-4", config.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" size="sm">{memory.type}</Badge>
                    <span className="text-xs text-muted-foreground font-mono">@{memory.agent}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{formatRelativeTime(memory.timestamp)}</span>
                  </div>
                  <p className="text-sm mt-1.5">{memory.content}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span>{memory.tokens.toLocaleString()} tokens</span>
                    <Button variant="ghost" size="xs" className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
