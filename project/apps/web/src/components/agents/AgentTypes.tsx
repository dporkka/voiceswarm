"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Bot, Code2, TestTube, FileText, GitPullRequest, Rocket, Search, Shield,
} from "lucide-react";

interface AgentType {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  defaultModel: string;
  capabilities: string[];
  useCases: string[];
}

const agentTypes: AgentType[] = [
  {
    id: "orchestrator",
    name: "Orchestrator",
    description: "Coordinates multi-agent workflows and delegates tasks",
    icon: Bot,
    defaultModel: "claude-sonnet-4-20250514",
    capabilities: ["Task delegation", "Workflow management", "Agent coordination"],
    useCases: ["Complex projects", "Multi-step workflows"],
  },
  {
    id: "code-review",
    name: "Code Reviewer",
    description: "Analyzes code for quality, security, and best practices",
    icon: GitPullRequest,
    defaultModel: "claude-sonnet-4-20250514",
    capabilities: ["Code analysis", "Security review", "Style checking"],
    useCases: ["PR reviews", "Code audits"],
  },
  {
    id: "test-writer",
    name: "Test Writer",
    description: "Generates unit, integration, and e2e tests",
    icon: TestTube,
    defaultModel: "claude-sonnet-4-20250514",
    capabilities: ["Test generation", "Coverage analysis", "Mock creation"],
    useCases: ["Test coverage", "TDD support"],
  },
  {
    id: "refactor",
    name: "Refactoring Agent",
    description: "Improves code quality through automated refactoring",
    icon: Code2,
    defaultModel: "claude-sonnet-4-20250514",
    capabilities: ["Code cleanup", "Pattern detection", "Optimization"],
    useCases: ["Technical debt", "Performance"],
  },
  {
    id: "docs",
    name: "Documentation Agent",
    description: "Generates and maintains documentation",
    icon: FileText,
    defaultModel: "claude-haiku-3-20250708",
    capabilities: ["Doc generation", "API docs", "README updates"],
    useCases: ["Documentation", "API references"],
  },
  {
    id: "deploy",
    name: "Deployment Agent",
    description: "Manages deployment pipelines and infrastructure",
    icon: Rocket,
    defaultModel: "claude-haiku-3-20250708",
    capabilities: ["CI/CD", "Infrastructure", "Rollback"],
    useCases: ["Deployments", "Infrastructure"],
  },
];

interface AgentTypesProps {
  selected?: string;
  onSelect?: (type: AgentType) => void;
}

export function AgentTypes({ selected, onSelect }: AgentTypesProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {agentTypes.map((type) => {
        const isSelected = selected === type.id;
        const Icon = type.icon;
        return (
          <Card
            key={type.id}
            hover
            className={cn(
              "cursor-pointer transition-all duration-200",
              isSelected && "border-primary ring-1 ring-primary/30"
            )}
            onClick={() => onSelect?.(type)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", isSelected ? "bg-primary/10" : "bg-muted")}>
                  <Icon className={cn("h-5 w-5", isSelected ? "text-primary" : "text-muted-foreground")} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">{type.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{type.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {type.capabilities.slice(0, 2).map((c) => (
                      <Badge key={c} variant="secondary" size="sm">{c}</Badge>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">Default: {type.defaultModel}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
