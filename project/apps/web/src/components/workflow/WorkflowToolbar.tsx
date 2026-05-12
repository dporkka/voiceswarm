"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Play, Square, RotateCcw, Save, Download, Upload,
  Settings, ZoomIn, ZoomOut, Maximize, Undo, Redo,
} from "lucide-react";

interface WorkflowToolbarProps {
  onRun?: () => void;
  onStop?: () => void;
  onReset?: () => void;
  isRunning?: boolean;
}

export function WorkflowToolbar({ onRun, onStop, onReset, isRunning = false }: WorkflowToolbarProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-muted/30 border border-border rounded-xl">
      <div className="flex items-center gap-1">
        {!isRunning ? (
          <Button size="sm" onClick={onRun} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
            <Play className="h-3.5 w-3.5" />Run
          </Button>
        ) : (
          <Button size="sm" variant="destructive" onClick={onStop} className="gap-1.5">
            <Square className="h-3.5 w-3.5" />Stop
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onReset} className="gap-1.5">
          <RotateCcw className="h-3.5 w-3.5" />Reset
        </Button>
        <Separator orientation="vertical" className="h-6 mx-1" />
        <Button variant="ghost" size="icon-sm">
          <Save className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon-sm">
          <Download className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon-sm">
          <Upload className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="secondary" size="sm">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1" />
          3 nodes running
        </Badge>
        <Separator orientation="vertical" className="h-6 mx-1" />
        <Button variant="ghost" size="icon-sm">
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
