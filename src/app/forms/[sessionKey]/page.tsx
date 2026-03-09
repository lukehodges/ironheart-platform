"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { CheckCircle, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react"
import { api } from "@/lib/trpc/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { FormFieldRenderer } from "@/components/public-form"
import type { PublicFormField, FormFieldValue } from "@/types/public-form"

// ---------------------------------------------------------------------------
// Field Mapper: DB FormField → PublicFormField for the renderer component
// ---------------------------------------------------------------------------

interface DbFormField {
  id: string
  type: string
  label: string
  required: boolean
  placeholder?: string
  options?: string[]
  validation?: {
    minLength?: number
    maxLength?: number
    pattern?: string
    min?: string
    max?: string
  }
}

/** Map a DB field type (uppercase) to the public component's field type (lowercase) */
const FIELD_TYPE_MAP: Record<string, PublicFormField["type"]> = {
  TEXT: "text",
  TEXTAREA: "textarea",
  EMAIL: "email",
  PHONE: "phone",
  SELECT: "dropdown",
  MULTISELECT: "dropdown",
  BOOLEAN: "checkbox",
  DATE: "date",
}

/**
 * Convert a server-side FormField (from the DB / tRPC response) into the
 * PublicFormField discriminated union that FormFieldRenderer expects.
 */
function mapDbFieldToPublic(field: DbFormField): PublicFormField {
  const base = {
    id: field.id,
    label: field.label,
    placeholder: field.placeholder ?? null,
    helpText: null as string | null,
    isRequired: field.required,
    validationRules: null as Record<string, unknown> | null,
  }

  const mappedType = FIELD_TYPE_MAP[field.type] ?? "text"

  switch (mappedType) {
    case "text":
      return {
        ...base,
        type: "text" as const,
        minLength: field.validation?.minLength ?? null,
        maxLength: field.validation?.maxLength ?? null,
      }
    case "textarea":
      return {
        ...base,
        type: "textarea" as const,
        minLength: field.validation?.minLength ?? null,
        maxLength: field.validation?.maxLength ?? null,
        rows: null,
      }
    case "email":
      return { ...base, type: "email" as const }
    case "phone":
      return { ...base, type: "phone" as const, format: null }
    case "dropdown":
      return {
        ...base,
        type: "dropdown" as const,
        options: (field.options ?? []).map((o) => ({ value: o, label: o })),
        allowMultiple: field.type === "MULTISELECT",
      }
    case "checkbox":
      return { ...base, type: "checkbox" as const, defaultChecked: false }
    case "date":
      return {
        ...base,
        type: "date" as const,
        minDate: field.validation?.min ?? null,
        maxDate: field.validation?.max ?? null,
      }
    default:
      return {
        ...base,
        type: "text" as const,
        minLength: null,
        maxLength: null,
      }
  }
}

// Validation constants
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_REGEX = /^[+]?[\d\s\-().]{7,20}$/

/** Validate a single form field value based on its type constraints */
function validateField(field: PublicFormField, value: FormFieldValue): string | undefined {
  const isEmpty = value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0)

  if (field.isRequired && isEmpty) {
    return `${field.label} is required`
  }

  // Skip further validation if the field is empty and not required
  if (isEmpty) return undefined

  switch (field.type) {
    case "email": {
      if (typeof value === "string" && !EMAIL_REGEX.test(value)) {
        return "Please enter a valid email address"
      }
      break
    }
    case "phone": {
      if (typeof value === "string" && !PHONE_REGEX.test(value)) {
        return "Please enter a valid phone number"
      }
      break
    }
    case "text": {
      if (typeof value === "string") {
        if (field.minLength != null && value.length < field.minLength) {
          return `Must be at least ${field.minLength} characters`
        }
        if (field.maxLength != null && value.length > field.maxLength) {
          return `Must be no more than ${field.maxLength} characters`
        }
      }
      break
    }
    case "textarea": {
      if (typeof value === "string") {
        if (field.minLength != null && value.length < field.minLength) {
          return `Must be at least ${field.minLength} characters`
        }
        if (field.maxLength != null && value.length > field.maxLength) {
          return `Must be no more than ${field.maxLength} characters`
        }
      }
      break
    }
    case "dropdown": {
      if (field.allowMultiple && Array.isArray(value) && value.length === 0 && field.isRequired) {
        return "Please select at least one option"
      }
      break
    }
    default:
      break
  }

  return undefined
}

/**
 * Public form submission page
 *
 * Features:
 * - Token-based form access (7-day expiry)
 * - Dynamic field rendering (8 field types)
 * - Multi-step for long forms (>5 fields)
 * - Progress tracking
 * - Success/error states
 * - Token validation
 *
 * Route: /forms/[sessionKey]
 */
