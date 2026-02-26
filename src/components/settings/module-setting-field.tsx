"use client"

import type { ModuleSettingDefinition } from "@/shared/module-system/types"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ModuleSettingFieldProps {
  definition: ModuleSettingDefinition
  value: unknown
  onChange: (key: string, value: unknown) => void
  error?: string
  disabled?: boolean
}

export function ModuleSettingField({
  definition,
  value,
  onChange,
  error,
  disabled,
}: ModuleSettingFieldProps) {
  const { key, label, type, options, validation } = definition

  if (type === "boolean") {
    return (
      <div className="flex items-center justify-between">
        <Label htmlFor={key}>{label}</Label>
        <Switch
          id={key}
          checked={Boolean(value)}
          onCheckedChange={(checked) => onChange(key, checked)}
          disabled={disabled}
          aria-describedby={error ? `${key}-error` : undefined}
        />
      </div>
    )
  }

  if (type === "number") {
    return (
      <div className="space-y-2">
        <Label htmlFor={key}>{label}</Label>
        <Input
          id={key}
          type="number"
          value={value === undefined || value === null ? "" : String(value)}
          onChange={(e) => {
            const raw = e.target.value
            if (raw === "") {
              onChange(key, undefined)
            } else {
              onChange(key, Number(raw))
            }
          }}
          min={validation?.min}
          max={validation?.max}
          error={!!error}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={error ? `${key}-error` : undefined}
        />
        {error && (
          <p id={`${key}-error`} className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    )
  }

  if (type === "text") {
    return (
      <div className="space-y-2">
        <Label htmlFor={key}>{label}</Label>
        <Input
          id={key}
          type="text"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(key, e.target.value)}
          error={!!error}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={error ? `${key}-error` : undefined}
        />
        {error && (
          <p id={`${key}-error`} className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    )
  }

  if (type === "select" && options) {
    return (
      <div className="space-y-2">
        <Label htmlFor={key}>{label}</Label>
        <Select
          value={typeof value === "string" ? value : String(value ?? "")}
          onValueChange={(v) => onChange(key, v)}
          disabled={disabled}
        >
          <SelectTrigger
            id={key}
            className={error ? "border-destructive focus:ring-destructive" : ""}
            aria-invalid={!!error}
            aria-describedby={error ? `${key}-error` : undefined}
          >
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {error && (
          <p id={`${key}-error`} className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    )
  }

  if (type === "json") {
    const stringValue =
      typeof value === "string" ? value : JSON.stringify(value ?? {}, null, 2)
    return (
      <div className="space-y-2">
        <Label htmlFor={key}>{label}</Label>
        <Textarea
          id={key}
          className="font-mono text-sm"
          value={stringValue}
          onChange={(e) => onChange(key, e.target.value)}
          rows={6}
          error={!!error}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={error ? `${key}-error` : undefined}
        />
        {error && (
          <p id={`${key}-error`} className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    )
  }

  // Fallback: render as text input
  return (
    <div className="space-y-2">
      <Label htmlFor={key}>{label}</Label>
      <Input
        id={key}
        type="text"
        value={String(value ?? "")}
        onChange={(e) => onChange(key, e.target.value)}
        error={!!error}
        disabled={disabled}
      />
    </div>
  )
}
