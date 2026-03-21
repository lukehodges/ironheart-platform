"use client"

import { useState } from "react"
import { Inbox } from "lucide-react"
import { api } from "@/lib/trpc/react"
import { PageHeader } from "@/components/ui/page-header"
import { ReplyList } from "./_components/reply-list"
import { ReplyDetail } from "./_components/reply-detail"
import type { OutreachContactWithDetails } from "@/modules/outreach/outreach.types"

export default function RepliesPage() {
  const [selectedContact, setSelectedContact] =
    useState<OutreachContactWithDetails | null>(null)

  const contactsQuery = api.outreach.listContacts.useQuery({
    status: "REPLIED",
    limit: 50,
  })

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-6 py-4">
        <PageHeader
          title="Replies"
          description="Process and categorize incoming replies"
        />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left pane — reply list (35%) */}
        <div className="w-[35%] shrink-0 border-r border-border overflow-hidden">
          <ReplyList
            contacts={contactsQuery.data?.rows ?? []}
            isLoading={contactsQuery.isLoading}
            selectedId={selectedContact?.id ?? null}
            onSelect={setSelectedContact}
            hasMore={contactsQuery.data?.hasMore ?? false}
            onLoadMore={() => {
              // TODO: implement cursor-based pagination
            }}
          />
        </div>

        {/* Right pane — reply detail (65%) */}
        <div className="flex-1 overflow-y-auto">
          {selectedContact ? (
            <ReplyDetail
              contact={selectedContact}
              onContactUpdated={() => void contactsQuery.refetch()}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
              <Inbox className="h-10 w-10" />
              <p className="text-sm">Select a reply to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
