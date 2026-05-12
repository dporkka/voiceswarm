"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { FolderKanban, Plus, GitBranch, Clock, CheckCircle2 } from "lucide-react";

const projects = [
  {
    id: "p1",
    name: "AASOP Core",
    description: "Main platform infrastructure and API",
    status: "active",
    progress: 78,
    tasks: { total: 24, completed: 19 },
    agents: ["orchestrator", "code-reviewer"],
    lastUpdated: "2 hours ago",
  },
  {
    id: "p2",
    name: "Agent SDK",
    description: "Developer SDK for custom agents",
    status: "active",
    progress: 45,
    tasks: { total: 32, completed: 14 },
    agents: ["refactoring-agent", "test-writer"],
    lastUpdated: "5 hours ago",
  },
  {
    id: "p3",
    name: "Documentation Site",
    description: "Public docs and API reference",
    status: "planning",
    progress: 12,
    tasks: { total: 16, completed: 2 },
    agents: ["docs-agent"],
    lastUpdated: "1 day ago",
  },
  {
    id: "p4",
    name: "CI/CD Pipeline",
    description: "Automated testing and deployment",
    status: "completed",
    progress: 100,
    tasks: { total: 12, completed: 12 },
    agents: ["deploy-agent"],
    lastUpdated: "3 days ago",
  },
];

export default function ProjectsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FolderKanban className="h-6 w-6 text-primary" />
            Projects
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your development projects
          </p>
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          New Project
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projects.map((project) => (
          <Card key={project.id} hover>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{project.name}</h3>
                    <Badge
                      variant={project.status === "active" ? "success" : project.status === "completed" ? "secondary" : "warning"}
                      size="sm"
                    >
                      {project.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{project.description}</p>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{project.progress}%</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      project.progress === 100 ? "bg-emerald-500" : "bg-primary"
                    )}
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {project.tasks.completed}/{project.tasks.total} tasks
                  </span>
                  <span className="flex items-center gap-1">
                    <GitBranch className="h-3 w-3" />
                    {project.agents.length} agents
                  </span>
                </div>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {project.lastUpdated}
                </span>
              </div>

              <div className="flex items-center gap-1.5 mt-3">
                {project.agents.map((agent) => (
                  <span key={agent} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    {agent}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
