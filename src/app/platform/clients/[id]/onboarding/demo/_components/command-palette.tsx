"use client"

/**
 * Demo command palette for /platform/clients/[id]/onboarding/demo.
 *
 * Verb-first add/jump/view actions over the in-memory DemoNode graph.
 * Multi-step add flows are handled inside the palette via local state so
 * the parent only has to manage `open` and the final mutation callbacks.
 */

import * as React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowLeftIcon,
  BriefcaseIcon,
  CornerDownLeftIcon,
  EyeIcon,
  EyeOffIcon,
  LayersIcon,
  ShieldAlertIcon,
  TargetIcon,
  UserPlusIcon,
  UserXIcon,
} from "lucide-react"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"

import type { DemoNode, NodeKind, Overlay } from "./types"

interface DemoCommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  nodes: DemoNode[]
  selectedId: string | null
  onAddPerson: (parentId: string, name: string, title: string) => void
  onAddVacancy: (parentId: string, title: string) => void
  onAddContractor: (parentId: string, name: string, title: string) => void
  onMarkInterviewTarget: (nodeId: string) => void
  onFocusNode: (nodeId: string) => void
  onSetOverlay: (overlay: Overlay) => void
}

type FlowKind = "add-person" | "add-vacancy" | "add-contractor"

interface ActiveFlow {
  kind: FlowKind
  parentId: string
  step: 1 | 2
  name: string
  title: string
}

const PERSON_KINDS: NodeKind[] = ["PERSON", "CONTRACTOR", "ADVISOR"]
const ADDABLE_PARENT_KINDS: NodeKind[] = ["ORG", "DEPARTMENT", "PERSON"]
const FLOW_LABEL: Record<FlowKind, string> = {
  "add-person": "Add direct report",
  "add-vacancy": "Add vacancy",
  "add-contractor": "Add contractor",
}

