"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn, formatRelativeTime } from "@/lib/utils";
import { Bot, User } from "lucide-react";
import type { ChatMessageData } from "./ChatPanel";

interface ChatMessageProps {
  message: ChatMessageData;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div className={cn(
        "shrink-0 h-8 w-8 rounded-full flex items-center justify-center mt-0.5",
        isUser ? "bg-muted" : "bg-primary/10"
      )}>
        {isUser ? (
          <User className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Bot className="h-4 w-4 text-primary" />
        )}
      </div>
      <div className={cn(
        "max-w-[80%] rounded-2xl px-4 py-2.5",
        isUser
          ? "bg-primary text-primary-foreground rounded-br-sm"
          : "bg-muted/50 border border-border rounded-bl-sm"
      )}>
        <div className={cn("prose prose-sm max-w-none", isUser ? "prose-invert" : "dark:prose-invert")}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content}
          </ReactMarkdown>
        </div>
        <span className={cn("text-[10px] mt-1 block", isUser ? "text-primary-foreground/60" : "text-muted-foreground")}>
          {formatRelativeTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
}
