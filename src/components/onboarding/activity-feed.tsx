"use client"

import { api } from "@/lib/trpc/react"

interface ActivityFeedProps {
  mode: "consultant" | "client"
  engagementId: string
}

export function ActivityFeed({ mode, engagementId }: ActivityFeedProps) {
  const query =
    mode === "consultant"
      ? api.onboarding.getActivity.useQuery(
          { engagementId, limit: 30 },
          { refetchInterval: 10_000 },
        )
      : api.onboarding.clientGetActivity.useQuery(
          { engagementId, limit: 30 },
          { refetchInterval: 10_000 },
        )

  if (query.isLoading) {
    return (
      <div style={{ fontSize: 11, color: "var(--ih-ink-50)" }}>Loading activity…</div>
    )
  }

  const rows = query.data?.rows ?? []

  if (rows.length === 0) {
    return (
      <div>
        <p className="ih-eyebrow" style={{ marginBottom: 8 }}>Activity</p>
        <p style={{ fontSize: 11, color: "var(--ih-ink-50)" }}>No activity yet.</p>
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p className="ih-eyebrow" style={{ marginBottom: 4 }}>Activity</p>
      {rows.map((row) => (
        <div key={row.id} style={{ fontSize: 11 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                display: "inline-block",
                width: 6,
                height: 6,
                borderRadius: "50%",
                flexShrink: 0,
                background:
                  row.actorType === "CONSULTANT"
                    ? "var(--ih-info)"
                    : row.actorType === "CLIENT"
                      ? "var(--ih-warn)"
                      : "var(--ih-ink-40)",
              }}
            />
            <span style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--ih-ink)" }}>
              {row.actorName}
            </span>
            <span
              className="ih-mono"
              style={{ marginLeft: "auto", fontSize: 9, color: "var(--ih-ink-40)", flexShrink: 0 }}
            >
              {new Date(row.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <p style={{ color: "var(--ih-ink-65)", marginTop: 2, wordBreak: "break-word", lineHeight: 1.4 }}>
            {row.message}
          </p>
        </div>
      ))}
    </div>
  )
}
