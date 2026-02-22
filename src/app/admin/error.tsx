"use client"

import { ErrorCard } from "@/components/ui/error-card"

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorCard
      error={error}
      reset={reset}
      title="Something went wrong"
      homeHref="/admin"
      homeLabel="Return to Dashboard"
    />
  )
}
