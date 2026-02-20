"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, CheckCircle2, Clock, DollarSign, MapPin, User } from "lucide-react"
import { format } from "date-fns"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface BookingSuccessProps {
  booking: {
    id: string
    service: {
      name: string
      durationMinutes: number
      price: number
      currency: string
    }
    staff: {
      name: string
      imageUrl?: string | null
    } | null
    dateTime: Date
    location: string | null
    customerEmail: string
  }
  onAddToCalendar?: (type: "google" | "apple" | "outlook") => void
  showConfetti?: boolean
  className?: string
}

export default function BookingSuccess({
  booking,
  onAddToCalendar,
  showConfetti = true,
  className,
}: BookingSuccessProps) {
  const [hasShownConfetti, setHasShownConfetti] = React.useState(false)

  // Show confetti animation on mount
  React.useEffect(() => {
    if (!showConfetti || hasShownConfetti) return

    // Dynamic import to avoid bundling if not needed
    void import("canvas-confetti").then((confetti) => {
      const duration = 3000
      const end = Date.now() + duration

      const frame = () => {
        void confetti.default({
          particleCount: 2,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ["#a855f7", "#3b82f6", "#22c55e"],
        })
        void confetti.default({
          particleCount: 2,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ["#a855f7", "#3b82f6", "#22c55e"],
        })

        if (Date.now() < end) {
          requestAnimationFrame(frame)
        }
      }

      frame()
    }).catch((err) => {
      console.error("Failed to load confetti:", err)
    })

    setHasShownConfetti(true)
  }, [showConfetti, hasShownConfetti])

  const bookingReference = `BK-${booking.id.slice(0, 6).toUpperCase()}`
  const priceFormatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: booking.service.currency,
  }).format(booking.service.price)

  const handleCalendarSelect = (value: string) => {
    if (onAddToCalendar && (value === "google" || value === "apple" || value === "outlook")) {
      onAddToCalendar(value)
    }
  }

  return (
    <div className={cn("max-w-2xl mx-auto space-y-8 py-8", className)}>
      {/* Success header */}
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="rounded-full bg-success/10 p-4">
            <CheckCircle2 className="h-16 w-16 text-success" aria-hidden="true" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Booking Confirmed!</h1>
          <p className="text-lg text-muted-foreground">
            Your appointment has been successfully scheduled.
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-1.5">
          Reference: {bookingReference}
        </Badge>
      </div>

      {/* Booking details */}
      <Card>
        <CardHeader>
          <CardTitle>Booking Details</CardTitle>
          <CardDescription>
            A confirmation email has been sent to {booking.customerEmail}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            {/* Service */}
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold">{booking.service.name}</p>
                <p className="text-sm text-muted-foreground">
                  {booking.service.durationMinutes} minutes
                </p>
              </div>
            </div>

            {/* Date and time */}
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold">
                  {format(booking.dateTime, "EEEE, MMMM d, yyyy")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(booking.dateTime, "h:mm a")}
                </p>
              </div>
            </div>

            {/* Staff */}
            {booking.staff && (
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex items-center gap-3">
                  {booking.staff.imageUrl && (
                    <img
                      src={booking.staff.imageUrl}
                      alt={booking.staff.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  )}
                  <div className="space-y-1">
                    <p className="font-semibold">{booking.staff.name}</p>
                    <p className="text-sm text-muted-foreground">Your provider</p>
                  </div>
                </div>
              </div>
            )}

            {/* Location */}
            {booking.location && (
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold">Location</p>
                  <p className="text-sm text-muted-foreground">{booking.location}</p>
                </div>
              </div>
            )}

            {/* Price */}
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold">Price</p>
                <p className="text-sm text-muted-foreground">{priceFormatted}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add to calendar */}
      {onAddToCalendar && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Add to Calendar</CardTitle>
            <CardDescription>
              Never miss your appointment by adding it to your calendar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select onValueChange={handleCalendarSelect}>
              <SelectTrigger className="w-full" aria-label="Add to calendar">
                <SelectValue placeholder="Choose your calendar app" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="google">Google Calendar</SelectItem>
                <SelectItem value="apple">Apple Calendar</SelectItem>
                <SelectItem value="outlook">Outlook Calendar</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button
          variant="outline"
          size="lg"
          onClick={() => window.print()}
          aria-label="Print booking confirmation"
        >
          Print Confirmation
        </Button>
      </div>
    </div>
  )
}

export { BookingSuccess }
export type { BookingSuccessProps }
