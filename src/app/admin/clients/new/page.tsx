"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/lib/trpc/react"
import { toast } from "sonner"
import { CreateEngagementForm } from "@/components/clients/create-engagement-form"

export default function NewEngagementPage() {
  const router = useRouter()
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [customerName, setCustomerName] = useState("")
  const [title, setTitle] = useState("")
  const [type, setType] = useState<"PROJECT" | "RETAINER">("PROJECT")
  const [description, setDescription] = useState("")
  const [startDate, setStartDate] = useState("")

  const mutation = api.clientPortal.admin.createEngagement.useMutation({
    onError: (err) => toast.error(err.message),
  })

  const handleSubmit = (addProposal: boolean) => {
    if (!customerId) {
      toast.error("Please select a client")
      return
    }
    if (!title.trim()) {
      toast.error("Please enter a title")
      return
    }
    mutation.mutate(
      {
        customerId,
        type,
        title: title.trim(),
        description: description.trim() || undefined,
        startDate: startDate ? new Date(startDate) : undefined,
      },
      {
        onSuccess: (engagement) => {
          if (addProposal) {
            router.push(`/admin/clients/${engagement.id}/proposals/new`)
          } else {
            toast.success("Engagement created")
            router.push("/admin/clients")
          }
        },
      }
    )
  }

  return (
    <div className="max-w-[640px] mx-auto animate-fade-in">
      <Link href="/admin/clients" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-3.5 w-3.5" /> Back to Clients
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight mt-3">New Engagement</h1>
      <p className="text-sm text-muted-foreground mt-1">Create a new client engagement to track proposals, milestones and invoices.</p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm">Engagement Details</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateEngagementForm
            customerId={customerId}
            onCustomerSelect={(id, name) => { setCustomerId(id || null); setCustomerName(name) }}
            title={title}
            onTitleChange={setTitle}
            type={type}
            onTypeChange={setType}
            description={description}
            onDescriptionChange={setDescription}
            startDate={startDate}
            onStartDateChange={setStartDate}
          />
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2 mt-6 pt-6 border-t">
        <Button variant="outline" onClick={() => handleSubmit(false)} disabled={mutation.isPending}>
          Create as Draft
        </Button>
        <Button onClick={() => handleSubmit(true)} disabled={mutation.isPending}>
          <ChevronRight className="h-4 w-4 mr-1" /> Create &amp; Add Proposal
        </Button>
      </div>
    </div>
  )
}
