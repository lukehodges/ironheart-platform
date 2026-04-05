"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CloudDownload } from "lucide-react"
import type { DeliverableRecord, MilestoneRecord } from "@/modules/client-portal/client-portal.types"

function formatDate(date: Date | null): string {
  if (!date) return "—"
  return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  PENDING: "outline",
  DELIVERED: "default",
  ACCEPTED: "default",
}

interface DeliverablesTabProps {
  deliverables: DeliverableRecord[]
  milestones: MilestoneRecord[]
  onShareDeliverable: () => void
}

export function DeliverablesTab({ deliverables, milestones, onShareDeliverable }: DeliverablesTabProps) {
  const milestoneMap = Object.fromEntries(milestones.map((m) => [m.id, m.title]))

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {deliverables.length} deliverable{deliverables.length !== 1 ? "s" : ""}
        </p>
        <Button size="sm" onClick={onShareDeliverable}>
          <CloudDownload className="h-3.5 w-3.5 mr-1.5" /> Share Deliverable
        </Button>
      </div>

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead className="w-[180px]">Milestone</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[130px]">Delivered</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deliverables.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.title}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {d.milestoneId ? milestoneMap[d.milestoneId] ?? "—" : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[d.status] ?? "secondary"}>
                    {d.status.charAt(0) + d.status.slice(1).toLowerCase()}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {formatDate(d.deliveredAt)}
                </TableCell>
              </TableRow>
            ))}
            {deliverables.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No deliverables yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
