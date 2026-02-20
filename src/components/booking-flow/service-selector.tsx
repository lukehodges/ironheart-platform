"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, DollarSign, Users } from "lucide-react"
import type { ServiceCard } from "@/types/booking-flow"

interface ServiceSelectorProps {
  services: ServiceCard[]
  onSelect: (service: ServiceCard) => void
  selectedId?: string
  className?: string
}

export default function ServiceSelector({
  services,
  onSelect,
  selectedId,
  className,
}: ServiceSelectorProps) {
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null)

  // Extract unique categories from services (if description contains category info)
  // For now, we'll show all services - category filtering can be added later if needed

  const filteredServices = selectedCategory
    ? services
    : services

  const availableServices = filteredServices.filter((s) => s.isAvailable)

  if (availableServices.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No services available at this time.</p>
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Category filter placeholder - can be implemented if categories are added to ServiceCard */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {availableServices.map((service) => {
          const isSelected = selectedId === service.id
          const priceFormatted = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: service.currency,
          }).format(service.basePrice)

          return (
            <Card
              key={service.id}
              className={cn(
                "cursor-pointer transition-all hover:shadow-lg",
                "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
                isSelected && "ring-2 ring-primary shadow-lg"
              )}
              onClick={() => onSelect(service)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  onSelect(service)
                }
              }}
              tabIndex={0}
              role="button"
              aria-pressed={isSelected}
              aria-label={`Select ${service.name} service, ${service.durationMinutes} minutes, ${priceFormatted}`}
            >
              {service.imageUrl && (
                <div className="relative w-full h-48 overflow-hidden rounded-t-xl">
                  <img
                    src={service.imageUrl}
                    alt={service.name}
                    className="w-full h-full object-cover"
                  />
                  {isSelected && (
                    <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                      <Badge variant="default" className="text-base px-4 py-1">
                        Selected
                      </Badge>
                    </div>
                  )}
                </div>
              )}

              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg">{service.name}</CardTitle>
                  {isSelected && !service.imageUrl && (
                    <Badge variant="default">Selected</Badge>
                  )}
                </div>
                {service.description && (
                  <CardDescription className="line-clamp-2">
                    {service.description}
                  </CardDescription>
                )}
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    <span>{service.durationMinutes} min</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4" />
                    <span className="font-semibold text-foreground">
                      {priceFormatted}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export { ServiceSelector }
export type { ServiceSelectorProps }
