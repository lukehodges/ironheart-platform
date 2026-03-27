"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { api } from "@/lib/trpc/react"
import { toast } from "sonner"
import { Plus, MoreHorizontal, Copy, Archive, Trash2, GitCompare } from "lucide-react"
import type { ProductWithStats } from "@/modules/product/product.types"

interface ProductListClientProps {
  initialProducts: ProductWithStats[]
}

export function ProductListClient({ initialProducts }: ProductListClientProps) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [moduleFilter, setModuleFilter] = useState<string>("all")

  const { data: products } = api.product.listWithStats.useQuery(
    {
      search: search || undefined,
      status: statusFilter === "all" ? undefined : statusFilter as "live" | "draft" | "archived",
      moduleSlug: moduleFilter === "all" ? undefined : moduleFilter,
    },
    { initialData: initialProducts }
  )

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
      router.refresh()
    },
    onError: (err) => toast.error(err.message),
  })

  const deleteMutation = api.product.delete.useMutation({
    onSuccess: () => {
      toast.success("Product deleted")
      router.refresh()
    },
    onError: (err) => toast.error(err.message),
  })

  const allModules = Array.from(new Set((products ?? []).flatMap((p) => p.moduleSlugs))).sort()

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Products</h1>
        <div className="flex gap-2">
          <Link href="/platform/products/compare">
            <Button variant="outline" size="sm">
              <GitCompare className="h-4 w-4 mr-1" />
              Compare
            </Button>
          </Link>
          <Link href="/platform/products/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              New Product
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Input
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="live">Live</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select value={moduleFilter} onValueChange={setModuleFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Module" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modules</SelectItem>
            {allModules.map((mod) => (
              <SelectItem key={mod} value={mod}>{mod}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Modules</TableHead>
              <TableHead>Tenants</TableHead>
              <TableHead>MRR</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(products ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No products found.
                </TableCell>
              </TableRow>
            ) : (
              (products ?? []).map((product) => (
                <TableRow
                  key={product.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/platform/products/${product.id}`)}
                >
                  <TableCell>
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-mono">{product.slug}</span> · {product.planCount} plans
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {product.moduleSlugs.slice(0, 2).map((mod) => (
                        <Badge key={mod} variant="info" className="text-[10px]">{mod}</Badge>
                      ))}
                      {product.moduleSlugs.length > 2 && (
                        <Badge variant="secondary" className="text-[10px]">
                          +{product.moduleSlugs.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p>{product.tenantCount}</p>
                      {product.tenantGrowthThisMonth > 0 && (
                        <p className="text-xs text-green-500">↑ {product.tenantGrowthThisMonth} this month</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <p>£{(product.mrr / 100).toFixed(0)}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      product.archivedAt ? "secondary" :
                      product.isPublished ? "success" : "secondary"
                    }>
                      {product.archivedAt ? "Archived" : product.isPublished ? "Live" : "Draft"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); cloneMutation.mutate({ id: product.id }) }}>
                          <Copy className="h-4 w-4 mr-2" />
                          Clone
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); archiveMutation.mutate({ id: product.id }) }}>
                          <Archive className="h-4 w-4 mr-2" />
                          Archive
                        </DropdownMenuItem>
                        {product.tenantCount === 0 && (
                          <DropdownMenuItem
                            onClick={(e) => { e.stopPropagation(); deleteMutation.mutate({ id: product.id }) }}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
