"use client"

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
  const colors: Record<"RED" | "AMBER" | "GREEN", string> = {
    RED: "bg-red-500 border-red-700 text-white",
    AMBER: "bg-amber-500 border-amber-700 text-white",
    GREEN: "bg-emerald-500 border-emerald-700 text-white",
  }
  return (
    <div className="flex gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          disabled={disabled}
          className={`px-6 py-3 rounded-md border-2 text-sm font-mono font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            value === opt
              ? colors[opt]
              : "bg-background border-border text-muted-foreground hover:border-foreground"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}
