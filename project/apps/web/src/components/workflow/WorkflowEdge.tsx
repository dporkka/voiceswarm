"use client";

import type { WFNode } from "./WorkflowCanvas";

interface WorkflowEdgeProps {
  source: WFNode;
  target: WFNode;
  label?: string;
  condition?: string;
}

export function WorkflowEdge({ source, target, label, condition }: WorkflowEdgeProps) {
  const sx = source.x;
  const sy = source.y + 30;
  const tx = target.x;
  const ty = target.y - 30;

  const dx = tx - sx;
  const dy = ty - sy;
  const length = Math.sqrt(dx * dx + dy * dy);
  const midX = (sx + tx) / 2;
  const midY = (sy + ty) / 2;

  // Bezier control points
  const c1x = sx;
  const c1y = sy + length * 0.3;
  const c2x = tx;
  const c2y = ty - length * 0.3;

  const path = `M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${tx} ${ty}`;

  // Arrowhead
  const angle = Math.atan2(ty - c2y, tx - c2x);
  const arrowLen = 8;
  const ax1 = tx - arrowLen * Math.cos(angle - 0.4);
  const ay1 = ty - arrowLen * Math.sin(angle - 0.4);
  const ax2 = tx - arrowLen * Math.cos(angle + 0.4);
  const ay2 = ty - arrowLen * Math.sin(angle + 0.4);

  return (
    <g>
      <path
        d={path}
        fill="none"
        stroke="#30363d"
        strokeWidth={2}
        strokeDasharray={condition ? "5,5" : "none"}
      />
      <polygon
        points={`${tx},${ty} ${ax1},${ay1} ${ax2},${ay2}`}
        fill="#30363d"
      />
      {label && (
        <g transform={`translate(${midX}, ${midY})`}>
          <rect
            x={-30}
            y={-10}
            width={60}
            height={18}
            rx={4}
            fill="#1f2937"
            stroke="#30363d"
            strokeWidth={1}
          />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fill="#9ca3af"
            fontSize="9"
            fontFamily="Inter, sans-serif"
          >
            {label}
          </text>
        </g>
      )}
    </g>
  );
}
