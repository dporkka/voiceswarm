"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import { Terminal, Download, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LogEntry {
  id: string;
  level: "info" | "warn" | "error" | "debug";
  message: string;
  timestamp: Date;
  metadata?: Record<string, string>;
}

const mockLogs: LogEntry[] = [
  { id: "1", level: "info", message: "Agent initialized with model claude-sonnet-4-20250514", timestamp: new Date(Date.now() - 3600000) },
  { id: "2", level: "info", message: "Received task: Review pull request #234", timestamp: new Date(Date.now() - 3500000) },
  { id: "3", level: "debug", message: "Context window: 12.4k tokens, remaining: 87.6k", timestamp: new Date(Date.now() - 3400000) },
  { id: "4", level: "info", message: "Analyzing file changes in src/auth/middleware.ts", timestamp: new Date(Date.now() - 3200000) },
  { id: "5", level: "warn", message: "Token usage approaching threshold: 82%", timestamp: new Date(Date.now() - 2800000) },
  { id: "6", level: "info", message: "Completed analysis, generating report", timestamp: new Date(Date.now() - 2600000) },
  { id: "7", level: "info", message: "Task completed successfully, 3 issues found", timestamp: new Date(Date.now() - 2500000) },
  { id: "8", level: "debug", message: "Sleeping for 30s before next poll", timestamp: new Date(Date.now() - 2400000) },
];

const levelColors = {
  info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  warn: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  error: "bg-red-500/10 text-red-400 border-red-500/20",
  debug: "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

interface AgentLogsProps {
  agentId: string;
}

export function AgentLogs({ agentId }: AgentLogsProps) {
  const [filter, setFilter] = useState<string>("all");

  const filtered = filter === "all" ? mockLogs : mockLogs.filter((l) => l.level === filter);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Terminal className="h-4 w-4 text-primary" />
          Execution Logs
        </CardTitle>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {(["all", "info", "warn", "error", "debug"] as const).map((l) => (
              <Button
                key={l}
                variant={filter === l ? "default" : "ghost"}
                size="xs"
                onClick={() => setFilter(l)}
                className="capitalize"
              >
                {l}
              </Button>
            ))}
          </div>
          <Button variant="ghost" size="icon-sm">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="font-mono text-xs space-y-1 max-h-[400px] overflow-y-auto rounded-lg bg-background border border-border p-3">
          {filtered.map((log) => (
            <div key={log.id} className="flex gap-3 hover:bg-muted/30 rounded px-1.5 py-1 transition-colors">
              <span className="text-muted-foreground shrink-0 w-[140px]">
                {formatDate(log.timestamp)}
              </span>
              <Badge variant="outline" size="sm" className={cn("shrink-0 w-14 justify-center text-[10px]", levelColors[log.level])}>
                {log.level.toUpperCase()}
              </Badge>
              <span className="text-foreground/90">{log.message}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
