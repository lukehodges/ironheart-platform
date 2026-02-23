"use client"

import { useState } from "react"
import { toast } from "sonner"
import { api } from "@/lib/trpc/react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import type { EmployeeType } from "@/modules/team/team.types"

interface AddMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

interface FormState {
  firstName: string
  lastName: string
  email: string
  phone: string
  employeeType: EmployeeType | ""
}

interface FormErrors {
  firstName?: string
  lastName?: string
  email?: string
}

const initialForm: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  employeeType: "",
}

const EMPLOYEE_TYPE_LABELS: Record<EmployeeType, string> = {
  EMPLOYED: "Employed",
  SELF_EMPLOYED: "Self-employed",
  CONTRACTOR: "Contractor",
}

export function AddMemberDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddMemberDialogProps) {
  const [form, setForm] = useState<FormState>(initialForm)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitted, setSubmitted] = useState(false)

  const utils = api.useUtils()

  // team.create is the mutation to create a new staff member
  const createMutation = api.team.create.useMutation({
    onSuccess: () => {
      toast.success("Team member added successfully")
      void utils.team.list.invalidate()
      resetAndClose()
      onSuccess?.()
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to add team member")
    },
  })

  function validate(): FormErrors {
    const errs: FormErrors = {}
    if (!form.firstName.trim()) errs.firstName = "First name is required"
    if (!form.lastName.trim()) errs.lastName = "Last name is required"
    if (!form.email.trim()) {
      errs.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errs.email = "Enter a valid email address"
    }
    return errs
  }

  function handleChange(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (submitted) {
      const draft = { ...form, [field]: value }
      const errs: FormErrors = {}
      if (!draft.firstName.trim()) errs.firstName = "First name is required"
      if (!draft.lastName.trim()) errs.lastName = "Last name is required"
      if (!draft.email.trim()) {
        errs.email = "Email is required"
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) {
        errs.email = "Enter a valid email address"
      }
      setErrors(errs)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setErrors({})

    const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim()

    createMutation.mutate({
      name: fullName,
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      employeeType: form.employeeType ? (form.employeeType as EmployeeType) : undefined,
    })
  }

  function resetAndClose() {
    setForm(initialForm)
    setErrors({})
    setSubmitted(false)
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetAndClose()
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Team Member</DialogTitle>
          <DialogDescription>
            Create a new staff account. The member will receive an invitation to
            set their password.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-4 py-2">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="member-first-name">
                  First name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="member-first-name"
                  placeholder="Jane"
                  value={form.firstName}
                  onChange={(e) => handleChange("firstName", e.target.value)}
                  error={!!errors.firstName}
                  aria-describedby={errors.firstName ? "member-first-name-error" : undefined}
                  autoComplete="given-name"
                />
                {errors.firstName && (
                  <p id="member-first-name-error" className="text-xs text-destructive">
                    {errors.firstName}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="member-last-name">
                  Last name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="member-last-name"
                  placeholder="Smith"
                  value={form.lastName}
                  onChange={(e) => handleChange("lastName", e.target.value)}
                  error={!!errors.lastName}
                  aria-describedby={errors.lastName ? "member-last-name-error" : undefined}
                  autoComplete="family-name"
                />
                {errors.lastName && (
                  <p id="member-last-name-error" className="text-xs text-destructive">
                    {errors.lastName}
                  </p>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="member-email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="member-email"
                type="email"
                placeholder="jane@example.com"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                error={!!errors.email}
                aria-describedby={errors.email ? "member-email-error" : undefined}
                autoComplete="email"
              />
              {errors.email && (
                <p id="member-email-error" className="text-xs text-destructive">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="member-phone">Phone</Label>
              <Input
                id="member-phone"
                type="tel"
                placeholder="+44 7700 900000"
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                autoComplete="tel"
              />
            </div>

            {/* Employee type */}
            <div className="space-y-1.5">
              <Label htmlFor="member-employee-type">Employment type</Label>
              <Select
                value={form.employeeType}
                onValueChange={(val) => handleChange("employeeType", val)}
              >
                <SelectTrigger id="member-employee-type" aria-label="Employment type">
                  <SelectValue placeholder="Select type…" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(EMPLOYEE_TYPE_LABELS) as EmployeeType[]).map((type) => (
                    <SelectItem key={type} value={type}>
                      {EMPLOYEE_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              loading={createMutation.isPending}
            >
              Add member
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
