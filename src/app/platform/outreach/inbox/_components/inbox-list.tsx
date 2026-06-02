"use client"

import { useMemo, useState } from "react"
import { api } from "@/lib/trpc/react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

// -------------------------------------------------------------------------
// Types — locally shaped to mirror outreachRouter.listRepliesEnriched output
// -------------------------------------------------------------------------

type ReplyRow = {
  id: string
  contactId: string
  touchId: string | null
  receivedAt: Date | string
  subject: string | null
  body: string | null
  classifiedAs: string | null
  needsReview: boolean
  handled: boolean
  contact: {
    id: string
    fullName: string
    role: string | null
    email: string | null
  }
  company: {
    id: string
    name: string
    domain: string | null
  }
  touch: {
    id: string
    sentAt: Date | string | null
    subjectRendered: string | null
    channel: string
  } | null
}

type ScopeFilter = "needs-review" | "all" | "classified"
type TimeFilter = "today" | "7d" | "30d" | "all"

const SCOPE_OPTIONS: { value: ScopeFilter; label: string }[] = [
  { value: "needs-review", label: "Needs review" },
  { value: "all", label: "All replies" },
  { value: "classified", label: "Classified" },
]

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

function relativeTime(iso: Date | string | null | undefined): string {
  if (!iso) return ""
  const t = typeof iso === "string" ? new Date(iso) : iso
  const diffMs = Date.now() - t.getTime()
  const min = Math.round(diffMs / 60000)
  if (min < 1) return "just now"
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const d = Math.round(hr / 24)
  if (d < 30) return `${d}d ago`
  return t.toLocaleDateString()
}

function htmlToText(input: string | null | undefined): string {
  if (!input) return ""
  // Strip tags + collapse whitespace. Good enough for preview rendering;
  // a richer Gmail-html sanitiser belongs at ingest time.
  return input
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim()
}

function timeFilterToSinceDays(t: TimeFilter): number | undefined {
  if (t === "today") return 1
  if (t === "7d") return 7
  if (t === "30d") return 30
  return undefined
}

// -------------------------------------------------------------------------
// Component
// -------------------------------------------------------------------------

