"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  X,
  ExternalLink,
  Mail,
  Send,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  MessageSquare,
  Users,
  Folder,
  User as UserIcon,
  Tag,
} from "lucide-react"
import { api } from "@/lib/trpc/react"
import type {
  InterviewMode,
  OrgChartNodeType,
  OrgChartTree,
} from "@/modules/onboarding/onboarding.types"

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

/* ------- visual maps ------- */

const TYPE_ICON: Record<OrgChartNodeType, React.ComponentType<{ size?: number }>> = {
  DEPARTMENT: Folder,
  ROLE: Tag,
  PERSON: UserIcon,
}

const INTERVIEW_MODE_META: Record<InterviewMode, { label: string; description: string; tone: string; bg: string; border: string }> = {
  ALL: {
    label: "Interview everyone",
    description: "Every person in this branch will be sent a questionnaire and sampled for interview.",
    tone: "var(--ih-ok)",
    bg: "rgba(47,111,92,0.10)",
    border: "rgba(47,111,92,0.3)",
  },
  SAMPLE: {
    label: "Sample subset",
    description: "Only a defined number of people will be selected.",
    tone: "var(--ih-warn)",
    bg: "rgba(184,134,11,0.10)",
    border: "rgba(184,134,11,0.3)",
  },
  OWNER_ONLY: {
    label: "Owner only",
    description: "Just the lead / owner of this branch — direct reports skipped.",
    tone: "var(--ih-ink-65)",
    bg: "var(--ih-surface-2)",
    border: "var(--ih-line)",
  },
  SKIP: {
    label: "Skipped",
    description: "This branch will be excluded from the audit.",
    tone: "var(--ih-danger)",
    bg: "rgba(209,58,31,0.08)",
    border: "rgba(209,58,31,0.3)",
  },
}

/* ------- main inspector ------- */

