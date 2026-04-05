"use client"

import { useState } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { GripVertical, ChevronRight, MoreHorizontal, Trash2, FileText, CreditCard } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/format-currency"
import { api } from "@/lib/trpc/react"
import { toast } from "sonner"
import type { MilestoneRecord, DeliverableRecord, MilestoneStatus } from "@/modules/client-portal/client-portal.types"

const STATUS_CLASSES: Record<MilestoneStatus, string> = {
  UPCOMING: "bg-secondary text-secondary-foreground border-secondary",
  IN_PROGRESS: "bg-primary/10 text-primary border-primary/20",
  COMPLETED: "bg-green-500/10 text-green-600 border-green-500/20",
}

function formatDate(date: Date | null): string {
  if (!date) return ""
  return new Date(date).toISOString().split("T")[0]!
}

interface MilestoneCardProps {
  milestone: MilestoneRecord
  deliverables: DeliverableRecord[]
  isActive: boolean
  onInvalidate: () => void
}

export function MilestoneCard({ milestone, deliverables, isActive, onInvalidate }: MilestoneCardProps) {
  const [expanded, setExpanded] = useState(isActive)
  const [title, setTitle] = useState(milestone.title)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: milestone.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const updateMutation = api.clientPortal.admin.updateMilestone.useMutation({
    onSuccess: () => onInvalidate(),
    onError: (err) => toast.error(err.message),
  })

  const handleStatusClick = (status: MilestoneStatus) => {
    updateMutation.mutate({
      id: milestone.id,
      status,
    })
  }

  const handleTitleBlur = () => {
    if (title !== milestone.title && title.trim()) {
      updateMutation.mutate({ id: milestone.id, title: title.trim() })
    }
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value ? new Date(e.target.value) : null
    updateMutation.mutate({ id: milestone.id, dueDate: date })
  }

  const milestoneDeliverables = deliverables.filter((d) => d.milestoneId === milestone.id)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md",
        isActive && "border-primary/30"
      )}
    >
      <div className="flex items-center gap-4 px-5 py-4">
        {/* Drag handle */}
        <button
          className="flex flex-col gap-0.5 text-muted-foreground/50 hover:text-muted-foreground cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              className="text-sm font-medium bg-transparent border-b border-dashed border-transparent hover:border-border focus:border-ring outline-none w-[300px]"
            />
            {isActive && <Badge variant="default" className="text-[10px]">Current</Badge>}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {milestoneDeliverables.length} deliverable{milestoneDeliverables.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-3 shrink-0">
          <input
            type="date"
            value={formatDate(milestone.dueDate)}
            onChange={handleDateChange}
            className="text-xs text-muted-foreground bg-transparent border border-transparent hover:border-border focus:border-ring rounded px-2 py-1 outline-none text-right w-[120px]"
          />

          {/* Status stepper */}
          <div className="flex gap-0.5">
            {(["UPCOMING", "IN_PROGRESS", "COMPLETED"] as MilestoneStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => handleStatusClick(s)}
                className={cn(
                  "px-2.5 py-0.5 text-[10px] font-semibold border transition-colors",
                  s === "UPCOMING" && "rounded-l",
                  s === "COMPLETED" && "rounded-r",
                  milestone.status === s ? STATUS_CLASSES[s] : "bg-background text-muted-foreground border-border"
                )}
              >
                {s === "IN_PROGRESS" ? "In Progress" : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight className={cn("h-4 w-4 transition-transform", expanded && "rotate-90")} />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Expanded deliverables */}
      {expanded && milestoneDeliverables.length > 0 && (
        <div className="border-t px-5 py-3 ml-9">
          {milestoneDeliverables.map((d) => (
            <div key={d.id} className="flex items-center gap-2.5 py-2 border-b last:border-0">
              <div
                className={cn(
                  "h-4.5 w-4.5 rounded border flex items-center justify-center shrink-0",
                  d.status === "ACCEPTED" || d.status === "DELIVERED"
                    ? "bg-green-500 border-green-500 text-white"
                    : "border-input"
                )}
              >
                {(d.status === "ACCEPTED" || d.status === "DELIVERED") && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                )}
              </div>
              <span className={cn("text-sm flex-1", (d.status === "ACCEPTED" || d.status === "DELIVERED") && "line-through text-muted-foreground")}>
                {d.title}
              </span>
              {d.status !== "PENDING" && (
                <Badge variant="default" className="text-[10px]">
                  {d.status === "ACCEPTED" ? "Approved" : "Delivered"}
                </Badge>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
