"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import { cn, formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";

const dailyCosts = [
  { day: "Mon", cost: 8.42, budget: 15 },
  { day: "Tue", cost: 12.18, budget: 15 },
  { day: "Wed", cost: 9.76, budget: 15 },
  { day: "Thu", cost: 15.32, budget: 15 },
  { day: "Fri", cost: 11.54, budget: 15 },
  { day: "Sat", cost: 6.23, budget: 15 },
  { day: "Sun", cost: 7.89, budget: 15 },
];

const modelCosts = [
  { name: "Claude Sonnet 4", cost: 124.50, color: "#10b981" },
  { name: "Claude Haiku 3", cost: 45.20, color: "#34d399" },
  { name: "GPT-4o", cost: 89.30, color: "#3b82f6" },
  { name: "GPT-4o Mini", cost: 12.80, color: "#60a5fa" },
  { name: "Embedding", cost: 3.40, color: "#8b5cf6" },
];

const cumulativeCost = [
  { day: "1", amount: 12 },
  { day: "5", amount: 68 },
  { day: "10", amount: 142 },
  { day: "15", amount: 215 },
  { day: "20", amount: 289 },
  { day: "25", amount: 342 },
  { day: "30", amount: 412 },
];

export function CostDashboard() {
  const totalWeek = dailyCosts.reduce((a, b) => a + b.cost, 0);
  const totalBudget = dailyCosts.reduce((a, b) => a + b.budget, 0);
  const percentUsed = (totalWeek / totalBudget) * 100;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs">This Week</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totalWeek)}</p>
            <div className="flex items-center gap-2 mt-1">
              {percentUsed > 80 ? (
                <TrendingUp className="h-3.5 w-3.5 text-amber-400" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-emerald-400" />
              )}
              <span className={cn("text-xs", percentUsed > 80 ? "text-amber-400" : "text-emerald-400")}>
                {percentUsed.toFixed(1)}% of budget
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs">This Month</span>
            </div>
            <p className="text-2xl font-bold">$412.89</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-emerald-400">82% of $500 budget</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span className="text-xs">Projected</span>
            </div>
            <p className="text-2xl font-bold">$485.00</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-amber-400">On track for budget limit</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily Costs vs Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={dailyCosts} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 10%, 18%)" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#6b7280" }} />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={{ background: "hsl(220, 13%, 11%)", border: "1px solid hsl(220, 10%, 18%)", borderRadius: "8px", fontSize: 12 }}
                  formatter={(value: number, name: string) => [formatCurrency(value), name === "cost" ? "Actual" : "Budget"]}
                />
                <Bar dataKey="cost" fill="#10b981" radius={[4, 4, 0, 0]} name="cost" />
                <Bar dataKey="budget" fill="transparent" stroke="#6b7280" strokeWidth={1} strokeDasharray="5,5" radius={[4, 4, 0, 0]} name="budget" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cost by Model</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie data={modelCosts} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4} dataKey="cost">
                  {modelCosts.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(220, 13%, 11%)", border: "1px solid hsl(220, 10%, 18%)", borderRadius: "8px", fontSize: 12 }} formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {modelCosts.map((m) => (
                <div key={m.name} className="flex items-center gap-2 text-sm">
                  <div className="h-3 w-3 rounded-full" style={{ background: m.color }} />
                  <span className="text-muted-foreground">{m.name}</span>
                  <span className="font-medium ml-auto">{formatCurrency(m.cost)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Cumulative Monthly Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={cumulativeCost} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 10%, 18%)" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#6b7280" }} label={{ value: "Day", position: "insideBottom", offset: -5, fontSize: 10, fill: "#6b7280" }} />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={{ background: "hsl(220, 13%, 11%)", border: "1px solid hsl(220, 10%, 18%)", borderRadius: "8px", fontSize: 12 }} formatter={(v: number) => formatCurrency(v)} />
                <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2} fill="url(#cumGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