export function NodeInspector({
  node,
  mode,
  engagementId,
  onClearSelection,
}: NodeInspectorProps) {
  const utils = api.useUtils()
  const isConsultant = mode === "consultant"
  const isPerson = node.type === "PERSON"

  /* form state — only used inside Advanced edit drawer */
  const [form, setForm] = useState<FormState>(nodeToForm(node))
  const [advancedOpen, setAdvancedOpen] = useState(false)

  useEffect(() => setForm(nodeToForm(node)), [node.id, node.version])

  /* customer resolution for pill (consultant only — client tenants lack customer module) */
  const customerQuery = api.customer.list.useQuery(
    { search: node.contactEmail ?? "", limit: 5 },
    { enabled: isConsultant && isPerson && !!node.contactEmail },
  )
  const linkedCustomer = customerQuery.data?.rows.find(
    (c) =>
      c.email && node.contactEmail && c.email.toLowerCase() === node.contactEmail.toLowerCase(),
  )

  /* mutations */
  const invalidate = () => {
    utils.onboarding[isConsultant ? "getChart" : "clientGetChart"].invalidate({ engagementId })
    utils.onboarding[isConsultant ? "getActivity" : "clientGetActivity"].invalidate({ engagementId })
  }

  const handleErr = (err: { data?: { code?: string } | null; message: string }) => {
    if (err.data?.code === "CONFLICT") {
      alert("Conflict — someone else just edited this node. Refreshing.")
      utils.onboarding[isConsultant ? "getChart" : "clientGetChart"].invalidate({ engagementId })
    } else {
      alert(`Update failed: ${err.message}`)
    }
  }

  const updateMutation = isConsultant
    ? api.onboarding.updateNode.useMutation({
        onSuccess: invalidate,
        onError: (e) => handleErr({ data: e.data, message: e.message }),
      })
    : api.onboarding.clientUpdateNode.useMutation({
        onSuccess: invalidate,
        onError: (e) => handleErr({ data: e.data, message: e.message }),
      })

  const handleSave = () => {
    const patch: Record<string, unknown> = {}
    if (form.label !== node.label) patch.label = form.label
    if (form.type !== node.type) patch.type = form.type
    if (form.headcount !== (node.headcount?.toString() ?? "")) {
      patch.headcount = form.headcount === "" ? null : parseInt(form.headcount, 10)
    }
    if (form.contactEmail !== (node.contactEmail ?? "")) patch.contactEmail = form.contactEmail || null
    if (form.contactName !== (node.contactName ?? "")) patch.contactName = form.contactName || null
    if (form.contactRole !== (node.contactRole ?? "")) patch.contactRole = form.contactRole || null
    if (isConsultant) {
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

  const TypeIcon = TYPE_ICON[node.type]
  const interviewMeta = INTERVIEW_MODE_META[node.interviewMode]

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, padding: 22 }}>
      {/* top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <TypeIcon size={14} />
          <span className="ih-eyebrow">{node.type.toLowerCase()}</span>
        </div>
        <button
          type="button"
          onClick={onClearSelection}
          aria-label="Close inspector"
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: "transparent",
            border: "1px solid var(--ih-line)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "var(--ih-ink-50)",
          }}
        >
          <X size={14} />
        </button>
      </div>

      {/* header content: pill for PERSON, label for others */}
      {isPerson ? (
        <ContactPill
          node={node}
          isConsultant={isConsultant}
          linkedCustomer={
            linkedCustomer
              ? { id: linkedCustomer.id, name: linkedCustomer.name, email: linkedCustomer.email ?? null }
              : null
          }
          loading={customerQuery.isLoading}
        />
      ) : (
        <div>
          <h2 className="ih-serif" style={{ fontSize: 22, margin: 0, color: "var(--ih-ink)" }}>
            {node.label}
          </h2>
          {node.headcount != null && (
            <p style={{ fontSize: 12.5, color: "var(--ih-ink-50)", marginTop: 4 }}>
              <Users size={11} style={{ display: "inline", marginRight: 4, verticalAlign: "-1px" }} />
              {node.headcount} {node.headcount === 1 ? "person" : "people"} in this branch
            </p>
          )}
        </div>
      )}

      {/* Interview plan */}
      <Section title="Interview plan">
        <div
          style={{
            border: `1px solid ${interviewMeta.border}`,
            background: interviewMeta.bg,
            borderRadius: 8,
            padding: "10px 12px",
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: interviewMeta.tone,
              marginTop: 6,
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: interviewMeta.tone }}>
              {interviewMeta.label}
              {node.interviewMode === "SAMPLE" && node.sampleSize ? ` · ${node.sampleSize} interviews` : ""}
            </div>
            <div style={{ fontSize: 12, color: "var(--ih-ink-65)", marginTop: 2, lineHeight: 1.4 }}>
              {interviewMeta.description}
            </div>
          </div>
        </div>
      </Section>

      {/* Questionnaire status (PERSON only) */}
      {isPerson && (
        <Section title="Questionnaire">
          <QuestionnaireStatus
            formSendId={node.formSendId}
            contactEmail={node.contactEmail}
          />
        </Section>
      )}

      {/* Comms log */}
      {isPerson && (
        <Section title="Recent activity">
          {linkedCustomer ? (
            <CustomerNotes customerId={linkedCustomer.id} />
          ) : (
            <p style={{ fontSize: 12, color: "var(--ih-ink-50)" }}>
              {isConsultant
                ? node.contactEmail
                  ? "Sync this person to a CRM contact to see call notes and emails."
                  : "Add an email above to enable CRM sync."
                : "Activity not available in client view."}
            </p>
          )}
        </Section>
      )}

      {/* Advanced edit drawer */}
      <details
        open={advancedOpen}
        onToggle={(e) => setAdvancedOpen((e.target as HTMLDetailsElement).open)}
        style={{
          borderTop: "1px solid var(--ih-line)",
          paddingTop: 12,
          marginTop: 4,
        }}
      >
        <summary
          style={{
            cursor: "pointer",
            listStyle: "none",
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            color: "var(--ih-ink-65)",
            userSelect: "none",
          }}
        >
          <ChevronDown
            size={12}
            style={{
              transform: advancedOpen ? "rotate(0deg)" : "rotate(-90deg)",
              transition: "transform 0.15s",
            }}
          />
          Advanced — raw fields
        </summary>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 14 }}>
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

          <Field label="Interview mode">
            <select
              value={form.interviewMode}
              onChange={(e) => setForm({ ...form, interviewMode: e.target.value as InterviewMode })}
              disabled={!isConsultant}
              style={isConsultant ? inputStyle : disabledInputStyle}
            >
              <option value="ALL">ALL — interview everyone</option>
              <option value="SAMPLE">SAMPLE — interview N picks</option>
              <option value="OWNER_ONLY">OWNER_ONLY — owner only</option>
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
                style={isConsultant ? inputStyle : disabledInputStyle}
              />
            </Field>
          )}

          <Field label="Template override (slug)">
            <input
              value={form.templateSlugOverride}
              onChange={(e) => setForm({ ...form, templateSlugOverride: e.target.value })}
              disabled={!isConsultant}
              placeholder={isConsultant ? "Leave blank to auto-detect from role" : ""}
              style={isConsultant ? inputStyle : disabledInputStyle}
            />
          </Field>

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

          <p className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)" }}>
            Version {node.version} · Last edited by {node.lastEditedBy.toLowerCase()} ·{" "}
            {new Date(node.lastEditedAt).toLocaleString()}
          </p>
        </div>
      </details>
    </div>
  )
}

