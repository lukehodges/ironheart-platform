"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Eye, Plus, X } from "lucide-react"
import type { SendEmailActionConfig } from "@/modules/workflow/workflow.types"

interface EmailConfigProps {
  config: SendEmailActionConfig
  onChange: (config: SendEmailActionConfig) => void
}

export function EmailConfig({ config, onChange }: EmailConfigProps) {
  const [recipientType, setRecipientType] = React.useState<"field" | "literal">(
    config.recipientField ? "field" : "literal"
  )
  const [showPreview, setShowPreview] = React.useState(false)

  const handleRecipientTypeChange = (value: "field" | "literal") => {
    setRecipientType(value)
    if (value === "field") {
      onChange({ ...config, recipientEmail: undefined })
    } else {
      onChange({ ...config, recipientField: undefined })
    }
  }

  return (
    <div className="space-y-4">
      {/* Template Selector */}
      <div className="space-y-2">
        <Label htmlFor="email-template">Email Template</Label>
        <Select
          value={config.templateId ?? "custom"}
          onValueChange={(value) => {
            onChange({
              ...config,
              templateId: value === "custom" ? undefined : value,
            })
          }}
        >
          <SelectTrigger id="email-template">
            <SelectValue placeholder="Select a template" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="custom">Custom Email</SelectItem>
            <SelectItem value="booking-confirmation">Booking Confirmation</SelectItem>
            <SelectItem value="booking-reminder">Booking Reminder</SelectItem>
            <SelectItem value="booking-cancellation">Booking Cancellation</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Choose a pre-built template or create a custom email
        </p>
      </div>

      {/* Recipient Configuration */}
      <div className="space-y-2">
        <Label>Recipient</Label>
        <Select value={recipientType} onValueChange={handleRecipientTypeChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="field">From Field (Variable)</SelectItem>
            <SelectItem value="literal">Email Address</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {recipientType === "field" ? (
        <div className="space-y-2">
          <Label htmlFor="recipient-field">Recipient Field</Label>
          <Input
            id="recipient-field"
            placeholder="e.g., customer.email, booking.customerEmail"
            value={config.recipientField ?? ""}
            onChange={(e) => onChange({ ...config, recipientField: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Dot-path to email field in context (e.g., customer.email)
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="recipient-email">Email Address</Label>
          <Input
            id="recipient-email"
            type="email"
            placeholder="user@example.com"
            value={config.recipientEmail ?? ""}
            onChange={(e) => onChange({ ...config, recipientEmail: e.target.value })}
          />
        </div>
      )}

      {/* Subject Field */}
      <div className="space-y-2">
        <Label htmlFor="email-subject">Subject</Label>
        <Input
          id="email-subject"
          placeholder="e.g., Your booking is confirmed!"
          value={config.subject ?? ""}
          onChange={(e) => onChange({ ...config, subject: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          Use variables like {`{{customerName}}`} or {`{{bookingDate}}`}
        </p>
      </div>

      {/* Body Field */}
      <div className="space-y-2">
        <Label htmlFor="email-body">Body (Plain Text)</Label>
        <Textarea
          id="email-body"
          placeholder="e.g., Hi {{customerName}}, your booking is confirmed..."
          className="min-h-[100px]"
          value={config.body ?? ""}
          onChange={(e) => onChange({ ...config, body: e.target.value })}
        />
      </div>

      {/* HTML Body Field */}
      <div className="space-y-2">
        <Label htmlFor="email-body-html">Body (HTML)</Label>
        <Textarea
          id="email-body-html"
          placeholder="Optional HTML version of the email"
          className="min-h-[100px] font-mono text-xs"
          value={config.bodyHtml ?? ""}
          onChange={(e) => onChange({ ...config, bodyHtml: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          Optional: Provide an HTML version for richer formatting
        </p>
      </div>

      {/* Delay Field */}
      <div className="space-y-2">
        <Label htmlFor="email-delay">Delay (ISO 8601 Duration)</Label>
        <Input
          id="email-delay"
          placeholder="e.g., PT1H (1 hour), P1D (1 day)"
          value={config.delay ?? ""}
          onChange={(e) => onChange({ ...config, delay: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          Optional: Delay before sending (e.g., PT24H = 24 hours)
        </p>
      </div>

      {/* Variable Mapping Info */}
      <div className="rounded-md border border-border bg-muted/50 p-3">
        <h4 className="text-sm font-medium mb-2">Available Variables</h4>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li><code className="bg-background px-1 py-0.5 rounded">{`{{customerName}}`}</code> - Customer full name</li>
          <li><code className="bg-background px-1 py-0.5 rounded">{`{{customerEmail}}`}</code> - Customer email</li>
          <li><code className="bg-background px-1 py-0.5 rounded">{`{{bookingDate}}`}</code> - Booking date</li>
          <li><code className="bg-background px-1 py-0.5 rounded">{`{{bookingTime}}`}</code> - Booking time</li>
          <li><code className="bg-background px-1 py-0.5 rounded">{`{{serviceName}}`}</code> - Service name</li>
        </ul>
      </div>

      {/* Preview Button */}
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => setShowPreview(!showPreview)}
      >
        <Eye className="h-4 w-4" />
        {showPreview ? "Hide Preview" : "Preview Email"}
      </Button>

      {showPreview && (
        <div className="rounded-md border border-border p-4 space-y-2 bg-background">
          <div className="text-sm">
            <span className="font-medium">To:</span>{" "}
            <span className="text-muted-foreground">
              {recipientType === "field" ? config.recipientField : config.recipientEmail || "Not set"}
            </span>
          </div>
          <div className="text-sm">
            <span className="font-medium">Subject:</span>{" "}
            <span className="text-muted-foreground">{config.subject || "No subject"}</span>
          </div>
          <div className="border-t border-border pt-2 mt-2">
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">
              {config.body || config.bodyHtml || "No content"}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
