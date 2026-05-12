"use client";

import { useState } from "react";
import { TerminalPanel } from "./TerminalPanel";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, X, Terminal } from "lucide-react";

interface TerminalSession {
  id: string;
  title: string;
  type: "bash" | "agent" | "logs";
}

const initialSessions: TerminalSession[] = [
  { id: "term-1", title: "bash", type: "bash" },
  { id: "term-2", title: "orchestrator", type: "agent" },
];

export function MultiTerminal() {
  const [sessions, setSessions] = useState<TerminalSession[]>(initialSessions);
  const [activeId, setActiveId] = useState("term-1");

  const addSession = () => {
    const id = `term-${Date.now()}`;
    const title = `session-${sessions.length + 1}`;
    setSessions([...sessions, { id, title, type: "bash" }]);
    setActiveId(id);
  };

  const removeSession = (id: string) => {
    if (sessions.length <= 1) return;
    const filtered = sessions.filter((s) => s.id !== id);
    setSessions(filtered);
    if (activeId === id) {
      setActiveId(filtered[0].id);
    }
  };

  const activeSession = sessions.find((s) => s.id === activeId);

  return (
    <div className="flex flex-col h-full min-h-[500px] rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b border-border">
        <div className="flex items-center gap-1 flex-1 overflow-x-auto">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => setActiveId(session.id)}
              className={
                "flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors shrink-0 " +
                (activeId === session.id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground")
              }
            >
              <Terminal className="h-3 w-3" />
              {session.title}
              <X
                className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity"
                onClick={(e) => { e.stopPropagation(); removeSession(session.id); }}
              />
            </button>
          ))}
        </div>
        <Button variant="ghost" size="icon-sm" onClick={addSession}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 p-3 bg-[#0d1117]">
        {activeSession && (
          <TerminalPanel
            key={activeSession.id}
            sessionId={activeSession.id}
            title={activeSession.title}
            className="h-full border-0 rounded-none"
          />
        )}
      </div>
    </div>
  );
}
