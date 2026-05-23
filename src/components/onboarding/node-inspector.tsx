"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/trpc/react"
import type { OrgChartTree, OrgChartNodeType, InterviewMode } from "@/modules/onboarding/onboarding.types"

interface NodeInspectorProps {
  node: OrgChartTree
  mode: "consultant" | "client"
  engagementId: string
  onClearSelection: () => void
}

interface FormState {
  label: string
  type: OrgChartNodeType
  headcount: string
  contactEmail: string
  contactName: string
  contactRole: string
  interviewMode: InterviewMode
  sampleSize: string
  templateSlugOverride: string
}

function nodeToForm(node: OrgChartTree): FormState {
  return {
    label: node.label,
    type: node.type,
    headcount: node.headcount?.toString() ?? "",
    contactEmail: node.contactEmail ?? "",
    contactName: node.contactName ?? "",
    contactRole: node.contactRole ?? "",
    interviewMode: node.interviewMode,
    sampleSize: node.sampleSize?.toString() ?? "",
    templateSlugOverride: node.templateSlugOverride ?? "",
  }
}

export function NodeInspector({
  node,
  mode,
  engagementId,
  onClearSelection,
}: NodeInspectorProps) {
  const utils = api.useUtils()
  const [form, setForm] = useState<FormState>(nodeToForm(node))

  // Reset form when selected node changes (by id or version)
  useEffect(() => {
    setForm(nodeToForm(node))
  }, [node.id, node.version])

  const invalidateAll = () => {
    utils.onboarding[mode === "consultant" ? "getChart" : "clientGetChart"].invalidate({
      engagementId,
    })
    utils.onboarding[mode === "consultant" ? "getActivity" : "clientGetActivity"].invalidate({
      engagementId,
    })
  }

  const updateMutation =
    mode === "consultant"
      ? api.onboarding.updateNode.useMutation({
          onSuccess: invalidateAll,
          onError: (err) => {
            if (err.data?.code === "CONFLICT") {
              alert("Conflict — someone else just edited this node. Refreshing.")
              utils.onboarding.getChart.invalidate({ engagementId })
            } else {
              alert(`Update failed: ${err.message}`)
            }
          },
        })
      : api.onboarding.clientUpdateNode.useMutation({
          onSuccess: invalidateAll,
          onError: (err) => {
            if (err.data?.code === "CONFLICT") {
              alert("Conflict — someone else just edited this node. Refreshing.")
              utils.onboarding.clientGetChart.invalidate({ engagementId })
            } else {
              alert(`Update failed: ${err.message}`)
            }
          },
        })

  const handleSave = () => {
    const patch: Record<string, unknown> = {}

    if (form.label !== node.label) patch.label = form.label
    if (form.type !== node.type) patch.type = form.type
    if (form.headcount !== (node.headcount?.toString() ?? "")) {
      patch.headcount = form.headcount === "" ? null : parseInt(form.headcount, 10)
    }
    if (form.contactEmail !== (node.contactEmail ?? "")) {
      patch.contactEmail = form.contactEmail || null
    }
    if (form.contactName !== (node.contactName ?? "")) {
      patch.contactName = form.contactName || null
    }
    if (form.contactRole !== (node.contactRole ?? "")) {
      patch.contactRole = form.contactRole || null
    }

    if (mode === "consultant") {
      if (form.interviewMode !== node.interviewMode) patch.interviewMode = form.interviewMode
      if (form.sampleSize !== (node.sampleSize?.toString() ?? "")) {
        patch.sampleSize = form.sampleSize === "" ? null : parseInt(form.sampleSize, 10)
      }
      if (form.templateSlugOverride !== (node.templateSlugOverride ?? "")) {
        patch.templateSlugOverride = form.templateSlugOverride || null
      }
    }

    if (Object.keys(patch).length === 0) return

    updateMutation.mutate({ id: node.id, version: node.version, patch })
  }

  const isConsultant = mode === "consultant"

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg truncate">{node.label}</h2>
        <button
          onClick={onClearSelection}
          className="text-xs text-muted-foreground hover:text-foreground flex-shrink-0 ml-2"
        >
          Close
        </button>
      </div>

      <Field label="Label">
        <input
          value={form.label}
          onChange={(e) => setForm({ ...form, label: e.target.value })}
          className="w-full rounded border border-border px-2 py-1 text-sm bg-background"
        />
      </Field>

      <Field label="Type">
        <select
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value as OrgChartNodeType })}
          className="w-full rounded border border-border px-2 py-1 text-sm bg-background"
        >
          <option value="DEPARTMENT">Department</option>
          <option value="ROLE">Role</option>
          <option value="PERSON">Person</option>
        </select>
      </Field>

      {form.type === "DEPARTMENT" && (
        <Field label="Headcount">
          <input
            type="number"
            min={0}
            value={form.headcount}
            onChange={(e) => setForm({ ...form, headcount: e.target.value })}
            className="w-full rounded border border-border px-2 py-1 text-sm bg-background"
          />
        </Field>
      )}

      {form.type === "PERSON" && (
        <>
          <Field label="Contact name">
            <input
              value={form.contactName}
              onChange={(e) => setForm({ ...form, contactName: e.target.value })}
              className="w-full rounded border border-border px-2 py-1 text-sm bg-background"
            />
          </Field>
          <Field label="Contact email">
            <input
              type="email"
              value={form.contactEmail}
              onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
              className="w-full rounded border border-border px-2 py-1 text-sm bg-background"
            />
          </Field>
          <Field label="Role / title">
            <input
              value={form.contactRole}
              onChange={(e) => setForm({ ...form, contactRole: e.target.value })}
              className="w-full rounded border border-border px-2 py-1 text-sm bg-background"
            />
          </Field>
        </>
      )}

      <div className="border-t border-border pt-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
          Interview plan{" "}
          {!isConsultant && (
            <span className="normal-case font-normal">(consultant-controlled)</span>
          )}
        </p>

        <Field label="Mode">
          <select
            value={form.interviewMode}
            onChange={(e) => setForm({ ...form, interviewMode: e.target.value as InterviewMode })}
            disabled={!isConsultant}
            className="w-full rounded border border-border px-2 py-1 text-sm bg-background disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="ALL">ALL — interview everyone</option>
            <option value="SAMPLE">SAMPLE — interview N picks</option>
            <option value="OWNER_ONLY">OWNER_ONLY — skip this branch</option>
            <option value="SKIP">SKIP — exclude entirely</option>
          </select>
        </Field>

        {form.interviewMode === "SAMPLE" && (
          <Field label="Sample size">
            <input
              type="number"
              min={1}
              value={form.sampleSize}
              onChange={(e) => setForm({ ...form, sampleSize: e.target.value })}
              disabled={!isConsultant}
              className="w-full rounded border border-border px-2 py-1 text-sm bg-background disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </Field>
        )}

        <Field label="Template override (slug)">
          <input
            value={form.templateSlugOverride}
            onChange={(e) => setForm({ ...form, templateSlugOverride: e.target.value })}
            disabled={!isConsultant}
            placeholder={isConsultant ? "Leave blank to auto-detect from role" : ""}
            className="w-full rounded border border-border px-2 py-1 text-sm bg-background disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </Field>
      </div>

      <button
        onClick={handleSave}
        disabled={updateMutation.isPending}
        className="w-full rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {updateMutation.isPending ? "Saving…" : "Save changes"}
      </button>

      <p className="text-xs text-muted-foreground">
        Version {node.version} · Last edited by {node.lastEditedBy} ·{" "}
        {new Date(node.lastEditedAt).toLocaleString()}
      </p>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block mb-3">
      <span className="text-xs text-muted-foreground mb-1 block">{label}</span>
      {children}
    </label>
  )
}
