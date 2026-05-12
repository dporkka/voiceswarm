"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search,
  Bell,
  Command,
  Plus,
  User,
  LogOut,
  CreditCard,
  HelpCircle,
} from "lucide-react";

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  const [searchOpen, setSearchOpen] = React.useState(false);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-background/80 backdrop-blur-md px-4 sm:px-6",
        className
      )}
    >
      {/* Left section */}
      <div className="flex items-center gap-3 flex-1">
        {/* Search */}
        <div className="relative max-w-md flex-1 hidden sm:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search agents, tasks, workflows..."
            className="pl-9 h-9 bg-muted/50 border-muted pr-20"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <kbd className="hidden md:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
              <Command className="h-3 w-3" />
              <span>K</span>
            </kbd>
          </div>
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        {/* New button */}
        <Button size="sm" className="hidden sm:flex gap-2 h-8">
          <Plus className="h-4 w-4" />
          New
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
            3
          </span>
        </Button>

        {/* User */}
        <div className="flex items-center gap-3 pl-3 border-l border-border">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-sm font-medium leading-tight">Admin</span>
            <span className="text-xs text-muted-foreground">admin@aasop.dev</span>
          </div>
          <Avatar className="h-8 w-8 cursor-pointer ring-2 ring-border hover:ring-primary/30 transition-all">
            <AvatarImage src="" alt="Admin" />
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
              AD
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
