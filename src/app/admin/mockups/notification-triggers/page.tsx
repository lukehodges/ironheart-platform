"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  User,
  Users,
  ChevronDown,
  Pencil,
  Check,
  X,
  ToggleLeft,
  ToggleRight,
  Clock,
  Info,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type Channel = "email" | "sms" | "push"
type Recipient = "customer" | "staff" | "both"
type FilterTab = "all" | "customer" | "staff" | "system"

interface ChannelConfig {
  channel: Channel
  enabled: boolean
}

interface TriggerTemplate {
  id: string
  name: string
  description: string
  channels: ChannelConfig[]
  recipient: Recipient
  enabled: boolean
  category: FilterTab
  defaultTemplate: string
  defaultDelay: string
  defaultWindow: string
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const INITIAL_TRIGGERS: TriggerTemplate[] = [
  {
    id: "t1",
    name: "Booking Confirmed",
    description: "Sent immediately when a booking is accepted and confirmed in the system",
    channels: [
      { channel: "email", enabled: true },
      { channel: "sms", enabled: true },
      { channel: "push", enabled: false },
    ],
    recipient: "customer",
    enabled: true,
    category: "customer",
    defaultTemplate:
      "Hi {{customer.firstName}}, your booking for {{service.name}} has been confirmed for {{booking.date}} at {{booking.time}}. Your reference is {{booking.ref}}.",
    defaultDelay: "Send immediately",
    defaultWindow: "Any time",
  },
  {
    id: "t2",
    name: "Engineer En Route",
    description: "Triggered when the assigned engineer marks themselves as travelling to the job",
    channels: [
      { channel: "email", enabled: false },
      { channel: "sms", enabled: true },
      { channel: "push", enabled: true },
    ],
    recipient: "customer",
    enabled: true,
    category: "customer",
    defaultTemplate:
      "{{engineer.name}} is on their way to you! Estimated arrival: {{eta}}. Track in real time at {{trackingUrl}}.",
    defaultDelay: "Send immediately on status change",
    defaultWindow: "08:00 – 20:00",
  },
  {
    id: "t3",
    name: "Job Completed",
    description: "Sent when the engineer marks the job as complete and submits their timesheet",
    channels: [
      { channel: "email", enabled: true },
      { channel: "sms", enabled: false },
      { channel: "push", enabled: false },
    ],
    recipient: "customer",
    enabled: true,
    category: "customer",
    defaultTemplate:
      "Your {{service.name}} has been completed by {{engineer.name}}. Your invoice will follow shortly. Thank you for choosing us.",
    defaultDelay: "Send immediately",
    defaultWindow: "Any time",
  },
  {
    id: "t4",
    name: "Review Request",
    description: "Prompts the customer to leave a review after a job has been completed",
    channels: [
      { channel: "email", enabled: true },
      { channel: "sms", enabled: true },
      { channel: "push", enabled: false },
    ],
    recipient: "customer",
    enabled: true,
    category: "customer",
    defaultTemplate:
      "We hope {{engineer.name}} did a great job! Could you spare 2 minutes to leave a review? {{reviewUrl}}",
    defaultDelay: "Send 2 hours after job completion",
    defaultWindow: "09:00 – 19:00",
  },
  {
    id: "t5",
    name: "Booking Reminder (24h)",
    description: "Reminder message sent 24 hours before the scheduled appointment time",
    channels: [
      { channel: "email", enabled: true },
      { channel: "sms", enabled: true },
      { channel: "push", enabled: true },
    ],
    recipient: "customer",
    enabled: true,
    category: "customer",
    defaultTemplate:
      "Reminder: {{engineer.name}} is scheduled to visit tomorrow at {{booking.time}} for your {{service.name}}. Reply CONFIRM to confirm or call us to rearrange.",
    defaultDelay: "Send 24 hours before appointment",
    defaultWindow: "08:00 – 20:00",
  },
  {
    id: "t6",
    name: "New Job Assigned",
    description: "Notifies an engineer when a new job has been assigned to their schedule",
    channels: [
      { channel: "email", enabled: false },
      { channel: "sms", enabled: false },
      { channel: "push", enabled: true },
    ],
    recipient: "staff",
    enabled: true,
    category: "staff",
    defaultTemplate:
      "New job assigned: {{service.name}} at {{customer.address}} on {{booking.date}} at {{booking.time}}. Tap to view details.",
    defaultDelay: "Send immediately",
    defaultWindow: "Any time",
  },
  {
    id: "t7",
    name: "Certification Expiring (30d)",
    description: "Alerts staff members when a required certification is due to expire in 30 days",
    channels: [
      { channel: "email", enabled: true },
      { channel: "sms", enabled: false },
      { channel: "push", enabled: true },
    ],
    recipient: "staff",
    enabled: true,
    category: "staff",
    defaultTemplate:
      "Your {{certification.name}} is expiring on {{certification.expiryDate}}. Please arrange renewal to avoid being removed from the active roster.",
    defaultDelay: "Send 30 days before expiry",
    defaultWindow: "09:00 – 17:00",
  },
  {
    id: "t8",
    name: "Daily Schedule Briefing",
    description: "A morning push summary of the day's jobs, sent to each engineer at 07:30",
    channels: [
      { channel: "email", enabled: false },
      { channel: "sms", enabled: false },
      { channel: "push", enabled: true },
    ],
    recipient: "staff",
    enabled: false,
    category: "staff",
    defaultTemplate:
      "Good morning {{engineer.firstName}}! You have {{jobs.count}} job(s) today. First job at {{jobs.first.time}} — {{jobs.first.address}}. Have a great day.",
    defaultDelay: "Send daily at 07:30",
    defaultWindow: "07:00 – 08:00",
  },
]

const CHANNEL_META: Record<Channel, { label: string; icon: React.ElementType; color: string; bg: string; border: string }> = {
  email: {
    label: "Email",
    icon: Mail,
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  sms: {
    label: "SMS",
    icon: MessageSquare,
    color: "text-violet-700",
    bg: "bg-violet-50",
    border: "border-violet-200",
  },
  push: {
    label: "Push",
    icon: Smartphone,
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
}

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "customer", label: "Customer" },
  { id: "staff", label: "Staff" },
  { id: "system", label: "System" },
]

// ─── Channel Badge ────────────────────────────────────────────────────────────

function ChannelBadge({ channel, enabled }: { channel: Channel; enabled: boolean }) {
  const meta = CHANNEL_META[channel]
  const Icon = meta.icon
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold transition-opacity",
        enabled
          ? cn(meta.bg, meta.color, meta.border)
          : "bg-zinc-100 text-zinc-400 border-zinc-200 opacity-60",
      )}
    >
      <Icon className="h-2.5 w-2.5" />
      {meta.label}
    </span>
  )
}

