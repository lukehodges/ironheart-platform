"use client"

import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import Link from "next/link"

interface ErrorCardProps {
  error: Error & { digest?: string }
  reset: () => void
  title?: string
  homeHref?: string
  homeLabel?: string
}

export function ErrorCard({
  error,
  reset,
  title = "Something went wrong",
  homeHref,
  homeLabel,
}: ErrorCardProps) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="rounded-full bg-destructive/10 p-3">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="text-sm text-muted-foreground">
                {error.message || "An unexpected error occurred. Please try again."}
              </p>
              {error.digest && (
                <p className="text-xs text-muted-foreground">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center gap-3">
          <Button onClick={reset} variant="default">
            Try Again
          </Button>
          {homeHref && homeLabel && (
            <Button variant="outline" asChild>
              <Link href={homeHref}>{homeLabel}</Link>
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
