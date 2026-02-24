# Resource Pool Frontend — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the staff profile page (`/admin/team/[id]`) with 6 tabs, enhance staff cards with workload/skill data, add "View full profile" to the sheet, and remove scheduling from nav.

**Architecture:** Single client-component profile page using shadcn Tabs. Each tab is a separate component in `src/components/team/profile/` that owns its own data fetching via tRPC hooks. Staff cards enhanced with per-card workload and skill queries.

**Tech Stack:** Next.js 16, React 19, Tailwind 4, tRPC 11, shadcn/ui (Tabs, Badge, Card, Table, Progress, Sheet, Dialog, Avatar), Lucide icons, Sonner toasts, date-fns.

**Design doc:** `docs/plans/2026-02-23-resource-pool-frontend-design.md`

---

## Task 1: Profile Page Shell + Profile Header

**Files:**
- Create: `src/app/admin/team/[id]/page.tsx`
- Create: `src/components/team/profile/profile-header.tsx`

**Step 1: Create the profile page**

Create `src/app/admin/team/[id]/page.tsx`:

```tsx
"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { api } from "@/lib/trpc/react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ProfileHeader } from "@/components/team/profile/profile-header"
import { OverviewTab } from "@/components/team/profile/overview-tab"
import { SkillsTab } from "@/components/team/profile/skills-tab"
import { CapacityTab } from "@/components/team/profile/capacity-tab"
import { AvailabilityTab } from "@/components/team/profile/availability-tab"
import { AssignmentsTab } from "@/components/team/profile/assignments-tab"
import { ActivityTab } from "@/components/team/profile/activity-tab"

export default function StaffProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()

  const { data: member, isLoading, isError, refetch } = api.team.getById.useQuery(
    { userId: id },
  )

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-8 w-32" />
        <div className="flex items-start gap-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (isError || !member) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin/team")}>
          <ArrowLeft className="h-4 w-4" />
          Back to Team
        </Button>
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <p className="text-sm text-destructive font-medium">Staff member not found</p>
          <Button size="sm" variant="outline" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <Button variant="ghost" size="sm" onClick={() => router.push("/admin/team")}>
        <ArrowLeft className="h-4 w-4" />
        Back to Team
      </Button>

      <ProfileHeader member={member} onUpdate={() => void refetch()} />

      <Tabs defaultValue="overview">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="capacity">Capacity</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab member={member} onUpdate={() => void refetch()} />
        </TabsContent>
        <TabsContent value="skills">
          <SkillsTab memberId={member.id} />
        </TabsContent>
        <TabsContent value="capacity">
          <CapacityTab memberId={member.id} />
        </TabsContent>
        <TabsContent value="availability">
          <AvailabilityTab memberId={member.id} />
        </TabsContent>
        <TabsContent value="assignments">
          <AssignmentsTab memberId={member.id} />
        </TabsContent>
        <TabsContent value="activity">
          <ActivityTab memberId={member.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

**Step 2: Create the profile header component**

Create `src/components/team/profile/profile-header.tsx`:

```tsx
"use client"

import { Mail, Phone, Calendar, Pencil, ShieldOff } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import { api } from "@/lib/trpc/react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { StaffMember, StaffStatus } from "@/modules/team/team.types"

interface ProfileHeaderProps {
  member: StaffMember
  onUpdate: () => void
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

const statusConfig: Record<
  StaffStatus,
  { label: string; variant: "success" | "warning" | "secondary" }
> = {
  ACTIVE: { label: "Active", variant: "success" },
  INACTIVE: { label: "Inactive", variant: "secondary" },
  SUSPENDED: { label: "Suspended", variant: "warning" },
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—"
  try {
    return format(new Date(date), "d MMM yyyy")
  } catch {
    return "—"
  }
}

function WorkloadStrip({ memberId }: { memberId: string }) {
  const today = new Date().toISOString().split("T")[0]!
  const { data, isLoading } = api.team.getWorkload.useQuery({
    userId: memberId,
    date: today,
  })

  if (isLoading) return <Skeleton className="h-6 w-32" />
  if (!data || data.capacities.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {data.capacities.map((cap) => (
        <div
          key={cap.capacityType}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
            cap.isOver
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : "border-border bg-muted/50 text-foreground"
          )}
        >
          <span className="capitalize">{cap.capacityType}</span>
          <span className="tabular-nums font-semibold">
            {cap.used}/{cap.max ?? "∞"}
          </span>
        </div>
      ))}
    </div>
  )
}

