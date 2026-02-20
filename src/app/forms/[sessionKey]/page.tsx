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
import type { FormFieldValue } from "@/types/public-form"

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

  // Parse fields from formData
  const fields = (formData.template.fields as unknown[]) || []
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

    currentFields.forEach((field: any) => {
      const value = fieldValues[field.id]
      if (field.required && !value) {
        newErrors[field.id] = `${field.label} is required`
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
            {/* Placeholder for dynamic field renderer (Wave 4) */}
            <div className="space-y-4">
              {currentFields.map((field: any) => (
                <div key={field.id} className="space-y-2">
                  <label className="text-sm font-medium">
                    {field.label}
                    {field.required && <span className="text-destructive ml-1">*</span>}
                  </label>
                  <div className="p-4 border border-dashed border-border rounded-md text-center text-sm text-muted-foreground">
                    {field.type} field renderer (Wave 4)
                  </div>
                  {errors[field.id] && (
                    <p className="text-sm text-destructive">{errors[field.id]}</p>
                  )}
                </div>
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
