"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MetricsPanel } from "@/components/observability/MetricsPanel";
import { LogViewer } from "@/components/observability/LogViewer";
import { TraceViewer } from "@/components/observability/TraceViewer";
import { CostDashboard } from "@/components/observability/CostDashboard";
import { cn, formatRelativeTime } from "@/lib/utils";
import {
  BarChart3, Activity, Terminal, GitBranch, DollarSign,
  Server, Globe, Database, AlertCircle,
} from "lucide-react";

const systemHealth = [
  { name: "API Gateway", status: "healthy", latency: "12ms", uptime: "99.99%" },
  { name: "Orchestrator", status: "healthy", latency: "45ms", uptime: "99.97%" },
  { name: "Inference Engine", status: "warning", latency: "234ms", uptime: "99.92%" },
  { name: "Memory Store", status: "healthy", latency: "8ms", uptime: "99.99%" },
  { name: "Task Queue", status: "healthy", latency: "3ms", uptime: "100%" },
  { name: "WebSocket", status: "healthy", latency: "1ms", uptime: "99.98%" },
];

export default function ObservabilityPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Observability
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor platform health, performance, and costs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="success" className="gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            All Systems Healthy
          </Badge>
        </div>
      </div>

      {/* System health */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {systemHealth.map((svc) => (
          <Card key={svc.name} className={cn(
            "transition-colors",
            svc.status === "warning" && "border-amber-500/30"
          )}>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className={cn("h-2 w-2 rounded-full",
                  svc.status === "healthy" ? "bg-emerald-500" : svc.status === "warning" ? "bg-amber-500" : "bg-red-500"
                )} />
                <span className="text-xs font-medium truncate">{svc.name}</span>
              </div>
              <p className="text-sm font-bold">{svc.latency}</p>
              <p className="text-[10px] text-muted-foreground">{svc.uptime} uptime</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main tabs */}
      <Tabs defaultValue="metrics" className="w-full">
        <TabsList>
          <TabsTrigger value="metrics">
            <Activity className="h-3.5 w-3.5 mr-1" />
            Metrics
          </TabsTrigger>
          <TabsTrigger value="logs">
            <Terminal className="h-3.5 w-3.5 mr-1" />
            Logs
          </TabsTrigger>
          <TabsTrigger value="traces">
            <GitBranch className="h-3.5 w-3.5 mr-1" />
            Traces
          </TabsTrigger>
          <TabsTrigger value="cost">
            <DollarSign className="h-3.5 w-3.5 mr-1" />
            Cost
          </TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="mt-4">
          <MetricsPanel />
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <LogViewer />
        </TabsContent>

        <TabsContent value="traces" className="mt-4">
          <TraceViewer />
        </TabsContent>

        <TabsContent value="cost" className="mt-4">
          <CostDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
