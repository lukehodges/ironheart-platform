"use client"

import { useCallback, useState, type ReactNode } from "react"
import { Frame } from "@/components/shell/frame"
import { CommandPalette } from "@/components/shell/command-palette"
import { AICopilot } from "@/components/shell/ai-copilot"

interface AdminShellClientProps {
  children: ReactNode
  user: {
    name?: string | null
    email?: string | null
    initials?: string
    role?: string
  }
}

export function AdminShellClient({ children, user }: AdminShellClientProps) {
  const [cmdOpen, setCmdOpen] = useState(false)
  const [copilotOpen, setCopilotOpen] = useState(false)

  const handleCmdChange = useCallback((v: boolean) => setCmdOpen(v), [])
  const handleCopilotChange = useCallback((v: boolean) => setCopilotOpen(v), [])

  return (
    <Frame
      surface="tenant"
      user={user}
      userInitials={user.initials}
    >
      {children}
      <CommandPalette open={cmdOpen} onOpenChange={handleCmdChange} />
      <AICopilot open={copilotOpen} onOpenChange={handleCopilotChange} />
    </Frame>
  )
}
