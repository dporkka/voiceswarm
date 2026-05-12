"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Bot,
  KanbanSquare,
  GitBranch,
  FolderKanban,
  Brain,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Terminal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

interface SidebarItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: string;
}

const mainItems: SidebarItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Bot, label: "Agents", href: "/agents", badge: "3" },
  { icon: KanbanSquare, label: "Tasks", href: "/tasks" },
  { icon: GitBranch, label: "Workflows", href: "/workflows" },
  { icon: FolderKanban, label: "Projects", href: "/projects" },
];

const insightItems: SidebarItem[] = [
  { icon: Brain, label: "Memory", href: "/memory" },
  { icon: BarChart3, label: "Observability", href: "/observability" },
];

const bottomItems: SidebarItem[] = [
  { icon: Settings, label: "Settings", href: "/settings" },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  const NavItem = ({ item }: { item: SidebarItem }) => {
    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
    const Icon = item.icon;

    return (
      <TooltipProvider delayDuration={collapsed ? 100 : 1000}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 group relative",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary")} />
              {!collapsed && (
                <>
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary/15 px-1.5 text-[10px] font-semibold text-primary">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full bg-primary" />
              )}
            </Link>
          </TooltipTrigger>
          {collapsed && <TooltipContent side="right">{item.label}</TooltipContent>}
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-sidebar transition-all duration-300 ease-in-out",
        collapsed ? "w-[64px]" : "w-[240px]"
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center gap-3 border-b border-border px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="h-5 w-5" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-sm font-bold leading-tight tracking-tight">AASOP</span>
            <span className="text-[10px] text-muted-foreground leading-tight">Agentic Platform</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {!collapsed && (
          <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Platform
          </div>
        )}
        {mainItems.map((item) => (
          <NavItem key={item.href} item={item} />
        ))}

        {!collapsed && (
          <div className="mt-6 mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Insights
          </div>
        )}
        {collapsed && <div className="my-2 mx-auto h-px w-8 bg-border" />}
        {insightItems.map((item) => (
          <NavItem key={item.href} item={item} />
        ))}
      </div>

      {/* Bottom section */}
      <div className="border-t border-border p-3 space-y-1">
        {bottomItems.map((item) => (
          <NavItem key={item.href} item={item} />
        ))}

        {/* Toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center mt-2"
          onClick={onToggle}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span className="text-xs">Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