/* ------- contact pill ------- */

function ContactPill({
  node,
  isConsultant,
  linkedCustomer,
  loading,
}: {
  node: OrgChartTree
  isConsultant: boolean
  linkedCustomer: { id: string; name: string; email: string | null } | null
  loading: boolean
}) {
  const name = node.contactName ?? node.label ?? "Unnamed"
  const initials = name
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()

  const synced = !!linkedCustomer
  const canShowSync = isConsultant && !!node.contactEmail

  const pillBody = (
    <>
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 999,
          background: synced
            ? "color-mix(in srgb, var(--ih-accent) 14%, transparent)"
            : "var(--ih-surface-2)",
          color: synced ? "var(--ih-accent)" : "var(--ih-ink-50)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: "0.04em",
          flexShrink: 0,
        }}
      >
        {initials || "—"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "var(--ih-ink)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {name}
          </span>
          {synced && (
            <span
              className="ih-mono"
              style={{
                padding: "1px 5px",
                borderRadius: 999,
                fontSize: 9,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--ih-accent)",
                background: "color-mix(in srgb, var(--ih-accent) 12%, transparent)",
                border: "1px solid color-mix(in srgb, var(--ih-accent) 30%, transparent)",
              }}
            >
              Synced
            </span>
          )}
          {canShowSync && !synced && !loading && (
            <span
              className="ih-mono"
              style={{
                padding: "1px 5px",
                borderRadius: 999,
                fontSize: 9,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--ih-warn)",
                background: "rgba(184,134,11,0.10)",
                border: "1px solid rgba(184,134,11,0.3)",
              }}
            >
              Not synced
            </span>
          )}
        </div>
        {node.contactRole && (
          <div style={{ fontSize: 12, color: "var(--ih-ink-65)", marginTop: 1 }}>
            {node.contactRole}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 6 }}>
          {node.contactEmail && (
            <ContactLine icon={<Mail size={11} />} text={node.contactEmail} href={`mailto:${node.contactEmail}`} />
          )}
        </div>
      </div>
      {synced && (
        <ExternalLink
          size={14}
          style={{ color: "var(--ih-ink-40)", flexShrink: 0, alignSelf: "flex-start", marginTop: 4 }}
        />
      )}
    </>
  )

  const pillStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    padding: "12px 14px",
    borderRadius: 10,
    background: "var(--ih-surface)",
    border: `1px solid ${synced ? "color-mix(in srgb, var(--ih-accent) 35%, var(--ih-line))" : "var(--ih-line)"}`,
    textDecoration: "none",
    color: "inherit",
    cursor: synced ? "pointer" : "default",
    transition: "background 0.12s, border-color 0.12s",
  }

  if (synced && linkedCustomer) {
    return (
      <Link href={`/platform/customers/${linkedCustomer.id}`} style={pillStyle}>
        {pillBody}
      </Link>
    )
  }

  return <div style={pillStyle}>{pillBody}</div>
}

