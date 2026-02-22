"use client"

import { useState, useCallback } from "react"
import { toast } from "sonner"
import {
  Search,
  Plus,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Trash2,
  Pencil,
  Eye,
  X,
  GripVertical,
} from "lucide-react"
import { api } from "@/lib/trpc/react"
import { useDebounce } from "@/hooks/use-debounce"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { FormTemplateRecord, FormField, FormFieldType } from "@/modules/forms/forms.types"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 25

const FIELD_TYPES: { value: FormFieldType; label: string }[] = [
  { value: "TEXT", label: "Text" },
  { value: "TEXTAREA", label: "Textarea" },
  { value: "SELECT", label: "Select" },
  { value: "MULTISELECT", label: "Multi-select" },
  { value: "DATE", label: "Date" },
  { value: "BOOLEAN", label: "Yes / No" },
  { value: "EMAIL", label: "Email" },
  { value: "PHONE", label: "Phone" },
]

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "\u2014"
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function createEmptyField(): FormField {
  return {
    id: crypto.randomUUID(),
    type: "TEXT",
    label: "",
    required: false,
  }
}

// ---------------------------------------------------------------------------
// Table skeleton
// ---------------------------------------------------------------------------

function TableRowSkeleton() {
  return (
    <TableRow>
      <TableCell><Skeleton className="h-4 w-36" /></TableCell>
      <TableCell><Skeleton className="h-4 w-10" /></TableCell>
      <TableCell><Skeleton className="h-5 w-16 rounded-md" /></TableCell>
      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
      <TableCell><Skeleton className="h-7 w-7 rounded-md" /></TableCell>
    </TableRow>
  )
}

// ---------------------------------------------------------------------------
// Field editor row
// ---------------------------------------------------------------------------

interface FieldEditorRowProps {
  field: FormField
  onChange: (updated: FormField) => void
  onRemove: () => void
  canRemove: boolean
}

