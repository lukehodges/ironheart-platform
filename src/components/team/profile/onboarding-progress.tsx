"use client"

import { toast } from "sonner"
import { api } from "@/lib/trpc/react"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

type ChecklistStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED"

interface ChecklistItem {
  key: string
  label: string
  description: string
  isRequired: boolean
  order: number
}

interface ChecklistItemProgress extends ChecklistItem {
  completedAt: string | null
  completedBy: string | null
}

interface ChecklistProgress {
  id: string
  userId: string
  templateId: string
  templateName: string
  status: ChecklistStatus
  items: ChecklistItemProgress[]
  startedAt: Date | null
  completedAt: Date | null
}

const statusVariant: Record<ChecklistStatus, "secondary" | "warning" | "success"> = {
  NOT_STARTED: "secondary",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
}

const statusLabel: Record<ChecklistStatus, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
}

export function OnboardingProgress({ memberId }: { memberId: string }) {
  const utils = api.useUtils()

  const { data: progressList, isLoading } =
    api.team.onboarding.getProgress.useQuery({ userId: memberId })

  const completeMutation = api.team.onboarding.completeItem.useMutation({
    onSuccess: () => {
      toast.success("Item completed")
      void utils.team.onboarding.getProgress.invalidate({ userId: memberId })
    },
    onError: (err) => toast.error(err.message ?? "Failed to complete item"),
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  const activeChecklists = (progressList ?? []).filter(
    (p) => p.status !== "COMPLETED"
  )

  if (activeChecklists.length === 0) {
    return null
  }

  return (
    <div className="space-y-6">
      {activeChecklists.map((checklist) => {
        const requiredItems = checklist.items.filter((i) => i.isRequired)
        const completedRequired = requiredItems.filter(
          (i) => i.completedAt !== null
        ).length
        const totalRequired = requiredItems.length
        const pct =
          totalRequired > 0
            ? Math.round((completedRequired / totalRequired) * 100)
            : 0

        return (
          <div key={checklist.id} className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">{checklist.templateName}</h4>
              <Badge
                variant={statusVariant[checklist.status]}
                className="text-[10px]"
              >
                {statusLabel[checklist.status]}
              </Badge>
            </div>

            {/* Progress bar */}
            {totalRequired > 0 && (
              <div className="space-y-1">
                <Progress value={pct} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {completedRequired} / {totalRequired} required item
                  {totalRequired !== 1 ? "s" : ""} completed
                </p>
              </div>
            )}

            {/* Item list */}
            <div className="space-y-1">
              {checklist.items
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((item) => {
                  const isCompleted = item.completedAt !== null
                  return (
                    <div
                      key={item.key}
                      className="flex items-start gap-3 rounded-lg border border-border px-4 py-3"
                    >
                      <Checkbox
                        checked={isCompleted}
                        disabled={
                          isCompleted || completeMutation.isPending
                        }
                        onCheckedChange={() => {
                          if (!isCompleted) {
                            completeMutation.mutate({
                              progressId: checklist.id,
                              itemKey: item.key,
                            })
                          }
                        }}
                        aria-label={`Mark "${item.label}" as complete`}
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "text-sm",
                            isCompleted &&
                              "line-through text-muted-foreground"
                          )}
                        >
                          {item.label}
                          {item.isRequired && (
                            <span className="text-destructive ml-0.5">
                              *
                            </span>
                          )}
                        </span>
                        {item.description && (
                          <p
                            className={cn(
                              "text-xs text-muted-foreground mt-0.5",
                              isCompleted && "line-through"
                            )}
                          >
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
