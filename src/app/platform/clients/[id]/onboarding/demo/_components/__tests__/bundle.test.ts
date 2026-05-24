import { describe, expect, it } from "vitest"
import { bundleSiblings, normaliseTitle } from "../bundle"
import type { DemoNode } from "../types"

// ── factories ────────────────────────────────────────────────────────────────

function person(overrides: Partial<DemoNode> & Pick<DemoNode, "id" | "parentId">): DemoNode {
  return {
    kind: "PERSON",
    name: overrides.name ?? overrides.id,
    title: overrides.title ?? "Account Executive",
    email: overrides.email ?? null,
    avatarColor: overrides.avatarColor ?? "indigo",
    headcount: null,
    tenureYears: null,
    location: null,
    edgeStyle: "SOLID",
    auditFlags: overrides.auditFlags ?? [],
    interviewStatus: overrides.interviewStatus ?? "NOT_TARGET",
    formStatus: overrides.formStatus ?? "NOT_SENT",
    notes: null,
    isFounder: false,
    isFractional: false,
    ...overrides,
  }
}

function dept(id: string, parentId: string | null, name: string = id): DemoNode {
  return {
    id,
    parentId,
    kind: "DEPARTMENT",
    name,
    title: null,
    email: null,
    avatarColor: null,
    headcount: null,
    tenureYears: null,
    location: null,
    edgeStyle: "SOLID",
    auditFlags: [],
    interviewStatus: "NOT_TARGET",
    formStatus: "NOT_SENT",
    notes: null,
    isFounder: false,
    isFractional: false,
  }
}

// ── normaliseTitle ───────────────────────────────────────────────────────────

describe("normaliseTitle", () => {
  it("lowercases and dasherises", () => {
    expect(normaliseTitle("Account Executive")).toBe("account-executive")
  })
  it("strips punctuation", () => {
    expect(normaliseTitle("SDR (Inbound)")).toBe("sdr-inbound")
  })
  it("returns empty string for nullish input", () => {
    expect(normaliseTitle(null)).toBe("")
    expect(normaliseTitle(undefined)).toBe("")
    expect(normaliseTitle("")).toBe("")
  })
})

// ── bundleSiblings ───────────────────────────────────────────────────────────

