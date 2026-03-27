"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { api } from "@/lib/trpc/react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

const ALL_MODULES = [
  "booking", "scheduling", "customer", "team", "payment",
  "forms", "review", "notification", "outreach", "ai",
  "workflow", "analytics", "calendar-sync", "pipeline",
  "developer",
]

const PRODUCT_COLORS = [
  { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/30", fill: "fill-blue-500/20", stroke: "stroke-blue-500" },
  { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30", fill: "fill-emerald-500/20", stroke: "stroke-emerald-500" },
  { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30", fill: "fill-amber-500/20", stroke: "stroke-amber-500" },
]

export default function CompareProductsPage() {
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const { data: allProducts } = api.product.listWithStats.useQuery({})
  const { data: comparison } = api.product.compare.useQuery(
    { ids: selectedIds },
    { enabled: selectedIds.length >= 2 }
  )

  const toggleProduct = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id)
      if (prev.length >= 3) return prev
      return [...prev, id]
    })
  }

  // Compute Venn regions
  const computeVennData = () => {
    if (!comparison || comparison.length < 2) return null
    const sets = comparison.map((c) => new Set(c.moduleSlugs))

    if (comparison.length === 2) {
      const shared = ALL_MODULES.filter((m) => sets[0].has(m) && sets[1].has(m))
      const onlyA = ALL_MODULES.filter((m) => sets[0].has(m) && !sets[1].has(m))
      const onlyB = ALL_MODULES.filter((m) => !sets[0].has(m) && sets[1].has(m))
      return { type: 2 as const, shared, onlyA, onlyB }
    }

    const allThree = ALL_MODULES.filter((m) => sets[0].has(m) && sets[1].has(m) && sets[2].has(m))
    const abOnly = ALL_MODULES.filter((m) => sets[0].has(m) && sets[1].has(m) && !sets[2].has(m))
    const acOnly = ALL_MODULES.filter((m) => sets[0].has(m) && !sets[1].has(m) && sets[2].has(m))
    const bcOnly = ALL_MODULES.filter((m) => !sets[0].has(m) && sets[1].has(m) && sets[2].has(m))
    const onlyA = ALL_MODULES.filter((m) => sets[0].has(m) && !sets[1].has(m) && !sets[2].has(m))
    const onlyB = ALL_MODULES.filter((m) => !sets[0].has(m) && sets[1].has(m) && !sets[2].has(m))
    const onlyC = ALL_MODULES.filter((m) => !sets[0].has(m) && !sets[1].has(m) && sets[2].has(m))
    return { type: 3 as const, allThree, abOnly, acOnly, bcOnly, onlyA, onlyB, onlyC }
  }

  const venn = computeVennData()

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/platform/products">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold">Compare Products</h1>
      </div>

      {/* Product picker */}
      <Card className="p-5">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
          Select 2-3 products to compare
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
          {(allProducts ?? []).map((product) => (
            <button
              key={product.id}
              onClick={() => toggleProduct(product.id)}
              className={`text-left px-3 py-2 rounded-lg border transition-colors ${
                selectedIds.includes(product.id)
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/30"
              }`}
              disabled={!selectedIds.includes(product.id) && selectedIds.length >= 3}
            >
              <p className="text-sm font-medium">{product.name}</p>
              <p className="text-xs text-muted-foreground">{product.moduleSlugs.length} modules</p>
            </button>
          ))}
        </div>
      </Card>

      {/* Venn visualization */}
      {venn && comparison && (
        <Card className="p-5">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4">Module Sets</h3>

          {/* Legend */}
          <div className="flex gap-4 mb-4">
            {comparison.map((c, i) => (
              <div key={c.productId} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${PRODUCT_COLORS[i].bg} ${PRODUCT_COLORS[i].border} border`} />
                <span className="text-sm font-medium">{c.productName}</span>
              </div>
            ))}
          </div>

          {/* Venn circles using CSS */}
          <div className="relative h-80 flex items-center justify-center mb-6">
            {venn.type === 2 ? (
              <>
                <div className={`absolute w-56 h-56 rounded-full ${PRODUCT_COLORS[0].bg} ${PRODUCT_COLORS[0].border} border-2 left-1/2 -translate-x-[60%] flex flex-col items-start justify-center pl-8`}>
                  <div className="text-xs space-y-0.5">
                    {venn.onlyA.map((m) => (
                      <div key={m} className={PRODUCT_COLORS[0].text}>{m}</div>
                    ))}
                  </div>
                </div>
                <div className={`absolute w-56 h-56 rounded-full ${PRODUCT_COLORS[1].bg} ${PRODUCT_COLORS[1].border} border-2 left-1/2 -translate-x-[40%] flex flex-col items-end justify-center pr-8`}>
                  <div className="text-xs space-y-0.5 text-right">
                    {venn.onlyB.map((m) => (
                      <div key={m} className={PRODUCT_COLORS[1].text}>{m}</div>
                    ))}
                  </div>
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 z-10 text-xs space-y-0.5 text-center">
                  {venn.shared.map((m) => (
                    <div key={m} className="text-foreground font-medium">{m}</div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center text-sm text-muted-foreground">
                {/* 3-way Venn simplified as a list */}
                <div className="grid grid-cols-3 gap-4">
                  {comparison.map((c, i) => {
                    const uniqueKey = i === 0 ? "onlyA" : i === 1 ? "onlyB" : "onlyC"
                    const unique = (venn as Record<string, string[]>)[uniqueKey] ?? []
                    return (
                      <div key={c.productId}>
                        <p className={`font-medium mb-2 ${PRODUCT_COLORS[i].text}`}>Only {c.productName}</p>
                        {unique.map((m) => <Badge key={m} variant="secondary" className="mr-1 mb-1 text-[10px]">{m}</Badge>)}
                        {unique.length === 0 && <span className="text-xs text-muted-foreground">None</span>}
                      </div>
                    )
                  })}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <p className="font-medium mb-2">Shared by all</p>
                  {venn.allThree.map((m) => <Badge key={m} variant="info" className="mr-1 mb-1 text-[10px]">{m}</Badge>)}
                  {venn.allThree.length === 0 && <span className="text-xs text-muted-foreground">None</span>}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Diff table */}
      {comparison && comparison.length >= 2 && (
        <Card className="p-5">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Module Diff</h3>
          <div className="rounded-lg border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Module</TableHead>
                  {comparison.map((c) => (
                    <TableHead key={c.productId} className="text-center">{c.productName}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {ALL_MODULES.map((mod) => (
                  <TableRow key={mod}>
                    <TableCell className="font-mono text-sm">{mod}</TableCell>
                    {comparison.map((c) => (
                      <TableCell key={c.productId} className="text-center">
                        {c.moduleSlugs.includes(mod) ? (
                          <span className="text-green-500">&#10003;</span>
                        ) : (
                          <span className="text-muted-foreground/30">&mdash;</span>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  )
}
