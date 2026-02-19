import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Calendar,
  Search,
  Users,
  FileText,
  Inbox,
  type LucideIcon,
} from "lucide-react"

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  className?: string
  variant?: "default" | "calendar" | "search" | "users" | "documents" | "inbox"
}

const variantConfig: Record<
  NonNullable<EmptyStateProps["variant"]>,
  { icon: LucideIcon; title: string; description: string }
> = {
  default: {
    icon: Inbox,
    title: "Nothing here yet",
    description: "Get started by creating your first item.",
  },
  calendar: {
    icon: Calendar,
    title: "No bookings found",
    description: "No bookings match your current filters.",
  },
  search: {
    icon: Search,
    title: "No results found",
    description: "Try adjusting your search or filters.",
  },
  users: {
    icon: Users,
    title: "No team members",
    description: "Invite your first team member to get started.",
  },
  documents: {
    icon: FileText,
    title: "No documents",
    description: "Upload or create your first document.",
  },
  inbox: {
    icon: Inbox,
    title: "All caught up",
    description: "You have no pending items.",
  },
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  variant = "default",
}: EmptyStateProps) {
  const config = variantConfig[variant]
  const Icon = icon ?? config.icon

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center animate-fade-in",
        className
      )}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Icon className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
      </div>
      <h3 className="text-sm font-semibold text-foreground">
        {title || config.title}
      </h3>
      {(description || config.description) && (
        <p className="mt-1 text-sm text-muted-foreground max-w-sm">
          {description || config.description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-6 flex items-center gap-3">
          {action && (
            <Button size="sm" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button size="sm" variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
