"use client"

import { useState } from "react"
import { ChevronRight, Plus, Pencil, Archive } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/trpc/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible"
import type { Department } from "@/modules/team/team.types"

interface DepartmentTreeProps {
  onEdit: (dept: Department) => void
  onCreate: (parentId?: string) => void
}

function DepartmentTreeNode({
  department,
  depth,
  onEdit,
  onCreate,
  onArchive,
}: {
  department: Department
  depth: number
  onEdit: (dept: Department) => void
  onCreate: (parentId?: string) => void
  onArchive: (dept: Department) => void
}) {
  const [open, setOpen] = useState(true)
  const hasChildren = department.children.length > 0

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors"
        style={{ paddingLeft: depth * 24 + "px" }}
      >
        {/* Expand/collapse chevron */}
        {hasChildren ? (
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm hover:bg-muted"
              aria-label={open ? "Collapse" : "Expand"}
            >
              <ChevronRight
                className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-200"
                style={{ transform: open ? "rotate(90deg)" : undefined }}
              />
            </button>
          </CollapsibleTrigger>
        ) : (
          <span className="h-5 w-5 shrink-0" />
        )}

        {/* Color dot */}
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full border border-border"
          style={{ backgroundColor: department.color ?? undefined }}
          aria-hidden="true"
        />

        {/* Department name */}
        <span className="text-sm font-medium truncate">{department.name}</span>

        {/* Member count badge */}
        <Badge variant="secondary" className="text-[10px] shrink-0">
          {department.memberCount}
        </Badge>

        {/* Action buttons — visible on hover */}
        <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onCreate(department.id)}
            aria-label={`Add sub-department to ${department.name}`}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onEdit(department)}
            aria-label={`Edit ${department.name}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onArchive(department)}
            aria-label={`Archive ${department.name}`}
          >
            <Archive className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {hasChildren && (
        <CollapsibleContent>
          {department.children.map((child) => (
            <DepartmentTreeNode
              key={child.id}
              department={child}
              depth={depth + 1}
              onEdit={onEdit}
              onCreate={onCreate}
              onArchive={onArchive}
            />
          ))}
        </CollapsibleContent>
      )}
    </Collapsible>
  )
}

function TreeSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 px-2 py-1.5" style={{ paddingLeft: (i % 2) * 24 + "px" }}>
          <Skeleton className="h-5 w-5 rounded-sm" />
          <Skeleton className="h-2.5 w-2.5 rounded-full" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-6 rounded-full" />
        </div>
      ))}
    </div>
  )
}

export function DepartmentTree({ onEdit, onCreate }: DepartmentTreeProps) {
  const utils = api.useUtils()
  const { data: departments, isLoading } = api.team.departments.list.useQuery()

  const deleteMutation = api.team.departments.delete.useMutation({
    onSuccess: () => {
      toast.success("Department archived")
      void utils.team.departments.list.invalidate()
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to archive department")
    },
  })

  function handleArchive(dept: Department) {
    deleteMutation.mutate({ id: dept.id })
  }

  if (isLoading) {
    return <TreeSkeleton />
  }

  if (!departments || departments.length === 0) {
    return (
      <EmptyState
        title="No departments yet"
        description="Create your first department to organize your team."
        action={{ label: "Create Department", onClick: () => onCreate() }}
      />
    )
  }

  return (
    <div className="rounded-lg border border-border p-2">
      {departments.map((dept) => (
        <DepartmentTreeNode
          key={dept.id}
          department={dept}
          depth={0}
          onEdit={onEdit}
          onCreate={onCreate}
          onArchive={handleArchive}
        />
      ))}
    </div>
  )
}
