"use client"

import { useState, useEffect, useCallback } from "react"
import { Icon } from "@/components/shell"

export type ToastTone = "ok" | "warn" | "info" | "danger" | "accent" | "muted"

export interface NotificationToastProps {
  message: string
  tone?: ToastTone
  duration?: number
  onDismiss?: () => void
}

function toneStyles(tone: ToastTone): { bg: string; border: string; iconColor: string } {
  switch (tone) {
    case "ok": return { bg: "var(--ih-ok-soft)", border: "var(--ih-ok)", iconColor: "var(--ih-ok)" }
    case "warn": return { bg: "var(--ih-warn-soft)", border: "var(--ih-warn)", iconColor: "var(--ih-warn)" }
    case "danger": return { bg: "var(--ih-danger-soft)", border: "var(--ih-danger)", iconColor: "var(--ih-danger)" }
    case "accent": return { bg: "var(--ih-accent-soft)", border: "var(--ih-accent)", iconColor: "var(--ih-accent)" }
    case "info": return { bg: "var(--ih-info-soft)", border: "var(--ih-info)", iconColor: "var(--ih-info)" }
    default: return { bg: "var(--ih-surface)", border: "var(--ih-line-2)", iconColor: "var(--ih-ink-50)" }
  }
}

const toneIcon: Record<ToastTone, "check" | "bolt" | "bell" | "x" | "star" | "moreH"> = {
  ok: "check",
  warn: "bolt",
  info: "bell",
  danger: "x",
  accent: "star",
  muted: "moreH",
}

export function NotificationToast({ message, tone = "muted", duration = 4000, onDismiss }: NotificationToastProps) {
  const [visible, setVisible] = useState(true)
  const [exiting, setExiting] = useState(false)

  const dismiss = useCallback(() => {
    setExiting(true)
    setTimeout(() => {
      setVisible(false)
      onDismiss?.()
    }, 200)
  }, [onDismiss])

  useEffect(() => {
    if (duration <= 0) return
    const timer = setTimeout(dismiss, duration)
    return () => clearTimeout(timer)
  }, [duration, dismiss])

  if (!visible) return null

  const { bg, border, iconColor } = toneStyles(tone)

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        background: bg,
        borderLeft: `3px solid ${border}`,
        borderRadius: "var(--ih-r-md)",
        boxShadow: "var(--ih-shadow-pop)",
        fontSize: 13,
        color: "var(--ih-ink)",
        minWidth: 260,
        maxWidth: 400,
        opacity: exiting ? 0 : 1,
        transform: exiting ? "translateY(8px)" : "translateY(0)",
        transition: "opacity 0.2s ease, transform 0.2s ease",
        animation: "ih-toast-in 0.25s ease-out",
      }}
    >
      <Icon name={toneIcon[tone]} size={14} style={{ color: iconColor, flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{message}</span>
      <button
        onClick={dismiss}
        style={{
          background: "transparent",
          border: 0,
          padding: 4,
          cursor: "pointer",
          color: "var(--ih-ink-40)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: 44,
          minHeight: 44,
        }}
        aria-label="Dismiss notification"
      >
        <Icon name="x" size={12} />
      </button>
      <style>{`
        @keyframes ih-toast-in {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
