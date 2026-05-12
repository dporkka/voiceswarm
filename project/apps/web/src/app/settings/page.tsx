"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import {
  Settings, Building2, CreditCard, Bell, Shield, Users,
  Key, Globe, Save, ToggleLeft, ToggleRight,
} from "lucide-react";

interface SettingSection {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
}

const sections: SettingSection[] = [
  { id: "organization", title: "Organization", description: "Company details and branding", icon: Building2 },
  { id: "billing", title: "Billing", description: "Usage, plans, and payments", icon: CreditCard },
  { id: "notifications", title: "Notifications", description: "Alert preferences and channels", icon: Bell },
  { id: "security", title: "Security", description: "API keys and access controls", icon: Shield },
  { id: "models", title: "Models", description: "LLM configuration and limits", icon: Key },
];

export default function SettingsPage() {
  const [orgName, setOrgName] = useState("Acme Corp");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [slackNotifications, setSlackNotifications] = useState(false);
  const [budgetLimit, setBudgetLimit] = useState(500);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your organization and platform preferences
          </p>
        </div>
        <Button size="sm">
          <Save className="h-4 w-4 mr-1" />
          Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <Card className="lg:col-span-1 h-fit">
          <CardContent className="p-3 space-y-1">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  className={cn(
                    "flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm transition-colors",
                    section.id === "organization" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <div className="text-left">
                    <p className="font-medium">{section.title}</p>
                    <p className="text-xs text-muted-foreground">{section.description}</p>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Organization */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Organization
              </CardTitle>
              <CardDescription>Manage your organization details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Organization Name</label>
                  <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} className="mt-1.5" />
                </div>
                <div>
                  <label className="text-sm font-medium">Slug</label>
                  <Input value="acme-corp" className="mt-1.5" disabled />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Default Model</label>
                <Select defaultValue="claude-sonnet-4">
                  <SelectTrigger className="mt-1.5 w-full md:w-80">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="claude-sonnet-4">Claude Sonnet 4</SelectItem>
                    <SelectItem value="claude-haiku-3">Claude Haiku 3</SelectItem>
                    <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                    <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Billing */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Billing & Usage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Current Plan</p>
                  <Badge variant="default" className="mt-1">Pro</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">This Month</p>
                  <p className="text-lg font-bold">{formatCurrency(412.89)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Budget Limit</p>
                  <Input
                    type="number"
                    value={budgetLimit}
                    onChange={(e) => setBudgetLimit(Number(e.target.value))}
                    className="mt-1 w-32"
                  />
                </div>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: "82%" }} />
              </div>
              <p className="text-xs text-muted-foreground">82% of monthly budget used</p>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "Email notifications", description: "Receive updates via email", value: emailNotifications, onChange: setEmailNotifications },
                { label: "Slack integration", description: "Send alerts to Slack", value: slackNotifications, onChange: setSlackNotifications },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  <button
                    onClick={() => item.onChange(!item.value)}
                    className={cn(
                      "relative h-6 w-11 rounded-full transition-colors",
                      item.value ? "bg-primary" : "bg-muted"
                    )}
                  >
                    <span className={cn(
                      "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                      item.value ? "left-6" : "left-0.5"
                    )} />
                  </button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />
                API Keys
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { name: "Production Key", key: "sk-aasop-prod-****-w3x9", created: "2 months ago" },
                { name: "Development Key", key: "sk-aasop-dev-****-k7m2", created: "1 month ago" },
              ].map((k) => (
                <div key={k.name} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                  <div>
                    <p className="text-sm font-medium">{k.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{k.key}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="xs">Copy</Button>
                    <Button variant="ghost" size="xs" className="text-red-400">Revoke</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Models */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Key className="h-4 w-4" />
                Model Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Temperature</label>
                  <Input type="number" defaultValue={0.7} min={0} max={2} step={0.1} className="mt-1.5" />
                </div>
                <div>
                  <label className="text-sm font-medium">Max Tokens</label>
                  <Input type="number" defaultValue={4096} min={256} max={128000} step={256} className="mt-1.5" />
                </div>
                <div>
                  <label className="text-sm font-medium">Timeout (seconds)</label>
                  <Input type="number" defaultValue={60} min={10} max={300} step={10} className="mt-1.5" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">System Prompt</label>
                <textarea
                  defaultValue={"You are a helpful AI assistant working within AASOP. Follow best practices and provide clear, actionable responses."}
                  className="mt-1.5 w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm min-h-[80px] resize-y focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
