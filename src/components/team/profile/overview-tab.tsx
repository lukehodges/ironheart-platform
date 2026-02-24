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
