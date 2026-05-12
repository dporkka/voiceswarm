"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";
import { Search, Download, Filter, RotateCcw, Pause } from "lucide-react";

interface LogEntry {
  id: string;
  timestamp: Date;
  level: "info" | "warn" | "error" | "debug";
  service: string;
  message: string;
  traceId?: string;
}

const mockLogs: LogEntry[] = [
  { id: "1", timestamp: new Date(Date.now() - 1000), level: "info", service: "api-gateway", message: "Request processed: GET /api/v1/agents - 200 OK in 45ms", traceId: "trace-abc123" },
  { id: "2", timestamp: new Date(Date.now() - 3000), level: "info", service: "orchestrator", message: "Task task-892 assigned to refactoring-agent", traceId: "trace-abc124" },
  { id: "3", timestamp: new Date(Date.now() - 5000), level: "warn", service: "code-reviewer", message: "Token usage at 82% of context window", traceId: "trace-abc125" },
  { id: "4", timestamp: new Date(Date.now() - 8000), level: "error", service: "test-runner", message: "Test timeout: payment-service/integration.test.ts after 30000ms", traceId: "trace-abc126" },
  { id: "5", timestamp: new Date(Date.now() - 12000), level: "info", service: "deploy-agent", message: "Deployment completed: aasop-api v2.1.0 to production", traceId: "trace-abc127" },
  { id: "6", timestamp: new Date(Date.now() - 15000), level: "debug", service: "inference", message: "Cache hit for prompt hash: 0x7f3a9b2c", traceId: "trace-abc128" },
  { id: "7", timestamp: new Date(Date.now() - 20000), level: "info", service: "api-gateway", message: "WebSocket connection established: client-8942", traceId: "trace-abc129" },
  { id: "8", timestamp: new Date(Date.now() - 25000), level: "warn", service: "billing", message: "Hourly cost threshold at 78%: $9.80 of $12.50", traceId: "trace-abc130" },
  { id: "9", timestamp: new Date(Date.now() - 30000), level: "info", service: "orchestrator", message: "Workflow wf-1234 started: 8 nodes, 12 edges", traceId: "trace-abc131" },
  { id: "10", timestamp: new Date(Date.now() - 35000), level: "error", service: "memory-store", message: "Connection pool exhausted, retrying in 500ms", traceId: "trace-abc132" },
];

const levelColors = {
  info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  warn: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  error: "bg-red-500/10 text-red-400 border-red-500/20",
  debug: "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

export function LogViewer() {
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [paused, setPaused] = useState(false);
  const [serviceFilter, setServiceFilter] = useState<string>("all");

  const services = Array.from(new Set(mockLogs.map((l) => l.service)));

  const filtered = mockLogs.filter((l) => {
    const matchesSearch = !search || l.message.toLowerCase().includes(search.toLowerCase()) || l.traceId?.includes(search);
    const matchesLevel = levelFilter === "all" || l.level === levelFilter;
    const matchesService = serviceFilter === "all" || l.service === serviceFilter;
    return matchesSearch && matchesLevel && matchesService;
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Live Logs</CardTitle>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => setPaused(!paused)}>
            {paused ? <RotateCcw className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon-sm">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <div className="flex items-center gap-1">
            {(["all", "info", "warn", "error", "debug"] as const).map((l) => (
              <Button
                key={l}
                variant={levelFilter === l ? "default" : "ghost"}
                size="xs"
                onClick={() => setLevelFilter(l)}
                className="capitalize"
              >
                {l}
              </Button>
            ))}
          </div>
          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="h-9 rounded-lg border border-border bg-muted px-3 text-xs"
          >
            <option value="all">All Services</option>
            {services.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Log table */}
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr className="border-b border-border">
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground w-[140px]">Timestamp</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground w-[60px]">Level</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground w-[120px]">Service</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Message</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground w-[100px]">Trace</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2 text-muted-foreground font-mono">{formatDate(log.timestamp)}</td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" size="sm" className={cn(levelColors[log.level], "text-[10px]")}>
                        {log.level}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 font-mono text-muted-foreground">{log.service}</td>
                    <td className="px-3 py-2 max-w-md truncate">{log.message}</td>
                    <td className="px-3 py-2 font-mono text-muted-foreground text-[10px]">{log.traceId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">No logs match your filters.</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
