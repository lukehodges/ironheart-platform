"use client"

import { lazy, Suspense, useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { Pencil, Building2, User, MapPin, AlertTriangle, DollarSign } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/trpc/react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
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
import type { StaffMember, EmployeeType } from "@/modules/team/team.types"

const PayRatesDialog = lazy(() =>
  import("@/components/team/profile/pay-rates-dialog").then((m) => ({ default: m.PayRatesDialog }))
)

const CustomFieldsEditor = lazy(() =>
  import("@/components/team/profile/custom-fields-editor").then((m) => ({ default: m.CustomFieldsEditor }))
)

interface OverviewTabProps {
  member: StaffMember
  onUpdate: () => void
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return " - "
  try {
    return format(new Date(date), "d MMM yyyy")
  } catch {
    return " - "
  }
}

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return " - "
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

function EmergencyContactSection({ member }: { member: StaffMember }) {
  const hasContact = member.emergencyContactName || member.emergencyContactPhone
  if (!hasContact) return null

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-warning" />
        Emergency Contact
      </h4>
      <div className="rounded-lg border border-border divide-y divide-border px-4">
        {member.emergencyContactName && (
          <DetailRow label="Name" value={member.emergencyContactName} />
        )}
        {member.emergencyContactPhone && (
          <DetailRow label="Phone" value={member.emergencyContactPhone} />
        )}
        {member.emergencyContactRelation && (
          <DetailRow label="Relationship" value={member.emergencyContactRelation} />
        )}
      </div>
    </div>
  )
}

function AddressSection({ member }: { member: StaffMember }) {
  const parts = [member.addressLine1, member.addressLine2, member.addressCity, member.addressPostcode, member.addressCountry].filter(Boolean)
  if (parts.length === 0) return null

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium flex items-center gap-2">
        <MapPin className="h-4 w-4" />
        Address
      </h4>
      <div className="rounded-lg border border-border px-4 py-3">
        <p className="text-sm text-foreground">{parts.join(", ")}</p>
      </div>
    </div>
  )
}

function DepartmentBadges({ member }: { member: StaffMember }) {
  const departments = member.departments ?? []
  if (departments.length === 0) return null

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium flex items-center gap-2">
        <Building2 className="h-4 w-4" />
        Departments
      </h4>
      <div className="flex flex-wrap gap-2">
        {departments.map((dept) => (
          <Badge
            key={dept.departmentId}
            variant={dept.isPrimary ? "default" : "secondary"}
            className="text-xs"
          >
            {dept.departmentName}
            {dept.isPrimary && <span className="ml-1 opacity-70">primary</span>}
          </Badge>
        ))}
      </div>
    </div>
  )
}

function ReportingLine({ reportsTo }: { reportsTo: string | null }) {
  const { data: manager } = api.team.getById.useQuery(
    { userId: reportsTo! },
    { enabled: !!reportsTo, staleTime: 5 * 60 * 1000, retry: false }
  )
  if (!reportsTo || !manager) return null

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium flex items-center gap-2">
        <User className="h-4 w-4" />
        Reports to
      </h4>
      <div className="rounded-lg border border-border px-4 py-3">
        <p className="text-sm text-foreground">{manager.name}</p>
        {manager.jobTitle && (
          <p className="text-xs text-muted-foreground">{manager.jobTitle}</p>
        )}
      </div>
    </div>
  )
}

function PayRateSection({ memberId, currentRate }: { memberId: string; currentRate: number | null }) {
  const [historyOpen, setHistoryOpen] = useState(false)

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium flex items-center gap-2">
        <DollarSign className="h-4 w-4" />
        Pay Rate
      </h4>
      <div className="rounded-lg border border-border px-4 py-3 flex items-center justify-between">
        <span className="text-sm text-foreground">
          {currentRate != null ? formatCurrency(currentRate) : "Not set"}
          {currentRate != null && <span className="text-xs text-muted-foreground ml-1">/hr</span>}
        </span>
        <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setHistoryOpen(true)}>
          View history
        </Button>
      </div>
      {historyOpen && (
        <Suspense fallback={<Skeleton className="h-32 w-full" />}>
          <PayRatesDialog memberId={memberId} open={historyOpen} onOpenChange={setHistoryOpen} />
        </Suspense>
      )}
    </div>
  )
}

