"use client";

import { useState, useCallback, useRef } from "react";
import { WorkflowNode } from "./WorkflowNode";
import { WorkflowEdge } from "./WorkflowEdge";
import { cn, generateId } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Plus, ZoomIn, ZoomOut, Maximize, Move } from "lucide-react";

export interface WFNode {
  id: string;
  type: "start" | "agent" | "task" | "decision" | "parallel" | "end";
  label: string;
  description: string;
  status: "idle" | "running" | "completed" | "failed";
  x: number;
  y: number;
  agentId?: string;
  config?: Record<string, string>;
}

export interface WFEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  condition?: string;
}

const initialNodes: WFNode[] = [
  { id: "n1", type: "start", label: "Start", description: "Trigger on PR creation", status: "completed", x: 400, y: 50 },
  { id: "n2", type: "decision", label: "PR Size Check", description: "Analyze PR complexity", status: "completed", x: 400, y: 160 },
  { id: "n3", type: "agent", label: "Code Review", description: "Review code changes", status: "running", x: 250, y: 300, agentId: "code-reviewer" },
  { id: "n4", type: "agent", label: "Security Scan", description: "Check for vulnerabilities", status: "running", x: 550, y: 300, agentId: "security-agent" },
  { id: "n5", type: "parallel", label: "Parallel Tests", description: "Run test suite", status: "idle", x: 400, y: 440 },
  { id: "n6", type: "agent", label: "Unit Tests", description: "Run unit test suite", status: "idle", x: 250, y: 560, agentId: "test-writer" },
  { id: "n7", type: "agent", label: "Integration Tests", description: "Run integration tests", status: "idle", x: 550, y: 560 },
  { id: "n8", type: "decision", label: "All Passed?", description: "Check test results", status: "idle", x: 400, y: 700 },
  { id: "n9", type: "agent", label: "Deploy", description: "Deploy to staging", status: "idle", x: 300, y: 840, agentId: "deploy-agent" },
  { id: "n10", type: "end", label: "Done", description: "Workflow complete", status: "idle", x: 300, y: 960 },
];

const initialEdges: WFEdge[] = [
  { id: "e1", source: "n1", target: "n2" },
  { id: "e2", source: "n2", target: "n3", label: "Large PR" },
  { id: "e3", source: "n2", target: "n4", label: "Any PR" },
  { id: "e4", source: "n3", target: "n5" },
  { id: "e5", source: "n4", target: "n5" },
  { id: "e6", source: "n5", target: "n6" },
  { id: "e7", source: "n5", target: "n7" },
  { id: "e8", source: "n6", target: "n8" },
  { id: "e9", source: "n7", target: "n8" },
  { id: "e10", source: "n8", target: "n9", label: "Yes" },
  { id: "e11", source: "n8", target: "n2", label: "No", condition: "retry" },
  { id: "e12", source: "n9", target: "n10" },
];

function clampVal(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function WorkflowCanvas() {
  const [nodes, setNodes] = useState<WFNode[]>(initialNodes);
  const [edges] = useState<WFEdge[]>(initialEdges);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    setDragging(nodeId);
    setDragOffset({
      x: e.clientX - node.x * zoom - pan.x,
      y: e.clientY - node.y * zoom - pan.y,
    });
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = (e.clientX - dragOffset.x - pan.x) / zoom;
      const y = (e.clientY - dragOffset.y - pan.y) / zoom;
      setNodes((prev) =>
        prev.map((n) => (n.id === dragging ? { ...n, x: Math.max(0, x), y: Math.max(0, y) } : n))
      );
    },
    [dragging, dragOffset, pan, zoom]
  );

  const handleMouseUp = () => {
    setDragging(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom((z) => clampVal(z + delta, 0.3, 2));
    }
  };

  return (
    <div
      ref={canvasRef}
      className="relative w-full h-[600px] rounded-xl border border-border bg-[#0b0f19] overflow-hidden cursor-grab active:cursor-grabbing"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* Grid */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `radial-gradient(circle, #30363d 1px, transparent 1px)`,
          backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
          transform: `translate(${pan.x}px, ${pan.y}px)`,
        }}
      />

      {/* Transform container */}
      <div
        className="absolute inset-0 origin-top-left"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        }}
      >
        {/* Edges */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: "visible" }}>
          {edges.map((edge) => {
            const source = nodes.find((n) => n.id === edge.source);
            const target = nodes.find((n) => n.id === edge.target);
            if (!source || !target) return null;
            return (
              <WorkflowEdge
                key={edge.id}
                source={source}
                target={target}
                label={edge.label}
                condition={edge.condition}
              />
            );
          })}
        </svg>

        {/* Nodes */}
        {nodes.map((node) => (
          <WorkflowNode
            key={node.id}
            node={node}
            onMouseDown={(e) => handleMouseDown(e, node.id)}
            isDragging={dragging === node.id}
          />
        ))}
      </div>

      {/* Toolbar */}
      <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-card/90 backdrop-blur border border-border rounded-lg p-1 shadow-lg">
        <Button variant="ghost" size="icon-sm" onClick={() => setZoom((z) => clampVal(z + 0.1, 0.3, 2))}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <span className="text-xs text-muted-foreground w-12 text-center">{Math.round(zoom * 100)}%</span>
        <Button variant="ghost" size="icon-sm" onClick={() => setZoom((z) => clampVal(z - 0.1, 0.3, 2))}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <div className="w-px h-4 bg-border mx-1" />
        <Button variant="ghost" size="icon-sm" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>
          <Maximize className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
