"use client"

import { useState, useMemo, useCallback } from "react"
import { api } from "@/lib/trpc/react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { moduleRegistry } from "@/shared/module-system/register-all"
import type { ModuleManifest, ModuleCategory } from "@/shared/module-system/types"
import {
  ChevronRight,
  ChevronDown,
  Circle,
  Info,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TreeNode {
  manifest: ModuleManifest
  children: TreeNode[]
}

interface EnabledMap {
  [slug: string]: boolean
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_ORDER: ModuleCategory[] = [
  "operations",
  "intelligence",
  "automation",
  "finance",
]

const CATEGORY_LABELS: Record<ModuleCategory, string> = {
  operations: "Operations",
  intelligence: "Intelligence",
  automation: "Automation",
  finance: "Finance",
}

const CATEGORY_COLORS: Record<ModuleCategory, string> = {
  operations: "border-border",
  intelligence: "border-border",
  automation: "border-border",
  finance: "border-border",
}

// ---------------------------------------------------------------------------
// Tree-building helpers
// ---------------------------------------------------------------------------

/**
 * Build a forest of TreeNode structures grouped by category.
 *
 * Strategy:
 * - A module's "primary parent" is its first dependency (index 0).
 * - Root nodes are those with no dependencies OR whose primary parent is
 *   in a different category (to keep category groupings clean).
 * - Within each category we build a tree rooted at the category's root nodes.
 */
function buildCategoryTrees(
  manifests: ModuleManifest[]
): Map<ModuleCategory, TreeNode[]> {
  const bySlug = new Map<string, ModuleManifest>()
  for (const m of manifests) {
    bySlug.set(m.slug, m)
  }

  // Compute children: a module is a child of its primary (first) dependency
  const childrenOf = new Map<string, ModuleManifest[]>()
  const hasParent = new Set<string>()

  for (const m of manifests) {
    if (m.dependencies.length > 0) {
      const primaryDep = m.dependencies[0]
      // Only attach as child if primary dep exists in registry
      if (bySlug.has(primaryDep)) {
        if (!childrenOf.has(primaryDep)) {
          childrenOf.set(primaryDep, [])
        }
        childrenOf.get(primaryDep)!.push(m)
        hasParent.add(m.slug)
      }
    }
  }

  // Recursive tree builder
  function buildNode(manifest: ModuleManifest): TreeNode {
    const kids = (childrenOf.get(manifest.slug) ?? [])
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
    return {
      manifest,
      children: kids.map(buildNode),
    }
  }

  // Group root nodes by category
  const categoryRoots = new Map<ModuleCategory, ModuleManifest[]>()
  for (const cat of CATEGORY_ORDER) {
    categoryRoots.set(cat, [])
  }

  for (const m of manifests) {
    if (!hasParent.has(m.slug)) {
      const list = categoryRoots.get(m.category)
      if (list) {
        list.push(m)
      }
    }
  }

  // Build trees per category
  const result = new Map<ModuleCategory, TreeNode[]>()
  for (const [cat, roots] of categoryRoots) {
    const sorted = roots.slice().sort((a, b) => {
      // Core modules first within their category
      if (a.isCore !== b.isCore) return a.isCore ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    result.set(cat, sorted.map(buildNode))
  }

  return result
}

/**
 * Collect all slugs in a subtree.
 */
function collectSlugs(node: TreeNode): string[] {
  const slugs: string[] = [node.manifest.slug]
  for (const child of node.children) {
    slugs.push(...collectSlugs(child))
  }
  return slugs
}

/**
 * Get all transitive dependents (downstream) for a given slug.
 */
function getTransitiveDependents(
  slug: string,
  allManifests: ModuleManifest[]
): Set<string> {
  const result = new Set<string>()
  const queue = [slug]
  while (queue.length > 0) {
    const current = queue.pop()!
    const dependents = allManifests.filter((m) =>
      m.dependencies.includes(current)
    )
    for (const d of dependents) {
      if (!result.has(d.slug)) {
        result.add(d.slug)
        queue.push(d.slug)
      }
    }
  }
  return result
}

/**
 * Get all transitive dependencies (upstream) for a given slug.
 */
function getTransitiveDependencies(
  slug: string,
  bySlug: Map<string, ModuleManifest>
): Set<string> {
  const result = new Set<string>()
  const queue = [...(bySlug.get(slug)?.dependencies ?? [])]
  while (queue.length > 0) {
    const current = queue.pop()!
    if (!result.has(current)) {
      result.add(current)
      const manifest = bySlug.get(current)
      if (manifest) {
        queue.push(...manifest.dependencies)
      }
    }
  }
  return result
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusDot({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 shrink-0 rounded-full transition-colors",
        enabled
          ? "bg-primary"
          : "bg-muted-foreground/30"
      )}
      aria-label={enabled ? "Enabled" : "Disabled"}
    />
  )
}

// ---------------------------------------------------------------------------
// TreeNodeRow
// ---------------------------------------------------------------------------

interface TreeNodeRowProps {
  node: TreeNode
  depth: number
  isLast: boolean
  enabledMap: EnabledMap
  bySlug: Map<string, ModuleManifest>
  hoveredSlug: string | null
  upstreamSlugs: Set<string>
  downstreamSlugs: Set<string>
  collapsedSlugs: Set<string>
  onHover: (slug: string | null) => void
  onToggleCollapse: (slug: string) => void
  category: ModuleCategory
}

function TreeNodeRow({
  node,
  depth,
  isLast,
  enabledMap,
  bySlug,
  hoveredSlug,
  upstreamSlugs,
  downstreamSlugs,
  collapsedSlugs,
  onHover,
  onToggleCollapse,
  category,
}: TreeNodeRowProps) {
  const { manifest } = node
  const isEnabled = enabledMap[manifest.slug] ?? false
  const isHovered = hoveredSlug === manifest.slug
  const isUpstream = upstreamSlugs.has(manifest.slug)
  const isDownstream = downstreamSlugs.has(manifest.slug)
  const isHighlighted = isUpstream || isDownstream
  const hasChildren = node.children.length > 0
  const isCollapsed = collapsedSlugs.has(manifest.slug)

  return (
    <div>
      {/* The node row itself */}
      <div
        className={cn(
          "group relative flex items-center gap-2 rounded-md px-2.5 py-1.5 transition-all duration-150",
          // Hover state
          isHovered && "bg-accent shadow-sm",
          // Highlighted (upstream or downstream dependency)
          isHighlighted && !isHovered && "bg-accent/50",
          // Dimmed when disabled and not highlighted
          !isEnabled && !isHovered && !isHighlighted && "opacity-45",
          // Core module subtle background
          manifest.isCore && !isHovered && !isHighlighted && "bg-muted/50"
        )}
        onMouseEnter={() => onHover(manifest.slug)}
        onMouseLeave={() => onHover(null)}
      >
        {/* Collapse/expand toggle */}
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggleCollapse(manifest.slug)}
            className={cn(
              "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded transition-colors",
              "text-muted-foreground/70 hover:text-foreground hover:bg-accent"
            )}
            aria-label={isCollapsed ? "Expand" : "Collapse"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center">
            <Circle className="h-1.5 w-1.5 fill-muted-foreground/30 text-muted-foreground/30" />
          </span>
        )}

        {/* Status dot */}
        <StatusDot enabled={isEnabled} />

        {/* Module name */}
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={cn(
                "text-sm font-medium truncate cursor-default select-none",
                isEnabled ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {manifest.name}
            </span>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            className="max-w-xs space-y-1 py-2 px-3"
          >
            <p className="font-semibold text-xs">{manifest.name}</p>
            <p className="text-xs opacity-80 leading-relaxed">
              {manifest.description}
            </p>
            {manifest.dependencies.length > 0 && (
              <p className="text-xs opacity-70 pt-0.5">
                Depends on:{" "}
                {manifest.dependencies
                  .map((s) => bySlug.get(s)?.name ?? s)
                  .join(", ")}
              </p>
            )}
          </TooltipContent>
        </Tooltip>

        {/* Badges and dependency info */}
        <span className="ml-auto flex shrink-0 items-center gap-1.5">
          {manifest.isCore && (
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 font-medium"
            >
              Core
            </Badge>
          )}
          {manifest.availability === "addon" && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 font-medium"
            >
              Addon
            </Badge>
          )}
          {manifest.dependencies.length > 0 && (
            <span className="hidden sm:inline-flex text-[11px] text-muted-foreground/60">
              {manifest.dependencies.length} dep{manifest.dependencies.length > 1 ? "s" : ""}
            </span>
          )}
        </span>
      </div>

      {/* Children rendered with left-border indentation */}
      {hasChildren && !isCollapsed && (
        <div
          className={cn(
            "ml-[18px] border-l-2 pl-3",
            CATEGORY_COLORS[category]
          )}
        >
          {node.children.map((child) => (
            <TreeNodeRow
              key={child.manifest.slug}
              node={child}
              depth={depth + 1}
              isLast={false}
              enabledMap={enabledMap}
              bySlug={bySlug}
              hoveredSlug={hoveredSlug}
              upstreamSlugs={upstreamSlugs}
              downstreamSlugs={downstreamSlugs}
              collapsedSlugs={collapsedSlugs}
              onHover={onHover}
              onToggleCollapse={onToggleCollapse}
              category={category}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// CategorySection
// ---------------------------------------------------------------------------

interface CategorySectionProps {
  category: ModuleCategory
  trees: TreeNode[]
  enabledMap: EnabledMap
  bySlug: Map<string, ModuleManifest>
  hoveredSlug: string | null
  upstreamSlugs: Set<string>
  downstreamSlugs: Set<string>
  collapsedSlugs: Set<string>
  onHover: (slug: string | null) => void
  onToggleCollapse: (slug: string) => void
}

function CategorySection({
  category,
  trees,
  enabledMap,
  bySlug,
  hoveredSlug,
  upstreamSlugs,
  downstreamSlugs,
  collapsedSlugs,
  onHover,
  onToggleCollapse,
}: CategorySectionProps) {
  if (trees.length === 0) return null

  const totalModules = trees.reduce(
    (acc, tree) => acc + collectSlugs(tree).length,
    0
  )
  const enabledCount = trees.reduce(
    (acc, tree) =>
      acc + collectSlugs(tree).filter((s) => enabledMap[s]).length,
    0
  )

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold tracking-tight">
            {CATEGORY_LABELS[category]}
          </CardTitle>
          <span className="text-xs tabular-nums text-muted-foreground">
            {enabledCount}
            <span className="text-muted-foreground/50">/{totalModules}</span>
            {" enabled"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pb-3 pt-1">
        <div className="space-y-0.5">
          {trees.map((tree) => (
            <TreeNodeRow
              key={tree.manifest.slug}
              node={tree}
              depth={0}
              isLast={false}
              enabledMap={enabledMap}
              bySlug={bySlug}
              hoveredSlug={hoveredSlug}
              upstreamSlugs={upstreamSlugs}
              downstreamSlugs={downstreamSlugs}
              collapsedSlugs={collapsedSlugs}
              onHover={onHover}
              onToggleCollapse={onToggleCollapse}
              category={category}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function TreeSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent className="pb-3 pt-1 space-y-1">
            <Skeleton className="h-8 w-full rounded-md" />
            <div className="ml-[18px] border-l-2 border-border pl-3 space-y-1">
              <Skeleton className="h-8 w-full rounded-md" />
              <Skeleton className="h-8 w-5/6 rounded-md" />
            </div>
            <Skeleton className="h-8 w-full rounded-md" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ModuleHierarchyTree() {
  const {
    data: tenantModules,
    isLoading,
    error,
  } = api.tenant.listModules.useQuery(undefined, {
    staleTime: 60_000,
  })

  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null)
  const [collapsedSlugs, setCollapsedSlugs] = useState<Set<string>>(new Set())

  // All manifests from the registry
  const allManifests = useMemo(() => moduleRegistry.getAllManifests(), [])

  const bySlug = useMemo(() => {
    const map = new Map<string, ModuleManifest>()
    for (const m of allManifests) {
      map.set(m.slug, m)
    }
    return map
  }, [allManifests])

  // Enabled/disabled map: tenant DB data + core modules always enabled
  const enabledMap = useMemo<EnabledMap>(() => {
    const map: EnabledMap = {}
    // Core modules are always enabled regardless of DB state
    for (const m of allManifests) {
      if (m.isCore) map[m.slug] = true
    }
    // Overlay with actual tenant data (deduplicates by taking last write)
    if (tenantModules) {
      for (const m of tenantModules) {
        // Only set if this slug exists in the registry
        if (bySlug.has(m.moduleSlug)) {
          map[m.moduleSlug] = m.isEnabled
        }
      }
    }
    // Re-enforce core modules after overlay (DB might say disabled)
    for (const m of allManifests) {
      if (m.isCore) map[m.slug] = true
    }
    return map
  }, [tenantModules, allManifests, bySlug])

  // Build the category trees
  const categoryTrees = useMemo(
    () => buildCategoryTrees(allManifests),
    [allManifests]
  )

  // Compute highlighted slugs when hovering — separate upstream from downstream
  const upstreamSlugs = useMemo(() => {
    if (!hoveredSlug) return new Set<string>()
    return getTransitiveDependencies(hoveredSlug, bySlug)
  }, [hoveredSlug, bySlug])

  const downstreamSlugs = useMemo(() => {
    if (!hoveredSlug) return new Set<string>()
    return getTransitiveDependents(hoveredSlug, allManifests)
  }, [hoveredSlug, allManifests])

  const handleHover = useCallback((slug: string | null) => {
    setHoveredSlug(slug)
  }, [])

  const handleToggleCollapse = useCallback((slug: string) => {
    setCollapsedSlugs((prev) => {
      const next = new Set(prev)
      if (next.has(slug)) {
        next.delete(slug)
      } else {
        next.add(slug)
      }
      return next
    })
  }, [])

  // --- Error state ---
  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <p className="text-sm text-destructive">
          Failed to load module data. Please try again later.
        </p>
      </div>
    )
  }

  // --- Loading state ---
  if (isLoading) {
    return <TreeSkeleton />
  }

  // --- Empty state ---
  if (!tenantModules || tenantModules.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/50 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No modules configured for this tenant.
        </p>
      </div>
    )
  }

  // --- Summary (count only against known manifests) ---
  const totalModules = allManifests.length
  const totalEnabled = allManifests.filter((m) => enabledMap[m.slug]).length

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Module dependency tree showing how modules relate to each other.
          </p>
          <span className="text-xs tabular-nums text-muted-foreground">
            {totalEnabled}
            <span className="text-muted-foreground/50">/{totalModules}</span>
            {" modules enabled"}
          </span>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <StatusDot enabled={true} />
            Enabled
          </span>
          <span className="inline-flex items-center gap-1.5">
            <StatusDot enabled={false} />
            Disabled
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              Core
            </Badge>
            Always on
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              Addon
            </Badge>
            Optional
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Info className="h-3 w-3" />
            Hover to trace dependencies
          </span>
        </div>

        {/* Category trees */}
        {CATEGORY_ORDER.map((cat) => {
          const trees = categoryTrees.get(cat)
          if (!trees || trees.length === 0) return null
          return (
            <CategorySection
              key={cat}
              category={cat}
              trees={trees}
              enabledMap={enabledMap}
              bySlug={bySlug}
              hoveredSlug={hoveredSlug}
              upstreamSlugs={upstreamSlugs}
              downstreamSlugs={downstreamSlugs}
              collapsedSlugs={collapsedSlugs}
              onHover={handleHover}
              onToggleCollapse={handleToggleCollapse}
            />
          )
        })}
      </div>
    </TooltipProvider>
  )
}