export function InboxList() {
  const utils = api.useUtils()
  const [scope, setScope] = useState<ScopeFilter>("needs-review")
  const [time, setTime] = useState<TimeFilter>("7d")
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [exiting, setExiting] = useState<Set<string>>(new Set())
  const [convertTarget, setConvertTarget] = useState<ReplyRow | null>(null)

  const queryInput = useMemo(() => {
    const base: {
      limit: number
      needsReview?: boolean
      handled?: boolean
      sinceDays?: number
    } = { limit: 100 }
    if (scope === "needs-review") base.needsReview = true
    if (scope === "classified") base.needsReview = false
    const since = timeFilterToSinceDays(time)
    if (since) base.sinceDays = since
    return base
  }, [scope, time])

  const repliesQuery = api.outreach.listRepliesEnriched.useQuery(queryInput)

  const classify = api.outreach.classifyReply.useMutation({
    onMutate: async ({ replyId }) => {
      // Optimistic remove from list — schedule actual removal after the
      // CSS opacity transition completes.
      setExiting((prev) => new Set(prev).add(replyId))
      await utils.outreach.listRepliesEnriched.cancel()
      const prev = utils.outreach.listRepliesEnriched.getData(queryInput)
      utils.outreach.listRepliesEnriched.setData(queryInput, (old) => {
        if (!old) return old
        return {
          ...old,
          rows: old.rows.map((r) =>
            r.id === replyId
              ? { ...r, classifiedAs: "pending", needsReview: false }
              : r,
          ),
        }
      })
      return { prev }
    },
    onError: (_err, { replyId }, ctx) => {
      setExiting((prev) => {
        const next = new Set(prev)
        next.delete(replyId)
        return next
      })
      if (ctx?.prev) {
        utils.outreach.listRepliesEnriched.setData(queryInput, ctx.prev)
      }
    },
    onSettled: () => {
      void utils.outreach.listRepliesEnriched.invalidate()
    },
  })

  const addToDnc = api.outreach.addToDnc.useMutation({
    onSettled: () => {
      void utils.outreach.listRepliesEnriched.invalidate()
    },
  })

  function handleClassify(reply: ReplyRow, value: string) {
    classify.mutate({
      replyId: reply.id,
      classifiedAs: value,
      classifiedBy: "luke",
      confidence: 1,
    })
  }

  function handleUnsubscribe(reply: ReplyRow) {
    if (reply.contact.email) {
      addToDnc.mutate({
        email: reply.contact.email,
        reason: "Recipient unsubscribed via reply triage",
      })
    }
    handleClassify(reply, "negative")
  }

  const rows = (repliesQuery.data?.rows ?? []) as ReplyRow[]
  const visibleRows = rows.filter((r) => !exiting.has(r.id))

  const needsReviewCount =
    scope === "needs-review"
      ? rows.length
      : rows.filter((r) => r.needsReview).length

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className="text-xs font-medium tabular-nums"
          >
            {needsReviewCount} need review
          </Badge>
          {repliesQuery.isFetching && (
            <span className="text-xs text-muted-foreground">Refreshing…</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={scope} onValueChange={(v) => setScope(v as ScopeFilter)}>
            <TabsList>
              {SCOPE_OPTIONS.map((opt) => (
                <TabsTrigger
                  key={opt.value}
                  value={opt.value}
                  className="text-xs"
                >
                  {opt.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Select
            value={time}
            onValueChange={(v) => setTime(v as TimeFilter)}
          >
            <SelectTrigger className="h-9 w-[140px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* List */}
      {repliesQuery.isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Loading replies…
          </CardContent>
        </Card>
      ) : repliesQuery.error ? (
        <Card className="border-destructive/40">
          <CardContent className="py-8 text-sm text-destructive">
            Failed to load replies: {repliesQuery.error.message}
          </CardContent>
        </Card>
      ) : visibleRows.length === 0 ? (
        <EmptyState onSync={() => void repliesQuery.refetch()} />
      ) : (
        <div className="flex flex-col gap-3">
          {visibleRows.map((reply) => (
            <ReplyCard
              key={reply.id}
              reply={reply}
              expanded={expanded.has(reply.id)}
              exiting={exiting.has(reply.id)}
              onToggleExpand={() =>
                setExpanded((prev) => {
                  const next = new Set(prev)
                  if (next.has(reply.id)) next.delete(reply.id)
                  else next.add(reply.id)
                  return next
                })
              }
              onClassify={(v) => handleClassify(reply, v)}
              onUnsubscribe={() => handleUnsubscribe(reply)}
              onConvertToDeal={() => setConvertTarget(reply)}
            />
          ))}
        </div>
      )}

      <ConvertToDealDialog
        reply={convertTarget}
        onClose={() => setConvertTarget(null)}
      />
    </div>
  )
}

// -------------------------------------------------------------------------
// Reply card
// -------------------------------------------------------------------------

const ACTION_BUTTONS: {
  value: string
  label: string
  emoji: string
  variant: "default" | "secondary" | "destructive" | "outline" | "ghost"
}[] = [
  { value: "positive",     label: "Positive",      emoji: "✅", variant: "default" },
  { value: "negative",     label: "Negative",      emoji: "🔴", variant: "outline" },
  { value: "ooo",          label: "OOO",           emoji: "🌴", variant: "outline" },
  { value: "wrong_person", label: "Wrong person",  emoji: "🔁", variant: "outline" },
  { value: "auto_reply",   label: "Auto-reply",    emoji: "🤖", variant: "outline" },
]

function ReplyCard({
  reply,
  expanded,
  exiting,
  onToggleExpand,
  onClassify,
  onUnsubscribe,
  onConvertToDeal,
}: {
  reply: ReplyRow
  expanded: boolean
  exiting: boolean
  onToggleExpand: () => void
  onClassify: (value: string) => void
  onUnsubscribe: () => void
  onConvertToDeal: () => void
}) {
  const bodyText = htmlToText(reply.body)
  const preview = bodyText.slice(0, 200)
  const isLong = bodyText.length > 200
  const isPositive = reply.classifiedAs === "positive"

  return (
    <Card
      className={`overflow-hidden transition-all duration-300 ${
        exiting
          ? "pointer-events-none -translate-x-2 opacity-0"
          : "opacity-100"
      }`}
    >
      <CardContent className="flex flex-col gap-3 p-5">
        {/* Header: sender + meta */}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col">
            <div className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {reply.contact.fullName}
              </span>
              {reply.contact.role && (
                <span> · {reply.contact.role}</span>
              )}
              <span> · {reply.company.name}</span>
              {reply.contact.email && (
                <span className="ml-2 font-mono text-[10px] text-muted-foreground/70">
                  {reply.contact.email}
                </span>
              )}
            </div>
            <div className="mt-1 text-sm font-semibold leading-snug">
              {reply.subject || "(no subject)"}
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            {reply.classifiedAs && (
              <Badge variant="secondary" className="text-[10px]">
                {reply.classifiedAs}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {relativeTime(reply.receivedAt)}
            </span>
          </div>
        </div>

        {/* Body preview */}
        <button
          type="button"
          onClick={onToggleExpand}
          className="text-left text-sm leading-relaxed text-muted-foreground hover:text-foreground"
        >
          {expanded ? bodyText : preview}
          {!expanded && isLong && (
            <span className="text-foreground/70"> … show more</span>
          )}
        </button>

        {/* Touch context */}
        {reply.touch && (
          <div className="text-xs text-muted-foreground/70">
            Reply to{" "}
            <span className="font-mono">
              {reply.touch.channel}
            </span>{" "}
            sent{" "}
            {reply.touch.sentAt
              ? new Date(reply.touch.sentAt).toLocaleDateString()
              : "—"}
            {reply.touch.subjectRendered && (
              <>
                {" "}
                — subject: <em>&ldquo;{reply.touch.subjectRendered}&rdquo;</em>
              </>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {ACTION_BUTTONS.map((a) => (
            <Button
              key={a.value}
              size="sm"
              variant={a.variant}
              className="h-8 text-xs"
              onClick={() => onClassify(a.value)}
            >
              <span className="mr-1.5">{a.emoji}</span>
              {a.label}
            </Button>
          ))}
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={onUnsubscribe}
            disabled={!reply.contact.email}
            title={
              reply.contact.email
                ? "Add to DNC + classify as negative"
                : "No email on contact"
            }
          >
            <span className="mr-1.5">🚫</span>
            Unsubscribe
          </Button>
        </div>

        {/* Convert to deal — only shown after positive classification */}
        {isPositive && (
          <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2">
            <span className="text-xs text-muted-foreground">
              Marked positive. Ready to move into the pipeline?
            </span>
            <Button size="sm" onClick={onConvertToDeal}>
              Convert to deal →
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// -------------------------------------------------------------------------
// Empty state
// -------------------------------------------------------------------------

function EmptyState({ onSync }: { onSync: () => void }) {
  const [syncedAt, setSyncedAt] = useState<Date | null>(null)
  const [syncing, setSyncing] = useState(false)

  async function forceSync() {
    setSyncing(true)
    try {
      // Endpoint is best-effort. If it doesn't exist we still refetch the list.
      await fetch("/api/integrations/gmail/pull-now", { method: "POST" }).catch(
        () => undefined,
      )
    } finally {
      onSync()
      setSyncedAt(new Date())
      setSyncing(false)
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
        <div className="text-3xl">✅</div>
        <div className="text-base font-medium">Inbox zero.</div>
        <div className="text-xs text-muted-foreground">
          {syncedAt
            ? `Last sync: ${relativeTime(syncedAt)}`
            : "Nothing left to triage."}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void forceSync()}
          disabled={syncing}
          className="mt-2"
        >
          {syncing ? "Syncing…" : "Force sync now"}
        </Button>
      </CardContent>
    </Card>
  )
}

// -------------------------------------------------------------------------
// Convert-to-deal dialog
// -------------------------------------------------------------------------

function ConvertToDealDialog({
  reply,
  onClose,
}: {
  reply: ReplyRow | null
  onClose: () => void
}) {
  const utils = api.useUtils()
  const [name, setName] = useState("")
  const [valueEstimate, setValueEstimate] = useState<string>("")

  // Reset state whenever a new reply is targeted.
  const targetId = reply?.id ?? null
  useMemo(() => {
    if (reply) {
      setName(`${reply.company.name} — outreach reply`)
      setValueEstimate("")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId])

  const convert = api.pipeline.convertFromReply.useMutation({
    onSuccess: async () => {
      await utils.outreach.listRepliesEnriched.invalidate()
      onClose()
    },
  })

  if (!reply) {
    return (
      <Dialog open={false} onOpenChange={() => onClose()}>
        <DialogContent />
      </Dialog>
    )
  }

  return (
    <Dialog
      open={true}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convert reply to deal</DialogTitle>
          <DialogDescription>
            Creates a qualified-stage deal linked to{" "}
            <span className="font-medium">{reply.contact.fullName}</span> at{" "}
            <span className="font-medium">{reply.company.name}</span>. The
            originating touch is wired to the deal automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-2">
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground">Deal name</span>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground">
              Value estimate (£, optional)
            </span>
            <Input
              type="number"
              min={0}
              value={valueEstimate}
              onChange={(e) => setValueEstimate(e.target.value)}
              placeholder="e.g. 5000"
            />
          </label>
        </div>

        {convert.error && (
          <div className="text-xs text-destructive">
            {convert.error.message}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={convert.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              const value = valueEstimate.trim()
                ? Number(valueEstimate)
                : null
              convert.mutate({
                replyId: reply.id,
                dealInput: {
                  companyId: reply.company.id,
                  primaryContactId: reply.contact.id,
                  name: name.trim() || `${reply.company.name} — outreach`,
                  stage: "qualified",
                  valueEstimate: value,
                },
              })
            }}
            disabled={convert.isPending || !name.trim()}
          >
            {convert.isPending ? "Creating…" : "Create deal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
