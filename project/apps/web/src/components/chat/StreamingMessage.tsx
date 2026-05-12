"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { Bot } from "lucide-react";

interface StreamingMessageProps {
  content: string;
}

export function StreamingMessage({ content }: StreamingMessageProps) {
  return (
    <div className="flex gap-3">
      <div className="shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
        <Bot className="h-4 w-4 text-primary" />
      </div>
      <div className="max-w-[80%] rounded-2xl px-4 py-2.5 bg-muted/50 border border-border rounded-bl-sm">
        {content ? (
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 py-1">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse delay-75" />
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse delay-150" />
          </div>
        )}
      </div>
    </div>
  );
}
