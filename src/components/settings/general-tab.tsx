"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { generalSettingsSchema, type GeneralSettingsInput } from "@/schemas/settings.schemas"
import { useSettingsMutations } from "@/hooks/use-settings-mutations"
import { api } from "@/lib/trpc/react"
import { Loader2, Upload, X, Image as ImageIcon } from "lucide-react"

// Common timezones
const TIMEZONES = [
  { label: "UTC", value: "UTC" },
  { label: "America/New_York", value: "America/New_York" },
  { label: "America/Chicago", value: "America/Chicago" },
  { label: "America/Denver", value: "America/Denver" },
  { label: "America/Los_Angeles", value: "America/Los_Angeles" },
  { label: "Europe/London", value: "Europe/London" },
  { label: "Europe/Paris", value: "Europe/Paris" },
  { label: "Europe/Berlin", value: "Europe/Berlin" },
  { label: "Asia/Tokyo", value: "Asia/Tokyo" },
  { label: "Asia/Shanghai", value: "Asia/Shanghai" },
  { label: "Asia/Hong_Kong", value: "Asia/Hong_Kong" },
  { label: "Asia/Singapore", value: "Asia/Singapore" },
  { label: "Australia/Sydney", value: "Australia/Sydney" },
  { label: "Australia/Melbourne", value: "Australia/Melbourne" },
]

// Common currencies (ISO 4217)
const CURRENCIES = [
  { label: "US Dollar (USD)", value: "USD" },
  { label: "Euro (EUR)", value: "EUR" },
  { label: "British Pound (GBP)", value: "GBP" },
  { label: "Japanese Yen (JPY)", value: "JPY" },
  { label: "Canadian Dollar (CAD)", value: "CAD" },
  { label: "Australian Dollar (AUD)", value: "AUD" },
  { label: "Swiss Franc (CHF)", value: "CHF" },
  { label: "Chinese Yuan (CNY)", value: "CNY" },
  { label: "Indian Rupee (INR)", value: "INR" },
  { label: "Mexican Peso (MXN)", value: "MXN" },
  { label: "Singapore Dollar (SGD)", value: "SGD" },
  { label: "Hong Kong Dollar (HKD)", value: "HKD" },
  { label: "New Zealand Dollar (NZD)", value: "NZD" },
  { label: "South Korean Won (KRW)", value: "KRW" },
  { label: "Thai Baht (THB)", value: "THB" },
  { label: "Brazilian Real (BRL)", value: "BRL" },
  { label: "South African Rand (ZAR)", value: "ZAR" },
]

