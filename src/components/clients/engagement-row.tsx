"use client"

import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Eye, Pencil, Archive } from "lucide-react"
import { TableRow, TableCell } from "@/components/ui/table"
import type { EngagementWithCustomer } from "@/modules/client-portal/client-portal.types"

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ACTIVE: "default",
  PROPOSED: "secondary",
  DRAFT: "outline",
  PAUSED: "outline",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return days === 1 ? "Yesterday" : `${days} days ago`
  const weeks = Math.floor(days / 7)
  return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`
}

interface EngagementRowProps {
  engagement: EngagementWithCustomer
}

export function EngagementRow({ engagement }: EngagementRowProps) {
  const router = useRouter()

  return (
    <TableRow
      className="cursor-pointer"
      onClick={() => router.push(`/admin/clients/${engagement.id}`)}
    >
      <TableCell className="font-medium">{engagement.customerName}</TableCell>
      <TableCell className="text-muted-foreground">{engagement.title}</TableCell>
      <TableCell>
        <Badge variant={engagement.type === "PROJECT" ? "default" : "outline"}>
          {engagement.type === "PROJECT" ? "Project" : engagement.type === "HYBRID" ? "Hybrid" : "Retainer"}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant={STATUS_VARIANT[engagement.status] ?? "secondary"}>
          {engagement.status.charAt(0) + engagement.status.slice(1).toLowerCase()}
        </Badge>
      </TableCell>
      <TableCell className="text-muted-foreground text-xs">
        {formatRelativeTime(engagement.updatedAt)}
      </TableCell>
      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push(`/admin/clients/${engagement.id}`)}>
              <Eye className="mr-2 h-4 w-4" /> View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/admin/clients/${engagement.id}`)}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Archive className="mr-2 h-4 w-4" /> Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}
