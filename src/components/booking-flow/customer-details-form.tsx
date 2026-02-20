"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FormFieldRenderer } from "@/components/public-form/form-field-renderer"
import { CustomerDetailsFormSchema, type CustomerDetailsForm } from "@/types/booking-flow"
import type { PublicFormField, FormFieldValue } from "@/types/public-form"
import { Loader2 } from "lucide-react"

interface CustomerDetailsFormProps {
  dynamicFields: PublicFormField[]
  onSubmit: (data: CustomerDetailsForm) => void | Promise<void>
  isLoading?: boolean
  className?: string
}

export default function CustomerDetailsFormComponent({
  dynamicFields,
  onSubmit,
  isLoading = false,
  className,
}: CustomerDetailsFormProps) {
  const [formData, setFormData] = React.useState<CustomerDetailsForm>({
    name: "",
    email: "",
    phone: "",
    notes: null,
    dynamicFields: {},
  })

  const [errors, setErrors] = React.useState<Record<string, string>>({})

  const handleFieldChange = (field: keyof CustomerDetailsForm, value: string | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handleDynamicFieldChange = (fieldId: string, value: FormFieldValue) => {
    setFormData((prev) => ({
      ...prev,
      dynamicFields: {
        ...prev.dynamicFields,
        [fieldId]: value,
      },
    }))
    // Clear error when user changes value
    if (errors[`dynamic.${fieldId}`]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[`dynamic.${fieldId}`]
        return newErrors
      })
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Validate standard fields using Zod schema
    const result = CustomerDetailsFormSchema.safeParse(formData)
    if (!result.success) {
      result.error.issues.forEach((err) => {
        const field = err.path[0] as string
        newErrors[field] = err.message
      })
    }

    // Validate dynamic fields
    dynamicFields.forEach((field) => {
      const value = formData.dynamicFields[field.id]

      if (field.isRequired && (value === null || value === undefined || value === "")) {
        newErrors[`dynamic.${field.id}`] = `${field.label} is required`
      }

      // Type-specific validation
      switch (field.type) {
        case "email":
          if (value && typeof value === "string" && !value.includes("@")) {
            newErrors[`dynamic.${field.id}`] = "Valid email is required"
          }
          break
        case "text":
        case "textarea":
          if (typeof value === "string") {
            if (field.minLength && value.length < field.minLength) {
              newErrors[`dynamic.${field.id}`] = `Minimum ${field.minLength} characters required`
            }
            if (field.maxLength && value.length > field.maxLength) {
              newErrors[`dynamic.${field.id}`] = `Maximum ${field.maxLength} characters allowed`
            }
          }
          break
        case "file":
          if (value instanceof File || (Array.isArray(value) && value[0] instanceof File)) {
            const files = Array.isArray(value) ? value : [value]
            files.forEach((file) => {
              if (field.maxSizeMb && file.size > field.maxSizeMb * 1024 * 1024) {
                newErrors[`dynamic.${field.id}`] = `File size must be less than ${field.maxSizeMb}MB`
              }
              if (field.allowedTypes && field.allowedTypes.length > 0) {
                if (!field.allowedTypes.includes(file.type)) {
                  newErrors[`dynamic.${field.id}`] = `File type must be one of: ${field.allowedTypes.join(", ")}`
                }
              }
            })
          }
          break
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    await onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-6", className)}>
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleFieldChange("name", e.target.value)}
              placeholder="John Doe"
              error={!!errors.name}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "name-error" : undefined}
              disabled={isLoading}
              required
            />
            {errors.name && (
              <p id="name-error" className="text-sm text-destructive">
                {errors.name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleFieldChange("email", e.target.value)}
              placeholder="john@example.com"
              error={!!errors.email}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
              disabled={isLoading}
              required
            />
            {errors.email && (
              <p id="email-error" className="text-sm text-destructive">
                {errors.email}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">
              Phone <span className="text-destructive">*</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleFieldChange("phone", e.target.value)}
              placeholder="+1 (555) 123-4567"
              error={!!errors.phone}
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? "phone-error" : undefined}
              disabled={isLoading}
              required
            />
            {errors.phone && (
              <p id="phone-error" className="text-sm text-destructive">
                {errors.phone}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes ?? ""}
              onChange={(e) => handleFieldChange("notes", e.target.value || null)}
              placeholder="Any special requests or information..."
              rows={3}
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      {dynamicFields.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {dynamicFields.map((field) => (
              <FormFieldRenderer
                key={field.id}
                field={field}
                value={formData.dynamicFields[field.id] as FormFieldValue ?? null}
                onChange={(value) => handleDynamicFieldChange(field.id, value)}
                error={errors[`dynamic.${field.id}`]}
                disabled={isLoading}
              />
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button
          type="submit"
          size="lg"
          disabled={isLoading}
          loading={isLoading}
          className="min-w-[200px]"
        >
          {isLoading ? "Submitting..." : "Complete Booking"}
        </Button>
      </div>
    </form>
  )
}

export { CustomerDetailsFormComponent as CustomerDetailsForm }
export type { CustomerDetailsFormProps }
