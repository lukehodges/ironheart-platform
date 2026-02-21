'use client'

import { useState, useMemo } from 'react'
import {
  Zap,
  Mail,
  MessageSquare,
  Webhook,
  GitBranch,
  RotateCw,
  Square,
  AlertCircle,
  Settings,
  Clock,
  Plus,
  ChevronDown,
  ChevronRight,
  Search,
} from 'lucide-react'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { WorkflowNodeTemplate } from '@/types/workflow-builder'

interface NodePaletteProps {
  onNodeDragStart: (
    event: React.DragEvent,
    nodeType: string,
    defaultConfig: Record<string, unknown>
  ) => void
}

// Node templates organized by category
const NODE_TEMPLATES: Record<string, WorkflowNodeTemplate[]> = {
  trigger: [
    {
      type: 'TRIGGER',
      label: 'Trigger',
      icon: 'Zap',
      description: 'Start a workflow when an event occurs',
      defaultConfig: { eventType: '' },
    },
  ],
  action: [
    {
      type: 'SEND_EMAIL',
      label: 'Send Email',
      icon: 'Mail',
      description: 'Send an email to a customer or staff member',
      defaultConfig: {
        templateId: '',
        to: '',
        subject: '',
        variables: {},
      },
    },
    {
      type: 'SEND_SMS',
      label: 'Send SMS',
      icon: 'MessageSquare',
      description: 'Send a text message',
      defaultConfig: {
        to: '',
        message: '',
        variables: {},
      },
    },
    {
      type: 'WEBHOOK',
      label: 'Webhook',
      icon: 'Webhook',
      description: 'Call an external API endpoint',
      defaultConfig: {
        url: '',
        method: 'POST',
        headers: {},
        body: {},
      },
    },
    {
      type: 'CREATE_BOOKING',
      label: 'Create Booking',
      icon: 'Plus',
      description: 'Create a new booking',
      defaultConfig: {
        customerId: '',
        serviceId: '',
        staffId: '',
        scheduledDate: '',
        scheduledTime: '',
      },
    },
    {
      type: 'UPDATE_BOOKING',
      label: 'Update Booking',
      icon: 'Settings',
      description: 'Modify an existing booking',
      defaultConfig: {
        bookingId: '',
        status: '',
        customFields: {},
      },
    },
    {
      type: 'SEND_NOTIFICATION',
      label: 'Send Notification',
      icon: 'AlertCircle',
      description: 'Send in-app or push notification',
      defaultConfig: {
        type: 'in_app',
        title: '',
        message: '',
        recipientType: 'customer',
      },
    },
    {
      type: 'LOG_MESSAGE',
      label: 'Log Message',
      icon: 'Square',
      description: 'Write a message to the workflow log',
      defaultConfig: {
        level: 'info',
        message: '',
      },
    },
  ],
  control: [
    {
      type: 'IF',
      label: 'If/Else',
      icon: 'GitBranch',
      description: 'Branch based on a condition',
      defaultConfig: {
        conditions: {
          logic: 'AND',
          conditions: [],
        },
      },
    },
    {
      type: 'SWITCH',
      label: 'Switch',
      icon: 'GitBranch',
      description: 'Branch based on multiple cases',
      defaultConfig: {
        field: '',
        cases: [],
        defaultHandle: 'default',
      },
    },
    {
      type: 'LOOP',
      label: 'Loop',
      icon: 'RotateCw',
      description: 'Repeat steps for each item in a collection',
      defaultConfig: {
        collection: '',
        itemVariableName: 'item',
        indexVariableName: 'index',
        mode: 'sequential',
      },
    },
    {
      type: 'WAIT_UNTIL',
      label: 'Wait Until',
      icon: 'Clock',
      description: 'Pause workflow until a condition is met',
      defaultConfig: {
        conditions: {
          logic: 'AND',
          conditions: [],
        },
        timeout: 3600,
      },
    },
    {
      type: 'WAIT_FOR_EVENT',
      label: 'Wait for Event',
      icon: 'Clock',
      description: 'Pause workflow and wait for a specific event',
      defaultConfig: {
        eventType: '',
        match: {},
        timeout: 3600,
      },
    },
    {
      type: 'MERGE',
      label: 'Merge',
      icon: 'Square',
      description: 'Combine multiple branches back together',
      defaultConfig: {
        mode: 'wait_all',
      },
    },
    {
      type: 'STOP',
      label: 'Stop',
      icon: 'Square',
      description: 'End the workflow execution',
      defaultConfig: {
        status: 'success',
        message: '',
      },
    },
    {
      type: 'ERROR',
      label: 'Error Handler',
      icon: 'AlertCircle',
      description: 'Catch and handle errors from previous steps',
      defaultConfig: {
        action: 'continue',
        message: '',
      },
    },
  ],
  transform: [
    {
      type: 'SET_VARIABLE',
      label: 'Set Variable',
      icon: 'Settings',
      description: 'Create or update a workflow variable',
      defaultConfig: {
        variableName: '',
        valueType: 'literal',
        value: '',
      },
    },
    {
      type: 'FILTER',
      label: 'Filter',
      icon: 'GitBranch',
      description: 'Filter items based on conditions',
      defaultConfig: {
        conditions: {
          logic: 'AND',
          conditions: [],
        },
      },
    },
    {
      type: 'TRANSFORM',
      label: 'Transform',
      icon: 'Settings',
      description: 'Transform data using expressions',
      defaultConfig: {
        inputField: '',
        transformType: 'map',
        expression: '',
      },
    },
    {
      type: 'EXECUTE_WORKFLOW',
      label: 'Execute Workflow',
      icon: 'Zap',
      description: 'Run another workflow as a sub-process',
      defaultConfig: {
        workflowId: '',
        mode: 'sync',
        passInputs: false,
      },
    },
  ],
}

