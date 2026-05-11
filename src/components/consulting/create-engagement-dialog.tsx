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
        <Button className="bg-[#D13A1F] hover:bg-[#9B2A12] text-white">
          <Plus className="h-4 w-4 mr-1.5" />
          New Engagement
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#FBF7EE] border-[#0E1013]/10 sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl text-[#0E1013]">
            Create Engagement
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Customer selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#0E1013]">Customer</Label>

            {selectedCustomerId && !creatingNew ? (
              <div className="flex items-center justify-between bg-[#F5F1E8] rounded-lg px-3 py-2.5 border border-[#0E1013]/10">
                <span className="text-sm text-[#0E1013]">{selectedCustomerName}</span>
                <button
                  type="button"
                  onClick={() => { setSelectedCustomerId(null); setSelectedCustomerName("") }}
                  className="text-xs text-[#D13A1F] hover:underline"
                >
                  Change
                </button>
              </div>
            ) : creatingNew ? (
              <div className="space-y-3 bg-[#F5F1E8] rounded-lg p-3 border border-[#0E1013]/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider text-[#0E1013]/50">New Customer</span>
                  <button
                    type="button"
                    onClick={() => setCreatingNew(false)}
                    className="text-xs text-[#D13A1F] hover:underline"
                  >
                    Choose existing
                  </button>
                </div>
                <Input
                  placeholder="Company or contact name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="bg-[#FBF7EE] border-[#0E1013]/10"
                />
                <Input
                  type="email"
                  placeholder="Email (optional)"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="bg-[#FBF7EE] border-[#0E1013]/10"
                />
              </div>
            ) : (
              <div className="space-y-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#0E1013]/30" />
                  <Input
                    placeholder="Search customers..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="pl-9 bg-[#FBF7EE] border-[#0E1013]/10"
                  />
                </div>
                <div className="max-h-[160px] overflow-y-auto rounded-lg border border-[#0E1013]/10 bg-[#FBF7EE]">
                  {customersQuery.isLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-4 w-4 animate-spin text-[#0E1013]/30" />
                    </div>
                  ) : filteredCustomers.length > 0 ? (
                    filteredCustomers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { setSelectedCustomerId(c.id); setSelectedCustomerName(c.name) }}
                        className="w-full text-left px-3 py-2 hover:bg-[#F5F1E8] transition-colors text-sm border-b border-[#0E1013]/5 last:border-0"
                      >
                        <span className="text-[#0E1013]">{c.name}</span>
                        {c.email && <span className="text-[#0E1013]/40 ml-2 text-xs">{c.email}</span>}
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-4 text-center text-sm text-[#0E1013]/40">
                      No customers found
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => { setCreatingNew(true); setNewName(customerSearch) }}
                    className="w-full text-left px-3 py-2.5 hover:bg-[#F5F1E8] transition-colors text-sm border-t border-[#0E1013]/10 flex items-center gap-1.5 text-[#D13A1F]"
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
            <Label className="text-sm font-medium text-[#0E1013]">Title</Label>
            <Input
              placeholder="e.g. Q2 Operations Audit"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-[#FBF7EE] border-[#0E1013]/10"
            />
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#0E1013]">Type</Label>
            <div className="flex gap-2">
              {(["PROJECT", "RETAINER", "HYBRID"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    "flex-1 py-2 rounded-lg border text-sm font-medium transition-all duration-200",
                    type === t
                      ? "bg-[#0E1013] text-white border-[#0E1013]"
                      : "bg-[#FBF7EE] text-[#0E1013]/65 border-[#0E1013]/10 hover:border-[#0E1013]/25"
                  )}
                >
                  {t.charAt(0) + t.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#0E1013]">
              Description <span className="text-[#0E1013]/40 font-normal">(optional)</span>
            </Label>
            <Textarea
              placeholder="Brief context for this engagement..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="bg-[#FBF7EE] border-[#0E1013]/10 resize-none"
            />
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className="w-full bg-[#D13A1F] hover:bg-[#9B2A12] text-white h-11"
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
