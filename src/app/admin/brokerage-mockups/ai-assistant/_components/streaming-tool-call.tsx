import { CheckCircle2, Loader2, AlertCircle } from "lucide-react"

interface ToolCallStep {
  type: "status" | "tool_call" | "tool_result" | "error"
  label: string
  detail?: string
}

interface StreamingToolCallProps {
  steps: ToolCallStep[]
}

export function StreamingToolCall({ steps }: StreamingToolCallProps) {
  return (
    <div className="space-y-1.5 my-2">
      {steps.map((step, i) => (
        <div key={i} className="flex items-start gap-2 text-xs">
          <div className="mt-0.5 shrink-0">
            {step.type === "tool_result" ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            ) : step.type === "error" ? (
              <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
            ) : step.type === "tool_call" ? (
              <div className="h-3.5 w-3.5 rounded-full border-2 border-primary/60 bg-primary/10" />
            ) : (
              <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <span className={
              step.type === "tool_call"
                ? "font-mono text-foreground"
                : step.type === "tool_result"
                  ? "text-emerald-700 dark:text-emerald-400"
                  : step.type === "error"
                    ? "text-amber-700 dark:text-amber-400"
                    : "text-muted-foreground"
            }>
              {step.label}
            </span>
            {step.detail && (
              <span className="text-muted-foreground ml-1.5">- {step.detail}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
