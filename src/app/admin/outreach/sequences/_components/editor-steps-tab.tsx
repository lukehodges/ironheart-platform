"use client";

import { useCallback, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Linkedin,
  Mail,
  Phone,
  Plus,
  Trash2,
} from "lucide-react";
import type {
  OutreachStep,
  OutreachChannel,
} from "@/modules/outreach/outreach.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

const CHANNELS: {
  value: OutreachChannel;
  label: string;
  icon: typeof Mail;
}[] = [
  { value: "EMAIL", label: "Email", icon: Mail },
  { value: "LINKEDIN_REQUEST", label: "LinkedIn Request", icon: Linkedin },
  { value: "LINKEDIN_MESSAGE", label: "LinkedIn Message", icon: Linkedin },
  { value: "CALL", label: "Call", icon: Phone },
];

const TEMPLATE_VARIABLES = [
  "{{firstName}}",
  "{{lastName}}",
  "{{company}}",
  "{{sector}}",
] as const;

function getChannelConfig(channel: OutreachChannel) {
  return CHANNELS.find((c) => c.value === channel) ?? CHANNELS[0];
}

interface EditorStepsTabProps {
  steps: OutreachStep[];
  onChange: (steps: OutreachStep[]) => void;
}

export function EditorStepsTab({ steps, onChange }: EditorStepsTabProps) {
  const [expandedStep, setExpandedStep] = useState<number | null>(
    steps.length > 0 ? steps[0].position : null,
  );
  const bodyRefs = useRef<Map<number, HTMLTextAreaElement>>(new Map());

  const updateStep = useCallback(
    (position: number, patch: Partial<OutreachStep>) => {
      onChange(
        steps.map((s) => (s.position === position ? { ...s, ...patch } : s)),
      );
    },
    [steps, onChange],
  );

  const removeStep = useCallback(
    (position: number) => {
      if (steps.length <= 1) return;
      const filtered = steps
        .filter((s) => s.position !== position)
        .map((s, i) => ({ ...s, position: i + 1 }));
      onChange(filtered);
      if (expandedStep === position) {
        setExpandedStep(filtered.length > 0 ? filtered[0].position : null);
      }
    },
    [steps, onChange, expandedStep],
  );

  const addStep = useCallback(() => {
    const newStep: OutreachStep = {
      position: steps.length + 1,
      channel: "EMAIL",
      delayDays: 3,
      bodyMarkdown: "",
    };
    onChange([...steps, newStep]);
    setExpandedStep(newStep.position);
  }, [steps, onChange]);

  const insertVariable = useCallback(
    (position: number, variable: string) => {
      const textarea = bodyRefs.current.get(position);
      if (!textarea) return;

      const { selectionStart, selectionEnd } = textarea;
      const step = steps.find((s) => s.position === position);
      if (!step) return;

      const before = step.bodyMarkdown.slice(0, selectionStart);
      const after = step.bodyMarkdown.slice(selectionEnd);
      const newBody = before + variable + after;

      updateStep(position, { bodyMarkdown: newBody });

      // Restore cursor after the inserted variable
      requestAnimationFrame(() => {
        const cursor = selectionStart + variable.length;
        textarea.focus();
        textarea.setSelectionRange(cursor, cursor);
      });
    },
    [steps, updateStep],
  );

  return (
    <div className="space-y-2">
      {steps.map((step) => {
        const isExpanded = expandedStep === step.position;
        const channelConfig = getChannelConfig(step.channel);
        const ChannelIcon = channelConfig.icon;

        return (
          <div
            key={step.position}
            className="rounded-lg border border-border bg-card"
          >
            {/* Collapsed header */}
            <button
              type="button"
              onClick={() =>
                setExpandedStep(isExpanded ? null : step.position)
              }
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-muted/50"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <span className="font-medium text-foreground">
                Step {step.position}
              </span>
              <Badge variant="secondary" className="gap-1">
                <ChannelIcon className="h-3 w-3" />
                {channelConfig.label}
              </Badge>
              <span className="text-muted-foreground">
                {step.delayDays}d delay
              </span>
              {step.subject && (
                <span className="truncate text-muted-foreground">
                  &mdash; {step.subject}
                </span>
              )}
            </button>

            {/* Expanded content */}
            {isExpanded && (
              <div className="space-y-4 border-t border-border px-4 py-4">
                {/* Channel */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Channel
                  </label>
                  <Select
                    value={step.channel}
                    onValueChange={(val) =>
                      updateStep(step.position, {
                        channel: val as OutreachChannel,
                        // Clear subject when switching away from email
                        ...(val !== "EMAIL" ? { subject: undefined } : {}),
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CHANNELS.map((ch) => (
                        <SelectItem key={ch.value} value={ch.value}>
                          <span className="flex items-center gap-2">
                            <ch.icon className="h-4 w-4" />
                            {ch.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Delay days */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Delay (days)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={step.delayDays}
                    onChange={(e) =>
                      updateStep(step.position, {
                        delayDays: Math.max(0, parseInt(e.target.value, 10) || 0),
                      })
                    }
                    className="w-32"
                  />
                </div>

                {/* Subject (email only) */}
                {step.channel === "EMAIL" && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">
                      Subject
                    </label>
                    <Input
                      value={step.subject ?? ""}
                      onChange={(e) =>
                        updateStep(step.position, { subject: e.target.value })
                      }
                      placeholder="Email subject line..."
                    />
                  </div>
                )}

                {/* Template variable pills */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Body
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {TEMPLATE_VARIABLES.map((variable) => (
                      <button
                        key={variable}
                        type="button"
                        onClick={() => insertVariable(step.position, variable)}
                        className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                      >
                        {variable}
                      </button>
                    ))}
                  </div>
                  <Textarea
                    ref={(el) => {
                      if (el) {
                        bodyRefs.current.set(step.position, el);
                      } else {
                        bodyRefs.current.delete(step.position);
                      }
                    }}
                    value={step.bodyMarkdown}
                    onChange={(e) =>
                      updateStep(step.position, {
                        bodyMarkdown: e.target.value,
                      })
                    }
                    placeholder="Write your message body in Markdown..."
                    className="min-h-[120px] font-mono text-sm"
                    rows={6}
                  />
                </div>

                {/* Internal notes */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Internal Notes
                  </label>
                  <Textarea
                    value={step.notes ?? ""}
                    onChange={(e) =>
                      updateStep(step.position, { notes: e.target.value })
                    }
                    placeholder="Internal notes (not sent to prospect)..."
                    className="min-h-[60px] text-sm"
                    rows={2}
                  />
                </div>

                {/* Remove step */}
                {steps.length > 1 && (
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeStep(step.position)}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      Remove Step
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      <Button
        type="button"
        variant="outline"
        onClick={addStep}
        className="w-full"
      >
        <Plus className="mr-1.5 h-4 w-4" />
        Add Step
      </Button>
    </div>
  );
}
