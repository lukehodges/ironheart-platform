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

  const inputStyle: React.CSSProperties = {
    width: "100%",
    borderRadius: 6,
    border: "1px solid var(--ih-line)",
    padding: "5px 8px",
    fontSize: 13,
    background: "var(--ih-surface)",
    color: "var(--ih-ink)",
    fontFamily: "var(--ih-font-sans)",
    outline: "none",
    boxSizing: "border-box",
  }

  const disabledInputStyle: React.CSSProperties = {
    ...inputStyle,
    opacity: 0.5,
    cursor: "not-allowed",
    background: "var(--ih-surface-2)",
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2
          className="ih-serif"
          style={{ fontSize: 18, margin: 0, color: "var(--ih-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        >
          {node.label}
        </h2>
        <button
          onClick={onClearSelection}
          style={{
            fontSize: 11,
            color: "var(--ih-ink-50)",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            flexShrink: 0,
            marginLeft: 8,
            padding: "2px 6px",
          }}
        >
          Close
        </button>
      </div>

      <Field label="Label">
        <input
          value={form.label}
          onChange={(e) => setForm({ ...form, label: e.target.value })}
          style={inputStyle}
        />
      </Field>

      <Field label="Type">
        <select
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value as OrgChartNodeType })}
          style={inputStyle}
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
            style={inputStyle}
          />
        </Field>
      )}

      {form.type === "PERSON" && (
        <>
          <Field label="Contact name">
            <input
              value={form.contactName}
              onChange={(e) => setForm({ ...form, contactName: e.target.value })}
              style={inputStyle}
            />
          </Field>
          <Field label="Contact email">
            <input
              type="email"
              value={form.contactEmail}
              onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
              style={inputStyle}
            />
          </Field>
          <Field label="Role / title">
            <input
              value={form.contactRole}
              onChange={(e) => setForm({ ...form, contactRole: e.target.value })}
              style={inputStyle}
            />
          </Field>
        </>
      )}

      <div style={{ borderTop: "1px solid var(--ih-line)", paddingTop: 16 }}>
        <p
          className="ih-eyebrow"
          style={{ marginBottom: 12 }}
        >
          Interview plan{" "}
          {!isConsultant && (
            <span style={{ textTransform: "none", fontWeight: 400, letterSpacing: 0 }}>(consultant-controlled)</span>
          )}
        </p>

        <Field label="Mode">
          <select
            value={form.interviewMode}
            onChange={(e) => setForm({ ...form, interviewMode: e.target.value as InterviewMode })}
            disabled={!isConsultant}
            style={!isConsultant ? disabledInputStyle : inputStyle}
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
              style={!isConsultant ? disabledInputStyle : inputStyle}
            />
          </Field>
        )}

        <Field label="Template override (slug)">
          <input
            value={form.templateSlugOverride}
            onChange={(e) => setForm({ ...form, templateSlugOverride: e.target.value })}
            disabled={!isConsultant}
            placeholder={isConsultant ? "Leave blank to auto-detect from role" : ""}
            style={!isConsultant ? disabledInputStyle : inputStyle}
          />
        </Field>
      </div>

      <button
        onClick={handleSave}
        disabled={updateMutation.isPending}
        style={{
          width: "100%",
          borderRadius: 6,
          background: "var(--ih-accent)",
          border: "none",
          padding: "8px 16px",
          fontSize: 13,
          color: "#fff",
          cursor: updateMutation.isPending ? "not-allowed" : "pointer",
          opacity: updateMutation.isPending ? 0.6 : 1,
        }}
      >
        {updateMutation.isPending ? "Saving…" : "Save changes"}
      </button>

      <p
        className="ih-mono"
        style={{ fontSize: 10, color: "var(--ih-ink-40)" }}
      >
        Version {node.version} · Last edited by {node.lastEditedBy} ·{" "}
        {new Date(node.lastEditedAt).toLocaleString()}
      </p>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: 0 }}>
      <span
        className="ih-eyebrow"
        style={{ marginBottom: 4, display: "block" }}
      >
        {label}
      </span>
      {children}
    </label>
  )
}
