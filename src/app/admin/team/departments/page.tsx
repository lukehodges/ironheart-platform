"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Plus } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { DepartmentTree } from "@/components/team/departments/department-tree"
import { DepartmentDialog } from "@/components/team/departments/department-dialog"
import type { Department } from "@/modules/team/team.types"

export default function DepartmentsPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(
    null,
  )
  const [parentIdForCreate, setParentIdForCreate] = useState<
    string | undefined
  >()

  function handleEdit(dept: Department) {
    setEditingDepartment(dept)
    setParentIdForCreate(undefined)
    setDialogOpen(true)
  }

  function handleCreate(parentId?: string) {
    setEditingDepartment(null)
    setParentIdForCreate(parentId)
    setDialogOpen(true)
  }

  function handleOpenChange(open: boolean) {
    setDialogOpen(open)
    if (!open) {
      setEditingDepartment(null)
      setParentIdForCreate(undefined)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back button */}
      <Link
        href="/admin/team"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Team
      </Link>

      {/* Page header */}
      <PageHeader
        title="Departments"
        description="Organize your team into departments and sub-departments."
      >
        <Button
          size="sm"
          onClick={() => handleCreate()}
          aria-label="Add department"
        >
          <Plus className="h-4 w-4" />
          Add Department
        </Button>
      </PageHeader>

      {/* Department tree */}
      <DepartmentTree onEdit={handleEdit} onCreate={handleCreate} />

      {/* Department dialog */}
      <DepartmentDialog
        open={dialogOpen}
        onOpenChange={handleOpenChange}
        department={editingDepartment}
        parentId={parentIdForCreate}
      />
    </div>
  )
}
