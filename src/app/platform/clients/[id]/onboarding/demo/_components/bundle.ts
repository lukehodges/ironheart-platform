import type { DemoNode } from "./types"

/**
 * Sibling role-bundling — tree mode.
 *
 * When several siblings under the same parent share an identical title (and
 * none of them have their own subordinates) we insert a synthetic BUNDLE
 * node above them and re-parent the members under it. The bundle behaves
 * like any other parent in the chart: collapsed by default (renders as a
 * stacked-avatar card), expandable via the standard +/− toggle into its
 * member children. Click again to fold them back into the bundle.
 *
 * The function is pure so it can be unit-tested without React.
 */

const PERSON_LIKE = new Set<DemoNode["kind"]>(["PERSON", "CONTRACTOR", "ADVISOR", "VACANCY", "EXTERNAL"])

export interface BundleOptions {
  /** Master switch — when false, the input is returned untouched. */
  enabled: boolean
  /** Minimum siblings sharing a title before we bundle. Default 3. */
  minGroupSize?: number
}

/**
 * Returns a new node list with same-title leaf siblings re-parented under a
 * synthetic BUNDLE node. The bundle inherits the original parentId; members
 * keep their original ids and content but get parentId = bundle.id.
 *
 * Bundle id format: `bundle__<parentId>__<titleSlug>`.
 *
 * The graph layout then treats the bundle as a regular parent — collapsed by
 * default (renders stacked avatars), expandable into its 3 children via the
 * standard +/− toggle.
 */
export function bundleSiblings(nodes: DemoNode[], opts: BundleOptions): DemoNode[] {
  if (!opts.enabled) return nodes
  const minSize = Math.max(2, opts.minGroupSize ?? 3)

  const childrenOf = new Map<string, DemoNode[]>()
  const hasChildren = new Set<string>()
  for (const n of nodes) {
    const key = n.parentId ?? "__root__"
    if (!childrenOf.has(key)) childrenOf.set(key, [])
    childrenOf.get(key)!.push(n)
    if (n.parentId) hasChildren.add(n.parentId)
  }

  // Plan groups: for each (parent, normalised-title) cluster of >= minSize
  // leaf members, allocate a bundle id and record the member set.
  type Plan = { bundleId: string; parentId: string; members: DemoNode[] }
  const plans: Plan[] = []
  const memberToBundle = new Map<string, string>()
  for (const [parentId, kids] of childrenOf) {
    if (parentId === "__root__") continue
    const groups = new Map<string, DemoNode[]>()
    for (const k of kids) {
      if (!PERSON_LIKE.has(k.kind)) continue
      if (hasChildren.has(k.id)) continue
      const key = normaliseTitle(k.title)
      if (!key) continue
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(k)
    }
    for (const [titleKey, members] of groups) {
      if (members.length < minSize) continue
      const bundleId = `bundle__${parentId}__${titleKey}`
      plans.push({ bundleId, parentId, members })
      for (const m of members) memberToBundle.set(m.id, bundleId)
    }
  }

  if (plans.length === 0) return nodes

  const out: DemoNode[] = []
  const bundleInserted = new Set<string>()

  for (const n of nodes) {
    // Member node — emit the bundle once at the location of the first member,
    // then re-emit the member itself but re-parented under the bundle.
    const bundleId = memberToBundle.get(n.id)
    if (bundleId) {
      if (!bundleInserted.has(bundleId)) {
        const plan = plans.find((p) => p.bundleId === bundleId)!
        out.push(makeBundleNode(plan.bundleId, plan.parentId, plan.members))
        bundleInserted.add(bundleId)
      }
      out.push({ ...n, parentId: bundleId })
      continue
    }
    out.push(n)
  }
  return out
}

/** Lower-case + dash-only; used as the cache key + bundle-id suffix. */
export function normaliseTitle(title: string | null | undefined): string {
  if (!title) return ""
  return title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
}

function makeBundleNode(id: string, parentId: string, members: DemoNode[]): DemoNode {
  const first = members[0]!
  const title = first.title ?? "Untitled"
  return {
    id,
    parentId,
    kind: "BUNDLE",
    name: `${members.length} × ${title}`,
    title,
    email: null,
    avatarColor: first.avatarColor,
    headcount: members.length,
    tenureYears: null,
    location: null,
    edgeStyle: first.edgeStyle,
    auditFlags: [],
    interviewStatus: aggregateInterviewStatus(members),
    formStatus: aggregateFormStatus(members),
    notes: null,
    isFounder: false,
    isFractional: false,
    bundleMemberIds: members.map((m) => m.id),
  }
}

function aggregateInterviewStatus(members: DemoNode[]): DemoNode["interviewStatus"] {
  // "Worst-case wins" so a card flags incomplete coverage clearly.
  const order: DemoNode["interviewStatus"][] = ["NOT_TARGET", "DECLINED", "TARGET", "INVITED", "SCHEDULED", "COMPLETED"]
  let best = -1
  for (const m of members) {
    const idx = order.indexOf(m.interviewStatus)
    if (idx > best) best = idx
  }
  return order[best] ?? "NOT_TARGET"
}

function aggregateFormStatus(members: DemoNode[]): DemoNode["formStatus"] {
  const order: DemoNode["formStatus"][] = ["NOT_SENT", "SENT", "OPENED", "IN_PROGRESS", "COMPLETED"]
  let best = -1
  for (const m of members) {
    const idx = order.indexOf(m.formStatus)
    if (idx > best) best = idx
  }
  return order[best] ?? "NOT_SENT"
}
