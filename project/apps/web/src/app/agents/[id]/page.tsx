"use client";

import { useParams, notFound } from "next/navigation";
import { useAgentStore } from "@/store/useAgentStore";
import { AgentDetail } from "@/components/agents/AgentDetail";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { ArrowLeft, Bot } from "lucide-react";

export default function AgentDetailPage() {
  const params = useParams();
  const { agents, isLoading } = useAgentStore();
  const agent = agents.find((a) => a.id === params.id);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="text-center py-20">
        <Bot className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold mb-2">Agent not found</h2>
        <p className="text-muted-foreground mb-4">The agent you are looking for does not exist.</p>
        <Link href="/agents">
          <Button><ArrowLeft className="h-4 w-4 mr-1" />Back to Agents</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/agents">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
      </div>
      <AgentDetail agent={agent} />
    </div>
  );
}
