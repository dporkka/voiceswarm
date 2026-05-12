"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Bot, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";
import { AgentTypes } from "./AgentTypes";

interface CreateAgentModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateAgentModal({ open, onClose }: CreateAgentModalProps) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [selectedType, setSelectedType] = useState<string | undefined>();

  const handleClose = () => {
    onClose();
    setStep(0);
    setName("");
    setSelectedType(undefined);
  };

  const steps = [
    { title: "Select Type", description: "Choose the type of agent to create" },
    { title: "Configure", description: "Set up name and settings" },
    { title: "Review", description: "Review and create the agent" },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Create New Agent
          </DialogTitle>
          <DialogDescription>{steps[step].description}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-4">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={cn(
                "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                i === step ? "bg-primary text-primary-foreground" :
                i < step ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
              )}>
                {i < step ? "✓" : i + 1}
              </div>
              <span className={cn("text-xs", i === step ? "text-foreground font-medium" : "text-muted-foreground")}>
                {s.title}
              </span>
              {i < steps.length - 1 && <div className="w-8 h-px bg-border" />}
            </div>
          ))}
        </div>

        {step === 0 && (
          <AgentTypes selected={selectedType} onSelect={(t) => setSelectedType(t.id)} />
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Agent Name</label>
              <Input
                placeholder="e.g., code-reviewer-prod"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Input placeholder="What does this agent do?" className="mt-1.5" />
            </div>
            <div>
              <label className="text-sm font-medium">Model</label>
              <div className="flex gap-2 mt-1.5 flex-wrap">
                {["claude-sonnet-4-20250514", "claude-haiku-3-20250708", "gpt-4o", "gpt-4o-mini"].map((m) => (
                  <Badge key={m} variant="secondary" size="lg" className="cursor-pointer hover:bg-primary/10">{m}</Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <Card className="bg-muted/50">
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Name</span>
                  <span className="text-sm font-medium">{name || "Unnamed Agent"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Type</span>
                  <span className="text-sm font-medium capitalize">{selectedType || "Not selected"}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter>
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" />Back
            </Button>
          )}
          {step < steps.length - 1 ? (
            <Button onClick={() => setStep(step + 1)} disabled={step === 0 && !selectedType}>
              Next<ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleClose}>
              <Sparkles className="h-4 w-4 mr-1" />Create Agent
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
