"use client";

import { StatsCards } from "@/components/dashboard/StatsCards";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { CostChart } from "@/components/dashboard/CostChart";
import { AgentStatusGrid } from "@/components/dashboard/AgentStatusGrid";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { MultiTerminal } from "@/components/terminal/MultiTerminal";
import {
  Bot, Terminal, BarChart3, Zap, Activity,
} from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of your agent fleet, tasks, and platform metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <BarChart3 className="h-4 w-4 mr-1" />
            Export Report
          </Button>
          <Button size="sm">
            <Zap className="h-4 w-4 mr-1" />
            Quick Action
          </Button>
        </div>
      </div>

      {/* Stats */}
      <StatsCards />

      {/* Charts + Activity */}
      <CostChart />

      {/* Agent Status */}
      <AgentStatusGrid />

      {/* Bottom section: Activity + Chat */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1">
          <ActivityFeed />
        </div>
        <div className="xl:col-span-2">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Terminal className="h-4 w-4 text-primary" />
                Terminal & Chat
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="chat" className="w-full">
                <TabsList className="mb-3">
                  <TabsTrigger value="chat">
                    <Bot className="h-3.5 w-3.5 mr-1" />
                    Chat
                  </TabsTrigger>
                  <TabsTrigger value="terminal">
                    <Terminal className="h-3.5 w-3.5 mr-1" />
                    Terminal
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="chat" className="mt-0">
                  <ChatPanel />
                </TabsContent>
                <TabsContent value="terminal" className="mt-0">
                  <MultiTerminal />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
