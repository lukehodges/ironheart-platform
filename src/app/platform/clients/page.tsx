import { Suspense } from "react"
import { ClientsListView } from "@/components/platform-clients/clients-list-view"

export default function PlatformClientsPage() {
  return (
    <Suspense fallback={<div className="p-8" style={{ color: "var(--ih-ink-50)", fontSize: 13 }}>Loading…</div>}>
      <ClientsListView />
    </Suspense>
  )
}
