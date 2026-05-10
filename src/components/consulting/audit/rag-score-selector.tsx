"use client"

import { cn } from "@/lib/utils"

type RagScore = "RED" | "AMBER" | "GREEN"

interface RagScoreSelectorProps {
  value: RagScore | null
  onChange: (score: RagScore) => void
  disabled?: boolean
}

const SCORES: { value: RagScore; label: string; selected: string; unselected: string }[] = [
  {
    value: "RED",
    label: "Red",
    selected: "bg-red-500 hover:bg-red-600 text-white border-red-500",
    unselected: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
  },
  {
    value: "AMBER",
    label: "Amber",
    selected: "bg-amber-500 hover:bg-amber-600 text-white border-amber-500",
    unselected: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
  },
  {
    value: "GREEN",
    label: "Green",
    selected: "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500",
    unselected: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
  },
]

export function RagScoreSelector({ value, onChange, disabled }: RagScoreSelectorProps) {
  return (
    <div className="flex gap-3">
      {SCORES.map((score) => {
        const isSelected = value === score.value
        return (
          <button
            key={score.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(score.value)}
            className={cn(
              "flex-1 rounded-lg border-2 py-3 px-4 text-sm font-semibold transition-all",
              "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-400",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              isSelected ? score.selected : score.unselected,
              isSelected && "ring-2 ring-offset-1 ring-zinc-300 shadow-sm"
            )}
          >
            {score.label}
          </button>
        )
      })}
    </div>
  )
}
