"use client"

import { useState, useCallback } from "react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { api } from "@/lib/trpc/react"
import { useDebounce } from "@/hooks/use-debounce"
import BookingStatusBadge from "@/components/bookings/booking-status-badge"
import {
  ChevronLeft,
  ChevronRight,
  Search,
  UserPlus,
  Check,
  CalendarDays,
  Clock,
  User,
  Mail,
  Phone,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NewBookingWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

type WizardStep = 1 | 2 | 3

interface SelectedCustomer {
  id: string
  name: string
  email: string | null | undefined
  phone: string | null | undefined
  avatarUrl: string | null | undefined
  isNew: boolean
}

interface NewCustomerForm {
  name: string
  email: string
  phone: string
}

interface SelectedSlot {
  date: string      // "YYYY-MM-DD"
  time: string      // "HH:MM"
  endTime: string   // "HH:MM"
  slotId: string
  serviceId: string
  staffId: string | null
  durationMinutes: number
  price: number | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

// Today as "YYYY-MM-DD"
function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

// Generate next 14 days for the date picker
function generateDateOptions(): string[] {
  const dates: string[] = []
  for (let i = 0; i < 14; i++) {
    const d = new Date()
    d.setDate(d.getDate() + i)
    dates.push(d.toISOString().slice(0, 10))
  }
  return dates
}

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

function StepIndicator({ current, total }: { current: WizardStep; total: number }) {
  return (
    <div className="flex items-center gap-2" aria-label={`Step ${current} of ${total}`}>
      {Array.from({ length: total }).map((_, i) => {
        const step = (i + 1) as WizardStep
        const isComplete = step < current
        const isActive = step === current
        return (
          <div key={step} className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                isActive && "bg-primary text-primary-foreground",
                isComplete && "bg-success text-success-foreground",
                !isActive && !isComplete && "bg-muted text-muted-foreground"
              )}
              aria-current={isActive ? "step" : undefined}
            >
              {isComplete ? <Check className="h-3 w-3" /> : step}
            </div>
            {i < total - 1 && (
              <div
                className={cn(
                  "h-[2px] w-8 rounded-full transition-colors",
                  isComplete ? "bg-success" : "bg-muted"
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 1 — Customer selection
// ---------------------------------------------------------------------------

interface Step1Props {
  onSelect: (customer: SelectedCustomer) => void
  selected: SelectedCustomer | null
}

function Step1Customer({ onSelect, selected }: Step1Props) {
  const [search, setSearch] = useState("")
  const [mode, setMode] = useState<"search" | "new">("search")
  const [newForm, setNewForm] = useState<NewCustomerForm>({ name: "", email: "", phone: "" })

  const debouncedSearch = useDebounce(search, 300)

  const { data: customerData, isLoading: searchLoading } = api.customer.list.useQuery(
    { search: debouncedSearch, limit: 10 },
    { enabled: mode === "search" && debouncedSearch.length >= 2, staleTime: 30_000 }
  )

  const customers = customerData?.rows ?? []

  const handleNewCustomer = () => {
    if (!newForm.name.trim()) return
    onSelect({
      id: "__new__",
      name: newForm.name.trim(),
      email: newForm.email.trim() || null,
      phone: newForm.phone.trim() || null,
      avatarUrl: null,
      isNew: true,
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Mode toggle */}
      <div className="flex rounded-md border border-border bg-muted p-0.5">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "search"}
          onClick={() => setMode("search")}
          className={cn(
            "flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors",
            mode === "search"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Search className="mr-1.5 inline h-3.5 w-3.5" />
          Search existing
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "new"}
          onClick={() => setMode("new")}
          className={cn(
            "flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors",
            mode === "new"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <UserPlus className="mr-1.5 inline h-3.5 w-3.5" />
          New customer
        </button>
      </div>

      {mode === "search" ? (
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email or phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              autoFocus
              aria-label="Search customers"
            />
          </div>

          {/* Results */}
          <div
            className="flex max-h-64 flex-col gap-1 overflow-y-auto rounded-md border border-border"
            role="listbox"
            aria-label="Customer search results"
          >
            {searchLoading ? (
              <div className="flex flex-col gap-1 p-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-md p-2">
                    <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-1/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : debouncedSearch.length < 2 ? (
              <p className="px-4 py-6 text-center text-xs text-muted-foreground">
                Type at least 2 characters to search
              </p>
            ) : customers.length === 0 ? (
              <EmptyState
                variant="search"
                title="No customers found"
                description="Try a different name or email, or create a new customer."
                className="py-6"
              />
            ) : (
              customers.map((c) => {
                const isSelected = selected?.id === c.id
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() =>
                      onSelect({
                        id: c.id,
                        name: c.name,
                        email: c.email,
                        phone: c.phone,
                        avatarUrl: c.avatarUrl,
                        isNew: false,
                      })
                    }
                    className={cn(
                      "flex w-full items-center gap-3 rounded-sm px-3 py-2 text-left transition-colors",
                      "hover:bg-accent focus:bg-accent focus:outline-none",
                      isSelected && "bg-accent"
                    )}
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={c.avatarUrl ?? undefined} alt={c.name} />
                      <AvatarFallback className="text-xs">{getInitials(c.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
                      {c.email && (
                        <p className="truncate text-xs text-muted-foreground">{c.email}</p>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="h-4 w-4 shrink-0 text-primary" aria-label="Selected" />
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      ) : (
        /* New customer form */
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="new-customer-name" className="text-xs font-medium text-foreground">
              Full name <span className="text-destructive">*</span>
            </label>
            <Input
              id="new-customer-name"
              placeholder="Jane Smith"
              value={newForm.name}
              onChange={(e) => setNewForm((f) => ({ ...f, name: e.target.value }))}
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="new-customer-email" className="text-xs font-medium text-foreground">
              Email
            </label>
            <Input
              id="new-customer-email"
              type="email"
              placeholder="jane@example.com"
              value={newForm.email}
              onChange={(e) => setNewForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="new-customer-phone" className="text-xs font-medium text-foreground">
              Phone
            </label>
            <Input
              id="new-customer-phone"
              type="tel"
              placeholder="+44 7700 900000"
              value={newForm.phone}
              onChange={(e) => setNewForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>
          <Button
            size="sm"
            onClick={handleNewCustomer}
            disabled={!newForm.name.trim()}
            className="self-end"
          >
            Use this customer
          </Button>

          {/* Show selection confirmation */}
          {selected?.isNew && selected.name === newForm.name.trim() && (
            <div className="flex items-center gap-2 rounded-md border border-success/20 bg-success/10 px-3 py-2 text-xs text-success">
              <Check className="h-3.5 w-3.5" />
              New customer will be created on booking confirmation
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 2 — Service + Slot + Staff
// ---------------------------------------------------------------------------

interface Step2Props {
  onSelect: (slot: SelectedSlot) => void
  selected: SelectedSlot | null
}

const COMMON_SERVICES = [
  { id: "__custom__", name: "Custom service", durationMinutes: 60, price: null },
]

const DURATION_OPTIONS = [30, 45, 60, 90, 120]

const TIME_SLOTS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30",
]

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number)
  const total = h * 60 + m + minutes
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`
}

function Step2ServiceSlot({ onSelect, selected }: Step2Props) {
  const [selectedDate, setSelectedDate] = useState(todayStr())
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [selectedServiceId, setSelectedServiceId] = useState<string>("__custom__")
  const [customServiceName, setCustomServiceName] = useState("")
  const [durationMinutes, setDurationMinutes] = useState(60)
  const [selectedStaffId, setSelectedStaffId] = useState<string>("__none__")

  const dateOptions = generateDateOptions()

  // Load available slots from scheduling router
  const { data: slotsData, isLoading: slotsLoading } = api.scheduling.listSlots.useQuery(
    {
      startDate: new Date(selectedDate + "T00:00:00"),
      endDate: new Date(selectedDate + "T23:59:59"),
      staffId: selectedStaffId !== "__none__" ? selectedStaffId : undefined,
    },
    { staleTime: 30_000 }
  )

  // Load staff list
  const { data: staffData, isLoading: staffLoading } = api.team.list.useQuery(
    { status: "ACTIVE", limit: 50 },
    { staleTime: 60_000 }
  )

  const staffMembers = staffData?.rows ?? []

  // Available time slots — use slots from API if available, otherwise fall back to static times
  const availableSlots = slotsData?.length
    ? slotsData.filter((s) => s.available).map((s) => ({
        id: s.id,
        time: s.time,
        endTime: s.endTime ?? addMinutes(s.time, durationMinutes),
      }))
    : TIME_SLOTS.map((t) => ({
        id: "__static__" + t,
        time: t,
        endTime: addMinutes(t, durationMinutes),
      }))

  return (
    <div className="flex flex-col gap-4">
      {/* Service */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-foreground">Service</label>
        <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
          <SelectTrigger aria-label="Select service">
            <SelectValue placeholder="Select a service" />
          </SelectTrigger>
          <SelectContent>
            {COMMON_SERVICES.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedServiceId === "__custom__" && (
          <Input
            placeholder="Enter service name"
            value={customServiceName}
            onChange={(e) => setCustomServiceName(e.target.value)}
            className="mt-1"
            aria-label="Custom service name"
          />
        )}
      </div>

      {/* Duration */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-foreground">Duration</label>
        <Select
          value={String(durationMinutes)}
          onValueChange={(v) => setDurationMinutes(Number(v))}
        >
          <SelectTrigger aria-label="Select duration">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DURATION_OPTIONS.map((d) => (
              <SelectItem key={d} value={String(d)}>
                {d < 60 ? `${d} minutes` : `${d / 60} hour${d > 60 ? "s" : ""}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Staff preference */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-foreground">Staff preference</label>
        {staffLoading ? (
          <Skeleton className="h-9 w-full rounded-md" />
        ) : (
          <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
            <SelectTrigger aria-label="Select staff member">
              <SelectValue placeholder="No preference" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No preference</SelectItem>
              {staffMembers.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Separator />

      {/* Date picker */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-foreground">
          <CalendarDays className="mr-1.5 inline h-3.5 w-3.5 text-muted-foreground" />
          Date
        </label>
        <div
          className="flex gap-1.5 overflow-x-auto pb-1"
          role="listbox"
          aria-label="Select date"
        >
          {dateOptions.map((d) => {
            const date = new Date(d + "T00:00:00")
            const dayName = date.toLocaleDateString("en-GB", { weekday: "short" })
            const dayNum = date.getDate()
            const isSelected = d === selectedDate
            return (
              <button
                key={d}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  setSelectedDate(d)
                  setSelectedTime(null)
                }}
                className={cn(
                  "flex shrink-0 flex-col items-center rounded-md border px-3 py-2 text-xs transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-ring",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:bg-accent"
                )}
              >
                <span className="font-medium">{dayName}</span>
                <span className="text-base font-semibold leading-none mt-0.5">{dayNum}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Time slots */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-foreground">
          <Clock className="mr-1.5 inline h-3.5 w-3.5 text-muted-foreground" />
          Time
        </label>
        {slotsLoading ? (
          <div className="grid grid-cols-4 gap-1.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-8 rounded-md" />
            ))}
          </div>
        ) : availableSlots.length === 0 ? (
          <EmptyState
            variant="calendar"
            title="No slots available"
            description="Try a different date or staff member."
            className="py-4"
          />
        ) : (
          <div
            className="grid grid-cols-4 gap-1.5"
            role="listbox"
            aria-label="Select time slot"
          >
            {availableSlots.map((slot) => {
              const isSelected = selectedTime === slot.time
              return (
                <button
                  key={slot.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    setSelectedTime(slot.time)
                    // Update selection immediately in parent
                    onSelect({
                      date: selectedDate,
                      time: slot.time,
                      endTime: slot.endTime,
                      slotId: slot.id.startsWith("__static__") ? "" : slot.id,
                      serviceId: selectedServiceId === "__custom__" ? "" : selectedServiceId,
                      staffId: selectedStaffId === "__none__" ? null : selectedStaffId,
                      durationMinutes,
                      price: null,
                    })
                  }}
                  className={cn(
                    "rounded-md border px-2 py-1.5 text-xs font-medium transition-colors",
                    "focus:outline-none focus:ring-2 focus:ring-ring",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground hover:bg-accent"
                  )}
                >
                  {slot.time}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 3 — Summary + confirm
// ---------------------------------------------------------------------------

interface Step3Props {
  customer: SelectedCustomer | null
  slot: SelectedSlot | null
  onConfirm: () => void
  isPending: boolean
}

function Step3Summary({ customer, slot, onConfirm, isPending }: Step3Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        {/* Customer */}
        {customer && (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarImage src={customer.avatarUrl ?? undefined} alt={customer.name} />
              <AvatarFallback className="text-xs">{getInitials(customer.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Customer
              </p>
              <p className="text-sm font-medium text-foreground">{customer.name}</p>
              {customer.email && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  {customer.email}
                </p>
              )}
              {customer.phone && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  {customer.phone}
                </p>
              )}
              {customer.isNew && (
                <span className="inline-flex items-center gap-1 text-xs text-warning">
                  <UserPlus className="h-3 w-3" />
                  New customer
                </span>
              )}
            </div>
          </div>
        )}

        <Separator />

        {/* Slot details */}
        {slot && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-foreground">{formatDate(slot.date)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-foreground">
                {slot.time} — {slot.endTime}
                <span className="ml-1.5 text-xs text-muted-foreground">
                  ({slot.durationMinutes} min)
                </span>
              </span>
            </div>
            {slot.staffId && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-foreground">Staff assigned</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status preview */}
      <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <BookingStatusBadge status="PENDING" />
        <span>Booking will be created in Pending status</span>
      </div>

      <Button
        size="default"
        onClick={onConfirm}
        disabled={!customer || !slot || isPending}
        loading={isPending}
        className="w-full"
        aria-label="Confirm and create booking"
      >
        Confirm Booking
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main wizard
// ---------------------------------------------------------------------------

export default function NewBookingWizard({
  open,
  onOpenChange,
  onSuccess,
}: NewBookingWizardProps) {
  const [step, setStep] = useState<WizardStep>(1)
  const [selectedCustomer, setSelectedCustomer] = useState<SelectedCustomer | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null)

  const utils = api.useUtils()

  // Create customer mutation (only when isNew)
  const createCustomerMutation = api.customer.create.useMutation()

  // Create booking mutation
  const createBookingMutation = api.booking.create.useMutation({
    onSuccess: () => {
      toast.success("Booking created successfully")
      void utils.booking.list.invalidate()
      void utils.booking.listForCalendar.invalidate()
      handleClose()
      onSuccess?.()
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to create booking")
    },
  })

  const isPending =
    createCustomerMutation.isPending || createBookingMutation.isPending

  const handleClose = useCallback(() => {
    setStep(1)
    setSelectedCustomer(null)
    setSelectedSlot(null)
    onOpenChange(false)
  }, [onOpenChange])

  const handleConfirm = useCallback(async () => {
    if (!selectedCustomer || !selectedSlot) return

    let customerId = selectedCustomer.id

    // Create new customer first if needed
    if (selectedCustomer.isNew) {
      try {
        const newCustomer = await createCustomerMutation.mutateAsync({
          name: selectedCustomer.name,
          email: selectedCustomer.email ?? undefined,
          phone: selectedCustomer.phone ?? undefined,
        })
        customerId = newCustomer.id
      } catch {
        toast.error("Failed to create customer")
        return
      }
    }

    createBookingMutation.mutate({
      customerId,
      serviceId: selectedSlot.serviceId || "00000000-0000-0000-0000-000000000000",
      staffId: selectedSlot.staffId ?? null,
      scheduledDate: new Date(selectedSlot.date + "T00:00:00"),
      scheduledTime: selectedSlot.time,
      durationMinutes: selectedSlot.durationMinutes,
      slotId: selectedSlot.slotId || undefined,
      source: "ADMIN",
      skipReservation: true,
    })
  }, [selectedCustomer, selectedSlot, createCustomerMutation, createBookingMutation])

  const stepTitles: Record<WizardStep, string> = {
    1: "Select Customer",
    2: "Choose Service & Slot",
    3: "Confirm Booking",
  }

  const canAdvanceStep1 = !!selectedCustomer
  const canAdvanceStep2 = !!selectedSlot?.time

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col gap-0 overflow-hidden p-0">
        {/* Header */}
        <DialogHeader className="border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-semibold">
              New Booking
            </DialogTitle>
            <StepIndicator current={step} total={3} />
          </div>
          <p className="text-xs text-muted-foreground mt-1">{stepTitles[step]}</p>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 1 && (
            <Step1Customer
              onSelect={setSelectedCustomer}
              selected={selectedCustomer}
            />
          )}
          {step === 2 && (
            <Step2ServiceSlot
              onSelect={setSelectedSlot}
              selected={selectedSlot}
            />
          )}
          {step === 3 && (
            <Step3Summary
              customer={selectedCustomer}
              slot={selectedSlot}
              onConfirm={handleConfirm}
              isPending={isPending}
            />
          )}
        </div>

        {/* Footer navigation */}
        {step < 3 && (
          <div className="shrink-0 border-t border-border px-6 py-4">
            <div className="flex items-center gap-2">
              {step > 1 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setStep((s) => (s - 1) as WizardStep)}
                  aria-label="Go to previous step"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Back
                </Button>
              )}
              <Button
                size="sm"
                className="ml-auto"
                disabled={step === 1 ? !canAdvanceStep1 : !canAdvanceStep2}
                onClick={() => setStep((s) => (s + 1) as WizardStep)}
                aria-label="Go to next step"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export { NewBookingWizard }
export type { NewBookingWizardProps }