export function GeneralTab() {
  const [formData, setFormData] = React.useState<GeneralSettingsInput>({
    businessName: "",
    address: "",
    timezone: "UTC",
    currency: "USD",
    logoUrl: undefined,
  })

  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [logoPreview, setLogoPreview] = React.useState<string | null>(null)
  const [logoFile, setLogoFile] = React.useState<File | null>(null)
  const [isUploading, setIsUploading] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const mutations = useSettingsMutations()
  const isLoading = mutations.updateGeneral.isPending

  // TODO: Implement settings router with getGeneral procedure
  // For now, stub the data to make build pass
  const isLoadingSettings = false
  const currentSettings = React.useMemo(
    () => ({
      businessName: "Demo Business",
      address: "123 Main St, City, State 12345",
      timezone: "UTC",
      currency: "USD",
      logoUrl: undefined as string | undefined,
    }),
    []
  )

  React.useEffect(() => {
    if (currentSettings) {
      setFormData({
        businessName: currentSettings.businessName,
        address: currentSettings.address,
        timezone: currentSettings.timezone,
        currency: currentSettings.currency,
        logoUrl: currentSettings.logoUrl,
      })
      if (currentSettings.logoUrl) {
        setLogoPreview(currentSettings.logoUrl)
      }
    }
  }, [currentSettings])

  const handleFieldChange = (field: keyof GeneralSettingsInput, value: string | undefined) => {
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

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({ ...prev, logo: "Please select a valid image file" }))
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, logo: "File size must be less than 5MB" }))
      return
    }

    setLogoFile(file)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setLogoPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Clear errors
    if (errors.logo) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors.logo
        return newErrors
      })
    }
  }

  const handleRemoveLogo = () => {
    setLogoFile(null)
    setLogoPreview(null)
    setFormData((prev) => ({ ...prev, logoUrl: undefined }))
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Validate using Zod schema
    const result = generalSettingsSchema.safeParse(formData)
    if (!result.success) {
      result.error.issues.forEach((err) => {
        const field = err.path[0] as string
        newErrors[field] = err.message
      })
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    // For now, submit without logo if no file selected
    // In a real implementation, you would upload the logo to a storage service
    // and get back a URL to submit with the form
    mutations.updateGeneral.mutate(formData)
  }

  if (isLoadingSettings) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Business Information */}
      <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="businessName">
              Business Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="businessName"
              type="text"
              value={formData.businessName}
              onChange={(e) => handleFieldChange("businessName", e.target.value)}
              placeholder="Acme Inc."
              error={!!errors.businessName}
              aria-invalid={!!errors.businessName}
              aria-describedby={errors.businessName ? "businessName-error" : undefined}
              disabled={isLoading}
              required
            />
            {errors.businessName && (
              <p id="businessName-error" className="text-sm text-destructive">
                {errors.businessName}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">
              Address <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleFieldChange("address", e.target.value)}
              placeholder="123 Main Street, Suite 100, New York, NY 10001"
              rows={3}
              error={!!errors.address}
              aria-invalid={!!errors.address}
              aria-describedby={errors.address ? "address-error" : undefined}
              disabled={isLoading}
              required
            />
            {errors.address && (
              <p id="address-error" className="text-sm text-destructive">
                {errors.address}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Location & Currency Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Location & Currency</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="timezone">
              Timezone <span className="text-destructive">*</span>
            </Label>
            <Select value={formData.timezone} onValueChange={(value) => handleFieldChange("timezone", value)}>
              <SelectTrigger
                id="timezone"
                className={errors.timezone ? "border-destructive focus:ring-destructive" : ""}
                disabled={isLoading}
                aria-invalid={!!errors.timezone}
                aria-describedby={errors.timezone ? "timezone-error" : undefined}
              >
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.timezone && (
              <p id="timezone-error" className="text-sm text-destructive">
                {errors.timezone}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">
              Currency <span className="text-destructive">*</span>
            </Label>
            <Select value={formData.currency} onValueChange={(value) => handleFieldChange("currency", value)}>
              <SelectTrigger
                id="currency"
                className={errors.currency ? "border-destructive focus:ring-destructive" : ""}
                disabled={isLoading}
                aria-invalid={!!errors.currency}
                aria-describedby={errors.currency ? "currency-error" : undefined}
              >
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((curr) => (
                  <SelectItem key={curr.value} value={curr.value}>
                    {curr.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.currency && (
              <p id="currency-error" className="text-sm text-destructive">
                {errors.currency}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Logo Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Logo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Logo Image</Label>
            <div className="flex gap-4">
              {/* Logo Preview */}
              <div className="flex-shrink-0">
                {logoPreview ? (
                  <div className="relative h-32 w-32 overflow-hidden rounded-lg border border-input bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logoPreview} alt="Logo preview" className="h-full w-full object-contain p-2" />
                  </div>
                ) : (
                  <div className="flex h-32 w-32 items-center justify-center rounded-lg border-2 border-dashed border-input bg-muted">
                    <div className="flex flex-col items-center gap-1">
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">No logo</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex flex-col justify-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoSelect}
                  disabled={isLoading || isUploading}
                  className="hidden"
                  aria-label="Upload logo"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || isUploading}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Choose Image
                </Button>
                {logoPreview && (
                  <Button type="button" variant="outline" size="sm" onClick={handleRemoveLogo} disabled={isLoading} className="gap-2">
                    <X className="h-4 w-4" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
            {errors.logo && (
              <p id="logo-error" className="text-sm text-destructive">
                {errors.logo}
              </p>
            )}
            <p className="text-xs text-muted-foreground">Recommended: Square image, max 5MB (PNG, JPG, WebP)</p>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading || isUploading} loading={isLoading} className="min-w-[200px]">
          {isLoading ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </form>
  )
}

export type { GeneralSettingsInput }
