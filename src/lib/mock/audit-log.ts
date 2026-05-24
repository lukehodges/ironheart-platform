/**
 * Mock data for system audit log (/admin/audit).
 *
 * Shape mirrors future tRPC `auditLog.list` procedure. Required DB fields:
 *   auditLog: id, severity, occurredAt, actorId (FK), actorRole, action, entity,
 *             diff (text/jsonb), ipAddress, tenantId
 */

export type LogSeverity = "DEBUG" | "INFO" | "WARNING" | "ERROR" | "CRITICAL"

export interface AuditLogEntry {
  id: string
  severity: LogSeverity
  when: string         /* display label */
  whenTs: number       /* epoch ms */
  actor: { name: string; role: string }
  action: string
  entity: string
  diff: string
  ip: string
}

export type AuditTimeframe = "24h" | "7d" | "all"

export interface AuditLogFilters {
  severity?: LogSeverity[]
  actorRole?: string[]
  entityPrefix?: string[]    /* e.g. "ENG-", "USR-", "INV-" */
  timeframe?: AuditTimeframe
}

export interface AuditLogQuery {
  filters?: AuditLogFilters
  search?: string
}

const NOW = Date.now()
const HRS = (h: number) => NOW - h * 60 * 60 * 1000
const DAYS = (d: number) => NOW - d * 24 * 60 * 60 * 1000

const ENTRIES: AuditLogEntry[] = [
  { id: "log-1",  severity: "WARNING",  when: "10:42:18",  whenTs: HRS(1),  actor: { name: "Luke Hodges", role: "owner" },        action: "ENGAGEMENT.STAGE_CHANGE",   entity: "ENG-0027", diff: "AUDITING → REPORTING",            ip: "82.14.12.4" },
  { id: "log-2",  severity: "INFO",     when: "10:42:17",  whenTs: HRS(1),  actor: { name: "system",      role: "workflow" },     action: "AUDIT_REPORT.GENERATE",     entity: "AR-0027",  diff: "status: NULL → DRAFT",            ip: "—" },
  { id: "log-3",  severity: "INFO",     when: "10:39:02",  whenTs: HRS(1),  actor: { name: "Luke Hodges", role: "owner" },        action: "FINDING.CREATE",            entity: "F-0431",   diff: "OPS · 'Shift handoff via WhatsApp'", ip: "82.14.12.4" },
  { id: "log-4",  severity: "INFO",     when: "10:21:55",  whenTs: HRS(1),  actor: { name: "Sarah Chen",  role: "client" },       action: "APPROVAL.GRANT",            entity: "DEL-0099", diff: "PENDING → ACCEPTED",              ip: "212.45.9.18" },
  { id: "log-5",  severity: "INFO",     when: "09:11:30",  whenTs: HRS(3),  actor: { name: "system",      role: "workflow" },     action: "INVOICE.CREATE",            entity: "NW-002",   diff: "amount: £6,125 · status: SENT",   ip: "—" },
  { id: "log-6",  severity: "ERROR",    when: "08:54:12",  whenTs: HRS(4),  actor: { name: "system",      role: "scheduler" },    action: "WORKFLOW.RUN_FAILED",       entity: "WF-021",   diff: "step 3 timeout · retry 1/3",      ip: "—" },
  { id: "log-7",  severity: "WARNING",  when: "Wed 16:24", whenTs: DAYS(2), actor: { name: "Luke Hodges", role: "owner" },        action: "PERMISSION.IMPERSONATE",    entity: "USR-209",  diff: "started · target Sarah Chen",     ip: "82.14.12.4" },
  { id: "log-8",  severity: "INFO",     when: "Wed 14:02", whenTs: DAYS(2), actor: { name: "Tom Hardy",   role: "client_admin" }, action: "USER.INVITE",               entity: "USR-213",  diff: "tom@northwind.co → portal_viewer", ip: "212.45.9.18" },
  { id: "log-9",  severity: "INFO",     when: "Wed 11:18", whenTs: DAYS(2), actor: { name: "Priya Patel", role: "staff" },        action: "DELIVERABLE.UPLOAD",        entity: "DEL-0098", diff: "file: workflow-gap-v3.pdf · 4.2MB", ip: "82.14.12.4" },
  { id: "log-10", severity: "CRITICAL", when: "Tue 22:01", whenTs: DAYS(3), actor: { name: "—",           role: "external" },     action: "AUTH.LOGIN_FAILED",         entity: "USR-209",  diff: "5 attempts · IP blocked 1h",      ip: "104.28.12.9" },
  { id: "log-11", severity: "INFO",     when: "Tue 18:33", whenTs: DAYS(3), actor: { name: "Alex Wong",   role: "staff" },        action: "AUDIT_SESSION.UPDATE_LENS", entity: "AS-0027",  diff: "TECHNOLOGY · rag: NULL → AMBER",  ip: "82.14.12.4" },
  { id: "log-12", severity: "INFO",     when: "Tue 14:00", whenTs: DAYS(3), actor: { name: "system",      role: "billing" },      action: "PAYMENT.RECEIVED",          entity: "INV-NW-001", diff: "Stripe · £12,250 · card_visa",  ip: "—" },
]

const SEV_ORDER: Record<LogSeverity, number> = { DEBUG: 0, INFO: 1, WARNING: 2, ERROR: 3, CRITICAL: 4 }

export const mockAuditLog = {
  list(q: AuditLogQuery = {}): AuditLogEntry[] {
    const f = q.filters
    const now = Date.now()
    const sinceTs = !f?.timeframe || f.timeframe === "all" ? undefined
      : now - (f.timeframe === "24h" ? 24 * 3600_000 : 7 * 24 * 3600_000)
    return ENTRIES.filter(r => {
      if (f?.severity?.length && !f.severity.includes(r.severity)) return false
      if (f?.actorRole?.length && !f.actorRole.includes(r.actor.role)) return false
      if (f?.entityPrefix?.length && !f.entityPrefix.some(p => r.entity.startsWith(p))) return false
      if (sinceTs !== undefined && r.whenTs < sinceTs) return false
      if (q.search?.trim()) {
        const s = q.search.toLowerCase()
        const blob = `${r.action} ${r.entity} ${r.actor.name} ${r.actor.role} ${r.diff}`.toLowerCase()
        if (!blob.includes(s)) return false
      }
      return true
    }).sort((a, b) => b.whenTs - a.whenTs)
  },

  stats(rows: AuditLogEntry[]) {
    return {
      total: rows.length,
      warnings: rows.filter(r => r.severity === "WARNING").length,
      errors: rows.filter(r => r.severity === "ERROR" || r.severity === "CRITICAL").length,
      logins: rows.filter(r => r.action.startsWith("AUTH.")).length,
    }
  },

  allRoles(): string[] {
    return Array.from(new Set(ENTRIES.map(r => r.actor.role))).sort()
  },

  allEntityPrefixes(): string[] {
    return Array.from(new Set(ENTRIES.map(r => r.entity.split("-")[0] + "-"))).sort()
  },

  minSeverity: SEV_ORDER,
}
