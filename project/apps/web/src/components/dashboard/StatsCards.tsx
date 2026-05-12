"use client";

import { useAgentStore } from "@/store/useAgentStore";
import { useTaskStore } from "@/store/useTaskStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bot,
  CheckCircle2,
  DollarSign,
  GitBranch,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatNumber } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ElementType;
  trend?: { value: number; label: string };
  status?: "up" | "down" | "neutral";
  loading?: boolean;
}

function StatCard({ title, value, description, icon: Icon, trend, status, loading }: StatCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16 mb-2" />
          <Skeleton className="h-3 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card hover>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardDescription className="text-xs font-medium uppercase tracking-wider">{title}</CardDescription>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        <div className="flex items-center gap-2 mt-1.5">
          {trend && (
            <Badge variant={status === "up" ? "success" : status === "down" ? "error" : "secondary"} size="sm">
              {status === "up" ? "+" : status === "down" ? "-" : ""}
              {trend.value}%
            </Badge>
          )}
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function StatsCards() {
  const { agents, isLoading: agentsLoading } = useAgentStore();
  const { tasks, isLoading: tasksLoading } = useTaskStore();

  const activeAgents = agents.filter((a) => a.status === "online").length;
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const workflowsRunning = 4;
  const costToday = 12.47;
  const costYesterday = 8.32;
  const costChange = ((costToday - costYesterday) / costYesterday * 100);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Active Agents"
        value={activeAgents}
        description="of 6 total agents"
        icon={Bot}
        trend={{ value: 20, label: "vs yesterday" }}
        status="up"
        loading={agentsLoading}
      />
      <StatCard
        title="Tasks Completed"
        value={completedTasks}
        description="in last 24 hours"
        icon={CheckCircle2}
        trend={{ value: 12, label: "vs yesterday" }}
        status="up"
        loading={tasksLoading}
      />
      <StatCard
        title="Cost Today"
        value={formatCurrency(costToday)}
        description={formatCurrency(costYesterday) + " yesterday"}
        icon={DollarSign}
        trend={{ value: Number(costChange.toFixed(1)), label: "vs yesterday" }}
        status={costChange > 0 ? "up" : "down"}
        loading={tasksLoading}
      />
      <StatCard
        title="Workflows Running"
        value={workflowsRunning}
        description="2 queued, 1 failed"
        icon={GitBranch}
        trend={{ value: 33, label: "vs yesterday" }}
        status="up"
        loading={false}
      />
    </div>
  );
}