describe("bundleSiblings", () => {
  it("returns input untouched when disabled", () => {
    const nodes = [
      dept("sales", null, "Sales"),
      person({ id: "ae1", parentId: "sales" }),
      person({ id: "ae2", parentId: "sales" }),
      person({ id: "ae3", parentId: "sales" }),
    ]
    const out = bundleSiblings(nodes, { enabled: false })
    expect(out).toBe(nodes)
  })

  it("inserts a BUNDLE node and re-parents 3+ same-title siblings beneath it", () => {
    const nodes = [
      dept("sales", null, "Sales"),
      person({ id: "ae1", parentId: "sales", title: "Account Executive" }),
      person({ id: "ae2", parentId: "sales", title: "Account Executive" }),
      person({ id: "ae3", parentId: "sales", title: "Account Executive" }),
    ]
    const out = bundleSiblings(nodes, { enabled: true })
    // Bundle inserted + 3 members re-parented + the original sales dept = 5
    expect(out).toHaveLength(5)
    const bundle = out.find((n) => n.kind === "BUNDLE")
    expect(bundle).toBeDefined()
    expect(bundle?.bundleMemberIds).toEqual(["ae1", "ae2", "ae3"])
    expect(bundle?.title).toBe("Account Executive")
    expect(bundle?.headcount).toBe(3)
    expect(bundle?.parentId).toBe("sales")
    expect(bundle?.id).toBe("bundle__sales__account-executive")
    // Members survive — re-parented under the bundle.
    const members = out.filter((n) => n.kind === "PERSON")
    expect(members).toHaveLength(3)
    expect(members.every((m) => m.parentId === bundle?.id)).toBe(true)
  })

  it("respects minGroupSize", () => {
    const nodes = [
      dept("sales", null, "Sales"),
      person({ id: "ae1", parentId: "sales" }),
      person({ id: "ae2", parentId: "sales" }),
    ]
    const out = bundleSiblings(nodes, { enabled: true, minGroupSize: 3 })
    expect(out.find((n) => n.kind === "BUNDLE")).toBeUndefined()
    // No bundle → original two AEs preserved.
    expect(out).toHaveLength(3)
  })

  it("does not bundle siblings with different titles", () => {
    const nodes = [
      dept("eng", null, "Engineering"),
      person({ id: "be1", parentId: "eng", title: "Backend Engineer" }),
      person({ id: "be2", parentId: "eng", title: "Backend Engineer" }),
      person({ id: "fe1", parentId: "eng", title: "Frontend Engineer" }),
      person({ id: "fe2", parentId: "eng", title: "Frontend Engineer" }),
    ]
    const out = bundleSiblings(nodes, { enabled: true, minGroupSize: 2 })
    const bundles = out.filter((n) => n.kind === "BUNDLE")
    expect(bundles).toHaveLength(2)
    const titles = bundles.map((b) => b.title).sort()
    expect(titles).toEqual(["Backend Engineer", "Frontend Engineer"])
  })

  it("does not bundle siblings that have their own subordinates", () => {
    const nodes = [
      dept("exec", null, "Exec"),
      person({ id: "vp1", parentId: "exec", title: "VP" }),
      person({ id: "vp2", parentId: "exec", title: "VP" }),
      person({ id: "vp3", parentId: "exec", title: "VP" }),
      // vp1 has a report — disqualifies the whole VP group
      person({ id: "report", parentId: "vp1", title: "IC" }),
    ]
    const out = bundleSiblings(nodes, { enabled: true })
    expect(out.find((n) => n.kind === "BUNDLE")).toBeUndefined()
  })

  it("expand state is no longer the bundler's concern (handled by collapsedIds at render)", () => {
    // The bundler always inserts the synthetic BUNDLE parent; whether its
    // children render is decided by the layout engine via the standard
    // expand/collapse pipeline. Sanity-check that members keep their original
    // attributes (only parentId changes).
    const nodes = [
      dept("sales", null, "Sales"),
      person({ id: "ae1", parentId: "sales", title: "Account Executive", interviewStatus: "TARGET" }),
      person({ id: "ae2", parentId: "sales", title: "Account Executive" }),
      person({ id: "ae3", parentId: "sales", title: "Account Executive" }),
    ]
    const out = bundleSiblings(nodes, { enabled: true })
    const ae1 = out.find((n) => n.id === "ae1")
    expect(ae1?.parentId).toBe("bundle__sales__account-executive")
    expect(ae1?.interviewStatus).toBe("TARGET")
  })

  it("aggregates the worst-case interview status across members", () => {
    const nodes = [
      dept("sales", null, "Sales"),
      person({ id: "a", parentId: "sales", interviewStatus: "NOT_TARGET" }),
      person({ id: "b", parentId: "sales", interviewStatus: "SCHEDULED" }),
      person({ id: "c", parentId: "sales", interviewStatus: "TARGET" }),
    ]
    const out = bundleSiblings(nodes, { enabled: true })
    const bundle = out.find((n) => n.kind === "BUNDLE")
    expect(bundle?.interviewStatus).toBe("SCHEDULED")
  })

  it("aggregates the worst-case form status across members", () => {
    const nodes = [
      dept("sales", null, "Sales"),
      person({ id: "a", parentId: "sales", formStatus: "NOT_SENT" }),
      person({ id: "b", parentId: "sales", formStatus: "SENT" }),
      person({ id: "c", parentId: "sales", formStatus: "COMPLETED" }),
    ]
    const out = bundleSiblings(nodes, { enabled: true })
    const bundle = out.find((n) => n.kind === "BUNDLE")
    expect(bundle?.formStatus).toBe("COMPLETED")
  })

  it("preserves non-bundled siblings in original order", () => {
    const nodes = [
      dept("sales", null, "Sales"),
      person({ id: "mgr", parentId: "sales", title: "Manager" }),
      person({ id: "ae1", parentId: "sales", title: "Account Executive" }),
      person({ id: "ae2", parentId: "sales", title: "Account Executive" }),
      person({ id: "ae3", parentId: "sales", title: "Account Executive" }),
      person({ id: "ops", parentId: "sales", title: "RevOps" }),
    ]
    const out = bundleSiblings(nodes, { enabled: true })
    const ids = out.map((n) => n.id)
    // Manager comes first, bundle inserted just before its first member,
    // members keep their slot (re-parented under bundle), RevOps last.
    expect(ids).toEqual([
      "sales",
      "mgr",
      "bundle__sales__account-executive",
      "ae1",
      "ae2",
      "ae3",
      "ops",
    ])
  })

  it("ignores siblings without a title", () => {
    const nodes = [
      dept("misc", null, "Misc"),
      person({ id: "a", parentId: "misc", title: null }),
      person({ id: "b", parentId: "misc", title: null }),
      person({ id: "c", parentId: "misc", title: null }),
    ]
    const out = bundleSiblings(nodes, { enabled: true })
    expect(out.find((n) => n.kind === "BUNDLE")).toBeUndefined()
  })

  it("treats titles case-insensitively and ignores whitespace", () => {
    const nodes = [
      dept("sales", null, "Sales"),
      person({ id: "a", parentId: "sales", title: "Account Executive" }),
      person({ id: "b", parentId: "sales", title: "  account executive " }),
      person({ id: "c", parentId: "sales", title: "ACCOUNT EXECUTIVE" }),
    ]
    const out = bundleSiblings(nodes, { enabled: true })
    const bundle = out.find((n) => n.kind === "BUNDLE")
    expect(bundle).toBeDefined()
    expect(bundle?.bundleMemberIds).toHaveLength(3)
  })

  it("bundles multiple independent groups under different parents", () => {
    const nodes = [
      dept("sales", null, "Sales"),
      dept("eng", null, "Eng"),
      person({ id: "ae1", parentId: "sales", title: "AE" }),
      person({ id: "ae2", parentId: "sales", title: "AE" }),
      person({ id: "ae3", parentId: "sales", title: "AE" }),
      person({ id: "be1", parentId: "eng", title: "Backend" }),
      person({ id: "be2", parentId: "eng", title: "Backend" }),
      person({ id: "be3", parentId: "eng", title: "Backend" }),
    ]
    const out = bundleSiblings(nodes, { enabled: true })
    const bundles = out.filter((n) => n.kind === "BUNDLE")
    expect(bundles).toHaveLength(2)
    const parents = bundles.map((b) => b.parentId).sort()
    expect(parents).toEqual(["eng", "sales"])
  })

  it("respects a higher minGroupSize threshold", () => {
    const nodes = [
      dept("sales", null, "Sales"),
      person({ id: "a", parentId: "sales" }),
      person({ id: "b", parentId: "sales" }),
      person({ id: "c", parentId: "sales" }),
      person({ id: "d", parentId: "sales" }),
    ]
    // Threshold 5 means even 4 isn't enough.
    const out = bundleSiblings(nodes, { enabled: true, minGroupSize: 5 })
    expect(out.find((n) => n.kind === "BUNDLE")).toBeUndefined()
    // Threshold 4 → exactly bundle.
    const out2 = bundleSiblings(nodes, { enabled: true, minGroupSize: 4 })
    expect(out2.find((n) => n.kind === "BUNDLE")).toBeDefined()
  })
})