export function ProfileHeader({ member, onUpdate }: ProfileHeaderProps) {
  const utils = api.useUtils()
  const statusInfo = statusConfig[member.status]

  const updateMutation = api.team.update.useMutation({
    onSuccess: () => {
      toast.success("Status updated")
      void utils.team.getById.invalidate({ userId: member.id })
      void utils.team.list.invalidate()
      onUpdate()
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to update status")
    },
  })

  function handleStatusChange(status: StaffStatus) {
    updateMutation.mutate({ id: member.id, status })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-4">
        <Avatar className="h-20 w-20 text-xl shrink-0">
          {member.avatarUrl && (
            <AvatarImage src={member.avatarUrl} alt={`${member.name} avatar`} />
          )}
          <AvatarFallback className="text-base font-medium">
            {getInitials(member.name)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0 space-y-2">
          <div>
            <h1 className="text-xl font-semibold text-foreground truncate">
              {member.name}
            </h1>
            {member.employeeType && (
              <p className="text-sm text-muted-foreground capitalize">
                {member.employeeType.replace("_", " ").toLowerCase()}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {member.email && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{member.email}</span>
              </div>
            )}
            {member.phone && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{member.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Joined {formatDate(member.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Status + workload row */}
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant={statusInfo.variant} className="text-xs">
          {statusInfo.label}
        </Badge>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 text-xs">
              Change status
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Set status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {(["ACTIVE", "INACTIVE", "SUSPENDED"] as StaffStatus[]).map((s) => (
              <DropdownMenuItem
                key={s}
                onClick={() => handleStatusChange(s)}
                className={cn(member.status === s && "bg-accent text-accent-foreground")}
              >
                {statusConfig[s].label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="border-l border-border h-5 mx-1" />

        <WorkloadStrip memberId={member.id} />
      </div>
    </div>
  )
}
```

**Step 3: Verify it compiles**

Run: `npx tsc --noEmit 2>&1 | head -30`

The page and header will have import errors for the tab components that don't exist yet. That's expected — we'll create stub files next.

**Step 4: Create stub tab components**

Create all 6 tab stubs so the profile page compiles. Each stub is a minimal placeholder:

Create `src/components/team/profile/overview-tab.tsx`:
```tsx
"use client"

import type { StaffMember } from "@/modules/team/team.types"

interface OverviewTabProps {
  member: StaffMember
  onUpdate: () => void
}

export function OverviewTab({ member }: OverviewTabProps) {
  return (
    <div className="py-6">
      <p className="text-sm text-muted-foreground">Overview tab — coming soon</p>
    </div>
  )
}
```

Create `src/components/team/profile/skills-tab.tsx`:
```tsx
"use client"

export function SkillsTab({ memberId }: { memberId: string }) {
  return (
    <div className="py-6">
      <p className="text-sm text-muted-foreground">Skills tab — coming soon</p>
    </div>
  )
}
```

Create `src/components/team/profile/capacity-tab.tsx`:
```tsx
"use client"

export function CapacityTab({ memberId }: { memberId: string }) {
  return (
    <div className="py-6">
      <p className="text-sm text-muted-foreground">Capacity tab — coming soon</p>
    </div>
  )
}
```

Create `src/components/team/profile/availability-tab.tsx`:
```tsx
"use client"

import { AvailabilityEditor } from "@/components/team/availability-editor"

export function AvailabilityTab({ memberId }: { memberId: string }) {
  return (
    <div className="py-6">
      <AvailabilityEditor memberId={memberId} />
    </div>
  )
}
```

Create `src/components/team/profile/assignments-tab.tsx`:
```tsx
"use client"

export function AssignmentsTab({ memberId }: { memberId: string }) {
  return (
    <div className="py-6">
      <p className="text-sm text-muted-foreground">Assignments tab — coming soon</p>
    </div>
  )
}
```

Create `src/components/team/profile/activity-tab.tsx`:
```tsx
"use client"

export function ActivityTab({ memberId }: { memberId: string }) {
  return (
    <div className="py-6">
      <p className="text-sm text-muted-foreground">Activity tab — coming soon</p>
    </div>
  )
}
```

**Step 5: Run tsc to verify compilation**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: No new errors from these files.

**Step 6: Commit**

```bash
git add src/app/admin/team/\[id\]/page.tsx src/components/team/profile/
git commit -m "feat: add staff profile page shell with header and tab stubs"
```

---

## Task 2: Overview Tab

**Files:**
- Modify: `src/components/team/profile/overview-tab.tsx`

**Step 1: Implement the overview tab**

Replace the stub in `src/components/team/profile/overview-tab.tsx`:

```tsx
"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Pencil } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/trpc/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Separator } from "@/components/ui/separator"
import type { StaffMember, EmployeeType } from "@/modules/team/team.types"

interface OverviewTabProps {
  member: StaffMember
  onUpdate: () => void
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—"
  try {
    return format(new Date(date), "d MMM yyyy")
  } catch {
    return "—"
  }
}

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "—"
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(value)
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground text-right">{value}</span>
    </div>
  )
}

const EMPLOYEE_TYPES: { value: EmployeeType; label: string }[] = [
  { value: "EMPLOYED", label: "Employed" },
  { value: "SELF_EMPLOYED", label: "Self-employed" },
  { value: "CONTRACTOR", label: "Contractor" },
]

export function OverviewTab({ member, onUpdate }: OverviewTabProps) {
  const [editOpen, setEditOpen] = useState(false)
  const utils = api.useUtils()

  return (
    <div className="py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Profile Details</h3>
        <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Button>
      </div>

      <div className="rounded-lg border border-border divide-y divide-border px-4">
        <DetailRow label="Email" value={member.email} />
        <DetailRow label="Phone" value={member.phone ?? "—"} />
        <DetailRow
          label="Employee type"
          value={
            member.employeeType
              ? member.employeeType.replace("_", " ").toLowerCase()
              : "—"
          }
        />
        <DetailRow label="Hourly rate" value={formatCurrency(member.hourlyRate)} />
        <DetailRow label="Joined" value={formatDate(member.createdAt)} />
      </div>

      <EditProfileDialog
        member={member}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={() => {
          void utils.team.getById.invalidate({ userId: member.id })
          void utils.team.list.invalidate()
          onUpdate()
        }}
      />
    </div>
  )
}

function EditProfileDialog({
  member,
  open,
  onOpenChange,
  onSuccess,
}: {
  member: StaffMember
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const [name, setName] = useState(member.name)
  const [email, setEmail] = useState(member.email)
  const [phone, setPhone] = useState(member.phone ?? "")
  const [employeeType, setEmployeeType] = useState<EmployeeType | "">(
    member.employeeType ?? ""
  )
  const [hourlyRate, setHourlyRate] = useState(
    member.hourlyRate != null ? String(member.hourlyRate) : ""
  )

  const updateMutation = api.team.update.useMutation({
    onSuccess: () => {
      toast.success("Profile updated")
      onOpenChange(false)
      onSuccess()
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to update profile")
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    updateMutation.mutate({
      id: member.id,
      name: name.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      employeeType: employeeType || undefined,
      hourlyRate: hourlyRate ? parseFloat(hourlyRate) : undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>Update {member.name}&apos;s profile details.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name</Label>
            <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-email">Email</Label>
            <Input id="edit-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-phone">Phone</Label>
            <Input id="edit-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-type">Employee type</Label>
            <Select value={employeeType} onValueChange={(v) => setEmployeeType(v as EmployeeType)}>
              <SelectTrigger id="edit-type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {EMPLOYEE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-rate">Hourly rate</Label>
            <Input id="edit-rate" type="number" step="0.01" min="0" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" loading={updateMutation.isPending}>Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

**Step 2: Run tsc**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No new errors.

**Step 3: Commit**

```bash
git add src/components/team/profile/overview-tab.tsx
git commit -m "feat: implement overview tab with edit profile dialog"
```

---

## Task 3: Skills Tab

**Files:**
- Modify: `src/components/team/profile/skills-tab.tsx`

**Step 1: Implement the skills tab**

Replace stub in `src/components/team/profile/skills-tab.tsx`:

```tsx
"use client"

import { useState } from "react"
import { format, isPast } from "date-fns"
import { Plus, Trash2, AlertTriangle, Award, Shield } from "lucide-react"
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
                          <Badge variant={proficiencyVariant[skill.proficiency]} className="text-[10px]">
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
```

**Step 2: Run tsc**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No new errors.

**Step 3: Commit**

```bash
git add src/components/team/profile/skills-tab.tsx
git commit -m "feat: implement skills tab with add/remove and expiry warnings"
```

---

## Task 4: Capacity Tab

**Files:**
- Modify: `src/components/team/profile/capacity-tab.tsx`

**Step 1: Implement the capacity tab**

Replace stub in `src/components/team/profile/capacity-tab.tsx`:

```tsx
"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/trpc/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { CapacityUnit } from "@/shared/resource-pool/resource-pool.types"

const CAPACITY_UNITS: { value: CapacityUnit; label: string }[] = [
  { value: "COUNT", label: "Count" },
  { value: "HOURS", label: "Hours" },
  { value: "POINTS", label: "Points" },
]

export function CapacityTab({ memberId }: { memberId: string }) {
  const today = new Date().toISOString().split("T")[0]!
  const utils = api.useUtils()

  const { data: workload, isLoading } = api.team.getWorkload.useQuery({
    userId: memberId,
    date: today,
  })

  if (isLoading) {
    return (
      <div className="py-6 space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    )
  }

  const capacities = workload?.capacities ?? []

  return (
    <div className="py-6 space-y-6">
      <h3 className="text-sm font-medium">Today&apos;s Workload</h3>

      {capacities.length === 0 ? (
        <p className="text-sm text-muted-foreground">No capacity rules configured.</p>
      ) : (
        <div className="space-y-3">
          {capacities.map((cap) => {
            const pct = cap.max != null && cap.max > 0
              ? Math.min(100, Math.round((cap.used / cap.max) * 100))
              : 0
            return (
              <div key={cap.capacityType} className="rounded-lg border border-border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">{cap.capacityType}</span>
                  <span className={cn(
                    "text-sm tabular-nums font-semibold",
                    cap.isOver ? "text-destructive" : "text-foreground"
                  )}>
                    {cap.used} / {cap.max ?? "∞"}
                  </span>
                </div>
                {cap.max != null && (
                  <Progress
                    value={pct}
                    className={cn("h-2", cap.isOver && "[&>div]:bg-destructive")}
                  />
                )}
                {cap.isOver && (
                  <p className="text-xs text-destructive">Over capacity</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Separator />

      <SetCapacityForm memberId={memberId} onSuccess={() => {
        void utils.team.getWorkload.invalidate({ userId: memberId })
        void utils.team.getCapacity.invalidate()
      }} />
    </div>
  )
}

function SetCapacityForm({
  memberId,
  onSuccess,
}: {
  memberId: string
  onSuccess: () => void
}) {
  const [capacityType, setCapacityType] = useState("bookings")
  const [maxDaily, setMaxDaily] = useState("")
  const [maxConcurrent, setMaxConcurrent] = useState("")
  const [maxWeekly, setMaxWeekly] = useState("")
  const [unit, setUnit] = useState<CapacityUnit>("COUNT")
  const [effectiveFrom, setEffectiveFrom] = useState(
    new Date().toISOString().split("T")[0]!
  )
  const [effectiveUntil, setEffectiveUntil] = useState("")

  const setCapacityMutation = api.team.setCapacity.useMutation({
    onSuccess: () => {
      toast.success("Capacity updated")
      onSuccess()
    },
    onError: (err) => toast.error(err.message ?? "Failed to set capacity"),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!capacityType.trim()) {
      toast.error("Capacity type is required")
      return
    }
    setCapacityMutation.mutate({
      userId: memberId,
      capacityType: capacityType.trim(),
      maxDaily: maxDaily ? parseInt(maxDaily, 10) : undefined,
      maxConcurrent: maxConcurrent ? parseInt(maxConcurrent, 10) : undefined,
      maxWeekly: maxWeekly ? parseInt(maxWeekly, 10) : undefined,
      unit,
      effectiveFrom,
      effectiveUntil: effectiveUntil || undefined,
    })
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Set Capacity</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cap-type">Capacity type</Label>
            <Input id="cap-type" value={capacityType} onChange={(e) => setCapacityType(e.target.value)} placeholder="e.g. bookings" />
          </div>
          <div className="space-y-2">
            <Label>Unit</Label>
            <Select value={unit} onValueChange={(v) => setUnit(v as CapacityUnit)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CAPACITY_UNITS.map((u) => (
                  <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cap-daily">Max daily</Label>
            <Input id="cap-daily" type="number" min={1} value={maxDaily} onChange={(e) => setMaxDaily(e.target.value)} placeholder="e.g. 8" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cap-concurrent">Max concurrent</Label>
            <Input id="cap-concurrent" type="number" min={1} value={maxConcurrent} onChange={(e) => setMaxConcurrent(e.target.value)} placeholder="e.g. 3" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cap-weekly">Max weekly</Label>
            <Input id="cap-weekly" type="number" min={1} value={maxWeekly} onChange={(e) => setMaxWeekly(e.target.value)} placeholder="e.g. 35" />
          </div>
          <div /> {/* spacer */}
          <div className="space-y-2">
            <Label htmlFor="cap-from">Effective from</Label>
            <Input id="cap-from" type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cap-until">Effective until (optional)</Label>
            <Input id="cap-until" type="date" value={effectiveUntil} onChange={(e) => setEffectiveUntil(e.target.value)} />
          </div>
        </div>

        <Button type="submit" size="sm" loading={setCapacityMutation.isPending}>
          Save Capacity
        </Button>
      </form>
    </div>
  )
}
```

**Step 2: Run tsc**

Run: `npx tsc --noEmit 2>&1 | head -20`

**Step 3: Commit**

```bash
git add src/components/team/profile/capacity-tab.tsx
git commit -m "feat: implement capacity tab with workload bars and set capacity form"
```

---

## Task 5: Assignments Tab

**Files:**
- Modify: `src/components/team/profile/assignments-tab.tsx`

**Step 1: Implement the assignments tab**

Replace stub in `src/components/team/profile/assignments-tab.tsx`:

```tsx
"use client"

import { useState } from "react"
import { format } from "date-fns"
import { api } from "@/lib/trpc/react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AssignmentStatus } from "@/shared/resource-pool/resource-pool.types"

const STATUS_OPTIONS: { value: AssignmentStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "ACTIVE", label: "Active" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
]

const statusVariant: Record<AssignmentStatus, "info" | "success" | "secondary" | "warning"> = {
  ASSIGNED: "info",
  ACTIVE: "success",
  COMPLETED: "secondary",
  CANCELLED: "warning",
}

const PAGE_SIZE = 20

export function AssignmentsTab({ memberId }: { memberId: string }) {
  const [statusFilter, setStatusFilter] = useState<AssignmentStatus | "ALL">("ALL")
  const [moduleFilter, setModuleFilter] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [page, setPage] = useState(0)

  const { data, isLoading } = api.team.listAssignments.useQuery({
    userId: memberId,
    status: statusFilter === "ALL" ? undefined : statusFilter,
    moduleSlug: moduleFilter || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    limit: PAGE_SIZE,
  })

  const assignments = data?.rows ?? []
  const hasMore = data?.hasMore ?? false

  function formatDate(date: Date | string | null): string {
    if (!date) return "—"
    try {
      return format(new Date(date), "d MMM yyyy")
    } catch {
      return "—"
    }
  }

  return (
    <div className="py-6 space-y-4">
      <h3 className="text-sm font-medium">Assignments</h3>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Status</Label>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as AssignmentStatus | "ALL")}>
            <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Module</Label>
          <Input className="h-8 w-32 text-xs" placeholder="e.g. bookings" value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">From</Label>
          <Input type="date" className="h-8 text-xs" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">To</Label>
          <Input type="date" className="h-8 text-xs" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : assignments.length === 0 ? (
        <EmptyState
          variant="documents"
          title="No assignments"
          description="No assignments match the current filters."
        />
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Module</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs text-right">Weight</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-xs capitalize">{a.moduleSlug}</TableCell>
                    <TableCell className="text-xs capitalize">{a.resourceType}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[a.status as AssignmentStatus]} className="text-[10px]">
                        {a.status.toLowerCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs tabular-nums">{formatDate(a.scheduledDate)}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{a.weight}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-end gap-2">
            <span className="text-xs text-muted-foreground">
              {assignments.length} result{assignments.length !== 1 ? "s" : ""}
              {hasMore ? "+" : ""}
            </span>
          </div>
        </>
      )}
    </div>
  )
}
```

**Step 2: Run tsc**

Run: `npx tsc --noEmit 2>&1 | head -20`

**Step 3: Commit**

```bash
git add src/components/team/profile/assignments-tab.tsx
git commit -m "feat: implement assignments tab with filters and table"
```

---

## Task 6: Activity Tab

**Files:**
- Modify: `src/components/team/profile/activity-tab.tsx`

**Step 1: Implement the activity tab**

Replace stub in `src/components/team/profile/activity-tab.tsx`:

```tsx
"use client"

import { format } from "date-fns"
import { api } from "@/lib/trpc/react"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { ScrollText } from "lucide-react"

export function ActivityTab({ memberId }: { memberId: string }) {
  const { data, isLoading, isError } = api.audit.list.useQuery(
    { userId: memberId, limit: 50 },
    {
      // Audit module may not be available for all users — fail gracefully
      retry: false,
    }
  )

  if (isError) {
    return (
      <div className="py-6">
        <div className="flex flex-col items-center py-12 gap-2">
          <ScrollText className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Activity log unavailable</p>
          <p className="text-xs text-muted-foreground">
            You may not have permission to view audit logs.
          </p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="py-6 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  const entries = data?.rows ?? []

  if (entries.length === 0) {
    return (
      <div className="py-6">
        <EmptyState
          variant="documents"
          title="No activity"
          description="No audit log entries found for this staff member."
        />
      </div>
    )
  }

  return (
    <div className="py-6 space-y-2">
      <h3 className="text-sm font-medium mb-4">
        Activity
        <span className="ml-1.5 text-muted-foreground font-normal">({entries.length})</span>
      </h3>
      <div className="space-y-1">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-start gap-3 rounded-md border border-border px-4 py-3"
          >
            <div className="flex-1 min-w-0 space-y-0.5">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">
                  {entry.action}
                </Badge>
                <span className="text-xs text-muted-foreground capitalize">
                  {entry.resourceType}
                </span>
              </div>
              {entry.description && (
                <p className="text-xs text-muted-foreground truncate">{entry.description}</p>
              )}
            </div>
            <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
              {format(new Date(entry.createdAt), "d MMM yyyy HH:mm")}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

**Step 2: Run tsc**

Run: `npx tsc --noEmit 2>&1 | head -20`

Note: This tab uses `api.audit.list` which requires audit:read permission. The `isError` fallback handles cases where the user doesn't have permission or the module isn't available. Check the audit types to verify the shape matches — key fields: `id`, `action`, `resourceType`, `description`, `createdAt`.

**Step 3: Commit**

```bash
git add src/components/team/profile/activity-tab.tsx
git commit -m "feat: implement activity tab with audit log entries"
```

---

## Task 7: Enhanced Staff Cards

**Files:**
- Modify: `src/components/team/team-member-card.tsx`

**Step 1: Add workload badge and skill chips to cards**

Edit `src/components/team/team-member-card.tsx` — add workload and skill data fetching per card, render chips and badge.

Key changes:
- Add `api.team.getWorkload.useQuery` for the workload badge
- Add `api.team.listSkills.useQuery` for skill chips (limit display to 3)
- Render skill chips between the status badge and footer
- Render workload badge in the footer

```tsx
"use client"

import { Clock, CheckCircle2, MinusCircle } from "lucide-react"
import { api } from "@/lib/trpc/react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { StaffMember, StaffStatus } from "@/modules/team/team.types"

interface TeamMemberCardProps {
  member: StaffMember
  onClick: () => void
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

const statusConfig: Record<
  StaffStatus,
  { label: string; variant: "success" | "warning" | "secondary" }
> = {
  ACTIVE: { label: "Active", variant: "success" },
  INACTIVE: { label: "Inactive", variant: "secondary" },
  SUSPENDED: { label: "Suspended", variant: "warning" },
}

function AvailabilityIndicator({ status }: { status: StaffStatus }) {
  if (status === "ACTIVE") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-success">
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Available today</span>
      </div>
    )
  }
  if (status === "SUSPENDED") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-warning">
        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
        <span>On leave</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <MinusCircle className="h-3.5 w-3.5" aria-hidden="true" />
      <span>Inactive</span>
    </div>
  )
}

function WorkloadBadge({ memberId }: { memberId: string }) {
  const today = new Date().toISOString().split("T")[0]!
  const { data, isLoading } = api.team.getWorkload.useQuery(
    { userId: memberId, date: today },
    { staleTime: 60 * 1000 }
  )

  if (isLoading) return <Skeleton className="h-4 w-10 inline-block" />
  if (!data || data.capacities.length === 0) return null

  // Show the first capacity type (usually bookings)
  const primary = data.capacities[0]!
  return (
    <span className={cn(
      "text-xs tabular-nums font-semibold",
      primary.isOver ? "text-destructive" : "text-muted-foreground"
    )}>
      {primary.used}/{primary.max ?? "∞"}
    </span>
  )
}

function SkillChips({ memberId }: { memberId: string }) {
  const { data, isLoading } = api.team.listSkills.useQuery(
    { userId: memberId },
    { staleTime: 60 * 1000 }
  )

  if (isLoading || !data || data.length === 0) return null

  const visible = data.slice(0, 3)
  const overflow = data.length - visible.length

  return (
    <div className="flex flex-wrap items-center justify-center gap-1 mt-1">
      {visible.map((skill) => (
        <span
          key={skill.id}
          className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
        >
          {skill.skillName}
        </span>
      ))}
      {overflow > 0 && (
        <span className="text-[10px] text-muted-foreground">+{overflow}</span>
      )}
    </div>
  )
}

export function TeamMemberCard({ member, onClick }: TeamMemberCardProps) {
  const statusInfo = statusConfig[member.status]

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-150",
        "hover:border-primary/50 hover:shadow-md",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      )}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick()
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`View ${member.name}'s profile`}
    >
      <CardContent className="p-5">
        <div className="flex flex-col items-center text-center gap-3">
          {/* Avatar */}
          <Avatar className="h-16 w-16 text-base">
            {member.avatarUrl && (
              <AvatarImage src={member.avatarUrl} alt={`${member.name} avatar`} />
            )}
            <AvatarFallback className="text-sm font-medium">
              {getInitials(member.name)}
            </AvatarFallback>
          </Avatar>

          {/* Name and role */}
          <div className="space-y-1 min-w-0 w-full">
            <p className="text-sm font-semibold text-foreground truncate">{member.name}</p>
            {member.employeeType && (
              <p className="text-xs text-muted-foreground capitalize">
                {member.employeeType.replace("_", " ").toLowerCase()}
              </p>
            )}
          </div>

          {/* Status badge */}
          <Badge variant={statusInfo.variant} className="text-[10px] px-2">
            {statusInfo.label}
          </Badge>

          {/* Skill chips */}
          <SkillChips memberId={member.id} />
        </div>
      </CardContent>

      <CardFooter className="px-5 py-3 border-t border-border justify-between">
        <AvailabilityIndicator status={member.status} />
        <WorkloadBadge memberId={member.id} />
      </CardFooter>
    </Card>
  )
}
```

**Step 2: Run tsc**

Run: `npx tsc --noEmit 2>&1 | head -20`

**Step 3: Commit**

```bash
git add src/components/team/team-member-card.tsx
git commit -m "feat: enhance staff cards with workload badges and skill chips"
```

---

## Task 8: Sheet — Add "View Full Profile" Link

**Files:**
- Modify: `src/components/team/team-member-sheet.tsx`

**Step 1: Add a "View full profile" button to the sheet header**

In `src/components/team/team-member-sheet.tsx`, add a Link/button after the status row in the profile header section:

After the status change dropdown (around line 429), add:

```tsx
import Link from "next/link"
import { ExternalLink } from "lucide-react"

// Inside the sheet, after the status row div (after line ~429):
<div className="flex items-center gap-2 mt-3">
  <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
    <Link href={`/admin/team/${member.id}`}>
      <ExternalLink className="h-3.5 w-3.5" />
      View full profile
    </Link>
  </Button>
</div>
```

This adds a button that navigates to the full profile page. Import `Link` from `next/link` and `ExternalLink` from lucide at the top of the file.

**Step 2: Run tsc**

Run: `npx tsc --noEmit 2>&1 | head -20`

**Step 3: Commit**

```bash
git add src/components/team/team-member-sheet.tsx
git commit -m "feat: add 'View full profile' link to team member sheet"
```

---

## Task 9: Team Manifest + Navigation

**Files:**
- Modify: `src/modules/team/team.manifest.ts`
- Modify: `src/modules/scheduling/scheduling.manifest.ts`

**Step 1: Add profile route to team manifest**

In `src/modules/team/team.manifest.ts`, add the profile page route to the `routes` array:

```ts
routes: [
  { path: '/admin/team', label: 'Team', permission: 'team:read' },
  { path: '/admin/team/[id]', label: 'Staff Profile', permission: 'staff:read' },
],
```

**Step 2: Remove scheduling from sidebar**

In `src/modules/scheduling/scheduling.manifest.ts`, clear the `sidebarItems` array:

```ts
sidebarItems: [],
```

This removes scheduling from the sidebar nav while keeping the module and its routes registered.

**Step 3: Run tsc**

Run: `npx tsc --noEmit 2>&1 | head -20`

**Step 4: Commit**

```bash
git add src/modules/team/team.manifest.ts src/modules/scheduling/scheduling.manifest.ts
git commit -m "feat: add profile route to team manifest, remove scheduling from nav"
```

---

## Task 10: Verify Build

**Step 1: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: 0 errors (or same count as before — no new errors).

**Step 2: Run build**

Run: `NEXT_PHASE=phase-production-build npx next build 2>&1 | tail -20`
Expected: Build succeeds.

**Step 3: Run tests**

Run: `npx vitest run 2>&1 | tail -20`
Expected: All existing tests pass (224/224).

**Step 4: Final commit if any fixes were needed**

If any tsc/build issues were found and fixed:
```bash
git add -A
git commit -m "fix: resolve build issues in resource pool frontend"
```