function FieldEditorRow({ field, onChange, onRemove, canRemove }: FieldEditorRowProps) {
  const needsOptions = field.type === "SELECT" || field.type === "MULTISELECT"

  return (
    <div className="flex items-start gap-2 rounded-lg border border-border p-3 bg-muted/30">
      <GripVertical className="h-4 w-4 mt-2.5 text-muted-foreground shrink-0" aria-hidden="true" />

      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          {/* Type select */}
          <Select
            value={field.type}
            onValueChange={(value) =>
              onChange({ ...field, type: value as FormFieldType, options: undefined })
            }
          >
            <SelectTrigger className="h-8 w-[130px] text-xs" aria-label="Field type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FIELD_TYPES.map((ft) => (
                <SelectItem key={ft.value} value={ft.value}>
                  {ft.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Label input */}
          <Input
            value={field.label}
            onChange={(e) => onChange({ ...field, label: e.target.value })}
            placeholder="Field label"
            className="h-8 text-xs flex-1"
            aria-label="Field label"
          />

          {/* Required toggle */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Checkbox
              id={`required-${field.id}`}
              checked={field.required}
              onCheckedChange={(checked) =>
                onChange({ ...field, required: checked === true })
              }
              aria-label="Required field"
            />
            <label
              htmlFor={`required-${field.id}`}
              className="text-xs text-muted-foreground cursor-pointer select-none"
            >
              Required
            </label>
          </div>

          {/* Remove button */}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onRemove}
            disabled={!canRemove}
            aria-label="Remove field"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </div>

        {/* Placeholder */}
        <Input
          value={field.placeholder ?? ""}
          onChange={(e) =>
            onChange({
              ...field,
              placeholder: e.target.value || undefined,
            })
          }
          placeholder="Placeholder text (optional)"
          className="h-7 text-xs"
          aria-label="Placeholder text"
        />

        {/* Options for SELECT/MULTISELECT */}
        {needsOptions && (
          <Input
            value={(field.options ?? []).join(", ")}
            onChange={(e) =>
              onChange({
                ...field,
                options: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            placeholder="Options (comma-separated)"
            className="h-7 text-xs"
            aria-label="Options"
          />
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Template detail dialog
// ---------------------------------------------------------------------------

interface TemplateDetailDialogProps {
  template: FormTemplateRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (id: string) => void
}

function TemplateDetailDialog({ template, open, onOpenChange, onEdit }: TemplateDetailDialogProps) {
  const { data: responses } = api.forms.listResponses.useQuery(
    { templateId: template?.id ?? "", limit: 1 },
    { enabled: !!template?.id },
  )

  if (!template) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{template.name}</DialogTitle>
          <DialogDescription>
            {template.description || "No description provided."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Meta */}
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant={template.isActive ? "success" : "secondary"} className="text-[10px]">
              {template.isActive ? "Active" : "Inactive"}
            </Badge>
            {template.requiresSignature && (
              <Badge variant="outline" className="text-[10px]">
                Signature required
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              Created {formatDate(template.createdAt)}
            </span>
            {responses && (
              <span className="text-xs text-muted-foreground">
                {"\u00B7"} {responses.rows.length > 0 ? `${responses.hasMore ? "1+" : responses.rows.length}` : "0"} response{responses.rows.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Send timing */}
          <div className="text-sm">
            <span className="text-muted-foreground">Send timing: </span>
            <span className="font-medium">
              {template.sendTiming === "IMMEDIATE"
                ? "Immediate"
                : template.sendTiming === "BEFORE_APPOINTMENT"
                  ? `${template.sendOffsetHours ?? 0}h before appointment`
                  : `${template.sendOffsetHours ?? 0}h after appointment`}
            </span>
          </div>

          {/* Fields */}
          <div>
            <h4 className="text-sm font-medium mb-2">
              Fields ({template.fields.length})
            </h4>
            <ScrollArea className="max-h-[280px]">
              <div className="space-y-1.5">
                {template.fields.map((field, idx) => (
                  <div
                    key={field.id}
                    className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <span className="text-xs text-muted-foreground tabular-nums w-5">
                      {idx + 1}.
                    </span>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {field.type}
                    </Badge>
                    <span className="font-medium truncate flex-1">{field.label}</span>
                    {field.required && (
                      <span className="text-xs text-destructive shrink-0">Required</span>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            size="sm"
            onClick={() => {
              onOpenChange(false)
              onEdit(template.id)
            }}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            Edit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Create/Edit dialog
// ---------------------------------------------------------------------------

interface TemplateFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null = create mode, template = edit mode */
  template: FormTemplateRecord | null
  onSuccess: () => void
}

function TemplateFormDialog({
  open,
  onOpenChange,
  template,
  onSuccess,
}: TemplateFormDialogProps) {
  const isEdit = !!template

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [requiresSignature, setRequiresSignature] = useState(false)
  const [fields, setFields] = useState<FormField[]>([createEmptyField()])

  // Reset form when dialog opens
  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (next) {
        if (template) {
          setName(template.name)
          setDescription(template.description ?? "")
          setIsActive(template.isActive)
          setRequiresSignature(template.requiresSignature)
          setFields(
            template.fields.length > 0
              ? template.fields.map((f) => ({ ...f }))
              : [createEmptyField()],
          )
        } else {
          setName("")
          setDescription("")
          setIsActive(true)
          setRequiresSignature(false)
          setFields([createEmptyField()])
        }
      }
      onOpenChange(next)
    },
    [template, onOpenChange],
  )

  const utils = api.useUtils()

  const createMutation = api.forms.createTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template created")
      void utils.forms.listTemplates.invalidate()
      onOpenChange(false)
      onSuccess()
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create template")
    },
  })

  const updateMutation = api.forms.updateTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template updated")
      void utils.forms.listTemplates.invalidate()
      void utils.forms.getTemplate.invalidate()
      onOpenChange(false)
      onSuccess()
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update template")
    },
  })

  const isSaving = createMutation.isPending || updateMutation.isPending

  function handleFieldChange(idx: number, updated: FormField) {
    setFields((prev) => prev.map((f, i) => (i === idx ? updated : f)))
  }

  function handleFieldRemove(idx: number) {
    setFields((prev) => prev.filter((_, i) => i !== idx))
  }

  function handleAddField() {
    setFields((prev) => [...prev, createEmptyField()])
  }

  function handleSubmit() {
    // Validate
    if (!name.trim()) {
      toast.error("Template name is required")
      return
    }

    const validFields = fields.filter((f) => f.label.trim())
    if (validFields.length === 0) {
      toast.error("At least one field with a label is required")
      return
    }

    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      isActive,
      requiresSignature,
      fields: validFields.map((f) => ({
        ...f,
        label: f.label.trim(),
      })),
    }

    if (isEdit && template) {
      updateMutation.mutate({ id: template.id, ...payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Template" : "New Template"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the form template details and fields."
              : "Create a new form template with custom fields."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-5 pb-1">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="template-name">Name</Label>
              <Input
                id="template-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Patient Intake Form"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="template-description">Description</Label>
              <Textarea
                id="template-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this form (optional)"
                rows={2}
              />
            </div>

            {/* Toggles row */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  id="template-active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
                <Label htmlFor="template-active" className="cursor-pointer">
                  Active
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="template-signature"
                  checked={requiresSignature}
                  onCheckedChange={setRequiresSignature}
                />
                <Label htmlFor="template-signature" className="cursor-pointer">
                  Require signature
                </Label>
              </div>
            </div>

            {/* Fields editor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Fields</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddField}
                  className="h-7 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Add Field
                </Button>
              </div>

              <div className="space-y-2">
                {fields.map((field, idx) => (
                  <FieldEditorRow
                    key={field.id}
                    field={field}
                    onChange={(updated) => handleFieldChange(idx, updated)}
                    onRemove={() => handleFieldRemove(idx)}
                    canRemove={fields.length > 1}
                  />
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} loading={isSaving}>
            {isEdit ? "Save Changes" : "Create Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Template row
// ---------------------------------------------------------------------------

interface TemplateRowProps {
  template: FormTemplateRecord
  onView: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

function TemplateRow({ template, onView, onEdit, onDelete }: TemplateRowProps) {
  return (
    <TableRow
      className="cursor-pointer"
      onClick={() => onView(template.id)}
      aria-label={`View template ${template.name}`}
    >
      {/* Name */}
      <TableCell>
        <div className="flex flex-col">
          <span className="font-medium text-sm text-foreground truncate max-w-[240px]">
            {template.name}
          </span>
          {template.description && (
            <span className="text-xs text-muted-foreground truncate max-w-[240px]">
              {template.description}
            </span>
          )}
        </div>
      </TableCell>

      {/* Fields count */}
      <TableCell>
        <span className="text-sm tabular-nums">{template.fields.length}</span>
      </TableCell>

      {/* Status */}
      <TableCell>
        <Badge
          variant={template.isActive ? "success" : "secondary"}
          className="text-[10px]"
        >
          {template.isActive ? "Active" : "Inactive"}
        </Badge>
      </TableCell>

      {/* Created */}
      <TableCell>
        <span className="text-xs text-muted-foreground">
          {formatDate(template.createdAt)}
        </span>
      </TableCell>

      {/* Actions */}
      <TableCell onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Actions for ${template.name}`}
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onView(template.id)}>
              <Eye className="h-4 w-4 mr-2" aria-hidden="true" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(template.id)}>
              <Pencil className="h-4 w-4 mr-2" aria-hidden="true" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete(template.id)}
            >
              <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function FormsPage() {
  const [searchInput, setSearchInput] = useState("")
  const debouncedSearch = useDebounce(searchInput, 300)

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL")
  const [cursor, setCursor] = useState<string | undefined>(undefined)
  const [cursorStack, setCursorStack] = useState<string[]>([])

  // Dialog/sheet state
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editTemplate, setEditTemplate] = useState<FormTemplateRecord | null>(null)
  const [viewTemplate, setViewTemplate] = useState<FormTemplateRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<FormTemplateRecord | null>(null)

  // Derive isActive filter
  const isActiveFilter =
    statusFilter === "ACTIVE" ? true : statusFilter === "INACTIVE" ? false : undefined

  const utils = api.useUtils()

  const { data, isLoading, isError, refetch } = api.forms.listTemplates.useQuery({
    search: debouncedSearch || undefined,
    isActive: isActiveFilter,
    limit: PAGE_SIZE,
    cursor,
  })

  const rows = (data?.rows ?? []) as FormTemplateRecord[]
  const hasMore = data?.hasMore ?? false

  const deleteMutation = api.forms.deleteTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template deleted")
      void utils.forms.listTemplates.invalidate()
      setDeleteTarget(null)
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete template")
    },
  })

  // Pagination helpers
  function goToNextPage() {
    if (!hasMore || rows.length === 0) return
    const nextCursor = rows[rows.length - 1]!.id
    setCursorStack((prev) => [...prev, cursor ?? ""])
    setCursor(nextCursor)
  }

  function goToPrevPage() {
    if (cursorStack.length === 0) return
    const prevCursor = cursorStack[cursorStack.length - 1]
    setCursorStack((prev) => prev.slice(0, -1))
    setCursor(prevCursor === "" ? undefined : prevCursor)
  }

  const isFirstPage = cursorStack.length === 0

  // Reset pagination when filters change
  function handleSearchChange(value: string) {
    setSearchInput(value)
    setCursor(undefined)
    setCursorStack([])
  }

  function handleStatusFilter(status: StatusFilter) {
    setStatusFilter(status)
    setCursor(undefined)
    setCursorStack([])
  }

  const handleView = useCallback(
    (id: string) => {
      const template = rows.find((r) => r.id === id)
      if (template) setViewTemplate(template)
    },
    [rows],
  )

  const handleEditOpen = useCallback(
    (id: string) => {
      const template = rows.find((r) => r.id === id)
      if (template) setEditTemplate(template)
    },
    [rows],
  )

  const handleDeleteOpen = useCallback(
    (id: string) => {
      const template = rows.find((r) => r.id === id)
      if (template) setDeleteTarget(template)
    },
    [rows],
  )

  const handleConfirmDelete = useCallback(() => {
    if (deleteTarget) {
      deleteMutation.mutate({ id: deleteTarget.id })
    }
  }, [deleteTarget, deleteMutation])

  const statusOptions: { label: string; value: StatusFilter }[] = [
    { label: "All", value: "ALL" },
    { label: "Active", value: "ACTIVE" },
    { label: "Inactive", value: "INACTIVE" },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <PageHeader
        title="Forms"
        description="Manage form templates and responses."
      >
        <Button
          size="sm"
          onClick={() => setCreateDialogOpen(true)}
          aria-label="Create new template"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          New Template
        </Button>
      </PageHeader>

      {/* Search + filters */}
      <div className="space-y-3">
        {/* Search bar */}
        <div className="relative max-w-sm">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder="Search templates..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
            aria-label="Search templates"
          />
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground font-medium">Status:</span>
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleStatusFilter(opt.value)}
              className={[
                "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                statusFilter === opt.value
                  ? "bg-primary text-primary-foreground border-transparent shadow"
                  : "border-input bg-background text-foreground hover:bg-accent",
              ].join(" ")}
              aria-pressed={statusFilter === opt.value}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="rounded-xl border border-border overflow-hidden">
        {isError ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <p className="text-sm text-destructive font-medium">
              Failed to load templates
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void refetch()}
              className="gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Retry
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[280px]">Name</TableHead>
                <TableHead className="w-[80px]">Fields</TableHead>
                <TableHead className="w-[90px]">Status</TableHead>
                <TableHead className="w-[120px]">Created</TableHead>
                <TableHead className="w-[48px]">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRowSkeleton key={i} />
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <td colSpan={5} className="p-0">
                    <EmptyState
                      variant={debouncedSearch ? "search" : "documents"}
                      title={
                        debouncedSearch
                          ? "No templates found"
                          : "No form templates yet"
                      }
                      description={
                        debouncedSearch
                          ? `No templates match "${debouncedSearch}". Try adjusting your search.`
                          : "Create your first form template to start collecting data."
                      }
                      action={
                        !debouncedSearch
                          ? {
                              label: "New Template",
                              onClick: () => setCreateDialogOpen(true),
                            }
                          : undefined
                      }
                    />
                  </td>
                </TableRow>
              ) : (
                rows.map((template) => (
                  <TemplateRow
                    key={template.id}
                    template={template}
                    onView={handleView}
                    onEdit={handleEditOpen}
                    onDelete={handleDeleteOpen}
                  />
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && !isError && rows.length > 0 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing {rows.length} template{rows.length !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={goToPrevPage}
              disabled={isFirstPage}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={goToNextPage}
              disabled={!hasMore}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail dialog */}
      <TemplateDetailDialog
        template={viewTemplate}
        open={!!viewTemplate}
        onOpenChange={(open) => {
          if (!open) setViewTemplate(null)
        }}
        onEdit={(id) => {
          setViewTemplate(null)
          handleEditOpen(id)
        }}
      />

      {/* Create dialog */}
      <TemplateFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        template={null}
        onSuccess={() => {}}
      />

      {/* Edit dialog */}
      <TemplateFormDialog
        open={!!editTemplate}
        onOpenChange={(open) => {
          if (!open) setEditTemplate(null)
        }}
        template={editTemplate}
        onSuccess={() => setEditTemplate(null)}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{deleteTarget?.name}&rdquo;?
              This action cannot be undone. Existing responses will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
