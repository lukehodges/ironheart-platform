"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, X, GitBranch } from "lucide-react"
import type { IfNodeConfig, WorkflowConditionGroup, WorkflowCondition } from "@/modules/workflow/workflow.types"

interface IfConfigProps {
  config: IfNodeConfig
  onChange: (config: IfNodeConfig) => void
}

export function IfConfig({ config, onChange }: IfConfigProps) {
  const [logic, setLogic] = React.useState<"AND" | "OR">(config.conditions?.logic ?? "AND")
  const [conditions, setConditions] = React.useState<WorkflowCondition[]>(
    (config.conditions?.conditions?.filter(
      (c): c is WorkflowCondition => "field" in c
    ) ?? []) as WorkflowCondition[]
  )

  React.useEffect(() => {
    const newConfig: IfNodeConfig = {
      conditions: {
        logic,
        conditions: conditions.length > 0 ? conditions : [],
      },
    }
    onChange(newConfig)
  }, [logic, conditions, onChange])

  const addCondition = () => {
    setConditions([
      ...conditions,
      { field: "", operator: "equals", value: "" },
    ])
  }

  const updateCondition = (index: number, updates: Partial<WorkflowCondition>) => {
    const newConditions = [...conditions]
    newConditions[index] = { ...newConditions[index], ...updates }
    setConditions(newConditions)
  }

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      {/* Logic Selector */}
      <div className="space-y-2">
        <Label>Condition Logic</Label>
        <Select value={logic} onValueChange={(value) => setLogic(value as "AND" | "OR")}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AND">All conditions must match (AND)</SelectItem>
            <SelectItem value="OR">Any condition can match (OR)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {logic === "AND"
            ? "All conditions must be true for the 'true' branch to execute"
            : "Any condition being true will execute the 'true' branch"}
        </p>
      </div>

      {/* Conditions List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Conditions</Label>
          <Button type="button" variant="outline" size="sm" onClick={addCondition}>
            <Plus className="h-4 w-4" />
            Add Condition
          </Button>
        </div>

        {conditions.length === 0 && (
          <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No conditions added yet. Click "Add Condition" to get started.
          </div>
        )}

        {conditions.map((condition, index) => (
          <div key={index} className="rounded-md border border-border p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <GitBranch className="h-4 w-4" />
                Condition {index + 1}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => removeCondition(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Field Input */}
            <div className="space-y-2">
              <Label htmlFor={`condition-field-${index}`}>Field</Label>
              <Input
                id={`condition-field-${index}`}
                placeholder="e.g., booking.status, customer.email"
                value={condition.field}
                onChange={(e) => updateCondition(index, { field: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Dot-path to field in context
              </p>
            </div>

            {/* Operator Select */}
            <div className="space-y-2">
              <Label htmlFor={`condition-operator-${index}`}>Operator</Label>
              <Select
                value={condition.operator}
                onValueChange={(value) =>
                  updateCondition(index, { operator: value as WorkflowCondition["operator"] })
                }
              >
                <SelectTrigger id={`condition-operator-${index}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="equals">Equals</SelectItem>
                  <SelectItem value="not_equals">Not Equals</SelectItem>
                  <SelectItem value="contains">Contains</SelectItem>
                  <SelectItem value="greater_than">Greater Than</SelectItem>
                  <SelectItem value="less_than">Less Than</SelectItem>
                  <SelectItem value="is_set">Is Set (Not Empty)</SelectItem>
                  <SelectItem value="is_not_set">Is Not Set (Empty)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Value Input (conditional on operator) */}
            {condition.operator !== "is_set" && condition.operator !== "is_not_set" && (
              <div className="space-y-2">
                <Label htmlFor={`condition-value-${index}`}>Value</Label>
                <Input
                  id={`condition-value-${index}`}
                  placeholder="e.g., CONFIRMED, user@example.com"
                  value={condition.value ?? ""}
                  onChange={(e) => updateCondition(index, { value: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  The value to compare against
                </p>
              </div>
            )}

            {index < conditions.length - 1 && (
              <div className="pt-2 border-t border-border text-center">
                <span className="text-xs font-medium text-muted-foreground bg-background px-2">
                  {logic}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Branch Info */}
      <div className="rounded-md border border-border bg-muted/50 p-3">
        <h4 className="text-sm font-medium mb-2">Branch Behavior</h4>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>
            <span className="font-medium text-success">True branch:</span> Executes when conditions match
          </li>
          <li>
            <span className="font-medium text-destructive">False branch:</span> Executes when conditions don't match
          </li>
          <li>
            Connect both branches to handle all cases, or leave one disconnected to skip
          </li>
        </ul>
      </div>
    </div>
  )
}
