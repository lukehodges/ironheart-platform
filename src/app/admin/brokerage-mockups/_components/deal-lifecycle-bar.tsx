"use client";

import Link from "next/link";
import type { LifecycleStage } from "../_mock-data";

interface DealLifecycleBarProps {
  currentStage: LifecycleStage;
  completedStages: LifecycleStage[];
  track: "supply" | "demand" | "matched";
  dealId: string;
}

const SUPPLY_STAGES: LifecycleStage[] = ["Prospect", "Assess", "Legal", "Allocate"];
const DEMAND_STAGES: LifecycleStage[] = ["Prospect", "Match", "Quote"];
const MATCHED_STAGES: LifecycleStage[] = [
  "Prospect", "Assess", "Legal", "Match", "Quote",
  "Agreement", "Payment", "Allocate", "Confirm", "Compliance",
];

function getStageLink(stage: LifecycleStage, dealId: string): string {
  const base = "/admin/brokerage-mockups";
  switch (stage) {
    case "Prospect": return `${base}/deals/${dealId}`;
    case "Assess": return `${base}/assessments`;
    case "Legal": return `${base}/documents`;
    case "Match": return `${base}/matching`;
    case "Quote": return `${base}/deals/${dealId}/quote`;
    case "Agreement": return `${base}/deals/${dealId}/agreement`;
    case "Payment": return `${base}/financials/invoices`;
    case "Allocate": return `${base}/inventory`;
    case "Confirm": return `${base}/compliance`;
    case "Compliance": return `${base}/compliance`;
  }
}

export function DealLifecycleBar({ currentStage, completedStages, track, dealId }: DealLifecycleBarProps) {
  const stages = track === "supply"
    ? SUPPLY_STAGES
    : track === "demand"
      ? DEMAND_STAGES
      : MATCHED_STAGES;

  const currentIdx = stages.indexOf(currentStage);

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-center gap-0 min-w-max px-2 py-3">
        {stages.map((stage, i) => {
          const isCompleted = completedStages.includes(stage);
          const isCurrent = stage === currentStage;
          const isUpcoming = !isCompleted && !isCurrent;
          const isLast = i === stages.length - 1;

          const node = (
            <div className="flex flex-col items-center gap-1.5 min-w-[72px]">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                  isCompleted
                    ? "bg-emerald-500 text-white"
                    : isCurrent
                      ? "bg-blue-500 text-white animate-pulse"
                      : "border-2 border-border bg-background text-muted-foreground"
                }`}
              >
                {isCompleted ? "✓" : i + 1}
              </div>
              <span
                className={`text-[10px] leading-tight text-center font-medium ${
                  isCompleted
                    ? "text-emerald-600 dark:text-emerald-400"
                    : isCurrent
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-muted-foreground"
                }`}
              >
                {stage}
              </span>
            </div>
          );

          const isClickable = isCompleted || isCurrent;

          return (
            <div key={stage} className="flex items-center">
              {isClickable ? (
                <Link href={getStageLink(stage, dealId)} className="hover:opacity-80 transition-opacity">
                  {node}
                </Link>
              ) : (
                node
              )}
              {!isLast && (
                <div
                  className={`h-0.5 w-8 mx-1 mt-[-18px] ${
                    isCompleted && (i < currentIdx || completedStages.includes(stages[i + 1]))
                      ? "bg-emerald-500"
                      : isCurrent
                        ? "bg-blue-500/50"
                        : "border-t-2 border-dashed border-border"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
