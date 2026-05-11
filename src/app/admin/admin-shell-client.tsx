"use client"

import type { ReactNode } from "react"
import { Frame } from "@/components/shell/frame"

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
  return (
    <Frame
      surface="tenant"
      user={user}
      userInitials={user.initials}
    >
      {children}
    </Frame>
  )
}
