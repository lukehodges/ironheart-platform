"use client"

import { useState } from "react"
import { format, isPast } from "date-fns"
import { Plus, Trash2, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/trpc/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { SkillType, ProficiencyLevel } from "@/shared/resource-pool/resource-pool.types"

const SKILL_TYPES: { value: SkillType; label: string }[] = [
  { value: "SERVICE", label: "Service" },
  { value: "CERTIFICATION", label: "Certification" },
  { value: "LANGUAGE", label: "Language" },
  { value: "QUALIFICATION", label: "Qualification" },
  { value: "EQUIPMENT", label: "Equipment" },
  { value: "CUSTOM", label: "Custom" },
]

const PROFICIENCY_LEVELS: { value: ProficiencyLevel; label: string }[] = [
  { value: "BEGINNER", label: "Beginner" },
  { value: "INTERMEDIATE", label: "Intermediate" },
  { value: "ADVANCED", label: "Advanced" },
  { value: "EXPERT", label: "Expert" },
]

const proficiencyVariant: Record<ProficiencyLevel, "secondary" | "info" | "success" | "warning"> = {
  BEGINNER: "secondary",
  INTERMEDIATE: "info",
  ADVANCED: "success",
  EXPERT: "warning",
}

export function SkillsTab({ memberId }: { memberId: string }) {
  const [addOpen, setAddOpen] = useState(false)
  const [filterType, setFilterType] = useState<SkillType | "ALL">("ALL")
  const utils = api.useUtils()

  const { data: skills, isLoading } = api.team.listSkills.useQuery({
    userId: memberId,
    skillType: filterType === "ALL" ? undefined : filterType,
  })

  const removeMutation = api.team.removeSkill.useMutation({
    onSuccess: () => {
      toast.success("Skill removed")
      void utils.team.listSkills.invalidate({ userId: memberId })
    },
    onError: (err) => toast.error(err.message ?? "Failed to remove skill"),
  })

  if (isLoading) {
    return (
      <div className="py-6 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  const skillList = skills ?? []

  // Group by type for display
  const grouped = new Map<string, typeof skillList>()
  for (const skill of skillList) {
    const group = grouped.get(skill.skillType) ?? []
    group.push(skill)
    grouped.set(skill.skillType, group)
  }

  return (
    <div className="py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">
          Skills
          {skillList.length > 0 && (
            <span className="ml-1.5 text-muted-foreground font-normal">({skillList.length})</span>
          )}
        </h3>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          Add Skill
        </Button>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground mr-1">Type:</span>
        <FilterChip active={filterType === "ALL"} onClick={() => setFilterType("ALL")}>All</FilterChip>
        {SKILL_TYPES.map((t) => (
          <FilterChip key={t.value} active={filterType === t.value} onClick={() => setFilterType(t.value)}>
            {t.label}
          </FilterChip>
        ))}
      </div>

      {skillList.length === 0 ? (
        <EmptyState
          variant="documents"
          title="No skills recorded"
          description="Add skills, certifications, and qualifications for this staff member."
          action={{ label: "Add Skill", onClick: () => setAddOpen(true) }}
        />
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([type, items]) => (
            <div key={type} className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {type.replace("_", " ")}
              </h4>
              <div className="space-y-2">
                {items.map((skill) => {
                  const isExpired = skill.expiresAt && isPast(new Date(skill.expiresAt))
                  return (
                    <div
                      key={skill.id}
                      className={cn(
                        "flex items-center justify-between rounded-lg border px-4 py-3",
                        isExpired ? "border-destructive/30 bg-destructive/5" : "border-border"
                      )}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{skill.skillName}</span>
                          <Badge variant={proficiencyVariant[skill.proficiency as ProficiencyLevel]} className="text-[10px]">
                            {skill.proficiency.toLowerCase()}
                          </Badge>
                          {isExpired && (
                            <Badge variant="destructive" className="text-[10px] gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Expired
                            </Badge>
                          )}
                        </div>
                        {skill.expiresAt && !isExpired && (
                          <p className="text-[11px] text-muted-foreground">
                            Expires {format(new Date(skill.expiresAt), "d MMM yyyy")}
                          </p>
                        )}
                      </div>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => removeMutation.mutate({
                          userId: memberId,
                          skillType: skill.skillType as SkillType,
                          skillId: skill.skillId,
                        })}
                        aria-label={`Remove ${skill.skillName}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <AddSkillDialog
        memberId={memberId}
        open={addOpen}
        onOpenChange={setAddOpen}
        onSuccess={() => void utils.team.listSkills.invalidate({ userId: memberId })}
      />
    </div>
  )
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-foreground hover:bg-muted"
      )}
      aria-pressed={active}
    >
      {children}
    </button>
  )
}

function AddSkillDialog({
  memberId,
  open,
  onOpenChange,
  onSuccess,
}: {
  memberId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const [skillType, setSkillType] = useState<SkillType>("SERVICE")
  const [skillId, setSkillId] = useState("")
  const [skillName, setSkillName] = useState("")
  const [proficiency, setProficiency] = useState<ProficiencyLevel>("INTERMEDIATE")
  const [expiresAt, setExpiresAt] = useState("")

  const addMutation = api.team.addSkill.useMutation({
    onSuccess: () => {
      toast.success("Skill added")
      onOpenChange(false)
      resetForm()
      onSuccess()
    },
    onError: (err) => toast.error(err.message ?? "Failed to add skill"),
  })

  function resetForm() {
    setSkillType("SERVICE")
    setSkillId("")
    setSkillName("")
    setProficiency("INTERMEDIATE")
    setExpiresAt("")
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!skillId.trim() || !skillName.trim()) {
      toast.error("Skill ID and name are required")
      return
    }
    addMutation.mutate({
      userId: memberId,
      skillType,
      skillId: skillId.trim(),
      skillName: skillName.trim(),
      proficiency,
      expiresAt: expiresAt || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Skill</DialogTitle>
          <DialogDescription>Add a skill, certification, or qualification.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={skillType} onValueChange={(v) => setSkillType(v as SkillType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SKILL_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="skill-id">Skill ID</Label>
            <Input id="skill-id" value={skillId} onChange={(e) => setSkillId(e.target.value)} placeholder="e.g. forklift-class-b" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="skill-name">Name</Label>
            <Input id="skill-name" value={skillName} onChange={(e) => setSkillName(e.target.value)} placeholder="e.g. Forklift Class B License" />
          </div>
          <div className="space-y-2">
            <Label>Proficiency</Label>
            <Select value={proficiency} onValueChange={(v) => setProficiency(v as ProficiencyLevel)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROFICIENCY_LEVELS.map((l) => (
                  <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="skill-expiry">Expires (optional)</Label>
            <Input id="skill-expiry" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" loading={addMutation.isPending}>Add Skill</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