function OnboardingProgressSection({ memberId }: { memberId: string }) {
  const { data: progress, isLoading } = api.team.onboarding.getProgress.useQuery(
    { userId: memberId, type: "ONBOARDING" },
    { staleTime: 30_000 }
  )
  if (isLoading) return <Skeleton className="h-16 w-full" />

  const active = Array.isArray(progress) ? progress.find((p: any) => p.status !== "COMPLETED") : null
  if (!active) return null

  const totalRequired = active.items.filter((i: any) => i.isRequired).length
  const completedRequired = active.items.filter((i: any) => i.isRequired && i.completedAt).length
  const pct = totalRequired > 0 ? Math.round((completedRequired / totalRequired) * 100) : 0

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">Onboarding Progress</h4>
      <div className="rounded-lg border border-border p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{active.templateName}</span>
          <span className="text-xs font-medium">{pct}%</span>
        </div>
        <Progress value={pct} className="h-2" />
        <p className="text-xs text-muted-foreground">
          {completedRequired}/{totalRequired} required items complete
        </p>
      </div>
    </div>
  )
}

function CustomFieldsSection({ memberId }: { memberId: string }) {
  const [editOpen, setEditOpen] = useState(false)
  const { data: values, isLoading } = api.team.customFields.getValues.useQuery(
    { userId: memberId },
    { staleTime: 60_000 }
  )
  if (isLoading) return <Skeleton className="h-16 w-full" />
  if (!values || values.length === 0) return null

  const grouped = new Map<string, typeof values>()
  for (const v of values) {
    const group = v.groupName ?? "Other"
    const arr = grouped.get(group) ?? []
    arr.push(v)
    grouped.set(group, arr)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Custom Fields</h3>
        <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setEditOpen(true)}>
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Button>
      </div>

      {Array.from(grouped.entries()).map(([group, fields]) => (
        <div key={group} className="space-y-2">
          <h4 className="text-sm font-medium">{group}</h4>
          <div className="rounded-lg border border-border divide-y divide-border px-4">
            {fields.map((f) => (
              <DetailRow
                key={f.fieldDefinitionId}
                label={f.label}
                value={f.value == null ? " - " : String(f.value)}
              />
            ))}
          </div>
        </div>
      ))}

      {editOpen && (
        <Suspense fallback={<Skeleton className="h-32 w-full" />}>
          <CustomFieldsEditor
            memberId={memberId}
            open={editOpen}
            onOpenChange={setEditOpen}
          />
        </Suspense>
      )}
    </div>
  )
}