function ContactLine({ icon, text, href }: { icon: React.ReactNode; text: string; href?: string }) {
  const content = (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--ih-ink-65)" }}>
      {icon}
      {text}
    </span>
  )
  if (href) {
    return (
      <a href={href} onClick={(e) => e.stopPropagation()} style={{ textDecoration: "none" }}>
        {content}
      </a>
    )
  }
  return content
}

/* ------- questionnaire status ------- */

function QuestionnaireStatus({
  formSendId,
  contactEmail,
}: {
  formSendId: string | null
  contactEmail: string | null
}) {
  if (!contactEmail) {
    return (
      <StatusRow
        icon={<AlertCircle size={13} />}
        tone="var(--ih-ink-50)"
        label="No email on file"
        detail="Add an email to send a questionnaire."
      />
    )
  }
  if (!formSendId) {
    return (
      <StatusRow
        icon={<Send size={13} />}
        tone="var(--ih-info)"
        label="Not sent yet"
        detail="Approve the audit plan to send questionnaires."
      />
    )
  }
  return (
    <StatusRow
      icon={<CheckCircle2 size={13} />}
      tone="var(--ih-ok)"
      label="Questionnaire sent"
      detail="Tracked in completed forms — see audit progress for response state."
    />
  )
}

function StatusRow({
  icon,
  tone,
  label,
  detail,
}: {
  icon: React.ReactNode
  tone: string
  label: string
  detail: string
}) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <span style={{ color: tone, marginTop: 1, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: tone }}>{label}</div>
        <div style={{ fontSize: 12, color: "var(--ih-ink-65)", marginTop: 1, lineHeight: 1.4 }}>{detail}</div>
      </div>
    </div>
  )
}

/* ------- customer notes feed ------- */

function CustomerNotes({ customerId }: { customerId: string }) {
  const notesQuery = api.customer.listNotes.useQuery({ customerId })

  if (notesQuery.isLoading) {
    return <p style={{ fontSize: 12, color: "var(--ih-ink-50)" }}>Loading activity…</p>
  }
  if (notesQuery.error) {
    return <p style={{ fontSize: 12, color: "var(--ih-danger)" }}>{notesQuery.error.message}</p>
  }
  const notes = notesQuery.data ?? []
  if (notes.length === 0) {
    return (
      <p style={{ fontSize: 12, color: "var(--ih-ink-50)" }}>
        No notes yet. Log calls and emails from this contact's CRM page.
      </p>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {notes.slice(0, 4).map((note) => (
        <div key={note.id} style={{ display: "flex", gap: 8 }}>
          <MessageSquare size={11} style={{ color: "var(--ih-ink-40)", marginTop: 3, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: "var(--ih-ink)", lineHeight: 1.4 }}>
              {note.content.length > 140 ? `${note.content.slice(0, 140)}…` : note.content}
            </div>
            <div className="ih-mono" style={{ fontSize: 9.5, color: "var(--ih-ink-40)", marginTop: 2 }}>
              {note.noteType.toLowerCase()} · {new Date(note.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ------- shared bits ------- */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="ih-eyebrow" style={{ marginBottom: 8 }}>
        {title}
      </p>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <span className="ih-eyebrow" style={{ marginBottom: 4, display: "block" }}>
        {label}
      </span>
      {children}
    </label>
  )
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 6,
  border: "1px solid var(--ih-line)",
  padding: "6px 9px",
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
