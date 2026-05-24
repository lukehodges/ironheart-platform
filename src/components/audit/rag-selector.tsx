"use client"

const RAG_STYLES: Record<
  "RED" | "AMBER" | "GREEN",
  { active: { bg: string; color: string; border: string }; label: string }
> = {
  RED: {
    active: {
      bg: "rgba(192,57,43,0.1)",
      color: "var(--ih-danger)",
      border: "rgba(192,57,43,0.5)",
    },
    label: "RED",
  },
  AMBER: {
    active: {
      bg: "rgba(184,134,11,0.1)",
      color: "var(--ih-warn)",
      border: "rgba(184,134,11,0.5)",
    },
    label: "AMBER",
  },
  GREEN: {
    active: {
      bg: "rgba(47,111,92,0.1)",
      color: "var(--ih-ok)",
      border: "rgba(47,111,92,0.5)",
    },
    label: "GREEN",
  },
}

export function RagSelector({
  value,
  onChange,
  disabled,
}: {
  value: "RED" | "AMBER" | "GREEN" | null | undefined
  onChange: (val: "RED" | "AMBER" | "GREEN") => void
  disabled?: boolean
}) {
  const options: ("RED" | "AMBER" | "GREEN")[] = ["RED", "AMBER", "GREEN"]

  return (
    <div style={{ display: "flex", gap: 8 }}>
      {options.map((opt) => {
        const isSelected = value === opt
        const s = RAG_STYLES[opt]
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            disabled={disabled}
            style={{
              padding: "10px 24px",
              borderRadius: "var(--ih-r-md)",
              border: isSelected ? `2px solid ${s.active.border}` : "2px solid var(--ih-line)",
              background: isSelected ? s.active.bg : "var(--ih-surface)",
              color: isSelected ? s.active.color : "var(--ih-ink-40)",
              fontFamily: "var(--ih-font-mono)",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.5 : 1,
              transition: "all 0.15s",
              display: "flex",
              alignItems: "center",
              gap: 7,
            }}
          >
            {isSelected && (
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: s.active.color,
                  flexShrink: 0,
                }}
              />
            )}
            {opt}
          </button>
        )
      })}
    </div>
  )
}
