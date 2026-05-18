"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { StreamingMessage } from "./StreamingMessage";
import { cn, generateId } from "@/lib/utils";
import { Bot, User, Trash2, Settings } from "lucide-react";

export interface ChatMessageData {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

const initialMessages: ChatMessageData[] = [
  {
    id: "msg-1",
    role: "assistant",
    content: `Hello! I am the AASOP Orchestrator. How can I help you today? You can ask me to:

- Create and assign tasks
- Check agent status
- Review code changes
- Run tests
- Deploy applications`,
    timestamp: new Date(Date.now() - 600000),
  },
];

export function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessageData[]>(initialMessages);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const simulateStream = async (response: string) => {
    setIsStreaming(true);
    setStreamingContent("");
    const words = response.split(" ");
    for (let i = 0; i < words.length; i++) {
      await new Promise((r) => setTimeout(r, 30 + Math.random() * 50));
      setStreamingContent((prev) => prev + (i > 0 ? " " : "") + words[i]);
    }
    setIsStreaming(false);
    return response;
  };

  const handleSend = async (content: string) => {
    const userMsg: ChatMessageData = {
      id: generateId("msg"),
      role: "user",
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);

    const lower = content.toLowerCase();
    let response = "";
    if (lower.includes("agent") || lower.includes("status")) {
      response = "I have 4 agents currently online:\n\n1. **Orchestrator** - Active, managing 3 workflows\n2. **Code Reviewer** - Busy reviewing PR #234\n3. **Refactoring Agent** - Processing task task-5\n4. **Test Writer** - Idle, awaiting assignment\n\nAll systems are operational.";
    } else if (lower.includes("task") || lower.includes("work")) {
      response = "Here is the current task breakdown:\n\n- **Pending**: 2 tasks (including security audit)\n- **In Progress**: 2 tasks (auth refactor, DB optimization)\n- **Reviewing**: 2 tasks (PR #234 review)\n- **Completed**: 2 tasks today\n\nWould you like me to create a new task or reprioritize existing ones?";
    } else if (lower.includes("deploy") || lower.includes("release")) {
      response = "Latest deployment status:\n\n- **Production**: v2.1.0 - Stable\n- **Staging**: v2.2.0-rc1 - Ready for QA\n- **Development**: v2.2.0-dev - 4 commits ahead\n\nLast deployment completed 30 minutes ago without issues.";
    } else {
      response = "I understand. I will process your request and coordinate with the appropriate agents. Is there anything specific you would like me to prioritize?";
    }

    const streamed = await simulateStream(response);
    const assistantMsg: ChatMessageData = {
      id: generateId("msg"),
      role: "assistant",
      content: streamed,
      timestamp: new Date(),
    };
    setStreamingContent("");
    setMessages((prev) => [...prev, assistantMsg]);
  };

  const clearChat = () => {
    setMessages([]);
    setStreamingContent("");
    setIsStreaming(false);
  };

  return (
    <Card className="flex flex-col h-[calc(100vh-140px)]">
      <CardHeader className="flex flex-row items-center justify-between py-3 border-b border-border shrink-0">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          Orchestrator Chat
          <Badge variant="success" size="sm">Online</Badge>
        </CardTitle>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={clearChat} title="Clear chat">
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" title="Settings">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {isStreaming && (
          <StreamingMessage content={streamingContent} />
        )}
        {isStreaming && !streamingContent && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            Thinking...
          </div>
        )}
        <div ref={bottomRef} />
      </CardContent>

      <div className="p-4 border-t border-border shrink-0">
        <ChatInput onSend={handleSend} disabled={isStreaming} />
      </div>
    </Card>
  );
}