export function DemoCommandPalette(p: DemoCommandPaletteProps): React.ReactElement {
  const {
    open, onOpenChange, nodes, selectedId,
    onAddPerson, onAddVacancy, onAddContractor,
    onMarkInterviewTarget, onFocusNode, onSetOverlay,
  } = p

  const [query, setQuery] = useState("")
  const [flow, setFlow] = useState<ActiveFlow | null>(null)
  const flowInputRef = useRef<HTMLInputElement>(null)

  const selected = useMemo(
    () => (selectedId ? nodes.find((n) => n.id === selectedId) ?? null : null),
    [nodes, selectedId],
  )

  useEffect(() => {
    if (!open) { setQuery(""); setFlow(null) }
  }, [open])

  useEffect(() => {
    if (flow) requestAnimationFrame(() => flowInputRef.current?.focus())
  }, [flow?.step, flow?.kind])

  const close = () => onOpenChange(false)

  function startFlow(kind: FlowKind) {
    if (!selected) return
    setFlow({ kind, parentId: selected.id, step: 1, name: "", title: "" })
  }

  function advanceFlow() {
    if (!flow) return
    if (flow.kind === "add-vacancy") {
      const t = flow.name.trim()
      if (!t) return
      onAddVacancy(flow.parentId, t); close(); return
    }
    if (flow.step === 1) {
      if (!flow.name.trim()) return
      setFlow({ ...flow, step: 2 }); return
    }
    const t = flow.title.trim()
    if (!t) return
    if (flow.kind === "add-person") onAddPerson(flow.parentId, flow.name.trim(), t)
    else onAddContractor(flow.parentId, flow.name.trim(), t)
    close()
  }

  function flowBack() {
    if (!flow) return
    if (flow.step === 2) setFlow({ ...flow, step: 1, title: "" })
    else setFlow(null)
  }

  // ── Active flow render ───────────────────────────────────────────────────

  if (open && flow) {
    const parent = nodes.find((n) => n.id === flow.parentId)
    const isVacancy = flow.kind === "add-vacancy"
    const stepIsName = !isVacancy && flow.step === 1
    const fieldLabel = isVacancy ? "Role title" : stepIsName ? "Full name" : "Job title"
    const fieldValue = isVacancy || stepIsName ? flow.name : flow.title
    const placeholder = isVacancy
      ? "e.g. Head of Data"
      : stepIsName ? "e.g. Priya Raman" : "e.g. Chief Operating Officer"

    const onFieldChange = (next: string) => {
      if (!flow) return
      setFlow(isVacancy || stepIsName ? { ...flow, name: next } : { ...flow, title: next })
    }

    return (
      <CommandDialog open={open} onOpenChange={onOpenChange}>
        <div className="flex flex-col gap-3 border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={flowBack}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-transparent px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
            >
              <ArrowLeftIcon size={12} />
              Back
            </button>
            <span className="flex-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {FLOW_LABEL[flow.kind]} under {parent?.name ?? "—"}
            </span>
            {!isVacancy && (
              <span className="font-mono text-[10px] text-muted-foreground">
                step {flow.step} / 2
              </span>
            )}
          </div>

          <label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {fieldLabel}
          </label>
          <input
            ref={flowInputRef}
            value={fieldValue}
            onChange={(e) => onFieldChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); advanceFlow() }
              else if (e.key === "Escape") { e.preventDefault(); flowBack() }
            }}
            placeholder={placeholder}
            className="border-0 border-b border-border bg-transparent py-2 text-base text-foreground outline-none"
          />
          <div className="flex justify-between text-[10.5px] text-muted-foreground">
            <span><span className="ih-kbd">esc</span> back</span>
            <span><span className="ih-kbd">↵</span> {isVacancy || flow.step === 2 ? "create" : "next"}</span>
          </div>
        </div>
      </CommandDialog>
    )
  }

  // ── Default palette render ───────────────────────────────────────────────

  const canChild = selected !== null && ADDABLE_PARENT_KINDS.includes(selected.kind)
  const personLike = selected !== null && PERSON_KINDS.includes(selected.kind)
  const canMarkTarget = personLike && selected!.interviewStatus === "NOT_TARGET"

  const q = query.trim().toLowerCase()
  const jumps = q.length > 0
    ? nodes.filter((n) => `${n.name} ${n.title ?? ""}`.toLowerCase().includes(q)).slice(0, 8)
    : nodes.slice(0, 6)

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Add someone, focus a node, change overlay…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No matches.</CommandEmpty>

        {selected && canChild && (
          <CommandGroup heading="Quick add">
            <CommandItem value={`add-person-${selected.id}`} onSelect={() => startFlow("add-person")}>
              <UserPlusIcon />
              <span>Add direct report to {selected.name}</span>
              <span className="ml-auto font-mono text-xs text-muted-foreground">↵ ↵</span>
            </CommandItem>
            <CommandItem value={`add-vacancy-${selected.id}`} onSelect={() => startFlow("add-vacancy")}>
              <BriefcaseIcon />
              <span>Add vacancy under {selected.name}</span>
              <span className="ml-auto font-mono text-xs text-muted-foreground">↵</span>
            </CommandItem>
            <CommandItem value={`add-contractor-${selected.id}`} onSelect={() => startFlow("add-contractor")}>
              <UserXIcon />
              <span>Add contractor under {selected.name}</span>
              <span className="ml-auto font-mono text-xs text-muted-foreground">↵ ↵</span>
            </CommandItem>
          </CommandGroup>
        )}

        {canMarkTarget && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Mark / status">
              <CommandItem
                value={`mark-target-${selected!.id}`}
                onSelect={() => { onMarkInterviewTarget(selected!.id); close() }}
              >
                <TargetIcon />
                <span>Mark {selected!.name} as interview target</span>
                <span className="ml-auto font-mono text-xs text-muted-foreground">↵</span>
              </CommandItem>
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Jump to">
          {jumps.map((n) => (
            <CommandItem
              key={n.id}
              value={`jump-${n.id}-${n.name}-${n.title ?? ""}`}
              onSelect={() => { onFocusNode(n.id); close() }}
            >
              <CornerDownLeftIcon />
              <span>{n.name}</span>
              {n.title && (
                <span className="ml-2 truncate text-xs text-muted-foreground">{n.title}</span>
              )}
              <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {n.kind.toLowerCase()}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading="View">
          <CommandItem value="overlay-interview" onSelect={() => { onSetOverlay("INTERVIEW_COVERAGE"); close() }}>
            <EyeIcon /><span>Toggle coverage overlay: interview</span>
          </CommandItem>
          <CommandItem value="overlay-form" onSelect={() => { onSetOverlay("FORM_STATUS"); close() }}>
            <LayersIcon /><span>Toggle coverage overlay: form status</span>
          </CommandItem>
          <CommandItem value="overlay-audit" onSelect={() => { onSetOverlay("AUDIT_CRITICAL"); close() }}>
            <ShieldAlertIcon /><span>Highlight audit-critical</span>
          </CommandItem>
          <CommandItem value="overlay-none" onSelect={() => { onSetOverlay("NONE"); close() }}>
            <EyeOffIcon /><span>Clear overlay</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
