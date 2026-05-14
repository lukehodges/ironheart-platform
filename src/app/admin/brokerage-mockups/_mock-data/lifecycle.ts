import type { DealStage, DealSide, LifecycleStage, DealLifecycle } from "./types";

const MATCHED_STAGES: LifecycleStage[] = [
  "Prospect", "Assess", "Legal", "Match", "Quote",
  "Agreement", "Payment", "Allocate", "Confirm", "Compliance",
];

export const STAGE_TO_LIFECYCLE: Record<DealStage, LifecycleStage> = {
  "Prospecting": "Prospect",
  "Initial Contact": "Prospect",
  "Requirements Gathered": "Match",
  "Site Matched": "Match",
  "Quote Sent": "Quote",
  "Quote Accepted": "Quote",
  "Legal Drafting": "Agreement",
  "Legal Review": "Agreement",
  "Contracts Signed": "Agreement",
  "Payment Pending": "Payment",
  "Payment Received": "Payment",
  "Credits Allocated": "Allocate",
  "LPA Confirmed": "Confirm",
  "Completed": "Compliance",
};

export function getDealLifecycle(
  dealId: string,
  dealStage: DealStage,
  side: DealSide,
): DealLifecycle {
  const currentStage = STAGE_TO_LIFECYCLE[dealStage];
  const track = side;
  const currentIdx = MATCHED_STAGES.indexOf(currentStage);
  const completedStages = MATCHED_STAGES.filter((_, i) => i < currentIdx);

  return { dealId, currentStage, completedStages, track };
}
