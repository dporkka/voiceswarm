"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { DollarSign } from "lucide-react";

const hourlyData = [
  { hour: "00:00", cost: 0.32, tokens: 12.4 },
  { hour: "02:00", cost: 0.28, tokens: 10.8 },
  { hour: "04:00", cost: 0.18, tokens: 6.2 },
  { hour: "06:00", cost: 0.45, tokens: 18.6 },
  { hour: "08:00", cost: 0.82, tokens: 34.2 },
  { hour: "10:00", cost: 1.24, tokens: 52.1 },
  { hour: "12:00", cost: 1.56, tokens: 64.8 },
  { hour: "14:00", cost: 1.89, tokens: 78.4 },
  { hour: "16:00", cost: 1.67, tokens: 69.3 },
  { hour: "18:00", cost: 1.45, tokens: 58.7 },
  { hour: "20:00", cost: 0.98, tokens: 42.1 },
  { hour: "22:00", cost: 0.56, tokens: 24.6 },
];

const agentCosts = [
  { name: "Orchestrator", cost: 4.23 },
  { name: "Code Review", cost: 3.12 },
  { name: "Test Runner", cost: 2.45 },
  { name: "Refactor", cost: 1.67 },
  { name: "Docs", cost: 0.89 },
  { name: "Deploy", cost: 0.11 },
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-xl">
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-semibold">
          {p.dataKey === "cost" ? formatCurrency(p.value) : `${p.value}k tokens`}
        </p>
      ))}
    </div>
  );
}

export function CostChart() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            Cost Overview
          </CardTitle>
          <CardDescription>Hourly inference cost and token consumption</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={hourlyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <defs>
                <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="tokenGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 10%, 18%)" />
              <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "#6b7280" }} />
              <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="cost"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#costGrad)"
                name="Cost ($)"
              />
              <Area
                type="monotone"
                dataKey="tokens"
                stroke="#3b82f6"
                strokeWidth={1.5}
                fill="url(#tokenGrad)"
                name="Tokens (k)"
                yAxisId={1}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cost by Agent</CardTitle>
          <CardDescription>Total cost breakdown today</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={agentCosts} layout="vertical" margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 10%, 18%)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: "#6b7280" }} tickFormatter={(v) => `$${v}`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#6b7280" }} width={70} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-lg border border-border bg-card p-2 shadow-lg">
                      <p className="text-xs font-semibold">{formatCurrency(payload[0].value as number)}</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="cost" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