// ─── Recipient Chip ───────────────────────────────────────────────────────────

function RecipientChip({ recipient }: { recipient: Recipient }) {
  if (recipient === "both") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
        <Users className="h-2.5 w-2.5" />
        Both
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
      <User className="h-2.5 w-2.5" />
      {recipient === "customer" ? "Customer" : "Staff"}
    </span>
  )
}

// ─── Toggle Switch ────────────────────────────────────────────────────────────

function ToggleSwitch({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="shrink-0 text-zinc-700 hover:text-zinc-900 transition-colors"
      title={enabled ? "Disable trigger" : "Enable trigger"}
    >
      {enabled ? (
        <ToggleRight className="h-7 w-7 text-zinc-900" />
      ) : (
        <ToggleLeft className="h-7 w-7 text-zinc-400" />
      )}
    </button>
  )
}

// ─── Edit Panel ───────────────────────────────────────────────────────────────

function EditPanel({
  trigger,
  onSave,
  onCancel,
}: {
  trigger: TriggerTemplate
  onSave: (updated: Partial<TriggerTemplate>) => void
  onCancel: () => void
}) {
  const [template, setTemplate] = useState(trigger.defaultTemplate)
  const [delay, setDelay] = useState(trigger.defaultDelay)
  const [window_, setWindow] = useState(trigger.defaultWindow)

  return (
    <div className="mt-3 border-t border-zinc-200 pt-4 space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Delay/offset */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 uppercase tracking-wide">
            <Clock className="h-3 w-3 text-zinc-400" />
            Delay / Offset
          </label>
          <input
            value={delay}
            onChange={(e) => setDelay(e.target.value)}
            className="w-full h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
            placeholder="e.g. Send 24 hours before"
          />
        </div>

        {/* Send time window */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 uppercase tracking-wide">
            <Clock className="h-3 w-3 text-zinc-400" />
            Send Time Window
          </label>
          <input
            value={window_}
            onChange={(e) => setWindow(e.target.value)}
            className="w-full h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
            placeholder="e.g. 08:00 – 20:00"
          />
        </div>
      </div>

      {/* Message template */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">
          Message Template
        </label>
        <textarea
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
        />
        <div className="flex items-start gap-1.5">
          <Info className="h-3.5 w-3.5 text-zinc-400 mt-0.5 shrink-0" />
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Use{" "}
            <code className="bg-zinc-100 rounded px-1 text-zinc-600">{"{{variable}}"}</code>{" "}
            syntax. Available:{" "}
            <code className="bg-zinc-100 rounded px-1 text-zinc-600">customer.firstName</code>,{" "}
            <code className="bg-zinc-100 rounded px-1 text-zinc-600">booking.date</code>,{" "}
            <code className="bg-zinc-100 rounded px-1 text-zinc-600">engineer.name</code>,{" "}
            <code className="bg-zinc-100 rounded px-1 text-zinc-600">service.name</code>
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <Button
          size="sm"
          className="h-8 px-4 bg-zinc-900 hover:bg-zinc-700 text-white text-xs gap-1.5"
          onClick={() => onSave({ defaultTemplate: template, defaultDelay: delay, defaultWindow: window_ })}
        >
          <Check className="h-3 w-3" />
          Save Changes
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-4 text-xs border-zinc-200 text-zinc-600 hover:bg-zinc-50 gap-1.5"
          onClick={onCancel}
        >
          <X className="h-3 w-3" />
          Cancel
        </Button>
      </div>
    </div>
  )
}

// ─── Trigger Card ─────────────────────────────────────────────────────────────

function TriggerCard({
  trigger,
  isEditing,
  onToggle,
  onEditOpen,
  onEditClose,
  onSave,
}: {
  trigger: TriggerTemplate
  isEditing: boolean
  onToggle: () => void
  onEditOpen: () => void
  onEditClose: () => void
  onSave: (updated: Partial<TriggerTemplate>) => void
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-white px-5 py-4 transition-all",
        isEditing ? "border-zinc-900 shadow-sm" : "border-zinc-200",
        !trigger.enabled && "opacity-60",
      )}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className={cn(
            "h-9 w-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
            trigger.enabled ? "bg-zinc-900" : "bg-zinc-100",
          )}
        >
          <Bell
            className={cn("h-4 w-4", trigger.enabled ? "text-white" : "text-zinc-400")}
          />
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-zinc-900 leading-snug">{trigger.name}</p>
              <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{trigger.description}</p>
            </div>
            {/* Controls */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 gap-1.5 text-xs px-3 border transition-colors",
                  isEditing
                    ? "border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-700"
                    : "border-zinc-200 text-zinc-600 hover:bg-zinc-50",
                )}
                onClick={isEditing ? onEditClose : onEditOpen}
              >
                <Pencil className="h-3 w-3" />
                Edit
                <ChevronDown
                  className={cn(
                    "h-3 w-3 transition-transform",
                    isEditing && "rotate-180",
                  )}
                />
              </Button>
              <ToggleSwitch enabled={trigger.enabled} onToggle={onToggle} />
            </div>
          </div>

          {/* Badges row */}
          <div className="flex items-center gap-2 flex-wrap">
            {trigger.channels.map((ch) => (
              <ChannelBadge key={ch.channel} channel={ch.channel} enabled={ch.enabled} />
            ))}
            <span className="text-zinc-300 select-none">·</span>
            <RecipientChip recipient={trigger.recipient} />
            <span className="text-zinc-300 select-none">·</span>
            <span className="text-[11px] text-zinc-400">{trigger.defaultDelay}</span>
          </div>
        </div>
      </div>

      {/* Inline edit panel */}
      {isEditing && (
        <EditPanel trigger={trigger} onSave={onSave} onCancel={onEditClose} />
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function NotificationTriggersPage() {
  const [triggers, setTriggers] = useState<TriggerTemplate[]>(INITIAL_TRIGGERS)
  const [filter, setFilter] = useState<FilterTab>("all")
  const [editingId, setEditingId] = useState<string | null>(null)

  function toggleTrigger(id: string) {
    setTriggers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t)),
    )
  }

  function saveTrigger(id: string, updated: Partial<TriggerTemplate>) {
    setTriggers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updated } : t)),
    )
    setEditingId(null)
  }

  const filtered = triggers.filter((t) => {
    if (filter === "all") return true
    if (filter === "system") return false // no system triggers in this mockup
    return t.category === filter
  })

  const counts = {
    all: triggers.length,
    customer: triggers.filter((t) => t.category === "customer").length,
    staff: triggers.filter((t) => t.category === "staff").length,
    system: 0,
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Notification Triggers</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Configure automated messages sent to customers and staff
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Bell className="h-3.5 w-3.5" />
          <span>
            {triggers.filter((t) => t.enabled).length} of {triggers.length} triggers active
          </span>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        {FILTER_TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={cn(
              "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              filter === id
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50",
            )}
          >
            {label}
            <span
              className={cn(
                "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                filter === id ? "bg-white/20 text-white" : "bg-zinc-100 text-zinc-500",
              )}
            >
              {counts[id]}
            </span>
          </button>
        ))}
      </div>

      {/* Trigger list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white px-5 py-12 text-center">
            <Bell className="h-8 w-8 text-zinc-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-zinc-500">No triggers in this category</p>
          </div>
        ) : (
          filtered.map((trigger) => (
            <TriggerCard
              key={trigger.id}
              trigger={trigger}
              isEditing={editingId === trigger.id}
              onToggle={() => toggleTrigger(trigger.id)}
              onEditOpen={() => setEditingId(trigger.id)}
              onEditClose={() => setEditingId(null)}
              onSave={(updated) => saveTrigger(trigger.id, updated)}
            />
          ))
        )}
      </div>

      <Separator />
      <div className="flex items-center justify-between text-[11px] text-zinc-400 pb-2">
        <span>Ironheart Platform — Notification Module</span>
        <span>All data hardcoded for mockup purposes</span>
      </div>
    </div>
  )
}
