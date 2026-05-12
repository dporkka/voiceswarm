"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatRelativeTime, formatNumber } from "@/lib/utils";
import { statusColors } from "@/lib/theme";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Search, SlidersHorizontal, ArrowUpDown, Bot, MoreHorizontal,
} from "lucide-react";
import type { Agent } from "./AgentCard";
import Link from "next/link";

interface AgentListProps {
  agents: Agent[];
}

type SortKey = "name" | "status" | "model" | "lastActive" | "tasksCompleted";
type SortDir = "asc" | "desc";

export function AgentList({ agents }: AgentListProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("lastActive");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const filtered = agents
    .filter((a) => {
      const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.description.toLowerCase().includes(search.toLowerCase()) ||
        a.model.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || a.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1;
      if (sortKey === "name") return a.name.localeCompare(b.name) * mul;
      if (sortKey === "status") return a.status.localeCompare(b.status) * mul;
      if (sortKey === "model") return a.model.localeCompare(b.model) * mul;
      if (sortKey === "tasksCompleted") return (a.tasksCompleted - b.tasksCompleted) * mul;
      return (new Date(a.lastActive).getTime() - new Date(b.lastActive).getTime()) * mul;
    });

  const SortIcon = ({ col }: { col: SortKey }) => (
    <ArrowUpDown className={cn("h-3 w-3 ml-1", sortKey === col && "text-primary")} />
  );

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search agents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <div className="flex items-center gap-1.5">
            {(["all", "online", "busy", "idle", "error", "offline"] as const).map((s) => (
              <Button
                key={s}
                variant={statusFilter === s ? "default" : "ghost"}
                size="xs"
                onClick={() => setStatusFilter(s)}
                className="capitalize"
              >
                {s}
              </Button>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer" onClick={() => toggleSort("name")}>
                  Agent <SortIcon col="name" />
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort("status")}>
                  Status <SortIcon col="status" />
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort("model")}>
                  Model <SortIcon col="model" />
                </TableHead>
                <TableHead>Capabilities</TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort("tasksCompleted")}>
                  Tasks <SortIcon col="tasksCompleted" />
                </TableHead>
                <TableHead>Last Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((agent) => {
                const status = statusColors[agent.status];
                return (
                  <TableRow key={agent.id}>
                    <TableCell>
                      <Link href={`/agents/${agent.id}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", status.bg)}>
                          <Bot className={cn("h-4 w-4", status.text)} />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{agent.name}</p>
                          <p className="text-xs text-muted-foreground">{agent.type}</p>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={agent.status === "online" ? "success" : agent.status === "busy" ? "warning" : agent.status === "error" ? "error" : "secondary"} size="sm">
                        <span className={cn("h-1.5 w-1.5 rounded-full mr-1.5", status.dot)} />
                        {agent.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{agent.model}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {agent.capabilities.slice(0, 2).map((c) => (
                          <Badge key={c} variant="secondary" size="sm">{c}</Badge>
                        ))}
                        {agent.capabilities.length > 2 && (
                          <Badge variant="secondary" size="sm">+{agent.capabilities.length - 2}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{formatNumber(agent.tasksCompleted)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatRelativeTime(agent.lastActive)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">No agents found matching your criteria.</div>
        )}
      </CardContent>
    </Card>
  );
}