export function OverviewTab({ member, onUpdate }: OverviewTabProps) {
  const [editOpen, setEditOpen] = useState(false)
  const utils = api.useUtils()

  return (
    <div className="py-6 space-y-6">
      {/* Onboarding progress (shows only if incomplete) */}
      <OnboardingProgressSection memberId={member.id} />

      {/* Profile details header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Profile Details</h3>
        <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Button>
      </div>

      <div className="rounded-lg border border-border divide-y divide-border px-4">
        <DetailRow label="Email" value={member.email} />
        <DetailRow label="Phone" value={member.phone ?? " - "} />
        <DetailRow label="Job title" value={member.jobTitle ?? " - "} />
        <DetailRow
          label="Employee type"
          value={member.employeeType ? member.employeeType.replace("_", " ").toLowerCase() : " - "}
        />
        <DetailRow label="Hourly rate" value={formatCurrency(member.hourlyRate)} />
        <DetailRow label="Joined" value={formatDate(member.createdAt)} />
      </div>

      {/* Bio */}
      {member.bio && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Bio</Label>
          <p className="text-sm text-foreground whitespace-pre-wrap">{member.bio}</p>
        </div>
      )}

      {/* Department badges */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Departments
          </h4>
          <Button size="sm" variant="ghost" className="text-xs h-7" asChild>
            <Link href="/admin/team/departments">Edit</Link>
          </Button>
        </div>
        {member.departments?.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {member.departments.map((dept) => (
              <Badge
                key={dept.departmentId}
                variant={dept.isPrimary ? "default" : "secondary"}
                className="text-xs"
              >
                {dept.departmentName}
                {dept.isPrimary && <span className="ml-1 opacity-70">primary</span>}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Not assigned to any department.</p>
        )}
      </div>

      {/* Reporting line */}
      <ReportingLine reportsTo={member.reportsTo ?? null} />

      {/* Pay rate with history link */}
      <PayRateSection memberId={member.id} currentRate={member.hourlyRate ?? null} />

      <Separator />

      {/* Emergency contact */}
      <EmergencyContactSection member={member} />

      {/* Address */}
      <AddressSection member={member} />

      {/* Custom fields */}
      <CustomFieldsSection memberId={member.id} />

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
  const [jobTitle, setJobTitle] = useState(member.jobTitle ?? "")
  const [bio, setBio] = useState(member.bio ?? "")
  const [reportsTo, setReportsTo] = useState<string>(member.reportsTo ?? "")
  const [emergencyContactName, setEmergencyContactName] = useState(member.emergencyContactName ?? "")
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(member.emergencyContactPhone ?? "")
  const [emergencyContactRelation, setEmergencyContactRelation] = useState(member.emergencyContactRelation ?? "")
  const [addressLine1, setAddressLine1] = useState(member.addressLine1 ?? "")
  const [addressLine2, setAddressLine2] = useState(member.addressLine2 ?? "")
  const [addressCity, setAddressCity] = useState(member.addressCity ?? "")
  const [addressPostcode, setAddressPostcode] = useState(member.addressPostcode ?? "")
  const [addressCountry, setAddressCountry] = useState(member.addressCountry ?? "")

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
      jobTitle: jobTitle.trim() || undefined,
      reportsTo: reportsTo || null,
      emergencyContactName: emergencyContactName.trim() || null,
      emergencyContactPhone: emergencyContactPhone.trim() || null,
      emergencyContactRelation: emergencyContactRelation.trim() || null,
      addressLine1: addressLine1.trim() || null,
      addressLine2: addressLine2.trim() || null,
      addressCity: addressCity.trim() || null,
      addressPostcode: addressPostcode.trim() || null,
      addressCountry: addressCountry.trim() || null,
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
          <div className="space-y-2">
            <Label htmlFor="edit-job-title">Job title</Label>
            <Input id="edit-job-title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
          </div>

          <Separator />
          <p className="text-xs font-medium text-muted-foreground">Emergency Contact</p>
          <div className="space-y-2">
            <Label htmlFor="edit-ec-name">Contact name</Label>
            <Input id="edit-ec-name" value={emergencyContactName} onChange={(e) => setEmergencyContactName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-ec-phone">Contact phone</Label>
            <Input id="edit-ec-phone" value={emergencyContactPhone} onChange={(e) => setEmergencyContactPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-ec-relation">Relationship</Label>
            <Input id="edit-ec-relation" value={emergencyContactRelation} onChange={(e) => setEmergencyContactRelation(e.target.value)} />
          </div>

          <Separator />
          <p className="text-xs font-medium text-muted-foreground">Address</p>
          <div className="space-y-2">
            <Label htmlFor="edit-addr1">Address line 1</Label>
            <Input id="edit-addr1" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-addr2">Address line 2</Label>
            <Input id="edit-addr2" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="edit-city">City</Label>
              <Input id="edit-city" value={addressCity} onChange={(e) => setAddressCity(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-postcode">Postcode</Label>
              <Input id="edit-postcode" value={addressPostcode} onChange={(e) => setAddressPostcode(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-country">Country</Label>
            <Input id="edit-country" value={addressCountry} onChange={(e) => setAddressCountry(e.target.value)} />
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
