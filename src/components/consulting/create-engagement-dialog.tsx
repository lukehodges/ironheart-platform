"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Plus, Loader2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/trpc/react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type EngagementType = "PROJECT" | "RETAINER" | "HYBRID"

interface CreateEngagementDialogProps {
  onCreated?: () => void
}

export function CreateEngagementDialog({ onCreated }: CreateEngagementDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  // Form state
  const [title, setTitle] = useState("")
  const [type, setType] = useState<EngagementType>("PROJECT")
  const [description, setDescription] = useState("")

  // Customer selection
  const [customerSearch, setCustomerSearch] = useState("")
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [selectedCustomerName, setSelectedCustomerName] = useState("")
  const [creatingNew, setCreatingNew] = useState(false)
  const [newName, setNewName] = useState("")
  const [newEmail, setNewEmail] = useState("")

  // Queries
  const customersQuery = api.clientPortal.admin.searchCustomers.useQuery(
    { query: customerSearch || "a", limit: 20 },
    { enabled: open && !creatingNew }
  )

  // Mutations
  const createCustomer = api.customer.create.useMutation()
  const createEngagement = api.clientPortal.admin.createEngagement.useMutation()

  const isPending = createCustomer.isPending || createEngagement.isPending

  const filteredCustomers = useMemo(() => {
    const rows = (customersQuery.data ?? []).map((c) => ({
      id: c.id,
      name: [c.firstName, c.lastName].filter(Boolean).join(" ") || "Unnamed",
      email: c.email,
    }))
    if (!customerSearch) return rows
    const q = customerSearch.toLowerCase()
    return rows.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q))
    )
  }, [customersQuery.data, customerSearch])

  function resetForm() {
    setTitle("")
    setType("PROJECT")
    setDescription("")
    setCustomerSearch("")
    setSelectedCustomerId(null)
    setSelectedCustomerName("")
    setCreatingNew(false)
    setNewName("")
    setNewEmail("")
  }

  async function handleSubmit() {
    if (!title.trim()) {
      toast.error("Please enter a title")
      return
    }

    try {
      let customerId = selectedCustomerId

      // Create customer inline if needed
      if (creatingNew) {
        if (!newName.trim()) {
          toast.error("Please enter a customer name")
          return
        }
        const customer = await createCustomer.mutateAsync({
          name: newName.trim(),
          email: newEmail.trim() || undefined,
        })
        customerId = customer.id
      }

      if (!customerId) {
        toast.error("Please select or create a customer")
        return
      }

      const engagement = await createEngagement.mutateAsync({
        customerId,
        type,
        title: title.trim(),
        description: description.trim() || undefined,
      })

      toast.success("Engagement created")
      resetForm()
      setOpen(false)
      onCreated?.()
      router.push(`/admin/engagements/${engagement.id}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create engagement"
      toast.error(message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm() }}>
      <DialogTrigger asChild>
        <Button className="bg-[var(--ih-accent)] hover:bg-[#B73117] text-white">
          <Plus className="h-4 w-4 mr-1.5" />
          New Engagement
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[var(--ih-surface)] border-[var(--ih-line)] sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="ih-serif text-xl text-[var(--ih-ink)]">
            Create Engagement
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Customer selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[var(--ih-ink)]">Customer</Label>

            {selectedCustomerId && !creatingNew ? (
              <div className="flex items-center justify-between bg-[var(--ih-surface-2)] rounded-lg px-3 py-2.5 border border-[var(--ih-line)]">
                <span className="text-sm text-[var(--ih-ink)]">{selectedCustomerName}</span>
                <button
                  type="button"
                  onClick={() => { setSelectedCustomerId(null); setSelectedCustomerName("") }}
                  className="text-xs text-[var(--ih-accent)] hover:underline"
                >
                  Change
                </button>
              </div>
            ) : creatingNew ? (
              <div className="space-y-3 bg-[var(--ih-surface-2)] rounded-lg p-3 border border-[var(--ih-line)]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider text-[var(--ih-ink-50)]">New Customer</span>
                  <button
                    type="button"
                    onClick={() => setCreatingNew(false)}
                    className="text-xs text-[var(--ih-accent)] hover:underline"
                  >
                    Choose existing
                  </button>
                </div>
                <Input
                  placeholder="Company or contact name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="bg-[var(--ih-surface)] border-[var(--ih-line)]"
                />
                <Input
                  type="email"
                  placeholder="Email (optional)"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="bg-[var(--ih-surface)] border-[var(--ih-line)]"
                />
              </div>
            ) : (
              <div className="space-y-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--ih-ink-30)]" />
                  <Input
                    placeholder="Search customers..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="pl-9 bg-[var(--ih-surface)] border-[var(--ih-line)]"
                  />
                </div>
                <div className="max-h-[160px] overflow-y-auto rounded-lg border border-[var(--ih-line)] bg-[var(--ih-surface)]">
                  {customersQuery.isLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-4 w-4 animate-spin text-[var(--ih-ink-30)]" />
                    </div>
                  ) : filteredCustomers.length > 0 ? (
                    filteredCustomers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { setSelectedCustomerId(c.id); setSelectedCustomerName(c.name) }}
                        className="w-full text-left px-3 py-2 hover:bg-[var(--ih-surface-2)] transition-colors text-sm border-b border-[var(--ih-line)] last:border-0"
                      >
                        <span className="text-[var(--ih-ink)]">{c.name}</span>
                        {c.email && <span className="text-[var(--ih-ink-40)] ml-2 text-xs">{c.email}</span>}
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-4 text-center text-sm text-[var(--ih-ink-40)]">
                      No customers found
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => { setCreatingNew(true); setNewName(customerSearch) }}
                    className="w-full text-left px-3 py-2.5 hover:bg-[var(--ih-surface-2)] transition-colors text-sm border-t border-[var(--ih-line)] flex items-center gap-1.5 text-[var(--ih-accent)]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Create new customer{customerSearch ? `: "${customerSearch}"` : ""}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[var(--ih-ink)]">Title</Label>
            <Input
              placeholder="e.g. Q2 Operations Audit"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-[var(--ih-surface)] border-[var(--ih-line)]"
            />
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[var(--ih-ink)]">Type</Label>
            <div className="flex gap-2">
              {(["PROJECT", "RETAINER", "HYBRID"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    "flex-1 py-2 rounded-lg border text-sm font-medium transition-all duration-200",
                    type === t
                      ? "bg-[var(--ih-ink)] text-white border-[var(--ih-ink)]"
                      : "bg-[var(--ih-surface)] text-[var(--ih-ink-65)] border-[var(--ih-line)] hover:border-[var(--ih-line-2)]"
                  )}
                >
                  {t.charAt(0) + t.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[var(--ih-ink)]">
              Description <span className="text-[var(--ih-ink-40)] font-normal">(optional)</span>
            </Label>
            <Textarea
              placeholder="Brief context for this engagement..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="bg-[var(--ih-surface)] border-[var(--ih-line)] resize-none"
            />
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className="w-full bg-[var(--ih-accent)] hover:bg-[#B73117] text-white h-11"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <Plus className="h-4 w-4 mr-1.5" />
            )}
            {isPending ? "Creating..." : "Create Engagement"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
