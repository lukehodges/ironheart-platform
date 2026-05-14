import { AlertTriangle, Clock, CheckCircle2, XCircle, Edit2, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface ApprovalCardProps {
  title: string
  details: { label: string; value: string }[]
  impact?: string
  reasoning?: string
  expiresIn?: string
  tier?: "confirm" | "escalate"
  locked?: boolean  // true = Phase B teaser shown in Phase A (greyed out)
  lockedMessage?: string
}

export function ApprovalCard({
  title,
  details,
  impact,
  reasoning,
  expiresIn = "28m 15s",
  tier = "confirm",
  locked = false,
  lockedMessage,
}: ApprovalCardProps) {
  return (
    <div className={`rounded-xl border ${
      locked
        ? "border-border/50 bg-muted/20 opacity-60"
        : tier === "escalate"
          ? "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20"
          : "border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20"
    } p-4 my-3`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          {locked ? (
            <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : tier === "escalate" ? (
            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
          )}
          <span className="text-sm font-semibold text-foreground">{title}</span>
        </div>
        {locked ? (
          <Badge variant="outline" className="text-xs shrink-0">Phase B</Badge>
        ) : (
          <Badge
            variant="outline"
            className={`text-xs shrink-0 ${tier === "escalate" ? "border-red-300 text-red-600" : "border-amber-300 text-amber-600"}`}
          >
            {tier === "escalate" ? "ESCALATE" : "CONFIRM"}
          </Badge>
        )}
      </div>

      {/* Details */}
      <div className="space-y-1 mb-3">
        {details.map((d, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{d.label}</span>
            <span className="text-foreground font-medium">{d.value}</span>
          </div>
        ))}
      </div>

      {/* Impact */}
      {impact && (
        <div className="rounded-lg bg-background/60 border border-border px-3 py-2 text-xs text-muted-foreground mb-3">
          <span className="font-medium text-foreground">Impact: </span>{impact}
        </div>
      )}

      {/* Reasoning expand */}
      {reasoning && (
        <details className="mb-3">
          <summary className="text-xs text-primary cursor-pointer hover:underline">Why did you suggest this? ↓</summary>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{reasoning}</p>
        </details>
      )}

      {/* Actions */}
      {locked ? (
        <p className="text-xs text-muted-foreground italic">{lockedMessage ?? "Approval flows unlock in Phase B"}</p>
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" className="h-8 text-xs gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" /> Approve
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5">
            <Edit2 className="h-3.5 w-3.5" /> Edit
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5">
            <XCircle className="h-3.5 w-3.5" /> Reject
          </Button>
          {expiresIn && (
            <span className="ml-auto text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Expires in {expiresIn}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
