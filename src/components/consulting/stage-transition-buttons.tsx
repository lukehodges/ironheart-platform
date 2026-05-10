"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { ArrowRight, X } from "lucide-react"
import type { EngagementStage } from "./stage-badge"

const VALID_TRANSITIONS: Record<string, EngagementStage[]> = {
  DISCOVERY: ["PROPOSAL", "CLOSED_LOST"],
  PROPOSAL: ["CONTRACTED", "CLOSED_LOST"],
  CONTRACTED: ["ONBOARDING", "CLOSED_LOST"],
  ONBOARDING: ["AUDITING", "CLOSED_LOST"],
  AUDITING: ["REPORTING", "CLOSED_LOST"],
  REPORTING: ["IMPLEMENTING", "CLOSED_WON", "CLOSED_LOST"],
  IMPLEMENTING: ["RETAINER", "CLOSED_WON", "CLOSED_LOST"],
  RETAINER: ["CLOSED_WON", "CLOSED_LOST"],
}

const STAGE_LABELS: Record<string, string> = {
  DISCOVERY: "Discovery",
  PROPOSAL: "Proposal",
  CONTRACTED: "Contracted",
  ONBOARDING: "Onboarding",
  AUDITING: "Auditing",
  REPORTING: "Reporting",
  IMPLEMENTING: "Implementing",
  RETAINER: "Retainer",
  CLOSED_WON: "Closed Won",
  CLOSED_LOST: "Closed Lost",
}

interface StageTransitionButtonsProps {
  currentStage: EngagementStage | string | null
  onTransition: (targetStage: EngagementStage, notes?: string) => void
  isLoading?: boolean
}

export function StageTransitionButtons({
  currentStage,
  onTransition,
  isLoading,
}: StageTransitionButtonsProps) {
  const [confirmTarget, setConfirmTarget] = useState<EngagementStage | null>(null)
  const [notes, setNotes] = useState("")

  const stage = (currentStage ?? "DISCOVERY") as string
  const nextStages = VALID_TRANSITIONS[stage] ?? []

  if (nextStages.length === 0) return null

  const handleConfirm = () => {
    if (!confirmTarget) return
    onTransition(confirmTarget, confirmTarget === "CLOSED_LOST" ? notes : undefined)
    setConfirmTarget(null)
    setNotes("")
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {nextStages.map((target) => {
          const isClose = target === "CLOSED_LOST"
          return (
            <Button
              key={target}
              variant={isClose ? "destructive" : "outline"}
              size="sm"
              disabled={isLoading}
              onClick={() => setConfirmTarget(target)}
            >
              {isClose ? (
                <>
                  <X className="mr-1.5 h-3.5 w-3.5" />
                  Close Lost
                </>
              ) : (
                <>
                  <ArrowRight className="mr-1.5 h-3.5 w-3.5" />
                  {STAGE_LABELS[target] ?? target}
                </>
              )}
            </Button>
          )
        })}
      </div>

      <Dialog open={!!confirmTarget} onOpenChange={(open) => !open && setConfirmTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Transition to {confirmTarget ? STAGE_LABELS[confirmTarget] ?? confirmTarget : ""}?
            </DialogTitle>
            <DialogDescription>
              This will move the engagement from {STAGE_LABELS[stage] ?? stage} to{" "}
              {confirmTarget ? STAGE_LABELS[confirmTarget] ?? confirmTarget : ""}.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {confirmTarget === "CLOSED_LOST" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason for closing</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Why is this engagement being closed?"
                rows={3}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmTarget(null)}>
              Cancel
            </Button>
            <Button
              variant={confirmTarget === "CLOSED_LOST" ? "destructive" : "default"}
              onClick={handleConfirm}
              disabled={isLoading}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
