"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatDuration } from "@/lib/utils";
import { ChevronRight, ChevronDown, Clock } from "lucide-react";

interface TraceSpan {
  id: string;
  name: string;
  service: string;
  startTime: number;
  duration: number;
  status: "ok" | "error";
  children?: TraceSpan[];
}

const sampleTrace: TraceSpan[] = [
  {
    id: "s1", name: "POST /api/v1/workflows", service: "api-gateway", startTime: 0, duration: 1245, status: "ok",
    children: [
      { id: "s2", name: "authenticate", service: "auth-service", startTime: 5, duration: 45, status: "ok" },
      { id: "s3", name: "validate_request", service: "api-gateway", startTime: 55, duration: 12, status: "ok" },
      {
        id: "s4", name: "create_workflow", service: "orchestrator", startTime: 72, duration: 1168, status: "ok",
        children: [
          { id: "s5", name: "load_agent_config", service: "orchestrator", startTime: 80, duration: 23, status: "ok" },
          { id: "s6", name: "initialize_nodes", service: "orchestrator", startTime: 108, duration: 156, status: "ok" },
          {
            id: "s7", name: "start_agent:code-reviewer", service: "inference", startTime: 275, duration: 890, status: "ok",
            children: [
              { id: "s8", name: "prepare_context", service: "inference", startTime: 280, duration: 45, status: "ok" },
              { id: "s9", name: "llm_request", service: "inference", startTime: 330, duration: 780, status: "ok" },
              { id: "s10", name: "parse_response", service: "inference", startTime: 1115, duration: 35, status: "ok" },
            ]
          },
          { id: "s11", name: "persist_workflow", service: "memory-store", startTime: 1175, duration: 55, status: "ok" },
        ]
      },
    ]
  },
];

const maxDuration = 1245;

function SpanRow({ span, depth = 0 }: { span: TraceSpan; depth?: number }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = span.children && span.children.length > 0;
  const leftPct = (span.startTime / maxDuration) * 100;
  const widthPct = (span.duration / maxDuration) * 100;

  return (
    <div>
      <div className="flex items-center gap-2 py-1.5 hover:bg-muted/30 transition-colors group">
        <div className="flex items-center gap-1" style={{ paddingLeft: depth * 20 }}>
          {hasChildren ? (
            <button onClick={() => setExpanded(!expanded)} className="shrink-0">
              {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          ) : (
            <div className="w-3.5" />
          )}
          <span className={cn("text-xs font-medium truncate", span.status === "error" && "text-red-400")}>
            {span.name}
          </span>
        </div>
        <div className="flex-1 relative h-5 mx-2">
          <div
            className={cn(
              "absolute h-3 rounded-full top-1",
              span.status === "ok" ? "bg-primary/60" : "bg-red-500/60"
            )}
            style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
          />
        </div>
        <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground w-[200px] justify-end">
          <span className="font-mono">{formatDuration(span.duration * 1000000)}</span>
          <Badge variant="secondary" size="sm">{span.service}</Badge>
        </div>
      </div>
      {expanded && hasChildren && (
        <div>
          {span.children!.map((child) => (
            <SpanRow key={child.id} span={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function TraceViewer() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Distributed Traces
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground">
            <div className="flex-1">Span Name</div>
            <div className="flex-1">Timeline</div>
            <div className="w-[200px] text-right">Duration / Service</div>
          </div>
          <div className="divide-y divide-border">
            {sampleTrace.map((span) => (
              <SpanRow key={span.id} span={span} />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
