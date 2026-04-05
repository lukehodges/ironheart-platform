"use client"

import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core"
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { api } from "@/lib/trpc/react"
import { toast } from "sonner"
import { MilestoneCard } from "./milestone-card"
import type { MilestoneRecord, DeliverableRecord } from "@/modules/client-portal/client-portal.types"

interface MilestonesTabProps {
  engagementId: string
  milestones: MilestoneRecord[]
  deliverables: DeliverableRecord[]
  onInvalidate: () => void
  onAddMilestone: () => void
}

export function MilestonesTab({
  engagementId,
  milestones,
  deliverables,
  onInvalidate,
  onAddMilestone,
}: MilestonesTabProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const updateMutation = api.clientPortal.admin.updateMilestone.useMutation({
    onSuccess: () => onInvalidate(),
    onError: (err) => toast.error(err.message),
  })

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = milestones.findIndex((m) => m.id === active.id)
    const newIndex = milestones.findIndex((m) => m.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    // Update sort orders for affected milestones
    const reordered = [...milestones]
    const [moved] = reordered.splice(oldIndex, 1)
    reordered.splice(newIndex, 0, moved!)

    reordered.forEach((m, i) => {
      if (m.sortOrder !== i) {
        updateMutation.mutate({ id: m.id, sortOrder: i })
      }
    })
  }

  const sorted = [...milestones].sort((a, b) => a.sortOrder - b.sortOrder)
  const activeId = sorted.find((m) => m.status === "IN_PROGRESS")?.id

  const completed = sorted.filter((m) => m.status === "COMPLETED").length
  const inProgress = sorted.filter((m) => m.status === "IN_PROGRESS").length
  const upcoming = sorted.filter((m) => m.status === "UPCOMING").length

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {sorted.length} milestone{sorted.length !== 1 ? "s" : ""}
          {sorted.length > 0 && ` · ${completed} completed, ${inProgress} in progress, ${upcoming} upcoming`}
        </p>
        <Button size="sm" onClick={onAddMilestone}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Milestone
        </Button>
      </div>

      <div className="flex flex-col gap-3 mt-4">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sorted.map((m) => m.id)} strategy={verticalListSortingStrategy}>
            {sorted.map((milestone) => (
              <MilestoneCard
                key={milestone.id}
                milestone={milestone}
                deliverables={deliverables}
                isActive={milestone.id === activeId}
                onInvalidate={onInvalidate}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  )
}
