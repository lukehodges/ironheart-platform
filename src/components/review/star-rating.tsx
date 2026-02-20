"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Star } from "lucide-react"

interface StarRatingProps {
  value: number | null
  onChange?: (rating: number) => void
  readonly?: boolean
  max?: number
  size?: "sm" | "md" | "lg"
  showLabel?: boolean
  className?: string
}

const SIZE_CONFIG = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
} as const

const RATING_LABELS: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very Good",
  5: "Excellent",
}

export default function StarRating({
  value,
  onChange,
  readonly = false,
  max = 5,
  size = "md",
  showLabel = false,
  className,
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = React.useState<number | null>(null)
  const isInteractive = !readonly && !!onChange

  const displayValue = hoverValue ?? value ?? 0

  const handleClick = (rating: number) => {
    if (!isInteractive) return
    onChange?.(rating)
  }

  const handleKeyDown = (e: React.KeyboardEvent, rating: number) => {
    if (!isInteractive) return

    switch (e.key) {
      case "Enter":
      case " ":
        e.preventDefault()
        onChange?.(rating)
        break
      case "ArrowRight":
      case "ArrowUp":
        e.preventDefault()
        if (rating < max) {
          onChange?.(rating + 1)
        }
        break
      case "ArrowLeft":
      case "ArrowDown":
        e.preventDefault()
        if (rating > 1) {
          onChange?.(rating - 1)
        }
        break
      case "Home":
        e.preventDefault()
        onChange?.(1)
        break
      case "End":
        e.preventDefault()
        onChange?.(max)
        break
    }
  }

  const label = value ? RATING_LABELS[value] : null

  return (
    <div className={cn("space-y-2", className)}>
      <div
        className="flex items-center gap-1"
        role={isInteractive ? "radiogroup" : undefined}
        aria-label={isInteractive ? "Rate from 1 to 5 stars" : `Rating: ${value ?? 0} out of ${max} stars`}
        onMouseLeave={() => isInteractive && setHoverValue(null)}
      >
        {Array.from({ length: max }, (_, i) => {
          const rating = i + 1
          const isFilled = rating <= displayValue
          const isHalfFilled = value !== null && rating === Math.ceil(value) && value % 1 !== 0

          return (
            <button
              key={rating}
              type="button"
              onClick={() => handleClick(rating)}
              onMouseEnter={() => isInteractive && setHoverValue(rating)}
              onKeyDown={(e) => handleKeyDown(e, rating)}
              disabled={!isInteractive}
              className={cn(
                "transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm",
                isInteractive && "cursor-pointer hover:scale-110",
                !isInteractive && "cursor-default"
              )}
              role={isInteractive ? "radio" : undefined}
              aria-checked={isInteractive && value === rating ? "true" : undefined}
              aria-label={`${rating} ${rating === 1 ? "star" : "stars"}`}
              tabIndex={isInteractive ? (value === rating || (value === null && rating === 1) ? 0 : -1) : undefined}
            >
              {isHalfFilled ? (
                <div className="relative">
                  <Star
                    className={cn(SIZE_CONFIG[size], "text-muted-foreground")}
                    aria-hidden="true"
                  />
                  <div className="absolute inset-0 overflow-hidden" style={{ width: "50%" }}>
                    <Star
                      className={cn(SIZE_CONFIG[size], "text-primary")}
                      fill="currentColor"
                      aria-hidden="true"
                    />
                  </div>
                </div>
              ) : (
                <Star
                  className={cn(
                    SIZE_CONFIG[size],
                    isFilled ? "text-primary" : "text-muted-foreground",
                    isInteractive && hoverValue && rating <= hoverValue && "text-primary/80"
                  )}
                  fill={isFilled ? "currentColor" : "none"}
                  aria-hidden="true"
                />
              )}
            </button>
          )
        })}
      </div>

      {showLabel && label && (
        <p className="text-sm font-medium text-muted-foreground">
          {label}
        </p>
      )}
    </div>
  )
}

export { StarRating }
export type { StarRatingProps }
