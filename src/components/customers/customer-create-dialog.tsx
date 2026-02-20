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
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface CustomerCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (customerId: string) => void
}

interface FormState {
  firstName: string
  lastName: string
  email: string
  phone: string
  notes: string
}

interface FormErrors {
  firstName?: string
  lastName?: string
  email?: string
}

const initialFormState: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  notes: "",
}

export function CustomerCreateDialog({
  open,
  onOpenChange,
  onSuccess,
}: CustomerCreateDialogProps) {
  const [form, setForm] = useState<FormState>(initialFormState)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitted, setSubmitted] = useState(false)

  const utils = api.useUtils()

  const createMutation = api.customer.create.useMutation({
    onSuccess: (customer) => {
      toast.success("Customer created successfully")
      void utils.customer.list.invalidate()
      setForm(initialFormState)
      setErrors({})
      setSubmitted(false)
      onOpenChange(false)
      onSuccess?.(customer.id)
    },
    onError: (error) => {
      toast.error(error.message ?? "Failed to create customer")
    },
  })

  function validate(): FormErrors {
    const errs: FormErrors = {}
    if (!form.firstName.trim()) errs.firstName = "First name is required"
    if (!form.lastName.trim()) errs.lastName = "Last name is required"
    if (!form.email.trim()) {
      errs.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = "Please enter a valid email address"
    }
    return errs
  }

  function handleChange(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (submitted) {
      // Re-validate on change after first submit attempt
      const current = { ...form, [field]: value }
      const errs: FormErrors = {}
      if (!current.firstName.trim()) errs.firstName = "First name is required"
      if (!current.lastName.trim()) errs.lastName = "Last name is required"
      if (!current.email.trim()) {
        errs.email = "Email is required"
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(current.email)) {
        errs.email = "Please enter a valid email address"
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
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      notes: form.notes.trim() || null,
    })
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setForm(initialFormState)
      setErrors({})
      setSubmitted(false)
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Customer</DialogTitle>
          <DialogDescription>
            Create a new customer record. Email is required.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-4 py-2">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="create-first-name">
                  First name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="create-first-name"
                  placeholder="Jane"
                  value={form.firstName}
                  onChange={(e) => handleChange("firstName", e.target.value)}
                  error={!!errors.firstName}
                  aria-describedby={errors.firstName ? "create-first-name-error" : undefined}
                  autoComplete="given-name"
                />
                {errors.firstName && (
                  <p id="create-first-name-error" className="text-xs text-destructive">
                    {errors.firstName}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-last-name">
                  Last name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="create-last-name"
                  placeholder="Smith"
                  value={form.lastName}
                  onChange={(e) => handleChange("lastName", e.target.value)}
                  error={!!errors.lastName}
                  aria-describedby={errors.lastName ? "create-last-name-error" : undefined}
                  autoComplete="family-name"
                />
                {errors.lastName && (
                  <p id="create-last-name-error" className="text-xs text-destructive">
                    {errors.lastName}
                  </p>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="create-email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="create-email"
                type="email"
                placeholder="jane@example.com"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                error={!!errors.email}
                aria-describedby={errors.email ? "create-email-error" : undefined}
                autoComplete="email"
              />
              {errors.email && (
                <p id="create-email-error" className="text-xs text-destructive">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="create-phone">Phone</Label>
              <Input
                id="create-phone"
                type="tel"
                placeholder="+44 7700 900000"
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                autoComplete="tel"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="create-notes">Notes</Label>
              <Textarea
                id="create-notes"
                placeholder="Any initial notes about this customer..."
                value={form.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                className="min-h-[80px]"
              />
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
              Create Customer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
