"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
} from "recharts";
import { cn, formatNumber } from "@/lib/utils";
import { Activity, Cpu, MemoryStick, Timer } from "lucide-react";

const latencyData = [
  { time: "00:00", p50: 120, p95: 340, p99: 580 },
  { time: "02:00", p50: 110, p95: 310, p99: 520 },
  { time: "04:00", p50: 95, p95: 280, p99: 480 },
  { time: "06:00", p50: 140, p95: 390, p99: 640 },
  { time: "08:00", p50: 180, p95: 480, p99: 820 },
  { time: "10:00", p50: 220, p95: 560, p99: 980 },
  { time: "12:00", p50: 260, p95: 640, p99: 1100 },
  { time: "14:00", p50: 240, p95: 600, p99: 1050 },
  { time: "16:00", p50: 200, p95: 520, p99: 900 },
  { time: "18:00", p50: 170, p95: 450, p99: 780 },
  { time: "20:00", p50: 150, p95: 400, p99: 680 },
  { time: "22:00", p50: 130, p95: 360, p99: 620 },
];

const requestData = [
  { status: "200", count: 45230, color: "#10b981" },
  { status: "201", count: 8234, color: "#34d399" },
  { status: "400", count: 342, color: "#f59e0b" },
  { status: "404", count: 128, color: "#f97316" },
  { status: "500", count: 24, color: "#ef4444" },
];

const throughputData = [
  { time: "00:00", rps: 45 },
  { time: "04:00", rps: 32 },
  { time: "08:00", rps: 120 },
  { time: "12:00", rps: 180 },
  { time: "16:00", rps: 150 },
  { time: "20:00", rps: 90 },
];

export function MetricsPanel() {
  return (
    <div className="space-y-4">
      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Avg Latency", value: "142ms", icon: Timer, color: "text-primary" },
          { label: "Throughput", value: "1.2k RPS", icon: Activity, color: "text-blue-400" },
          { label: "CPU Usage", value: "34%", icon: Cpu, color: "text-amber-400" },
          { label: "Memory", value: "2.4 GB", icon: MemoryStick, color: "text-purple-400" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <stat.icon className={cn("h-4 w-4", stat.color)} />
                <span className="text-xs">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Response Latency</CardTitle>
            <CardDescription>p50, p95, p99 percentiles</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={latencyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 10%, 18%)" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#6b7280" }} />
                <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} unit="ms" />
                <Tooltip
                  contentStyle={{ background: "hsl(220, 13%, 11%)", border: "1px solid hsl(220, 10%, 18%)", borderRadius: "8px", fontSize: 12 }}
                />
                <Line type="monotone" dataKey="p50" stroke="#10b981" strokeWidth={2} dot={false} name="p50" />
                <Line type="monotone" dataKey="p95" stroke="#f59e0b" strokeWidth={2} dot={false} name="p95" />
                <Line type="monotone" dataKey="p99" stroke="#ef4444" strokeWidth={2} dot={false} name="p99" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Response Status Distribution</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-6">
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie
                  data={requestData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="count"
                >
                  {requestData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "hsl(220, 13%, 11%)", border: "1px solid hsl(220, 10%, 18%)", borderRadius: "8px", fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {requestData.map((item) => (
                <div key={item.status} className="flex items-center gap-2 text-sm">
                  <div className="h-3 w-3 rounded-full" style={{ background: item.color }} />
                  <span className="text-muted-foreground">{item.status}</span>
                  <span className="font-medium ml-auto">{formatNumber(item.count)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Requests Per Second</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={throughputData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="rpsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 10%, 18%)" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#6b7280" }} />
                <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} />
                <Tooltip
                  contentStyle={{ background: "hsl(220, 13%, 11%)", border: "1px solid hsl(220, 10%, 18%)", borderRadius: "8px", fontSize: 12 }}
                />
                <Area type="monotone" dataKey="rps" stroke="#3b82f6" strokeWidth={2} fill="url(#rpsGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
