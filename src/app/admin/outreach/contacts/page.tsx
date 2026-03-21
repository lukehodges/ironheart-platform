"use client"

import { useState, useMemo } from "react"
import { Search, Upload } from "lucide-react"
import { api } from "@/lib/trpc/react"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { StatusCards } from "./_components/status-cards"
import { ContactsTable } from "./_components/contacts-table"
import { ContactDetail } from "../_components/contact-detail"
import type {
  OutreachContactStatus,
  OutreachContactWithDetails,
  DashboardContact,
} from "@/modules/outreach/outreach.types"

// ---------------------------------------------------------------------------
// Mapper
// ---------------------------------------------------------------------------

function toDashboardContact(c: OutreachContactWithDetails): DashboardContact {
  return {
    id: c.id,
    customerId: c.customerId,
    customerName: `${c.customerFirstName} ${c.customerLastName}`.trim(),
    customerEmail: c.customerEmail,
    company: null,
    sequenceId: c.sequenceId,
    sequenceName: c.sequenceName,
    sector: c.sector,
    currentStep: c.currentStep,
    totalSteps: c.currentStepTemplate?.position ?? c.currentStep,
    channel: c.currentStepTemplate?.channel ?? "EMAIL",
    subject: c.currentStepTemplate?.subject ?? null,
    nextDueAt: c.nextDueAt,
    notes: c.notes,
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ContactsPage() {
  const [statusFilter, setStatusFilter] = useState<OutreachContactStatus | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [sequenceFilter, setSequenceFilter] = useState("")
  const [sectorFilter, setSectorFilter] = useState("")
  const [selectedContact, setSelectedContact] = useState<OutreachContactWithDetails | null>(null)

  // Data fetching
  const sequencesQuery = api.outreach.listSequences.useQuery()
  const sequences = sequencesQuery.data ?? []

  const contactsQuery = api.outreach.listContacts.useQuery({
    status: statusFilter ?? undefined,
    sequenceId: sequenceFilter || undefined,
    search: searchQuery || undefined,
    limit: 25,
  })
  const contacts = contactsQuery.data?.rows ?? []
  const hasMore = contactsQuery.data?.hasMore ?? false

  // Derive sectors from sequences
  const sectors = useMemo(
    () => Array.from(new Set(sequences.map((s) => s.sector))).sort(),
    [sequences],
  )

  // Status counts derived from current contacts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const c of contacts) {
      counts[c.status] = (counts[c.status] ?? 0) + 1
    }
    return counts
  }, [contacts])

  // Client-side sector filter
  const filteredContacts = useMemo(() => {
    if (!sectorFilter) return contacts
    return contacts.filter((c) => c.sector === sectorFilter)
  }, [contacts, sectorFilter])

  // Contact detail slide-over
  const dashboardContact = selectedContact ? toDashboardContact(selectedContact) : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Contacts"
        description="Browse and manage all outreach contacts"
      >
        <Button disabled>
          <Upload className="h-4 w-4 mr-2" />
          Import
        </Button>
      </PageHeader>

      {/* Status Cards */}
      <StatusCards
        counts={statusCounts}
        activeStatus={statusFilter}
        onStatusClick={setStatusFilter}
      />

      {/* Filter Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>

        <Select
          value={sequenceFilter || "__all__"}
          onValueChange={(v) => setSequenceFilter(v === "__all__" ? "" : v)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Sequences" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Sequences</SelectItem>
            {sequences.map((seq) => (
              <SelectItem key={seq.id} value={seq.id}>
                {seq.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={sectorFilter || "__all__"}
          onValueChange={(v) => setSectorFilter(v === "__all__" ? "" : v)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Sectors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Sectors</SelectItem>
            {sectors.map((sector) => (
              <SelectItem key={sector} value={sector}>
                {sector}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Contacts Table */}
      <ContactsTable
        contacts={filteredContacts}
        isLoading={contactsQuery.isLoading}
        hasMore={hasMore}
        onLoadMore={() => {
          // Load more would require cursor-based pagination; placeholder for now
        }}
        onSelectContact={setSelectedContact}
      />

      {/* Contact Detail Slide-over */}
      <ContactDetail
        contact={dashboardContact}
        open={selectedContact !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedContact(null)
        }}
      />
    </div>
  )
}
