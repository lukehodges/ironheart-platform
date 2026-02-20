"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { PublicFormField, FormFieldValue } from "@/types/public-form"

interface FormFieldRendererProps {
  field: PublicFormField
  value: FormFieldValue
  onChange: (value: FormFieldValue) => void
  error?: string
  disabled?: boolean
  className?: string
}

export default function FormFieldRenderer({
  field,
  value,
  onChange,
  error,
  disabled = false,
  className,
}: FormFieldRendererProps) {
  const fieldId = `field-${field.id}`
  const errorId = `${fieldId}-error`
  const helpTextId = `${fieldId}-help`

  const renderField = () => {
    switch (field.type) {
      case "text": {
        return (
          <Input
            id={fieldId}
            type="text"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder ?? undefined}
            minLength={field.minLength ?? undefined}
            maxLength={field.maxLength ?? undefined}
            disabled={disabled}
            error={!!error}
            aria-invalid={!!error}
            aria-describedby={cn(
              field.helpText && helpTextId,
              error && errorId
            )}
            required={field.isRequired}
          />
        )
      }

      case "textarea": {
        return (
          <Textarea
            id={fieldId}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder ?? undefined}
            minLength={field.minLength ?? undefined}
            maxLength={field.maxLength ?? undefined}
            rows={field.rows ?? 4}
            disabled={disabled}
            error={!!error}
            aria-invalid={!!error}
            aria-describedby={cn(
              field.helpText && helpTextId,
              error && errorId
            )}
            required={field.isRequired}
          />
        )
      }

      case "email": {
        return (
          <Input
            id={fieldId}
            type="email"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder ?? undefined}
            disabled={disabled}
            error={!!error}
            aria-invalid={!!error}
            aria-describedby={cn(
              field.helpText && helpTextId,
              error && errorId
            )}
            required={field.isRequired}
          />
        )
      }

      case "phone": {
        return (
          <Input
            id={fieldId}
            type="tel"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder ?? field.format ?? undefined}
            disabled={disabled}
            error={!!error}
            aria-invalid={!!error}
            aria-describedby={cn(
              field.helpText && helpTextId,
              error && errorId
            )}
            required={field.isRequired}
          />
        )
      }

      case "dropdown": {
        if (field.allowMultiple) {
          // Multi-select - use checkboxes
          return (
            <div className="space-y-2">
              {field.options.map((option) => {
                const values = Array.isArray(value) ? (value as string[]) : []
                const isChecked = values.includes(option.value)

                return (
                  <div key={option.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`${fieldId}-${option.value}`}
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        const newValues = checked
                          ? [...values, option.value]
                          : values.filter((v) => v !== option.value)
                        onChange(newValues as FormFieldValue)
                      }}
                      disabled={disabled}
                      aria-describedby={cn(
                        field.helpText && helpTextId,
                        error && errorId
                      )}
                    />
                    <Label
                      htmlFor={`${fieldId}-${option.value}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {option.label}
                    </Label>
                  </div>
                )
              })}
            </div>
          )
        }

        // Single select
        return (
          <Select
            value={(value as string) ?? ""}
            onValueChange={(val) => onChange(val as FormFieldValue)}
            disabled={disabled}
            required={field.isRequired}
          >
            <SelectTrigger
              id={fieldId}
              className={cn(error && "border-destructive")}
              aria-invalid={!!error}
              aria-describedby={cn(
                field.helpText && helpTextId,
                error && errorId
              )}
            >
              <SelectValue placeholder={field.placeholder ?? "Select an option"} />
            </SelectTrigger>
            <SelectContent>
              {field.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      }

      case "checkbox": {
        return (
          <div className="flex items-center gap-2">
            <Checkbox
              id={fieldId}
              checked={(value as boolean) ?? field.defaultChecked}
              onCheckedChange={(checked) => onChange(!!checked)}
              disabled={disabled}
              aria-invalid={!!error}
              aria-describedby={cn(
                field.helpText && helpTextId,
                error && errorId
              )}
              required={field.isRequired}
            />
            <Label
              htmlFor={fieldId}
              className="text-sm font-normal cursor-pointer"
            >
              {field.label}
              {field.isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
          </div>
        )
      }

      case "date": {
        return (
          <Input
            id={fieldId}
            type="date"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            min={field.minDate ?? undefined}
            max={field.maxDate ?? undefined}
            disabled={disabled}
            error={!!error}
            aria-invalid={!!error}
            aria-describedby={cn(
              field.helpText && helpTextId,
              error && errorId
            )}
            required={field.isRequired}
          />
        )
      }

      case "file": {
        const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          const files = e.target.files
          if (!files) {
            onChange(null)
            return
          }

          if (field.allowMultiple) {
            onChange(Array.from(files))
          } else {
            onChange(files[0] ?? null)
          }
        }

        return (
          <div className="space-y-2">
            <Input
              id={fieldId}
              type="file"
              onChange={handleFileChange}
              accept={field.allowedTypes?.join(",") ?? undefined}
              multiple={field.allowMultiple}
              disabled={disabled}
              error={!!error}
              aria-invalid={!!error}
              aria-describedby={cn(
                field.helpText && helpTextId,
                error && errorId
              )}
              required={field.isRequired}
            />
            {field.maxSizeMb && (
              <p className="text-xs text-muted-foreground">
                Maximum file size: {field.maxSizeMb}MB
              </p>
            )}
            {field.allowedTypes && field.allowedTypes.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Allowed types: {field.allowedTypes.join(", ")}
              </p>
            )}
          </div>
        )
      }

      default: {
        // Type-safe exhaustive check
        const _exhaustive: never = field
        return null
      }
    }
  }

  // For checkbox type, the label is rendered inside the field
  const showLabel = field.type !== "checkbox"

  return (
    <div className={cn("space-y-2", className)}>
      {showLabel && (
        <Label htmlFor={fieldId}>
          {field.label}
          {field.isRequired && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}

      {field.helpText && (
        <p id={helpTextId} className="text-sm text-muted-foreground">
          {field.helpText}
        </p>
      )}

      {renderField()}

      {error && (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

export { FormFieldRenderer }
export type { FormFieldRendererProps }
