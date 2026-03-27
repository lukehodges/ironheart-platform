"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { api } from "@/lib/trpc/react"
import { toast } from "sonner"
import { ModuleCategoryGrid } from "@/components/platform/module-category-grid"

export default function NewProductPage() {
  const router = useRouter()
  const [slug, setSlug] = useState("")
  const [name, setName] = useState("")
  const [tagline, setTagline] = useState("")
  const [description, setDescription] = useState("")
  const [domain, setDomain] = useState("")
  const [moduleSlugs, setModuleSlugs] = useState<string[]>([])

  const createMutation = api.product.create.useMutation({
    onSuccess: (data) => {
      toast.success("Product created — now add a plan")
      router.push(`/platform/products/${data.id}`)
    },
    onError: (err) => toast.error(err.message),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({
      slug,
      name,
      tagline,
      description: description || undefined,
      domain: domain || undefined,
      moduleSlugs,
    })
  }

  const handleNameChange = (value: string) => {
    setName(value)
    if (!slug || slug === nameToSlug(name)) {
      setSlug(nameToSlug(value))
    }
  }

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Create Product</h1>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
        <Card className="p-5 space-y-4">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Name</Label>
              <Input value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Barber Pro" required className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Slug</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="barber-pro" pattern="[a-z0-9-]+" required className="mt-1 font-mono" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Tagline</Label>
            <Input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="All-in-one barbershop management" required className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1" placeholder="Longer product description..." />
          </div>
          <div>
            <Label className="text-xs">Domain (optional)</Label>
            <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="barber.ironheart.dev" className="mt-1" />
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4">Modules</h3>
          <ModuleCategoryGrid selected={moduleSlugs} onChange={setModuleSlugs} />
        </Card>

        <Button type="submit" disabled={createMutation.isPending || moduleSlugs.length === 0 || !name || !slug || !tagline}>
          {createMutation.isPending ? "Creating..." : "Create Product"}
        </Button>
      </form>
    </div>
  )
}

function nameToSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}
