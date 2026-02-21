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
import { Plus, X, Variable } from "lucide-react"
import type { SetVariableNodeConfig } from "@/modules/workflow/workflow.types"

interface VariableConfigProps {
  config: SetVariableNodeConfig
  onChange: (config: SetVariableNodeConfig) => void
}

export function VariableConfig({ config, onChange }: VariableConfigProps) {
  const [assignments, setAssignments] = React.useState(
    config.assignments ?? [{ key: "", valueType: "literal" as const, literal: "" }]
  )

  React.useEffect(() => {
    onChange({ assignments })
  }, [assignments, onChange])

  const addAssignment = () => {
    setAssignments([
      ...assignments,
      { key: "", valueType: "literal" as const, literal: "" },
    ])
  }

  const updateAssignment = (
    index: number,
    updates: Partial<typeof assignments[number]>
  ) => {
    const newAssignments = [...assignments]
    newAssignments[index] = { ...newAssignments[index], ...updates }
    setAssignments(newAssignments)
  }

  const removeAssignment = (index: number) => {
    setAssignments(assignments.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      {/* Add Assignment Button */}
      <div className="flex items-center justify-between">
        <Label>Variable Assignments</Label>
        <Button type="button" variant="outline" size="sm" onClick={addAssignment}>
          <Plus className="h-4 w-4" />
          Add Variable
        </Button>
      </div>

      {assignments.length === 0 && (
        <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No variables assigned yet. Click "Add Variable" to get started.
        </div>
      )}

      {/* Assignments List */}
      {assignments.map((assignment, index) => (
        <div key={index} className="rounded-md border border-border p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Variable className="h-4 w-4" />
              Variable {index + 1}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => removeAssignment(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Variable Name */}
          <div className="space-y-2">
            <Label htmlFor={`var-name-${index}`}>Variable Name</Label>
            <Input
              id={`var-name-${index}`}
              placeholder="e.g., totalPrice, customerName"
              value={assignment.key}
              onChange={(e) => updateAssignment(index, { key: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              This name will be available in context.variables
            </p>
          </div>

          {/* Value Type Selector */}
          <div className="space-y-2">
            <Label htmlFor={`var-type-${index}`}>Value Type</Label>
            <Select
              value={assignment.valueType}
              onValueChange={(value) => {
                const newAssignment: Partial<typeof assignment> = {
                  valueType: value as "literal" | "field" | "expression",
                  literal: undefined,
                  field: undefined,
                  expression: undefined,
                }
                updateAssignment(index, newAssignment)
              }}
            >
              <SelectTrigger id={`var-type-${index}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="literal">Literal Value</SelectItem>
                <SelectItem value="field">Field Reference</SelectItem>
                <SelectItem value="expression">Expression</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Conditional Input Based on Value Type */}
          {assignment.valueType === "literal" && (
            <div className="space-y-2">
              <Label htmlFor={`var-literal-${index}`}>Literal Value</Label>
              <Input
                id={`var-literal-${index}`}
                placeholder="e.g., Hello World, 42, true"
                value={
                  assignment.literal !== undefined
                    ? String(assignment.literal)
                    : ""
                }
                onChange={(e) => {
                  let value: string | number | boolean = e.target.value
                  // Try to parse as number or boolean
                  if (value === "true") value = true
                  else if (value === "false") value = false
                  else if (!isNaN(Number(value)) && value !== "") value = Number(value)
                  updateAssignment(index, { literal: value })
                }}
              />
              <p className="text-xs text-muted-foreground">
                Enter a static string, number, or boolean value
              </p>
            </div>
          )}

          {assignment.valueType === "field" && (
            <div className="space-y-2">
              <Label htmlFor={`var-field-${index}`}>Field Reference</Label>
              <Input
                id={`var-field-${index}`}
                placeholder="e.g., booking.price, nodes.SendEmail_1.output.messageId"
                value={assignment.field ?? ""}
                onChange={(e) => updateAssignment(index, { field: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Dot-path to a field in the execution context
              </p>
            </div>
          )}

          {assignment.valueType === "expression" && (
            <div className="space-y-2">
              <Label htmlFor={`var-expression-${index}`}>Expression</Label>
              <Textarea
                id={`var-expression-${index}`}
                placeholder="e.g., {{booking.price}} * 1.2"
                className="min-h-[80px] font-mono text-xs"
                value={assignment.expression ?? ""}
                onChange={(e) =>
                  updateAssignment(index, { expression: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Safe arithmetic expression using {`{{variables}}`} syntax
              </p>
              <div className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
                <div className="font-medium mb-1">Supported operators:</div>
                <div className="space-y-0.5">
                  <div>+, -, *, / (arithmetic)</div>
                  <div>Use {`{{fieldName}}`} to reference context values</div>
                  <div>Example: {`{{price}} * {{quantity}} * 1.1`}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Variable Scope Info */}
      <div className="rounded-md border border-border bg-muted/50 p-3">
        <h4 className="text-sm font-medium mb-2">Variable Scope</h4>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>
            <span className="font-medium">context.variables:</span> Variables set by SET_VARIABLE
            nodes
          </li>
          <li>
            <span className="font-medium">context.nodes:</span> Output from previous nodes
          </li>
          <li>
            <span className="font-medium">context.triggerData:</span> Data from the trigger event
          </li>
          <li>
            <span className="font-medium">context.loopStack:</span> Current loop item and index
            (if inside a loop)
          </li>
        </ul>
      </div>

      {/* Expression Examples */}
      <div className="rounded-md border border-border bg-muted/50 p-3">
        <h4 className="text-sm font-medium mb-2">Expression Examples</h4>
        <ul className="text-xs text-muted-foreground space-y-1 font-mono">
          <li>{`{{booking.price}} * 1.2`} - Add 20% markup</li>
          <li>{`{{nodes.Calculate_1.output.total}} + 5`} - Add shipping fee</li>
          <li>{`{{variables.quantity}} * {{variables.unitPrice}}`} - Multiply values</li>
        </ul>
      </div>
    </div>
  )
}
