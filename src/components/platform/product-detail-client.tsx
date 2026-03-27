"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { api } from "@/lib/trpc/react"
import { toast } from "sonner"
import { Copy, ExternalLink, Plus } from "lucide-react"
import { ModuleCategoryGrid } from "./module-category-grid"
import { FeatureMatrix } from "./feature-matrix"
import { PlanCard } from "./plan-card"
import type { ProductWithPlans, ProductPlanRecord, ProductAnalytics } from "@/modules/product/product.types"

interface ProductDetailClientProps {
  product: ProductWithPlans & { archivedAt: Date | null }
  tenants: {
    id: string
    name: string
    status: string
    plan: string
    subscriptionId: string | null
    planId: string | null
    createdAt: Date
  }[]
  analytics: ProductAnalytics
}

export function ProductDetailClient({ product, tenants, analytics }: ProductDetailClientProps) {
  const router = useRouter()

  // Overview state
  const [name, setName] = useState(product.name)
  const [tagline, setTagline] = useState(product.tagline)
  const [description, setDescription] = useState(product.description)
  const [domain, setDomain] = useState(product.domain ?? "")
  const [isPublished, setIsPublished] = useState(product.isPublished)
  const [moduleSlugs, setModuleSlugs] = useState(product.moduleSlugs)

  // Plan state
  const [plans, setPlans] = useState<ProductPlanRecord[]>(product.plans)
  const [showNewPlan, setShowNewPlan] = useState(false)
  const [newPlanName, setNewPlanName] = useState("")
  const [newPlanSlug, setNewPlanSlug] = useState("")
  const [newPlanPrice, setNewPlanPrice] = useState(0)
  const [newPlanStripePriceId, setNewPlanStripePriceId] = useState("")

  const updateMutation = api.product.update.useMutation({
    onSuccess: () => {
      toast.success("Product updated")
      router.refresh()
    },
    onError: (err) => toast.error(err.message),
  })

  const cloneMutation = api.product.clone.useMutation({
    onSuccess: (data) => {
      toast.success("Product cloned")
      router.push(`/platform/products/${data.id}`)
    },
    onError: (err) => toast.error(err.message),
  })

  const archiveMutation = api.product.archive.useMutation({
    onSuccess: () => {
      toast.success("Product archived")
      router.push("/platform/products")
    },
    onError: (err) => toast.error(err.message),
  })

  const unarchiveMutation = api.product.unarchive.useMutation({
    onSuccess: () => {
      toast.success("Product unarchived")
      router.refresh()
    },
    onError: (err) => toast.error(err.message),
  })

  const createPlanMutation = api.product.createPlan.useMutation({
    onSuccess: () => {
      toast.success("Plan created")
      setShowNewPlan(false)
      setNewPlanName("")
      setNewPlanSlug("")
      setNewPlanPrice(0)
      setNewPlanStripePriceId("")
      router.refresh()
    },
    onError: (err) => toast.error(err.message),
  })

  const updatePlanMutation = api.product.updatePlan.useMutation({
    onSuccess: () => {
      toast.success("Plan updated")
      router.refresh()
    },
    onError: (err) => toast.error(err.message),
  })

  const deletePlanMutation = api.product.deletePlan.useMutation({
    onSuccess: () => {
      toast.success("Plan deleted")
      router.refresh()
    },
    onError: (err) => toast.error(err.message),
  })

  const handleSave = () => {
    updateMutation.mutate({
      id: product.id,
      name,
      tagline,
      description,
      domain: domain || null,
      moduleSlugs,
      isPublished,
    })
  }

  const handleCreatePlan = () => {
    createPlanMutation.mutate({
      productId: product.id,
      name: newPlanName,
      slug: newPlanSlug,
      priceMonthly: newPlanPrice,
      stripePriceId: newPlanStripePriceId,
    })
  }

  const handleUpdatePlan = (planId: string, data: Record<string, unknown>) => {
    updatePlanMutation.mutate({ id: planId, ...data })
  }

  const handleFeatureUpdate = (planId: string, features: string[]) => {
    updatePlanMutation.mutate({ id: planId, features })
    // Optimistic update for responsiveness
    setPlans((prev) => prev.map((p) => (p.id === planId ? { ...p, features } : p)))
  }

  const isPending = updateMutation.isPending

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{product.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            <span className="font-mono">{product.slug}</span>
            {" · "}
            Created {product.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => cloneMutation.mutate({ id: product.id })} disabled={cloneMutation.isPending}>
            Clone
          </Button>
          {product.archivedAt ? (
            <Button variant="outline" size="sm" onClick={() => unarchiveMutation.mutate({ id: product.id })} disabled={unarchiveMutation.isPending}>
              Unarchive
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => archiveMutation.mutate({ id: product.id })} disabled={archiveMutation.isPending}>
              Archive
            </Button>
          )}
          <Button size="sm" onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {product.archivedAt && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-600">
          This product was archived on {product.archivedAt.toLocaleDateString("en-GB")}. It is hidden from the product list and its landing page returns 404.
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="modules">Modules</TabsTrigger>
          <TabsTrigger value="plans">Plans & Pricing</TabsTrigger>
          <TabsTrigger value="tenants">Tenants</TabsTrigger>
          <TabsTrigger value="landing">Landing Page</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
            <Card className="p-5 space-y-4">
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Settings</h3>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Tagline</Label>
                  <Input value={tagline} onChange={(e) => setTagline(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Slug</Label>
                  <Input value={product.slug} disabled className="mt-1 font-mono text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Description</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Domain</Label>
                  <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="custom-domain.com" className="mt-1" />
                </div>
                <div className="flex items-center justify-between pt-2">
                  <Label>Published</Label>
                  <Switch checked={isPublished} onCheckedChange={setIsPublished} />
                </div>
              </div>
            </Card>

            <div className="space-y-4">
              <Card className="p-5">
                <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Quick Stats</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-2xl font-semibold">{analytics.totalTenants}</p>
                    <p className="text-xs text-muted-foreground">Active Tenants</p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">&pound;{(analytics.mrr / 100).toFixed(0)}</p>
                    <p className="text-xs text-muted-foreground">Monthly Revenue</p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">{moduleSlugs.length}</p>
                    <p className="text-xs text-muted-foreground">Modules Enabled</p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">{plans.length}</p>
                    <p className="text-xs text-muted-foreground">Pricing Plans</p>
                  </div>
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Module Summary</h3>
                <div className="flex flex-wrap gap-1.5">
                  {moduleSlugs.map((mod) => (
                    <Badge key={mod} variant="info" className="text-xs">{mod}</Badge>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Modules Tab */}
        <TabsContent value="modules">
          <div className="mt-4">
            <ModuleCategoryGrid selected={moduleSlugs} onChange={setModuleSlugs} />
          </div>
        </TabsContent>

        {/* Plans & Pricing Tab */}
        <TabsContent value="plans">
          <div className="space-y-6 mt-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium">Plans</h3>
                <Button size="sm" variant="outline" onClick={() => setShowNewPlan(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Plan
                </Button>
              </div>

              {showNewPlan && (
                <Card className="p-4 mb-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Name</Label>
                      <Input value={newPlanName} onChange={(e) => setNewPlanName(e.target.value)} className="h-8 mt-1" placeholder="Starter" />
                    </div>
                    <div>
                      <Label className="text-xs">Slug</Label>
                      <Input value={newPlanSlug} onChange={(e) => setNewPlanSlug(e.target.value)} className="h-8 mt-1" placeholder="starter" pattern="[a-z0-9-]+" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Monthly Price (pence)</Label>
                      <Input type="number" value={newPlanPrice} onChange={(e) => setNewPlanPrice(Number(e.target.value))} className="h-8 mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Stripe Price ID</Label>
                      <Input value={newPlanStripePriceId} onChange={(e) => setNewPlanStripePriceId(e.target.value)} className="h-8 mt-1 font-mono text-xs" placeholder="price_..." />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleCreatePlan} disabled={createPlanMutation.isPending || !newPlanName || !newPlanSlug || !newPlanStripePriceId}>
                      Create Plan
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowNewPlan(false)}>Cancel</Button>
                  </div>
                </Card>
              )}

              <div className="space-y-2">
                {plans.map((plan, idx) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    onUpdate={handleUpdatePlan}
                    onDelete={(id) => deletePlanMutation.mutate({ id })}
                    onMoveUp={idx > 0 ? () => {} : undefined}
                    onMoveDown={idx < plans.length - 1 ? () => {} : undefined}
                    canDelete={tenants.filter((t) => t.planId === plan.id).length === 0}
                  />
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-3">Feature Matrix</h3>
              <FeatureMatrix
                plans={plans.map((p) => ({ id: p.id, name: p.name, features: p.features }))}
                onUpdate={handleFeatureUpdate}
              />
            </div>
          </div>
        </TabsContent>

        {/* Tenants Tab */}
        <TabsContent value="tenants">
          <div className="mt-4">
            {tenants.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No tenants on this product yet.
                  {!product.isPublished && " Publish the product to enable signups."}
                </p>
              </Card>
            ) : (
              <div className="rounded-lg border overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left px-4 py-2 font-medium">Tenant</th>
                      <th className="text-left px-4 py-2 font-medium">Plan</th>
                      <th className="text-left px-4 py-2 font-medium">Status</th>
                      <th className="text-left px-4 py-2 font-medium">Subscription</th>
                      <th className="text-left px-4 py-2 font-medium">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenants.map((tenant) => (
                      <tr key={tenant.id} className="border-b last:border-0">
                        <td className="px-4 py-2 font-medium">{tenant.name}</td>
                        <td className="px-4 py-2 text-muted-foreground">{tenant.plan}</td>
                        <td className="px-4 py-2">
                          <Badge variant={tenant.status === "ACTIVE" ? "success" : tenant.status === "TRIAL" ? "info" : "warning"}>
                            {tenant.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{tenant.subscriptionId ?? "\u2014"}</td>
                        <td className="px-4 py-2 text-muted-foreground">{tenant.createdAt.toLocaleDateString("en-GB")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Landing Page Tab */}
        <TabsContent value="landing">
          <div className="mt-4 space-y-4">
            <Card className="p-5">
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Public Page</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Landing Page URL</p>
                    <p className="text-sm text-muted-foreground font-mono">/products/{product.slug}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/products/${product.slug}`)
                        toast.success("URL copied")
                      }}
                    >
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      Copy
                    </Button>
                    <a href={`/products/${product.slug}`} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-3.5 w-3.5 mr-1" />
                        View
                      </Button>
                    </a>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Signup URL</p>
                    <p className="text-sm text-muted-foreground font-mono">/signup/{product.slug}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/signup/${product.slug}`)
                      toast.success("URL copied")
                    }}
                  >
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    Copy
                  </Button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <div>
                    <p className="text-sm font-medium">Status</p>
                    <p className="text-sm text-muted-foreground">
                      {product.isPublished ? "Published \u2014 visible to the public" : "Draft \u2014 not visible"}
                    </p>
                  </div>
                  <Badge variant={product.isPublished ? "success" : "secondary"}>
                    {product.isPublished ? "Live" : "Draft"}
                  </Badge>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Preview Content</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Hero Title:</span>{" "}
                  <span className="font-medium">{product.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Tagline:</span>{" "}
                  <span>{product.tagline}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Description:</span>{" "}
                  <span>{product.description || "Not set"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Logo:</span>{" "}
                  <span>{product.logoUrl || "Not uploaded"}</span>
                </div>
                <p className="text-xs text-muted-foreground pt-2">
                  Edit these fields in the Overview tab.
                </p>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">MRR</p>
                <p className="text-2xl font-semibold mt-1">&pound;{(analytics.mrr / 100).toFixed(0)}</p>
                <p className={`text-xs mt-1 ${analytics.mrrChange >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {analytics.mrrChange >= 0 ? "\u2191" : "\u2193"} {Math.abs(analytics.mrrChange)}%
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Tenants</p>
                <p className="text-2xl font-semibold mt-1">{analytics.totalTenants}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Trial Conversion</p>
                <p className="text-2xl font-semibold mt-1">{analytics.trialConversionRate}%</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Churn Rate</p>
                <p className="text-2xl font-semibold mt-1">{analytics.churnRate}%</p>
              </Card>
            </div>

            <Card className="p-5">
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Plan Distribution</h3>
              {analytics.tenantsByPlan.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tenants yet.</p>
              ) : (
                <div className="space-y-2">
                  {analytics.tenantsByPlan.map((entry) => {
                    const maxCount = Math.max(...analytics.tenantsByPlan.map((e) => e.count), 1)
                    const width = (entry.count / maxCount) * 100
                    return (
                      <div key={entry.planId} className="flex items-center gap-3">
                        <span className="text-sm w-24 shrink-0">{entry.planName}</span>
                        <div className="flex-1 h-6 rounded bg-muted overflow-hidden">
                          <div
                            className="h-full bg-primary/20 rounded"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-8 text-right">{entry.count}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
