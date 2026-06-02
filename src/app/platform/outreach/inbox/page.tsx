import { InboxList } from "./_components/inbox-list"

/**
 * Reply triage page.
 *
 * Server-component shell. All data fetching + mutations happen client-side via
 * tRPC so the list updates optimistically as Luke classifies each reply.
 * Tenant + auth scoping is inherited from the parent `/platform/*` layout.
 */
export default function OutreachInboxPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          Outreach · triage
        </span>
        <h1 className="text-3xl font-semibold leading-tight">Reply Triage</h1>
        <p className="text-sm text-muted-foreground">
          One row, one decision. Empty the list before lunch.
        </p>
      </header>
      <InboxList />
    </div>
  )
}
