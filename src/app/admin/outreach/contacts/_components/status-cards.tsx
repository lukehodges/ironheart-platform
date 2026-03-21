"use client";

import type { OutreachContactStatus } from "@/modules/outreach/outreach.types";
import { cn } from "@/lib/utils";

interface StatusCardsProps {
  counts: Record<string, number>;
  activeStatus: OutreachContactStatus | null;
  onStatusClick: (status: OutreachContactStatus | null) => void;
}

const STATUS_CONFIG: {
  value: OutreachContactStatus;
  label: string;
  color: string;
  activeColor: string;
}[] = [
  {
    value: "ACTIVE",
    label: "Active",
    color: "border-blue-300 text-blue-600",
    activeColor: "bg-blue-50 ring-blue-400",
  },
  {
    value: "REPLIED",
    label: "Replied",
    color: "border-emerald-300 text-emerald-600",
    activeColor: "bg-emerald-50 ring-emerald-400",
  },
  {
    value: "PAUSED",
    label: "Paused",
    color: "border-amber-300 text-amber-600",
    activeColor: "bg-amber-50 ring-amber-400",
  },
  {
    value: "COMPLETED",
    label: "Completed",
    color: "border-gray-300 text-gray-600",
    activeColor: "bg-gray-50 ring-gray-400",
  },
  {
    value: "BOUNCED",
    label: "Bounced",
    color: "border-red-300 text-red-600",
    activeColor: "bg-red-50 ring-red-400",
  },
  {
    value: "OPTED_OUT",
    label: "Opted Out",
    color: "border-gray-300 text-gray-400",
    activeColor: "bg-gray-50 ring-gray-300",
  },
  {
    value: "CONVERTED",
    label: "Converted",
    color: "border-purple-300 text-purple-600",
    activeColor: "bg-purple-50 ring-purple-400",
  },
];

export function StatusCards({
  counts,
  activeStatus,
  onStatusClick,
}: StatusCardsProps) {
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onStatusClick(null)}
        className={cn(
          "rounded-lg border px-3 py-2 text-left transition-colors",
          activeStatus === null
            ? "ring-2 ring-slate-400 bg-slate-50"
            : "hover:bg-muted/50"
        )}
      >
        <div className="text-lg font-semibold font-mono">{total}</div>
        <div className="text-[10px] text-muted-foreground">All</div>
      </button>

      {STATUS_CONFIG.map(({ value, label, color, activeColor }) => {
        const isActive = activeStatus === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => onStatusClick(isActive ? null : value)}
            className={cn(
              "rounded-lg border px-3 py-2 text-left transition-colors",
              color,
              isActive ? `ring-2 ${activeColor}` : "hover:bg-muted/50"
            )}
          >
            <div className="text-lg font-semibold font-mono">
              {counts[value] ?? 0}
            </div>
            <div className="text-[10px]">{label}</div>
          </button>
        );
      })}
    </div>
  );
}
