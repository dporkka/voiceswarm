import type { Metadata } from "next";
import "./globals.css";
import { ApiProvider } from "@/lib/api/client";
import { MainLayout } from "@/components/layout/MainLayout";

export const metadata: Metadata = {
  title: "AASOP - Autonomous Agentic Software Organization Platform",
  description: "AI-powered software development with autonomous agents, workflow orchestration, and intelligent task management",
  keywords: ["AI", "agents", "workflow", "automation", "software development"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground font-sans">
        <ApiProvider>
          <MainLayout>{children}</MainLayout>
        </ApiProvider>
      </body>
    </html>
  );
}
