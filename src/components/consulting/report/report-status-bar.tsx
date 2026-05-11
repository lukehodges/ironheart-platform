"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { ArrowLeft, Send, Undo2, Globe, Lock } from "lucide-react"
import type { AuditReportStatus } from "@/modules/report-generator/report-generator.types"

const STATUS_CONFIG: Record<
  AuditReportStatus,
  { label: string; className: string }
> = {
  GENERATING: {
    label: "Generating",
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  DRAFT: {
    label: "Draft",
    className: "bg-amber-100 text-amber-700 border-amber-200",
  },
  IN_REVIEW: {
    label: "In Review",
    className: "bg-purple-100 text-purple-700 border-purple-200",
  },
  PUBLISHED: {
    label: "Published",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
}

interface ReportStatusBarProps {
  status: AuditReportStatus
  publishedAt: Date | string | null
  onTransition: (targetStatus: "DRAFT" | "IN_REVIEW" | "PUBLISHED") => void
  isPending: boolean
}

export function ReportStatusBar({
  status,
  publishedAt,
  onTransition,
  isPending,
}: ReportStatusBarProps) {
  const [showPublishConfirm, setShowPublishConfirm] = useState(false)
  const config = STATUS_CONFIG[status]

  const handlePublish = () => {
    setShowPublishConfirm(false)
    onTransition("PUBLISHED")
  }

  const formattedPublishedDate = publishedAt
    ? new Date(publishedAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null

  return (
    <>
      <div className="flex items-center gap-3 flex-wrap">
        <Badge className={cn(config.className, "font-medium text-sm px-3 py-1")}>
          {config.label}
        </Badge>

        {status === "PUBLISHED" && formattedPublishedDate && (
          <span className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5" />
            Published {formattedPublishedDate}
          </span>
        )}

        {status === "DRAFT" && (
          <Button
            size="sm"
            variant="default"
            onClick={() => onTransition("IN_REVIEW")}
            disabled={isPending}
            className="min-h-[44px]"
          >
            <Send className="h-4 w-4 mr-1.5" />
            Submit for Review
          </Button>
        )}

        {status === "IN_REVIEW" && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onTransition("DRAFT")}
              disabled={isPending}
              className="min-h-[44px]"
            >
              <Undo2 className="h-4 w-4 mr-1.5" />
              Send Back to Draft
            </Button>
            <Button
              size="sm"
              variant="default"
              onClick={() => setShowPublishConfirm(true)}
              disabled={isPending}
              className="min-h-[44px] bg-emerald-600 hover:bg-emerald-700"
            >
              <Globe className="h-4 w-4 mr-1.5" />
              Publish to Client
            </Button>
          </div>
        )}
      </div>

      <Dialog open={showPublishConfirm} onOpenChange={setShowPublishConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish Report</DialogTitle>
            <DialogDescription>
              This will make the report visible to the client. Once published,
              the report content will be locked. Are you sure you want to
              continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPublishConfirm(false)}
              className="min-h-[44px]"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePublish}
              disabled={isPending}
              className="min-h-[44px] bg-emerald-600 hover:bg-emerald-700"
            >
              Yes, Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
