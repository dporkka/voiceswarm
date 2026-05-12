"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useUIStore } from "@/store/useUIStore";

interface MainLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function MainLayout({ children, className }: MainLayoutProps) {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      <div
        className={cn(
          "flex min-h-screen flex-col transition-all duration-300 ease-in-out",
          sidebarCollapsed ? "ml-[64px]" : "ml-[240px]"
        )}
      >
        <Header />
        <main className={cn("flex-1 p-4 sm:p-6 lg:p-8", className)}>
          {children}
        </main>
      </div>
    </div>
  );
}
