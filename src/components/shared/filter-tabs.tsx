"use client"

export interface FilterTab {
  label: string
  count?: number
  value: string
}

export interface FilterTabsProps {
  tabs: FilterTab[]
  activeValue: string
  onChange: (value: string) => void
}

export function FilterTabs({ tabs, activeValue, onChange }: FilterTabsProps) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {tabs.map((tab) => {
        const isActive = tab.value === activeValue
        return (
          <button
            key={tab.value}
            className={`ih-btn ${isActive ? "ih-btn-ghost" : "ih-btn-quiet"} ih-btn-sm`}
            style={{ height: 24, fontSize: 11 }}
            onClick={() => onChange(tab.value)}
            aria-pressed={isActive}
          >
            {tab.label}
            {tab.count != null && (
              <span
                className="ih-mono"
                style={{ fontSize: 10, color: "var(--ih-ink-40)", marginLeft: 4 }}
              >
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
