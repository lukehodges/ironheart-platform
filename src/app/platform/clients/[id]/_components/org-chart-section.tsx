"use client"

import Link from "next/link"
import { Icon } from "@/components/shell"
import { api } from "@/lib/trpc/react"
import type { OrgChartTree } from "@/modules/onboarding/onboarding.types"

interface OrgChartSectionProps {
  engagementId: string
  companyLabel: string
}

function countNodes(tree: OrgChartTree[]): { departments: number; roles: number; people: number } {
  let departments = 0
  let roles = 0
  let people = 0
  const walk = (nodes: OrgChartTree[]) => {
    for (const n of nodes) {
      if (n.type === "DEPARTMENT") departments++
      else if (n.type === "ROLE") roles++
      else if (n.type === "PERSON") people++
      if (n.children.length) walk(n.children)
    }
  }
  walk(tree)
  return { departments, roles, people }
}

/** Compact org-chart preview rendered inside the engagement hub.
 *  Pulls live data via api.onboarding.getChart and links out to the
 *  full-page editor at /platform/clients/[id]/onboarding (Phase 0.1.C). */
export function OrgChartSection({ engagementId, companyLabel }: OrgChartSectionProps) {
  const chartQuery = api.onboarding.getChart.useQuery({ engagementId })

  const tree = chartQuery.data ?? []
  const isEmpty = tree.length === 0
  const counts = countNodes(tree)

  return (
    <div className="ih-card" style={{ marginBottom: 24 }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--ih-line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <span className="ih-eyebrow">Org chart</span>
          <h3 style={{ margin: "2px 0 0", fontSize: 15, fontWeight: 600 }}>{companyLabel}</h3>
        </div>
        <Link href={`/platform/clients/${engagementId}/onboarding`} className="ih-btn ih-btn-quiet ih-btn-sm" style={{ textDecoration: "none" }}>
          {isEmpty ? <><Icon name="plus" size={11} /> Build org chart</> : <>Open editor <Icon name="arrowUpRight" size={11} /></>}
        </Link>
      </div>
      <div style={{ padding: "16px 18px" }}>
        {chartQuery.isLoading && (
          <div style={{ fontSize: 12, color: "var(--ih-ink-50)" }}>Loading chart…</div>
        )}
        {chartQuery.error && (
          <div style={{ fontSize: 12, color: "var(--ih-danger)" }}>{chartQuery.error.message}</div>
        )}
        {!chartQuery.isLoading && !chartQuery.error && isEmpty && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
            <div style={{ fontSize: 12.5, color: "var(--ih-ink-65)", lineHeight: 1.5 }}>
              No org chart yet for this engagement. The chart drives form routing and audit
              sampling — build it now to seed questionnaires.
            </div>
            <Link href={`/platform/clients/${engagementId}/onboarding`} className="ih-btn ih-btn-accent ih-btn-sm" style={{ textDecoration: "none" }}>
              <Icon name="plus" size={11} /> Build org chart
            </Link>
          </div>
        )}
        {!chartQuery.isLoading && !chartQuery.error && !isEmpty && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: "var(--ih-line)", border: "1px solid var(--ih-line)", borderRadius: "var(--ih-r-md)", overflow: "hidden", marginBottom: 12 }}>
              {[
                { label: "Departments", value: counts.departments, icon: "building" as const },
                { label: "Roles",       value: counts.roles,       icon: "users" as const },
                { label: "People",      value: counts.people,      icon: "user" as const },
              ].map((s) => (
                <div key={s.label} style={{ background: "var(--ih-surface)", padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <span className="ih-eyebrow">{s.label}</span>
                    <Icon name={s.icon} size={12} style={{ color: "var(--ih-ink-30)" }} />
                  </div>
                  <div className="ih-serif ih-num" style={{ fontSize: 24, lineHeight: 1 }}>{s.value}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {tree.slice(0, 4).map((node) => (
                <OrgRow key={node.id} node={node} depth={0} />
              ))}
              {tree.length > 4 && (
                <div className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-40)", paddingLeft: 6 }}>
                  …and {tree.length - 4} more top-level nodes
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function OrgRow({ node, depth }: { node: OrgChartTree; depth: number }) {
  const TYPE_TONE: Record<string, string> = {
    DEPARTMENT: "var(--ih-ink-30)",
    ROLE: "var(--ih-info)",
    PERSON: "var(--ih-accent)",
  }
  return (
    <>
      <div style={{
        display: "grid",
        gridTemplateColumns: "16px 1fr auto auto",
        gap: 10,
        alignItems: "center",
        padding: "6px 6px",
        paddingLeft: 6 + depth * 16,
        borderBottom: "1px dashed var(--ih-line)",
      }}>
        <span style={{ width: 6, height: 6, borderRadius: 999, background: TYPE_TONE[node.type] ?? "var(--ih-ink-30)" }} />
        <div style={{ minWidth: 0 }}>
          <span style={{ fontSize: 12.5, fontWeight: 500 }}>{node.label}</span>
          {node.contactName && (
            <span style={{ fontSize: 11, color: "var(--ih-ink-50)", marginLeft: 8 }}>
              {node.contactName}{node.contactRole ? ` · ${node.contactRole}` : ""}
            </span>
          )}
        </div>
        <span className="ih-mono" style={{ fontSize: 9.5, color: "var(--ih-ink-40)" }}>{node.type}</span>
        {node.headcount != null && (
          <span className="ih-mono" style={{ fontSize: 10, color: "var(--ih-ink-50)" }}>×{node.headcount}</span>
        )}
      </div>
      {depth < 2 && node.children.slice(0, 4).map((child) => (
        <OrgRow key={child.id} node={child} depth={depth + 1} />
      ))}
    </>
  )
}
