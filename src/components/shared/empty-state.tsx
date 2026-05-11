"use client"

import { Icon, type IconName } from "@/components/shell"

export interface EmptyStateProps {
  icon: IconName
  title: string
  description: string
  action?: { label: string; onClick: () => void }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          background: "var(--ih-surface-2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
        }}
      >
        <Icon name={icon} size={24} style={{ color: "var(--ih-ink-30)" }} />
      </div>
      <h3
        className="ih-serif"
        style={{ margin: "0 0 8px", fontSize: 20, lineHeight: 1.1 }}
      >
        {title}
      </h3>
      <p style={{ margin: 0, fontSize: 13, color: "var(--ih-ink-50)", maxWidth: 320, lineHeight: 1.5 }}>
        {description}
      </p>
      {action && (
        <button
          className="ih-btn ih-btn-accent ih-btn-sm"
          style={{ marginTop: 16 }}
          onClick={action.onClick}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
