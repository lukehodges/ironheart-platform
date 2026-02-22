"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { TriggerNodeConfig } from "@/modules/workflow/workflow.types"

interface TriggerConfigProps {
  config: TriggerNodeConfig
  onChange: (config: TriggerNodeConfig) => void
}

/**
 * Available trigger events in the system
 */
const TRIGGER_EVENTS = [
  { value: 'booking/created', label: 'Booking Created', description: 'When a new booking is created' },
  { value: 'booking/completed', label: 'Booking Completed', description: 'When a booking is marked as completed' },
  { value: 'booking/cancelled', label: 'Booking Cancelled', description: 'When a booking is cancelled' },
  { value: 'booking/rescheduled', label: 'Booking Rescheduled', description: 'When a booking is rescheduled to a new time' },
  { value: 'customer/created', label: 'Customer Created', description: 'When a new customer is added' },
  { value: 'review/submitted', label: 'Review Submitted', description: 'When a customer submits a review' },
  { value: 'payment/received', label: 'Payment Received', description: 'When a payment is successfully received' },
  { value: 'payment/failed', label: 'Payment Failed', description: 'When a payment attempt fails' },
  { value: 'forms/submitted', label: 'Form Submitted', description: 'When a customer submits a form' },
]

export function TriggerConfig({ config, onChange }: TriggerConfigProps) {
  const selectedEvent = TRIGGER_EVENTS.find(e => e.value === config.eventType)

  return (
    <div className="space-y-4">
      {/* Event Type Selector */}
      <div className="space-y-2">
        <Label htmlFor="trigger-event-type">Trigger Event</Label>
        <Select
          value={config.eventType ?? ''}
          onValueChange={(value) => {
            onChange({
              ...config,
              eventType: value,
            })
          }}
        >
          <SelectTrigger id="trigger-event-type">
            <SelectValue placeholder="Select an event type..." />
          </SelectTrigger>
          <SelectContent>
            {TRIGGER_EVENTS.map((event) => (
              <SelectItem key={event.value} value={event.value}>
                <div className="flex flex-col">
                  <span className="font-medium">{event.label}</span>
                  <span className="text-xs text-muted-foreground">{event.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedEvent && (
          <p className="text-xs text-muted-foreground">
            This workflow will run when: {selectedEvent.description.toLowerCase()}
          </p>
        )}
      </div>

      {/* Debounce Configuration */}
      <div className="space-y-2">
        <Label htmlFor="trigger-debounce">Debounce Period (milliseconds)</Label>
        <Input
          id="trigger-debounce"
          type="number"
          min="0"
          step="100"
          value={config.debounceMs ?? 0}
          onChange={(e) => {
            const value = parseInt(e.target.value, 10)
            onChange({
              ...config,
              debounceMs: value > 0 ? value : undefined,
            })
          }}
          placeholder="0"
        />
        <p className="text-xs text-muted-foreground">
          Prevent duplicate workflow executions within this time window (optional)
        </p>
      </div>

      {/* Info Box */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm dark:border-blue-900 dark:bg-blue-950">
        <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
          Multiple Triggers
        </p>
        <p className="text-blue-700 dark:text-blue-300">
          You can add multiple TRIGGER nodes to make this workflow respond to different events.
          Each trigger can have its own event type and conditions.
        </p>
      </div>

      {/* Conditions - Coming Soon */}
      <div className="space-y-2">
        <Label className="text-muted-foreground">Trigger Conditions (Coming Soon)</Label>
        <div className="p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
          Optional: Add conditions to filter which events trigger this workflow.
          For example: only trigger for bookings with status = "CONFIRMED".
        </div>
      </div>
    </div>
  )
}
