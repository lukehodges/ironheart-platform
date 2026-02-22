"use client"

import { useState, useEffect } from "react"
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

interface CustomerEditDialogProps {
  customerId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface FormState {
  name: string
  email: string
  phone: string
  notes: string
}

interface FormErrors {
  name?: string
  email?: string
}

const initialFormState: FormState = {
  name: "",
  email: "",
  phone: "",
  notes: "",
}

export function CustomerEditDialog({
  customerId,
  open,
  onOpenChange,
}: CustomerEditDialogProps) {
  const [form, setForm] = useState<FormState>(initialFormState)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitted, setSubmitted] = useState(false)

  const utils = api.useUtils()

  const { data: customer, isLoading } = api.customer.getById.useQuery(
    { id: customerId },
    { enabled: open && !!customerId }
  )

  // Pre-populate form when customer data loads
  useEffect(() => {
    if (customer) {
      setForm({
        name: customer.name ?? "",
        email: customer.email ?? "",
        phone: customer.phone ?? "",
        notes: customer.notes ?? "",
      })
    }
  }, [customer])

  const updateMutation = api.customer.update.useMutation({
    onSuccess: () => {
      toast.success("Customer updated successfully")
      void utils.customer.list.invalidate()
      void utils.customer.getById.invalidate({ id: customerId })
      setErrors({})
      setSubmitted(false)
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error(error.message ?? "Failed to update customer")
    },
  })

  function validate(): FormErrors {
    const errs: FormErrors = {}
    if (!form.name.trim()) errs.name = "Name is required"
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = "Please enter a valid email address"
    }
    return errs
  }

  function handleChange(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (submitted) {
      const current = { ...form, [field]: value }
      const errs: FormErrors = {}
      if (!current.name.trim()) errs.name = "Name is required"
      if (current.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(current.email)) {
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

    updateMutation.mutate({
      id: customerId,
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      notes: form.notes.trim() || null,
    })
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setErrors({})
      setSubmitted(false)
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Customer</DialogTitle>
          <DialogDescription>
            Update the customer record details.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Loading customer data...
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="space-y-4 py-2">
              {/* Name */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-name"
                  placeholder="Jane Smith"
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  error={!!errors.name}
                  aria-describedby={errors.name ? "edit-name-error" : undefined}
                  autoComplete="name"
                />
                {errors.name && (
                  <p id="edit-name-error" className="text-xs text-destructive">
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  placeholder="jane@example.com"
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  error={!!errors.email}
                  aria-describedby={errors.email ? "edit-email-error" : undefined}
                  autoComplete="email"
                />
                {errors.email && (
                  <p id="edit-email-error" className="text-xs text-destructive">
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  type="tel"
                  placeholder="+44 7700 900000"
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  autoComplete="tel"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes"
                  placeholder="Notes about this customer..."
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
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                loading={updateMutation.isPending}
              >
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