export default function FormSubmissionPage() {
  const params = useParams<{ sessionKey: string }>()
  const sessionKey = params?.sessionKey ?? ""

  // State
  const [currentStep, setCurrentStep] = useState(0)
  const [fieldValues, setFieldValues] = useState<Record<string, FormFieldValue>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitted, setIsSubmitted] = useState(false)

  // Fetch form template by session key
  const {
    data: formData,
    isLoading,
    isError,
    error,
  } = api.forms.getFormByToken.useQuery(
    { token: sessionKey },
    {
      retry: false,
      refetchOnWindowFocus: false,
    }
  )

  // Submit form mutation
  const submitMutation = api.forms.submitForm.useMutation({
    onSuccess: () => {
      setIsSubmitted(true)
      toast.success("Form submitted successfully!")
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit form")
    },
  })

  // Update page title when form loads
  useEffect(() => {
    if (formData?.template) {
      document.title = `${formData.template.name} - Form Submission`
    }
  }, [formData])

  // Loading state
  if (isLoading) {
    return <FormPageSkeleton />
  }

  // Error state - token invalid or expired
  if (isError || !formData) {
    const isExpired = error?.message?.includes("expired") || error?.message?.includes("7-day")
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/20">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <CardTitle className="text-center">
              {isExpired ? "Form Link Expired" : "Form Not Found"}
            </CardTitle>
            <CardDescription className="text-center">
              {isExpired
                ? "This form link has expired. Please contact the business for a new link."
                : "We couldn't find this form. Please check the URL and try again."}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // Success state
  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/20">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-success" />
            </div>
            <CardTitle className="text-2xl">Thank You!</CardTitle>
            <CardDescription>
              Your form has been submitted successfully
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">
                We&apos;ve received your submission. If needed, we&apos;ll be in touch soon.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Parse fields from formData - map DB types to the public component model
  const fields = (
    (formData.template.fields as DbFormField[]) ?? []
  ).map(mapDbFieldToPublic)
  const FIELDS_PER_STEP = 5
  const totalSteps = Math.max(1, Math.ceil(fields.length / FIELDS_PER_STEP))
  const isMultiStep = fields.length > FIELDS_PER_STEP

  const currentFields = isMultiStep
    ? fields.slice(currentStep * FIELDS_PER_STEP, (currentStep + 1) * FIELDS_PER_STEP)
    : fields

  const progress = ((currentStep + 1) / totalSteps) * 100

  // Validate current step
  const validateCurrentStep = (): boolean => {
    const newErrors: Record<string, string> = {}

    currentFields.forEach((field: PublicFormField) => {
      const value = fieldValues[field.id]
      const error = validateField(field, value ?? null)
      if (error) {
        newErrors[field.id] = error
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle next step
  const handleNext = () => {
    if (!validateCurrentStep()) {
      toast.error("Please fill in all required fields")
      return
    }
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  // Handle previous step
  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateCurrentStep()) {
      toast.error("Please fill in all required fields")
      return
    }

    // Convert fieldValues to the format expected by the API
    const responses: Record<string, unknown> = {}
    Object.entries(fieldValues).forEach(([fieldId, value]) => {
      responses[fieldId] = value
    })

    await submitMutation.mutateAsync({
      token: sessionKey,
      responses,
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold">{formData.template.name}</h1>
            {formData.template.description && (
              <p className="text-sm text-muted-foreground">{formData.template.description}</p>
            )}
          </div>
        </div>
      </header>

      {/* Progress bar (multi-step only) */}
      {isMultiStep && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                Step {currentStep + 1} of {totalSteps}
              </span>
              <span className="text-muted-foreground">
                {Math.round(progress)}% Complete
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      )}

      {/* Form content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle>
              {isMultiStep ? `Section ${currentStep + 1}` : "Form Details"}
            </CardTitle>
            <CardDescription>
              Please fill in all required fields marked with *
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Dynamic field rendering */}
            <div className="space-y-4">
              {currentFields.map((field: PublicFormField) => (
                <FormFieldRenderer
                  key={field.id}
                  field={field}
                  value={fieldValues[field.id] ?? null}
                  onChange={(value: FormFieldValue) => {
                    setFieldValues((prev) => ({ ...prev, [field.id]: value }))
                    // Clear error on change
                    if (errors[field.id]) {
                      setErrors((prev) => {
                        const next = { ...prev }
                        delete next[field.id]
                        return next
                      })
                    }
                  }}
                  error={errors[field.id]}
                  disabled={submitMutation.isPending}
                />
              ))}
            </div>

            {/* Navigation buttons */}
            <div className="flex justify-between pt-4 border-t border-border">
              {isMultiStep && currentStep > 0 ? (
                <Button variant="outline" onClick={handlePrev}>
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
              ) : (
                <div />
              )}

              {currentStep < totalSteps - 1 ? (
                <Button onClick={handleNext}>
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  loading={submitMutation.isPending}
                >
                  Submit Form
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Form info footer */}
        <div className="mt-6 text-center text-xs text-muted-foreground">
          <p>
            This form link expires after 7 days
          </p>
        </div>
      </main>
    </div>
  )
}

/**
 * Loading skeleton for form page
 */
function FormPageSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <Skeleton className="h-5 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
      </header>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-24 ml-auto" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
