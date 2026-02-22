"use client"

import { ErrorCard } from "@/components/ui/error-card"

export default function ReviewError({
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
      title="Unable to load review"
    />
  )
}
