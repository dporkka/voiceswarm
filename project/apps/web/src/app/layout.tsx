import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ApiProvider } from "@/lib/api/client";
import { MainLayout } from "@/components/layout/MainLayout";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

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
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} dark`}>
      <body className="min-h-screen bg-background text-foreground font-sans">
        <ApiProvider>
          <MainLayout>{children}</MainLayout>
        </ApiProvider>
      </body>
    </html>
  );
}
