"use client"

import { useEffect, useState } from "react"
import { useSettingsMutations } from "@/hooks/use-settings-mutations"
import { api } from "@/lib/trpc/react"
// TODO: Re-import NotificationSettings from "@/types/settings" when notification_preferences router is wired
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { TemplateEditor } from "@/components/settings/template-editor"
import { Skeleton } from "@/components/ui/skeleton"

export function NotificationsTab() {
  const {
    data: orgSettings,
    isLoading,
  } = api.tenant.getSettings.useQuery(undefined, { staleTime: 60_000 })

  // The organizationSettings table has communication fields (senderEmail, senderName, etc.)
  // but does NOT have emailEnabled/smsEnabled/reminderTiming/templates.
  // Those belong to the message_templates / notification_preferences tables.
  // For now, use defaults for the fields not yet in the settings query.
  // TODO: Wire emailEnabled/smsEnabled to notification_preferences table
  // TODO: Wire templates to message_templates table
  const settings = {
    emailEnabled: true,
    smsEnabled: false,
    reminderTiming: 24,
    confirmationTemplate: "Thank you for your booking!",
    reminderTemplate: "Reminder: You have an appointment tomorrow.",
    cancellationTemplate: "Your appointment has been cancelled.",
    // These come from the real settings
    senderName: orgSettings?.senderName ?? "",
    senderEmail: orgSettings?.senderEmail ?? "",
    replyToEmail: orgSettings?.replyToEmail ?? "",
    emailFooter: orgSettings?.emailFooter ?? "",
    smsSignature: orgSettings?.smsSignature ?? "",
  }
  const { updateNotifications } = useSettingsMutations()

  const [emailEnabled, setEmailEnabled] = useState(false)
  const [smsEnabled, setSmsEnabled] = useState(false)
  const [reminderTiming, setReminderTiming] = useState(24)
  const [confirmationTemplate, setConfirmationTemplate] = useState("")
  const [reminderTemplate, setReminderTemplate] = useState("")
  const [cancellationTemplate, setCancellationTemplate] = useState("")
  const [previewTemplate, setPreviewTemplate] = useState<{
    type: "confirmation" | "reminder" | "cancellation"
    content: string
  } | null>(null)

  // Load settings when data arrives
  // Using orgSettings as dependency (not `settings`) to avoid infinite re-render
  // since `settings` is a new object reference every render
  useEffect(() => {
    if (settings) {
      setEmailEnabled(settings.emailEnabled)
      setSmsEnabled(settings.smsEnabled)
      setReminderTiming(settings.reminderTiming)
      setConfirmationTemplate(settings.confirmationTemplate)
      setReminderTemplate(settings.reminderTemplate)
      setCancellationTemplate(settings.cancellationTemplate)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgSettings])

  const handleSave = () => {
    // Save the communication fields that exist in organizationSettings via updateSettings
    // TODO: Save emailEnabled/smsEnabled/reminderTiming/templates when notification_preferences
    // and message_templates routers are wired
    updateNotifications.mutate({
      senderEmail: settings.senderEmail || undefined,
      senderName: settings.senderName || undefined,
      replyToEmail: settings.replyToEmail || undefined,
      emailFooter: settings.emailFooter || undefined,
      smsSignature: settings.smsSignature || undefined,
    })
  }

  const handlePreview = (
    type: "confirmation" | "reminder" | "cancellation"
  ) => {
    const template =
      type === "confirmation"
        ? confirmationTemplate
        : type === "reminder"
          ? reminderTemplate
          : cancellationTemplate
    setPreviewTemplate({ type, content: template })
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Email & SMS Toggles Card */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Channels</CardTitle>
          <CardDescription>
            Choose which notification methods to enable
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-semibold">Email Notifications</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Send notification emails to customers
              </p>
            </div>
            <Switch
              checked={emailEnabled}
              onCheckedChange={setEmailEnabled}
              aria-label="Enable email notifications"
            />
          </div>

          {/* SMS Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-semibold">SMS Notifications</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Send SMS messages to customers
              </p>
            </div>
            <Switch
              checked={smsEnabled}
              onCheckedChange={setSmsEnabled}
              aria-label="Enable SMS notifications"
            />
          </div>
        </CardContent>
      </Card>

      {/* Reminder Timing Card */}
      <Card>
        <CardHeader>
          <CardTitle>Reminder Timing</CardTitle>
          <CardDescription>
            How many hours before a booking should reminders be sent?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <Label htmlFor="reminder-timing" className="text-sm font-medium">
                  Hours Before Booking
                </Label>
                <Input
                  id="reminder-timing"
                  type="number"
                  min={1}
                  max={72}
                  value={reminderTiming}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10)
                    if (!isNaN(val) && val >= 1 && val <= 72) {
                      setReminderTiming(val)
                    }
                  }}
                  className="mt-2"
                  aria-describedby="reminder-timing-hint"
                />
                <p id="reminder-timing-hint" className="text-xs text-muted-foreground mt-1">
                  Must be between 1 and 72 hours
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Current setting: Reminders will be sent {reminderTiming} hour
              {reminderTiming !== 1 ? "s" : ""} before each booking
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Template Editors */}
      <Card>
        <CardHeader>
          <CardTitle>Email Templates</CardTitle>
          <CardDescription>
            Customize email templates with variables for dynamic content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Confirmation Template */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <Label className="text-base font-semibold">
                Confirmation Email
              </Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePreview("confirmation")}
              >
                Preview
              </Button>
            </div>
            <TemplateEditor
              value={confirmationTemplate}
              onChange={setConfirmationTemplate}
              placeholder="Enter confirmation email template..."
              aria-label="Confirmation email template editor"
            />
          </div>

          {/* Reminder Template */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <Label className="text-base font-semibold">
                Reminder Email
              </Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePreview("reminder")}
              >
                Preview
              </Button>
            </div>
            <TemplateEditor
              value={reminderTemplate}
              onChange={setReminderTemplate}
              placeholder="Enter reminder email template..."
              aria-label="Reminder email template editor"
            />
          </div>

          {/* Cancellation Template */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <Label className="text-base font-semibold">
                Cancellation Email
              </Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePreview("cancellation")}
              >
                Preview
              </Button>
            </div>
            <TemplateEditor
              value={cancellationTemplate}
              onChange={setCancellationTemplate}
              placeholder="Enter cancellation email template..."
              aria-label="Cancellation email template editor"
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button
          onClick={handleSave}
          loading={updateNotifications.isPending}
          disabled={updateNotifications.isPending}
        >
          Save Settings
        </Button>
      </div>

      {/* Template Preview Dialog */}
      {previewTemplate && (
        <Dialog
          open={!!previewTemplate}
          onOpenChange={() => setPreviewTemplate(null)}
        >
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {previewTemplate.type === "confirmation"
                  ? "Confirmation Email Preview"
                  : previewTemplate.type === "reminder"
                    ? "Reminder Email Preview"
                    : "Cancellation Email Preview"}
              </DialogTitle>
              <DialogDescription>
                This is how your email template will be rendered with sample data
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 space-y-4">
              {/* Sample rendering with variables replaced */}
              <div className="bg-muted rounded-lg p-6 border border-border">
                <div className="space-y-3 text-sm">
                  <div>
                    <strong>From:</strong> notifications@bookings.local
                  </div>
                  <div>
                    <strong>To:</strong> john.doe@example.com
                  </div>
                  <div>
                    <strong>Subject:</strong>{" "}
                    {previewTemplate.type === "confirmation"
                      ? "Booking Confirmation"
                      : previewTemplate.type === "reminder"
                        ? "Reminder: Upcoming Booking"
                        : "Booking Cancelled"}
                  </div>
                </div>
              </div>

              {/* Template content preview */}
              <div className="bg-background rounded-lg p-6 border border-border min-h-[300px] whitespace-pre-wrap text-sm">
                {previewTemplate.content || "(Template is empty)"}
              </div>

              {/* Variables legend */}
              <div className="border-t border-border pt-4">
                <p className="text-xs font-semibold text-muted-foreground mb-2">
                  AVAILABLE VARIABLES:
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <code className="bg-muted px-2 py-1 rounded">
                      {"{{customerName}}"}
                    </code>
                  </div>
                  <div>
                    <code className="bg-muted px-2 py-1 rounded">
                      {"{{bookingTime}}"}
                    </code>
                  </div>
                  <div>
                    <code className="bg-muted px-2 py-1 rounded">
                      {"{{serviceName}}"}
                    </code>
                  </div>
                  <div>
                    <code className="bg-muted px-2 py-1 rounded">
                      {"{{staffName}}"}
                    </code>
                  </div>
                  <div>
                    <code className="bg-muted px-2 py-1 rounded">
                      {"{{bookingId}}"}
                    </code>
                  </div>
                  <div>
                    <code className="bg-muted px-2 py-1 rounded">
                      {"{{cancellationReason}}"}
                    </code>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setPreviewTemplate(null)}
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
