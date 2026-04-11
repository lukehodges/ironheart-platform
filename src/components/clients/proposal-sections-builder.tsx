"use client"

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { arrayMove } from "@dnd-kit/sortable"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { GripVertical, Plus, Trash2 } from "lucide-react"

export interface LocalItem {
  _id: string
  title: string
  description: string
  acceptanceCriteria: string
}

export interface LocalSection {
  _id: string
  title: string
  type: "PHASE" | "RECURRING" | "AD_HOC"
  estimatedDuration: string
  items: LocalItem[]
}

function newItem(): LocalItem {
  return { _id: crypto.randomUUID(), title: "", description: "", acceptanceCriteria: "" }
}

function newSection(type: LocalSection["type"]): LocalSection {
  return { _id: crypto.randomUUID(), title: "", type, estimatedDuration: "", items: [newItem()] }
}

const TYPE_LABEL: Record<LocalSection["type"], string> = {
  PHASE: "Phase",
  RECURRING: "Recurring",
  AD_HOC: "Ad-hoc",
}

const TYPE_VARIANT: Record<LocalSection["type"], "default" | "secondary" | "outline"> = {
  PHASE: "default",
  RECURRING: "secondary",
  AD_HOC: "outline",
}

// ── Sortable section row ────────────────────────────────────────────────────

interface SortableSectionProps {
  section: LocalSection
  phaseIndex: number
  onUpdate: (patch: Partial<Omit<LocalSection, "items">>) => void
  onRemove: () => void
  onAddItem: () => void
  onUpdateItem: (itemId: string, patch: Partial<LocalItem>) => void
  onRemoveItem: (itemId: string) => void
}

function SortableSection({
  section,
  phaseIndex,
  onUpdate,
  onRemove,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
}: SortableSectionProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section._id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="border rounded-lg p-4 space-y-3 bg-background">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0 touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <Badge variant={TYPE_VARIANT[section.type]} className="shrink-0 text-xs">
          {TYPE_LABEL[section.type]}
          {section.type === "PHASE" && ` ${phaseIndex}`}
        </Badge>
        <Input
          value={section.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder={
            section.type === "PHASE"
              ? `e.g. Phase ${phaseIndex}: Discovery & Setup`
              : section.type === "RECURRING"
                ? "e.g. Monthly Reporting"
                : "e.g. Ad-hoc Support"
          }
          className="text-sm"
        />
        <Input
          value={section.estimatedDuration}
          onChange={(e) => onUpdate({ estimatedDuration: e.target.value })}
          placeholder="Duration"
          className="text-sm w-[120px] shrink-0"
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
          onClick={onRemove}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="ml-6 space-y-2 pl-3 border-l">
        {section.items.map((item, ii) => (
          <div key={item._id} className="flex gap-2 items-start">
            <span className="text-muted-foreground text-xs mt-2 shrink-0 w-4 text-right">
              {ii + 1}.
            </span>
            <div className="flex-1 space-y-1.5">
              <Input
                value={item.title}
                onChange={(e) => onUpdateItem(item._id, { title: e.target.value })}
                placeholder="Deliverable title"
                className="text-sm"
              />
              <Textarea
                value={item.description}
                onChange={(e) => onUpdateItem(item._id, { description: e.target.value })}
                placeholder="Description (optional)"
                className="text-sm min-h-[56px] resize-none"
              />
              <Input
                value={item.acceptanceCriteria}
                onChange={(e) => onUpdateItem(item._id, { acceptanceCriteria: e.target.value })}
                placeholder="Acceptance criteria (optional)"
                className="text-sm"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0 mt-0.5"
              onClick={() => onRemoveItem(item._id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground text-xs"
          onClick={onAddItem}
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Add deliverable
        </Button>
      </div>
    </div>
  )
}

// ── Main builder ────────────────────────────────────────────────────────────

interface ProposalSectionsBuilderProps {
  sections: LocalSection[]
  onChange: (sections: LocalSection[]) => void
}

export function ProposalSectionsBuilder({ sections, onChange }: ProposalSectionsBuilderProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = sections.findIndex((s) => s._id === active.id)
    const newIndex = sections.findIndex((s) => s._id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    onChange(arrayMove(sections, oldIndex, newIndex))
  }

  const updateSection = (id: string, patch: Partial<Omit<LocalSection, "items">>) =>
    onChange(sections.map((s) => (s._id === id ? { ...s, ...patch } : s)))

  const removeSection = (id: string) => onChange(sections.filter((s) => s._id !== id))

  const addSection = (type: LocalSection["type"]) => onChange([...sections, newSection(type)])

  const addItem = (sectionId: string) =>
    onChange(
      sections.map((s) => (s._id === sectionId ? { ...s, items: [...s.items, newItem()] } : s))
    )

  const updateItem = (sectionId: string, itemId: string, patch: Partial<LocalItem>) =>
    onChange(
      sections.map((s) =>
        s._id === sectionId
          ? { ...s, items: s.items.map((i) => (i._id === itemId ? { ...i, ...patch } : i)) }
          : s
      )
    )

  const removeItem = (sectionId: string, itemId: string) =>
    onChange(
      sections.map((s) =>
        s._id === sectionId ? { ...s, items: s.items.filter((i) => i._id !== itemId) } : s
      )
    )

  // Running phase counter for labels
  const phaseIndexFor = (si: number) =>
    sections.slice(0, si + 1).filter((s) => s.type === "PHASE").length

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium">Phases &amp; Deliverables</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Break the engagement into phases. Drag to reorder. Items become deliverables and
          milestones on approval.
        </p>
      </div>

      {sections.length === 0 && (
        <p className="text-sm text-muted-foreground py-6 text-center border rounded-lg border-dashed">
          No sections yet — add a phase to get started.
        </p>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={sections.map((s) => s._id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {sections.map((section, si) => (
              <SortableSection
                key={section._id}
                section={section}
                phaseIndex={phaseIndexFor(si)}
                onUpdate={(patch) => updateSection(section._id, patch)}
                onRemove={() => removeSection(section._id)}
                onAddItem={() => addItem(section._id)}
                onUpdateItem={(itemId, patch) => updateItem(section._id, itemId, patch)}
                onRemoveItem={(itemId) => removeItem(section._id, itemId)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => addSection("PHASE")}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Phase
        </Button>
        <Button variant="outline" size="sm" onClick={() => addSection("RECURRING")}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Recurring
        </Button>
        <Button variant="outline" size="sm" onClick={() => addSection("AD_HOC")}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Ad-hoc
        </Button>
      </div>
    </div>
  )
}
