"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Play, Square, Trash2, Copy, Download, Settings, Search,
} from "lucide-react";

interface TerminalToolbarProps {
  onClear?: () => void;
  onCopy?: () => void;
  onDownload?: () => void;
}

export function TerminalToolbar({ onClear, onCopy, onDownload }: TerminalToolbarProps) {
  return (
    <div className="flex items-center gap-1 p-2 border-b border-border bg-muted/30 rounded-t-xl">
      <Button variant="ghost" size="icon-sm" title="Run" className="text-emerald-400 hover:text-emerald-400 hover:bg-emerald-500/10">
        <Play className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon-sm" title="Stop" className="text-red-400 hover:text-red-400 hover:bg-red-500/10">
        <Square className="h-4 w-4" />
      </Button>
      <Separator orientation="vertical" className="h-5 mx-1" />
      <Button variant="ghost" size="icon-sm" title="Clear" onClick={onClear}>
        <Trash2 className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon-sm" title="Copy" onClick={onCopy}>
        <Copy className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon-sm" title="Download" onClick={onDownload}>
        <Download className="h-4 w-4" />
      </Button>
      <div className="ml-auto flex items-center gap-1">
        <Button variant="ghost" size="icon-sm" title="Search">
          <Search className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" title="Settings">
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
