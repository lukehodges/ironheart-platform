"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { OutreachStep } from "@/modules/outreach/outreach.types";
import { api } from "@/lib/trpc/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { EditorStepsTab } from "./editor-steps-tab";
import { EditorContactsTab } from "./editor-contacts-tab";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SequenceEditorProps {
  sequenceId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormState {
  name: string;
  description: string;
  sector: string;
  targetIcp: string;
  isActive: boolean;
  steps: OutreachStep[];
}

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  sector: "",
  targetIcp: "",
  isActive: true,
  steps: [{ position: 1, channel: "EMAIL", delayDays: 0, bodyMarkdown: "" }],
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SequenceEditor({
  sequenceId,
  open,
  onOpenChange,
}: SequenceEditorProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const isEditMode = !!sequenceId;
  const utils = api.useUtils();

  // ---- Data fetching ----

  const sequenceQuery = api.outreach.getSequenceById.useQuery(
    { sequenceId: sequenceId! },
    { enabled: !!sequenceId && open },
  );

  const analyticsQuery = api.outreach.sequenceAnalytics.useQuery(
    {},
    { enabled: !!sequenceId && open },
  );

  // Populate form when sequence data loads
  useEffect(() => {
    if (sequenceQuery.data) {
      const s = sequenceQuery.data;
      setForm({
        name: s.name,
        description: s.description ?? "",
        sector: s.sector,
        targetIcp: s.targetIcp ?? "",
        isActive: s.isActive,
        steps: s.steps,
      });
    }
  }, [sequenceQuery.data]);

  // Reset form when dialog opens in create mode
  useEffect(() => {
    if (open && !sequenceId) {
      setForm(EMPTY_FORM);
    }
  }, [open, sequenceId]);

  // ---- Mutations ----

  const createSequence = api.outreach.createSequence.useMutation({
    onSuccess: () => {
      void utils.outreach.listSequences.invalidate();
      void utils.outreach.sequenceAnalytics.invalidate();
      toast.success("Sequence created");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const updateSequence = api.outreach.updateSequence.useMutation({
    onSuccess: () => {
      void utils.outreach.listSequences.invalidate();
      void utils.outreach.sequenceAnalytics.invalidate();
      toast.success("Sequence updated");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const isSaving = createSequence.isPending || updateSequence.isPending;

  // ---- Validation & Save ----

  function validate(): string | null {
    if (!form.name.trim()) return "Name is required";
    if (!form.sector.trim()) return "Sector is required";
    if (form.steps.length === 0) return "At least one step is required";
    const emptyBody = form.steps.find((s) => !s.bodyMarkdown.trim());
    if (emptyBody)
      return `Step ${emptyBody.position} needs a body`;
    return null;
  }

  function handleSave(closeAfter: boolean) {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    const onSuccess = () => {
      if (closeAfter) {
        onOpenChange(false);
      }
    };

    if (isEditMode) {
      updateSequence.mutate(
        {
          sequenceId: sequenceId!,
          name: form.name,
          description: form.description || null,
          sector: form.sector,
          targetIcp: form.targetIcp || null,
          isActive: form.isActive,
          steps: form.steps,
        },
        { onSuccess },
      );
    } else {
      createSequence.mutate(
        {
          name: form.name,
          description: form.description || undefined,
          sector: form.sector,
          targetIcp: form.targetIcp || undefined,
          isActive: form.isActive,
          steps: form.steps,
        },
        { onSuccess },
      );
    }
  }

  // ---- Performance data ----

  const perfData = analyticsQuery.data?.find(
    (a) => a.sequenceId === sequenceId,
  );

  // ---- Render ----

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-5 pt-5">
          <DialogTitle>
            {isEditMode ? "Edit Sequence" : "New Sequence"}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="settings" className="flex flex-1 flex-col overflow-hidden">
          <TabsList className="mx-5">
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="steps">Steps</TabsTrigger>
            {isEditMode && (
              <TabsTrigger value="contacts">Contacts</TabsTrigger>
            )}
            {isEditMode && (
              <TabsTrigger value="performance">Performance</TabsTrigger>
            )}
          </TabsList>

          {/* Settings tab */}
          <TabsContent value="settings" className="flex-1 overflow-y-auto px-5 py-4">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Name <span className="text-destructive">*</span>
                </label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="e.g. Recruitment Agency — Cold Outbound"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Description
                </label>
                <Textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Brief description of this sequence..."
                  rows={3}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Sector <span className="text-destructive">*</span>
                </label>
                <Input
                  value={form.sector}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sector: e.target.value }))
                  }
                  placeholder="e.g. Recruitment, SaaS, E-commerce"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Target ICP
                </label>
                <Textarea
                  value={form.targetIcp}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, targetIcp: e.target.value }))
                  }
                  placeholder="Describe your ideal customer profile..."
                  rows={2}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Status
                </label>
                <Select
                  value={form.isActive ? "active" : "paused"}
                  onValueChange={(val) =>
                    setForm((f) => ({ ...f, isActive: val === "active" }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          {/* Steps tab */}
          <TabsContent value="steps" className="flex-1 overflow-y-auto px-5 py-4">
            <EditorStepsTab
              steps={form.steps}
              onChange={(steps) => setForm((f) => ({ ...f, steps }))}
            />
          </TabsContent>

          {/* Contacts tab (edit mode only) */}
          {isEditMode && (
            <TabsContent value="contacts" className="flex-1 overflow-y-auto px-5 py-4">
              <EditorContactsTab sequenceId={sequenceId!} />
            </TabsContent>
          )}

          {/* Performance tab (edit mode only) */}
          {isEditMode && (
            <TabsContent value="performance" className="flex-1 overflow-y-auto px-5 py-4">
              {perfData ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard label="Total Sent" value={perfData.totalSent} />
                    <StatCard label="Replied" value={perfData.totalReplied} />
                    <StatCard
                      label="Reply Rate"
                      value={`${(perfData.replyRate * 100).toFixed(1)}%`}
                    />
                    <StatCard
                      label="Converted"
                      value={perfData.totalConverted}
                    />
                  </div>
                  <div className="rounded-lg border border-border bg-card p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      Conversion Rate
                    </p>
                    <p className="text-2xl font-semibold text-foreground">
                      {(perfData.conversionRate * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No performance data available yet.
                </p>
              )}
            </TabsContent>
          )}
        </Tabs>

        {/* Save bar */}
        <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
          <Button
            variant="outline"
            disabled={isSaving}
            onClick={() => handleSave(false)}
          >
            {isSaving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Save
          </Button>
          <Button disabled={isSaving} onClick={() => handleSave(true)}>
            {isSaving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Save &amp; Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Stat card helper
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 text-center">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
