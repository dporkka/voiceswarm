"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkflowCanvas } from "@/components/workflow/WorkflowCanvas";
import { WorkflowToolbar } from "@/components/workflow/WorkflowToolbar";
import { cn } from "@/lib/utils";
import {
  GitBranch, Plus, Play, Clock, CheckCircle2, AlertCircle,
} from "lucide-react";

const workflows = [
  { id: "wf-1", name: "PR Review Pipeline", description: "Automated code review and testing", status: "running" as const, nodes: 10, lastRun: "2 min ago" },
  { id: "wf-2", name: "Daily Code Quality", description: "Nightly code analysis and report", status: "idle" as const, nodes: 6, lastRun: "8 hours ago" },
  { id: "wf-3", name: "Security Scan", description: "Dependency and code vulnerability scan", status: "completed" as const, nodes: 4, lastRun: "1 hour ago" },
  { id: "wf-4", name: "Release Pipeline", description: "Automated release and deployment", status: "failed" as const, nodes: 12, lastRun: "30 min ago" },
];

const statusConfig = {
  running: { color: "text-amber-400", bg: "bg-amber-500/10", icon: Clock },
  idle: { color: "text-blue-400", bg: "bg-blue-500/10", icon: GitBranch },
  completed: { color: "text-emerald-400", bg: "bg-emerald-500/10", icon: CheckCircle2 },
  failed: { color: "text-red-400", bg: "bg-red-500/10", icon: AlertCircle },
};

export default function WorkflowsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <GitBranch className="h-6 w-6 text-primary" />
            Workflows
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Design and manage agent workflows
          </p>
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          New Workflow
        </Button>
      </div>

      <Tabs defaultValue="canvas" className="w-full">
        <TabsList>
          <TabsTrigger value="canvas">Canvas</TabsTrigger>
          <TabsTrigger value="list">All Workflows</TabsTrigger>
        </TabsList>

        <TabsContent value="canvas" className="mt-4 space-y-4">
          <WorkflowToolbar />
          <WorkflowCanvas />
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workflows.map((wf) => {
              const config = statusConfig[wf.status];
              const Icon = config.icon;
              return (
                <Card key={wf.id} hover>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", config.bg)}>
                          <Icon className={cn("h-5 w-5", config.color)} />
                        </div>
                        <div>
                          <h3 className="font-semibold">{wf.name}</h3>
                          <p className="text-xs text-muted-foreground">{wf.description}</p>
                        </div>
                      </div>
                      <Badge variant={wf.status === "running" ? "warning" : wf.status === "completed" ? "success" : wf.status === "failed" ? "error" : "secondary"}>
                        {wf.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                      <span>{wf.nodes} nodes</span>
                      <span>Last run: {wf.lastRun}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
