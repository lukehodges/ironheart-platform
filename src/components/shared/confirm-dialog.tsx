"use client"

import React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

export interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  confirmTone?: "accent" | "danger" | "primary"
  onConfirm: () => void
  onCancel: () => void
  children?: React.ReactNode
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  confirmTone = "primary",
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  const btnClass =
    confirmTone === "danger"
      ? "ih-btn ih-btn-accent"
      : confirmTone === "accent"
        ? "ih-btn ih-btn-accent"
        : "ih-btn ih-btn-primary"

  // For danger tone, override the background to use danger color
  const btnStyle: React.CSSProperties =
    confirmTone === "danger"
      ? { background: "var(--ih-danger)", borderColor: "var(--ih-danger)" }
      : {}

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children && <div style={{ padding: "8px 0" }}>{children}</div>}
        <DialogFooter>
          <button
            className="ih-btn ih-btn-ghost"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className={btnClass}
            style={btnStyle}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
