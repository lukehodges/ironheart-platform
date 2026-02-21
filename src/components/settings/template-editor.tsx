"use client"

import { useState, useRef } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown } from "lucide-react"

interface TemplateEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  "aria-label"?: string
}

const AVAILABLE_VARIABLES = [
  { label: "Customer Name", value: "{{customerName}}" },
  { label: "Booking Time", value: "{{bookingTime}}" },
  { label: "Service Name", value: "{{serviceName}}" },
  { label: "Staff Name", value: "{{staffName}}" },
  { label: "Booking ID", value: "{{bookingId}}" },
  { label: "Cancellation Reason", value: "{{cancellationReason}}" },
  { label: "Booking Date", value: "{{bookingDate}}" },
  { label: "Booking Duration", value: "{{bookingDuration}}" },
]

export function TemplateEditor({
  value,
  onChange,
  placeholder = "Enter template text...",
  "aria-label": ariaLabel,
}: TemplateEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [charCount, setCharCount] = useState(value.length)

  const handleChange = (newValue: string) => {
    onChange(newValue)
    setCharCount(newValue.length)
  }

  const insertVariable = (variable: string) => {
    if (!textareaRef.current) return

    const textarea = textareaRef.current
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = textarea.value

    const newText = text.slice(0, start) + variable + text.slice(end)
    handleChange(newText)

    // Move cursor after inserted variable
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + variable.length
      textarea.focus()
    }, 0)
  }

  return (
    <div className="space-y-3">
      {/* Variable Picker */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          Insert variable:
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              aria-label="Insert template variable"
            >
              <span className="text-xs">Variables</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {AVAILABLE_VARIABLES.map((variable) => (
              <DropdownMenuItem
                key={variable.value}
                onClick={() => insertVariable(variable.value)}
              >
                <div className="flex flex-col">
                  <span className="text-sm">{variable.label}</span>
                  <code className="text-xs text-muted-foreground font-mono">
                    {variable.value}
                  </code>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Textarea */}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-[300px] font-mono text-xs"
        aria-label={ariaLabel}
        aria-describedby="character-count"
      />

      {/* Character Count */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <p id="character-count">{charCount} characters</p>
        <p className="text-xs text-muted-foreground">
          Use <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{"{{variable}}"}</code> syntax
        </p>
      </div>
    </div>
  )
}
