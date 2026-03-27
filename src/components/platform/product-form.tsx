"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { api } from "@/lib/trpc/react"
import { toast } from "sonner"

const AVAILABLE_MODULES = [
  "booking", "scheduling", "customer", "team", "forms",
  "review", "workflow", "payment", "analytics", "notification",
  "calendar-sync", "pipeline", "outreach", "ai", "developer",
]

interface ProductFormProps {
  initialData?: {
    id: string
    slug: string
    name: string
    tagline: string
    description: string
    domain: string | null
    moduleSlugs: string[]
    isPublished: boolean
  }
}

export function ProductForm({ initialData }: ProductFormProps) {
  const router = useRouter()
  const isEditing = !!initialData

  const [slug, setSlug] = useState(initialData?.slug ?? "")
  const [name, setName] = useState(initialData?.name ?? "")
  const [tagline, setTagline] = useState(initialData?.tagline ?? "")
  const [description, setDescription] = useState(initialData?.description ?? "")
  const [domain, setDomain] = useState(initialData?.domain ?? "")
  const [moduleSlugs, setModuleSlugs] = useState<string[]>(
    initialData?.moduleSlugs ?? []
  )
  const [isPublished, setIsPublished] = useState(
    initialData?.isPublished ?? false
  )

  const createMutation = api.product.create.useMutation({
    onSuccess: () => {
      toast.success("Product created")
      router.push("/platform/products")
      router.refresh()
    },
    onError: (err) => toast.error(err.message),
  })

  const updateMutation = api.product.update.useMutation({
    onSuccess: () => {
      toast.success("Product updated")
      router.refresh()
    },
    onError: (err) => toast.error(err.message),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const data = {
      slug,
      name,
      tagline,
      description: description || undefined,
      domain: domain || undefined,
      moduleSlugs,
      isPublished,
    }

    if (isEditing) {
      updateMutation.mutate({ id: initialData.id, ...data })
    } else {
      createMutation.mutate(data)
    }
  }

  const toggleModule = (mod: string) => {
    setModuleSlugs((prev) =>
      prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod]
    )
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div className="space-y-2">
        <Label htmlFor="slug">Slug</Label>
        <Input
          id="slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="ironbook"
          disabled={isEditing}
          pattern="[a-z0-9-]+"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="IronBook"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tagline">Tagline</Label>
        <Input
          id="tagline"
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          placeholder="Scheduling for mobile health providers"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Longer product description..."
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="domain">Custom Domain (optional)</Label>
        <Input
          id="domain"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="ironbook.io"
        />
      </div>

      <div className="space-y-2">
        <Label>Modules</Label>
        <div className="grid grid-cols-3 gap-2">
          {AVAILABLE_MODULES.map((mod) => (
            <button
              key={mod}
              type="button"
              onClick={() => toggleModule(mod)}
              className={`px-3 py-2 text-sm rounded border transition-colors ${
                moduleSlugs.includes(mod)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              {mod}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Switch
          checked={isPublished}
          onCheckedChange={setIsPublished}
          id="published"
        />
        <Label htmlFor="published">Published (visible on landing page)</Label>
      </div>

      <Button type="submit" disabled={isPending || moduleSlugs.length === 0}>
        {isPending
          ? "Saving..."
          : isEditing
            ? "Update Product"
            : "Create Product"}
      </Button>
    </form>
  )
}
