import Link from "next/link"
import { db } from "@/shared/db"
import { completedForms, formTemplates, engagementOrgChart } from "@/shared/db/schema"
import { eq } from "drizzle-orm"
import { Icon, SetBreadcrumb } from "@/components/shell"
import type { FormField } from "@/modules/forms/forms.types"

/* ── Helpers ──────────────────────────────────────────────────────────── */

const STATUS_TONE: Record<string, string> = {
  COMPLETED: "ok",
  PENDING: "warn",
  EXPIRED: "danger",
  CANCELLED: "muted",
}

const STATUS_LABEL: Record<string, string> = {
  COMPLETED: "Completed",
  PENDING: "In Progress",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
}

function formatDateTime(d: Date | string | null): string {
  if (!d) return "—"
  const dt = typeof d === "string" ? new Date(d) : d
  return dt.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/** Resolve the engagement linked to this submission. Two paths (mirrors
 *  forms.repository.listResponses):
 *    1. template.engagementId (per-client clone)
 *    2. engagement_org_chart.formSendId = submission.id
 *  Returns the engagementId if either path resolves, else null. */
async function resolveEngagementIdForSubmission(
  submissionId: string,
  templateEngagementId: string | null,
): Promise<string | null> {
  if (templateEngagementId) return templateEngagementId
  const [node] = await db
    .select({ engagementId: engagementOrgChart.engagementId })
    .from(engagementOrgChart)
    .where(eq(engagementOrgChart.formSendId, submissionId))
    .limit(1)
  return node?.engagementId ?? null
}

/* ── Empty state ─────────────────────────────────────────────────────── */

function NotFound({ id }: { id: string }) {
  return (
    <div style={{ padding: "24px 28px 48px", maxWidth: 900, margin: "0 auto" }}>
      <SetBreadcrumb segment={id} label="Submission" />
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <Link href="/platform/forms" style={{ display: "flex", alignItems: "center", gap: 4, textDecoration: "none", color: "var(--ih-ink-50)" }}>
          <Icon name="chevronLeft" size={12} />
          <span className="ih-eyebrow">Forms</span>
        </Link>
      </div>
      <div className="ih-card" style={{ padding: "48px 24px", textAlign: "center" }}>
        <Icon name="file" size={32} style={{ color: "var(--ih-ink-30)", marginBottom: 12 }} />
        <h2 className="ih-serif" style={{ margin: 0, fontSize: 22 }}>Submission not found</h2>
        <p style={{ marginTop: 8, fontSize: 13, color: "var(--ih-ink-65)" }}>
          The submission <span className="ih-mono">{id}</span> does not exist or has been removed.
        </p>
      </div>
    </div>
  )
}

/* ── Page ─────────────────────────────────────────────────────────────── */

export default async function FormSubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // Load the completed form + its template. Direct DB query — auth is enforced
  // at the middleware layer on /platform/* and this page only renders for
  // platform-admin (consultant) users.
  const [submission] = await db
    .select()
    .from(completedForms)
    .where(eq(completedForms.id, id))
    .limit(1)

  if (!submission) return <NotFound id={id} />

  const [template] = await db
    .select()
    .from(formTemplates)
    .where(eq(formTemplates.id, submission.templateId))
    .limit(1)

  const engagementId = await resolveEngagementIdForSubmission(
    submission.id,
    template?.engagementId ?? null,
  )

  const fields: FormField[] = ((template?.fields ?? []) as FormField[]) ?? []
  const responses = (submission.responses ?? {}) as Record<string, unknown>
  const status = submission.status
  const statusTone = STATUS_TONE[status] ?? "muted"
  const statusLabel = STATUS_LABEL[status] ?? status
  const submittedAt = formatDateTime(submission.submittedAt ?? submission.createdAt)
  const submittedBy = submission.customerName?.trim() || "—"
  const templateName = template?.name ?? submission.templateName ?? "Questionnaire"

  return (
    <div style={{ padding: "24px 28px 48px", maxWidth: 900, margin: "0 auto" }}>
      <SetBreadcrumb segment={id} label={templateName} />

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <Link href="/platform/forms" style={{ display: "flex", alignItems: "center", gap: 4, textDecoration: "none", color: "var(--ih-ink-50)" }}>
          <Icon name="chevronLeft" size={12} />
          <span className="ih-eyebrow">Forms</span>
        </Link>
        <Icon name="chevronRight" size={10} style={{ color: "var(--ih-ink-30)" }} />
        <span className="ih-eyebrow">Submissions</span>
        <Icon name="chevronRight" size={10} style={{ color: "var(--ih-ink-30)" }} />
        <span className="ih-eyebrow" style={{ color: "var(--ih-accent)" }}>{submission.id.slice(0, 8)}</span>
      </div>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, gap: 24, flexWrap: "wrap" }}>
        <div>
          <h1 className="ih-serif" style={{ margin: 0, fontSize: 32, lineHeight: 1 }}>{templateName}</h1>
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: "var(--ih-ink-65)", flexWrap: "wrap" }}>
            <span>
              Submitted by <strong style={{ color: "var(--ih-ink)" }}>{submittedBy}</strong>
            </span>
            {submission.customerEmail && (
              <>
                <span>·</span>
                <span className="ih-mono" style={{ fontSize: 11 }}>{submission.customerEmail}</span>
              </>
            )}
            <span>·</span>
            <span className="ih-mono" style={{ fontSize: 11 }}>{submittedAt}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span className={`ih-pill ih-pill-${statusTone}`}>
            <span className={`ih-dot ih-dot-${statusTone}`} /> {statusLabel}
          </span>
          {engagementId && (
            <Link
              href={`/platform/clients/${engagementId}`}
              className="ih-btn ih-btn-quiet ih-btn-sm"
              style={{ textDecoration: "none" }}
            >
              <Icon name="arrowUpRight" size={11} /> Back to engagement
            </Link>
          )}
        </div>
      </div>

      {/* Info strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 24 }}>
        {[
          { l: "Submitted by", v: submittedBy, sub: submission.customerEmail ?? "—", icon: "user" as const },
          { l: "Template", v: templateName, sub: template?.slug ?? "—", icon: "file" as const },
          { l: "Status", v: statusLabel, sub: status, icon: "check" as const },
          { l: "Responses", v: String(Object.keys(responses).length), sub: `${fields.length} fields`, icon: "list" as const },
        ].map((s) => (
          <div key={s.l} className="ih-card" style={{ padding: "12px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <span className="ih-eyebrow">{s.l}</span>
              <Icon name={s.icon} size={12} style={{ color: "var(--ih-ink-30)" }} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.v}</div>
            <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Responses */}
      <div className="ih-card" style={{ overflow: "hidden", marginBottom: 20 }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--ih-line)" }}>
          <span className="ih-eyebrow">Responses</span>
          <h3 style={{ margin: "2px 0 0", fontSize: 15, fontWeight: 600 }}>Field-by-field answers</h3>
        </div>

        {fields.length === 0 ? (
          <div style={{ padding: "24px", fontSize: 12, color: "var(--ih-ink-50)", textAlign: "center" }}>
            No field schema available for this template.
          </div>
        ) : (
          <div style={{ padding: 0 }}>
            {fields.map((field, i) => {
              const raw = responses[field.id]
              const hasValue = raw != null && raw !== ""
              const valueStr =
                Array.isArray(raw) ? raw.join(", ") : raw == null ? "" : String(raw)
              return (
                <div key={field.id} style={{ padding: "14px 18px", borderTop: i === 0 ? "0" : "1px solid var(--ih-line)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="ih-mono" style={{ fontSize: 9, color: "var(--ih-ink-30)" }}>{i + 1}</span>
                      <span style={{ fontSize: 12, fontWeight: 500 }}>{field.label}</span>
                      {field.required && <span style={{ fontSize: 9, color: "var(--ih-danger)" }}>*</span>}
                    </div>
                    <span className="ih-mono" style={{ fontSize: 9, color: "var(--ih-ink-40)", textTransform: "uppercase" }}>{field.type}</span>
                  </div>

                  {!hasValue ? (
                    <div style={{ fontSize: 13, color: "var(--ih-ink-40)" }}>—</div>
                  ) : field.type === "TEXTAREA" ? (
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "var(--ih-ink)", padding: "6px 0", whiteSpace: "pre-wrap" }}>
                      {valueStr}
                    </p>
                  ) : field.type === "BOOLEAN" ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Icon
                        name={valueStr === "Yes" || valueStr === "true" ? "check" : "x"}
                        size={13}
                        style={{ color: valueStr === "Yes" || valueStr === "true" ? "var(--ih-ok)" : "var(--ih-danger)" }}
                      />
                      <span style={{ fontSize: 13 }}>{valueStr}</span>
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: "var(--ih-ink)" }}>{valueStr}</div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Signature */}
      {submission.signature && (
        <div className="ih-card" style={{ padding: 18 }}>
          <div className="ih-eyebrow" style={{ marginBottom: 8 }}>Signature</div>
          <p
            style={{
              margin: 0,
              fontFamily: "var(--ih-font-serif)",
              fontStyle: "italic",
              fontSize: 18,
              color: "var(--ih-ink)",
            }}
          >
            {submission.signature}
          </p>
        </div>
      )}
    </div>
  )
}