const CATEGORY_LABELS: Record<string, string> = {
  trigger: 'Trigger',
  action: 'Actions',
  control: 'Control Flow',
  transform: 'Transform',
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Zap,
  Mail,
  MessageSquare,
  Webhook,
  GitBranch,
  RotateCw,
  Square,
  AlertCircle,
  Settings,
  Clock,
  Plus,
}

/**
 * Node Palette Component
 *
 * Draggable library of workflow node templates organized by category.
 * Supports search/filtering, collapsible sections, and hover tooltips.
 *
 * Usage:
 * ```tsx
 * <NodePalette onNodeDragStart={(e, type, config) => {
 *   // Handle drag start
 * }} />
 * ```
 */
export function NodePalette({ onNodeDragStart }: NodePaletteProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<
    Set<string>
  >(new Set(['trigger', 'action']))

  // Filter templates based on search query
  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) {
      return NODE_TEMPLATES
    }

    const query = searchQuery.toLowerCase()
    const filtered: Record<string, WorkflowNodeTemplate[]> = {}

    for (const [category, templates] of Object.entries(NODE_TEMPLATES)) {
      const matches = templates.filter(
        (template) =>
          template.label.toLowerCase().includes(query) ||
          template.description.toLowerCase().includes(query) ||
          template.type.toLowerCase().includes(query)
      )
      if (matches.length > 0) {
        filtered[category] = matches
      }
    }

    return filtered
  }, [searchQuery])

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  const handleDragStart = (
    event: React.DragEvent,
    template: WorkflowNodeTemplate
  ) => {
    // Set drag data
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('application/json', JSON.stringify(template))

    // Call parent handler
    onNodeDragStart(event, template.type, template.defaultConfig)
  }

  return (
    <div className="flex flex-col h-full bg-background border-r border-border">
      {/* Search Input */}
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-9"
          />
        </div>
      </div>

      {/* Node Categories */}
      <ScrollArea className="flex-1">
        <TooltipProvider>
          <div className="p-4 space-y-2">
            {Object.entries(filteredTemplates).map(([category, templates]) => (
              <Collapsible
                key={category}
                open={expandedCategories.has(category)}
                onOpenChange={() => toggleCategory(category)}
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 rounded-md hover:bg-accent text-sm font-semibold text-foreground/70 transition-colors">
                  <span>{CATEGORY_LABELS[category]}</span>
                  {expandedCategories.has(category) ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </CollapsibleTrigger>

                <CollapsibleContent className="pt-2 space-y-1">
                  {templates.map((template) => {
                    const IconComponent =
                      ICON_MAP[template.icon] || AlertCircle

                    return (
                      <Tooltip key={template.type} delayDuration={200}>
                        <TooltipTrigger asChild>
                          <div
                            draggable
                            onDragStart={(e) => handleDragStart(e, template)}
                            className={cn(
                              'flex items-center gap-2 px-3 py-2 rounded-md',
                              'bg-secondary/50 hover:bg-secondary',
                              'cursor-move transition-colors',
                              'text-sm text-foreground/80 hover:text-foreground',
                              'border border-secondary-foreground/10'
                            )}
                          >
                            <IconComponent className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate flex-1">
                              {template.label}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          <p className="font-semibold">{template.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {template.description}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    )
                  })}
                </CollapsibleContent>
              </Collapsible>
            ))}

            {/* Empty State */}
            {Object.keys(filteredTemplates).length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Search className="w-8 h-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  No nodes match "{searchQuery}"
                </p>
              </div>
            )}
          </div>
        </TooltipProvider>
      </ScrollArea>

      {/* Help Text */}
      <div className="p-3 border-t border-border bg-muted/30 text-xs text-muted-foreground text-center">
        Drag nodes to canvas
      </div>
    </div>
  )
}
