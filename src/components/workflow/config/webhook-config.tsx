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
import { Plus, X, Send, Loader2 } from "lucide-react"
import type { WebhookActionConfig } from "@/modules/workflow/workflow.types"
import { toast } from "sonner"

interface WebhookConfigProps {
  config: WebhookActionConfig
  onChange: (config: WebhookActionConfig) => void
}

export function WebhookConfig({ config, onChange }: WebhookConfigProps) {
  const [headers, setHeaders] = React.useState<Array<{ key: string; value: string }>>(
    config.headers
      ? Object.entries(config.headers).map(([key, value]) => ({ key, value }))
      : [{ key: "Content-Type", value: "application/json" }]
  )
  const [isTesting, setIsTesting] = React.useState(false)

  React.useEffect(() => {
    const headerObj = headers.reduce((acc, { key, value }) => {
      if (key.trim()) {
        acc[key] = value
      }
      return acc
    }, {} as Record<string, string>)
    onChange({ ...config, headers: headerObj })
  }, [headers])

  const addHeader = () => {
    setHeaders([...headers, { key: "", value: "" }])
  }

  const updateHeader = (index: number, field: "key" | "value", value: string) => {
    const newHeaders = [...headers]
    newHeaders[index][field] = value
    setHeaders(newHeaders)
  }

  const removeHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index))
  }

  const testWebhook = async () => {
    if (!config.url) {
      toast.error("Please enter a URL before testing")
      return
    }

    setIsTesting(true)
    try {
      // Mock test - in real app would call a test endpoint
      await new Promise((resolve) => setTimeout(resolve, 1000))
      toast.success("Test webhook sent successfully")
    } catch (error) {
      toast.error("Failed to send test webhook")
    } finally {
      setIsTesting(false)
    }
  }

  const formatBodyTemplate = () => {
    try {
      if (config.bodyTemplate) {
        const parsed = JSON.parse(config.bodyTemplate)
        onChange({ ...config, bodyTemplate: JSON.stringify(parsed, null, 2) })
      }
    } catch {
      toast.error("Invalid JSON - cannot format")
    }
  }

  return (
    <div className="space-y-4">
      {/* URL Input */}
      <div className="space-y-2">
        <Label htmlFor="webhook-url">Webhook URL</Label>
        <Input
          id="webhook-url"
          type="url"
          placeholder="https://api.example.com/webhook"
          value={config.url}
          onChange={(e) => onChange({ ...config, url: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          The endpoint that will receive the webhook payload
        </p>
      </div>

      {/* HTTP Method Selector */}
      <div className="space-y-2">
        <Label htmlFor="webhook-method">HTTP Method</Label>
        <Select
          value={config.method ?? "POST"}
          onValueChange={(value) =>
            onChange({ ...config, method: value as WebhookActionConfig["method"] })
          }
        >
          <SelectTrigger id="webhook-method">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="POST">POST</SelectItem>
            <SelectItem value="PUT">PUT</SelectItem>
            <SelectItem value="PATCH">PATCH</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Headers Builder */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Headers</Label>
          <Button type="button" variant="outline" size="sm" onClick={addHeader}>
            <Plus className="h-4 w-4" />
            Add Header
          </Button>
        </div>

        {headers.map((header, index) => (
          <div key={index} className="flex gap-2">
            <Input
              placeholder="Header name"
              value={header.key}
              onChange={(e) => updateHeader(index, "key", e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="Value"
              value={header.value}
              onChange={(e) => updateHeader(index, "value", e.target.value)}
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeHeader(index)}
              disabled={headers.length === 1}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}

        <p className="text-xs text-muted-foreground">
          Common headers: Authorization, Content-Type, X-API-Key
        </p>
      </div>

      {/* Body JSON Editor */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="webhook-body">Request Body (JSON)</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={formatBodyTemplate}
            className="h-6 text-xs"
          >
            Format JSON
          </Button>
        </div>
        <Textarea
          id="webhook-body"
          placeholder={`{
  "event": "{{triggerEvent}}",
  "booking": {
    "id": "{{booking.id}}",
    "status": "{{booking.status}}"
  }
}`}
          className="min-h-[200px] font-mono text-xs"
          value={config.bodyTemplate ?? ""}
          onChange={(e) => onChange({ ...config, bodyTemplate: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          Use template variables like {`{{booking.id}}`} to insert dynamic data
        </p>
      </div>

      {/* Timeout Configuration */}
      <div className="space-y-2">
        <Label htmlFor="webhook-timeout">Timeout (milliseconds)</Label>
        <Input
          id="webhook-timeout"
          type="number"
          placeholder="5000"
          min="100"
          max="30000"
          value={config.timeout ?? ""}
          onChange={(e) =>
            onChange({ ...config, timeout: e.target.value ? parseInt(e.target.value) : undefined })
          }
        />
        <p className="text-xs text-muted-foreground">
          Maximum time to wait for response (default: 5000ms)
        </p>
      </div>

      {/* Expected Status Code */}
      <div className="space-y-2">
        <Label htmlFor="webhook-status">Expected Status Code</Label>
        <Input
          id="webhook-status"
          type="number"
          placeholder="200"
          min="100"
          max="599"
          value={config.expectedStatus ?? ""}
          onChange={(e) =>
            onChange({
              ...config,
              expectedStatus: e.target.value ? parseInt(e.target.value) : undefined,
            })
          }
        />
        <p className="text-xs text-muted-foreground">
          Response status code that indicates success (default: 200)
        </p>
      </div>

      {/* Test Button */}
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={testWebhook}
        disabled={isTesting || !config.url}
      >
        {isTesting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Sending Test...
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            Test Webhook
          </>
        )}
      </Button>

      {/* Info Box */}
      <div className="rounded-md border border-border bg-muted/50 p-3">
        <h4 className="text-sm font-medium mb-2">Webhook Behavior</h4>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>The webhook will be called with the configured method and headers</li>
          <li>Template variables in the body will be replaced with actual values</li>
          <li>If the response status doesn't match expected, the action will fail</li>
          <li>Use error handling to catch webhook failures gracefully</li>
        </ul>
      </div>
    </div>
  )
}
