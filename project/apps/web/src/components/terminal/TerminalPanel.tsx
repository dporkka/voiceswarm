"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface TerminalPanelProps {
  sessionId: string;
  title: string;
  className?: string;
  onData?: (data: string) => void;
}

interface TerminalLine {
  id: string;
  content: string;
  type: "input" | "output" | "error" | "system";
  timestamp: Date;
}

const welcomeMessage = `AASOP Terminal v0.1.0
Type 'help' for available commands.
`;

export function TerminalPanel({ sessionId, title, className, onData }: TerminalPanelProps) {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const welcome: TerminalLine[] = welcomeMessage.split("\n").map((line, i) => ({
      id: `welcome-${i}`,
      content: line,
      type: "system" as const,
      timestamp: new Date(),
    }));
    setLines(welcome);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  const addLine = (content: string, type: TerminalLine["type"]) => {
    setLines((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, content, type, timestamp: new Date() }]);
  };

  const handleCommand = (cmd: string) => {
    addLine(`$ ${cmd}`, "input");

    const trimmed = cmd.trim().toLowerCase();
    switch (trimmed) {
      case "help":
        addLine(`Available commands:`, "output");
        addLine(`  agents          - List active agents`, "output");
        addLine(`  status          - Platform status`, "output");
        addLine(`  tasks           - Show running tasks`, "output");
        addLine(`  cost            - Show cost summary`, "output");
        addLine(`  clear           - Clear terminal`, "output");
        break;
      case "clear":
        setLines([]);
        break;
      case "agents":
        addLine(`NAME              STATUS   MODEL                    TASKS`, "output");
        addLine(`orchestrator      online   claude-sonnet-4          142`, "output");
        addLine(`code-reviewer     busy     claude-sonnet-4           89`, "output");
        addLine(`test-runner       idle     claude-haiku-3            56`, "output");
        addLine(`refactoring       online   claude-sonnet-4           34`, "output");
        break;
      case "status":
        addLine(`Platform:     Healthy`, "output");
        addLine(`API:          Connected`, "output");
        addLine(`WebSocket:    Connected`, "output");
        addLine(`Agents:       4 online, 2 idle`, "output");
        addLine(`Tasks:        12 running, 34 queued`, "output");
        break;
      case "tasks":
        addLine(`ID           AGENT           STATUS    DURATION`, "output");
        addLine(`task-892     orchestrator    running   12m 34s`, "output");
        addLine(`task-891     code-reviewer   running    8m 12s`, "output");
        addLine(`task-890     refactoring     running   15m 47s`, "output");
        break;
      case "cost":
        addLine(`Today:        $12.47`, "output");
        addLine(`This week:    $78.32`, "output");
        addLine(`This month:   $312.89`, "output");
        addLine(`Total tokens: 1.2M`, "output");
        break;
      default:
        if (trimmed) {
          addLine(`Command not found: ${cmd}. Type 'help' for available commands.`, "error");
        }
    }
    onData?.(cmd);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && input.trim()) {
      handleCommand(input);
      setHistory((prev) => [...prev, input]);
      setHistoryIndex(-1);
      setInput("");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length > 0) {
        const newIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setInput(history[newIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex >= 0) {
        const newIndex = historyIndex + 1;
        if (newIndex >= history.length) {
          setHistoryIndex(-1);
          setInput("");
        } else {
          setHistoryIndex(newIndex);
          setInput(history[newIndex]);
        }
      }
    }
  };

  const handleClick = () => {
    inputRef.current?.focus();
  };

  return (
    <div className={cn("flex flex-col h-full min-h-[400px] rounded-xl border border-border bg-[#0d1117] overflow-hidden", className)}>
      {/* Terminal header */}
      <div className="flex items-center gap-2 px-4 py-2 bg-[#161b22] border-b border-[#30363d]">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-[#ff5f56]" />
          <div className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
          <div className="h-3 w-3 rounded-full bg-[#27ca40]" />
        </div>
        <span className="text-xs text-muted-foreground ml-2">{title}</span>
      </div>

      {/* Terminal body */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-3 font-mono text-sm"
        onClick={handleClick}
      >
        {lines.map((line) => (
          <div
            key={line.id}
            className={cn(
              "py-0.5",
              line.type === "input" && "text-primary",
              line.type === "error" && "text-red-400",
              line.type === "system" && "text-muted-foreground",
              line.type === "output" && "text-foreground/90"
            )}
          >
            {line.content}
          </div>
        ))}
        <div className="flex items-center gap-2 py-0.5">
          <span className="text-primary font-bold">$</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent outline-none text-foreground/90 font-mono text-sm"
            autoFocus
            spellCheck={false}
          />
        </div>
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
