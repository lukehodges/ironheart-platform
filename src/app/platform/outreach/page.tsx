"use client"

import { useState, useMemo, useEffect } from "react"
import { api } from "@/lib/trpc/react"
import type {
  LeadRecord,
  DailyActivityRecord,
  WeeklyHypothesisRecord,
  OutreachLeadOwner,
  OutreachLeadStatus,
  OutreachReplySentiment,
  OutreachHypothesisVerdict,
} from "@/modules/outreach"
import LeadAddModal from "./_components/LeadAddModal"
import LeadBulkImportModal from "./_components/LeadBulkImportModal"
import RowStatusDropdown from "./_components/RowStatusDropdown"
import AddToDncDialog from "./_components/AddToDncDialog"
import SendListModal from "./_components/SendListModal"
import ReplyTriageSection from "./_components/ReplyTriageSection"
import DailyActivityEditModal from "./_components/DailyActivityEditModal"

// ─── Local types ────────────────────────────────────────────────────────────

type Timeframe = "7d" | "14d" | "30d" | "q2" | "ytd" | "all"
type StrategyFilter = "all" | OutreachLeadOwner
type RosterTab = OutreachLeadStatus
type RosterSortCol = "number" | "name" | "company" | "lastContactedAt"
type DaySortCol = "date" | "sent" | "replies" | "positive"
type TopTab = "today" | "funnel" | "leads" | "inbox" | "hypothesis"
const TOP_TABS: readonly TopTab[] = ["today", "funnel", "leads", "inbox", "hypothesis"] as const
const TOP_TAB_LABELS: Record<TopTab, string> = {
  today: "Today",
  funnel: "Funnel",
  leads: "Leads",
  inbox: "Inbox",
  hypothesis: "Hypothesis",
}

interface Toast {
  id: number
  msg: string
  tone?: "ok" | "warn" | "danger"
}

interface Funnel {
  sent: number
  replies: number
  positive: number
  booked: number
  taken: number
  interested: number
  closed: number
  money: number
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const DAY = 86400000
const TODAY = new Date()
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

function fmtDate(s: string | Date | null): string {
  if (!s) return "—"
  const d = typeof s === "string" ? new Date(s) : s
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

function fmtDateLong(s: string | Date | null): string {
  if (!s) return "—"
  const d = typeof s === "string" ? new Date(s) : s
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function rangeFromTF(tf: Timeframe): { start: Date; end: Date } {
  const end = new Date(TODAY)
  let start: Date
  if (tf === "7d") start = new Date(end.getTime() - 6 * DAY)
  else if (tf === "14d") start = new Date(end.getTime() - 13 * DAY)
  else if (tf === "30d") start = new Date(end.getTime() - 29 * DAY)
  else if (tf === "q2") start = new Date(end.getFullYear(), 3, 1)
  else if (tf === "ytd") start = new Date(end.getFullYear(), 0, 1)
  else start = new Date(2019, 0, 1)
  return { start, end }
}

function tfLabel(tf: Timeframe): string {
  return { "7d": "last 7 days", "14d": "last 14 days", "30d": "last 30 days", q2: "this Q2", ytd: "year to date", all: "all time" }[tf]
}

function pct(n: number, d: number): number {
  return d > 0 ? (100 * n) / d : 0
}

function pctStr(n: number, d: number): string {
  return d > 0 ? `${((100 * n) / d).toFixed(1)}%` : "—"
}

function sumFunnel(rows: DailyActivityRecord[]): Funnel {
  return rows.reduce<Funnel>(
    (acc, r) => ({
      sent: acc.sent + r.sent,
      replies: acc.replies + r.replies,
      positive: acc.positive + r.positive,
      booked: acc.booked + r.meetingsBooked,
      taken: acc.taken + r.meetingsTaken,
      interested: acc.interested + r.interested,
      closed: acc.closed + r.closed,
      money: acc.money + Number(r.newUpfront) + Number(r.newRetainer),
    }),
    { sent: 0, replies: 0, positive: 0, booked: 0, taken: 0, interested: 0, closed: 0, money: 0 },
  )
}

function isoWeek(d: Date): string {
  const target = new Date(d.valueOf())
  const dayNr = (d.getDay() + 6) % 7
  target.setDate(target.getDate() - dayNr + 3)
  const firstThursday = target.valueOf()
  target.setMonth(0, 1)
  if (target.getDay() !== 4) target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7)
  const week = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000)
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`
}

// ─── CSS (scoped to this page) ──────────────────────────────────────────────

const OBSERVATORY_CSS = `
.obs *{box-sizing:border-box}
.obs{--obs-bg:#FAFAF7;--obs-surface:#FFFFFF;--obs-surface-2:#F4F2EC;--obs-surface-3:#EDEAE0;--obs-ink:#0E1013;--obs-ink-65:rgba(14,16,19,0.65);--obs-ink-50:rgba(14,16,19,0.50);--obs-ink-40:rgba(14,16,19,0.40);--obs-ink-30:rgba(14,16,19,0.30);--obs-line:rgba(14,16,19,0.08);--obs-line-2:rgba(14,16,19,0.14);--obs-accent:#D13A1F;--obs-accent-soft:rgba(209,58,31,0.10);--obs-ok:#2F6F5C;--obs-ok-soft:rgba(47,111,92,0.10);--obs-warn:#B8860B;--obs-warn-soft:rgba(184,134,11,0.12);--obs-info:#2A5DBF;--obs-info-soft:rgba(42,93,191,0.10);--obs-danger:#C0392B;--obs-danger-soft:rgba(192,57,43,0.10);--obs-serif:"Instrument Serif",Georgia,serif;--obs-mono:"JetBrains Mono",ui-monospace,monospace;color:var(--obs-ink);font-size:13.5px;line-height:1.5;background:var(--obs-bg);min-height:100%}
.obs .serif{font-family:var(--obs-serif);font-weight:400;letter-spacing:-0.005em}
.obs .italic-red{font-family:var(--obs-serif);font-style:italic;color:var(--obs-accent)}
.obs .mono{font-family:var(--obs-mono)}
.obs .eyebrow{font-family:var(--obs-mono);font-size:9.5px;letter-spacing:0.16em;text-transform:uppercase;color:var(--obs-ink-50);font-weight:500}
.obs .topbar{display:flex;align-items:center;gap:14px;padding:12px 28px;background:var(--obs-surface);border-bottom:1px solid var(--obs-line);position:sticky;top:0;z-index:50;flex-wrap:wrap}
.obs .crumb{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--obs-ink-50)}
.obs .crumb b{color:var(--obs-ink);font-weight:500}
.obs .topbar .spacer{flex:1}
.obs .seg{display:inline-flex;background:var(--obs-surface-2);border:1px solid var(--obs-line);border-radius:7px;padding:2px;font-size:11.5px;font-family:var(--obs-mono)}
.obs .seg button{background:none;border:0;padding:5px 10px;color:var(--obs-ink-65);border-radius:5px;cursor:pointer;font-family:inherit;font-size:inherit}
.obs .seg button.on{background:var(--obs-surface);box-shadow:0 1px 1px rgba(14,16,19,0.04);color:var(--obs-ink)}
.obs .seg button:hover:not(.on){color:var(--obs-ink)}
.obs .pill-pick{display:inline-flex;align-items:center;gap:6px;background:var(--obs-surface-2);border:1px solid var(--obs-line);border-radius:999px;padding:5px 10px 5px 12px;font-size:11.5px;color:var(--obs-ink);cursor:pointer;position:relative}
.obs .pill-pick:hover{border-color:var(--obs-ink-30)}
.obs .pill-pick .lab{font-family:var(--obs-mono);font-size:9.5px;letter-spacing:0.1em;text-transform:uppercase;color:var(--obs-ink-50)}
.obs .pill-pick .arr{color:var(--obs-ink-40);font-size:10px}
.obs .pill-menu{position:absolute;top:calc(100% + 6px);left:0;background:var(--obs-surface);border:1px solid var(--obs-line);border-radius:9px;box-shadow:0 12px 40px rgba(14,16,19,0.10);padding:4px;min-width:160px;z-index:60}
.obs .pill-menu button{display:block;width:100%;text-align:left;padding:7px 12px;font-size:12px;color:var(--obs-ink);background:none;border:0;border-radius:6px;cursor:pointer}
.obs .pill-menu button:hover{background:var(--obs-surface-2)}
.obs .pill-menu button.on{background:var(--obs-accent-soft);color:var(--obs-accent)}
.obs .btn{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--obs-line-2);background:var(--obs-surface);color:var(--obs-ink);font-size:12px;padding:6px 12px;border-radius:7px;cursor:pointer;font-weight:500}
.obs .btn:hover{border-color:var(--obs-ink-30)}
.obs .btn-primary{background:var(--obs-accent);border-color:var(--obs-accent);color:#fff}
.obs .btn-primary:hover{background:#b22f17}
.obs .btn-ghost{background:transparent;border-color:transparent;color:var(--obs-ink-65)}
.obs .btn-ghost:hover{background:var(--obs-surface-2);color:var(--obs-ink)}
.obs .page{padding:22px 28px 80px;max-width:1480px;margin:0 auto}
.obs .h1{font-family:var(--obs-serif);font-size:34px;line-height:1.02;letter-spacing:-0.01em;margin:2px 0 4px}
.obs .toptabs{display:flex;align-items:center;gap:0;margin:18px 0 6px;border-bottom:1px solid var(--obs-line);flex-wrap:wrap}
.obs .toptabs button{background:none;border:0;font-size:13px;padding:11px 18px;color:var(--obs-ink-50);cursor:pointer;position:relative;font-weight:500;font-family:inherit;letter-spacing:-0.005em}
.obs .toptabs button:hover:not(.on){color:var(--obs-ink)}
.obs .toptabs button.on{color:var(--obs-ink)}
.obs .toptabs button.on::after{content:"";position:absolute;left:18px;right:18px;bottom:-1px;height:2px;background:var(--obs-accent)}
.obs .toptabs .ct{font-family:var(--obs-mono);font-size:10px;color:var(--obs-ink-40);margin-left:6px}
.obs .toptabs button.on .ct{color:var(--obs-accent)}
.obs .today-stub{background:var(--obs-surface);border:1px dashed var(--obs-line-2);border-radius:12px;padding:36px 28px;margin:18px 0;text-align:center;color:var(--obs-ink-50)}
.obs .today-stub h4{font-family:var(--obs-serif);font-size:22px;color:var(--obs-ink);margin-bottom:6px;font-weight:400}
.obs .today-stub p{font-size:13px;line-height:1.55;max-width:520px;margin:0 auto}
.obs .hypo{background:var(--obs-surface);border:1px solid var(--obs-line);border-radius:14px;overflow:hidden;margin:14px 0 22px;box-shadow:0 1px 2px rgba(14,16,19,0.03)}
.obs .hypo .strip{background:linear-gradient(90deg,var(--obs-accent-soft) 0%,transparent 100%);padding:14px 22px;display:flex;align-items:center;gap:14px;border-bottom:1px solid var(--obs-line)}
.obs .hypo .week-tag{font-family:var(--obs-mono);font-size:10.5px;letter-spacing:0.14em;text-transform:uppercase;color:var(--obs-accent);background:var(--obs-surface);padding:4px 9px;border-radius:5px;border:1px solid var(--obs-line)}
.obs .hypo .label{font-family:var(--obs-mono);font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:var(--obs-ink-50)}
.obs .hypo .days-left{font-family:var(--obs-mono);font-size:11.5px;color:var(--obs-ink-65);margin-left:auto;display:flex;align-items:center;gap:6px}
.obs .hypo .days-left b{color:var(--obs-accent);font-weight:600}
.obs .hypo .body{display:grid;grid-template-columns:1.3fr 1fr;gap:0}
.obs .hypo .left{padding:18px 22px;border-right:1px solid var(--obs-line)}
.obs .hypo .right{padding:18px 22px;background:var(--obs-surface-2)}
.obs .hypo h2{font-family:var(--obs-serif);font-size:22px;line-height:1.18;margin-bottom:8px}
.obs .hypo .quote{color:var(--obs-ink-65);font-size:13px;line-height:1.55;margin-bottom:14px}
.obs .hypo .meta-row{display:flex;gap:18px;font-size:11.5px;color:var(--obs-ink-50);font-family:var(--obs-mono);flex-wrap:wrap}
.obs .hypo .meta-row b{color:var(--obs-ink);font-weight:500}
.obs .targets{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.obs .target{background:var(--obs-surface);border:1px solid var(--obs-line);border-radius:9px;padding:11px 13px}
.obs .target .lab{font-family:var(--obs-mono);font-size:9.5px;letter-spacing:0.12em;text-transform:uppercase;color:var(--obs-ink-50);margin-bottom:4px}
.obs .target .actual{font-family:var(--obs-serif);font-size:24px;line-height:1}
.obs .target .actual small{font-size:13px;color:var(--obs-ink-40);font-family:var(--obs-mono);margin-left:6px}
.obs .target .vs{margin-top:4px;display:flex;align-items:baseline;gap:6px;font-size:11px;color:var(--obs-ink-50);font-family:var(--obs-mono)}
.obs .delta-down{color:var(--obs-danger);font-weight:600}
.obs .delta-up{color:var(--obs-ok);font-weight:600}
.obs .delta-flat{color:var(--obs-ink-50);font-weight:600}
.obs .target .bar{margin-top:8px;height:5px;background:var(--obs-surface-3);border-radius:3px;overflow:hidden;position:relative}
.obs .target .bar i{display:block;height:100%;background:var(--obs-accent);border-radius:3px}
.obs .target .bar i.ok{background:var(--obs-ok)}
.obs .prev-week{margin-top:14px;background:var(--obs-surface);border:1px dashed var(--obs-line-2);border-radius:9px;padding:11px 13px;cursor:pointer}
.obs .prev-week .head{display:flex;align-items:center;gap:8px;margin-bottom:6px}
.obs .prev-week .head .tag{font-family:var(--obs-mono);font-size:9.5px;letter-spacing:0.12em;text-transform:uppercase;color:var(--obs-ink-50);background:var(--obs-surface-2);padding:2px 7px;border-radius:4px}
.obs .prev-week .vsrow{display:flex;gap:18px;font-size:11.5px;color:var(--obs-ink-65);font-family:var(--obs-mono);flex-wrap:wrap}
.obs .prev-week .vsrow b{color:var(--obs-ink);font-weight:500}
.obs .section{margin:24px 0 14px;display:flex;align-items:baseline;justify-content:space-between;gap:12px}
.obs .section h3{font-family:var(--obs-serif);font-size:22px;letter-spacing:-0.01em;font-weight:400}
.obs .section .sub{font-family:var(--obs-mono);font-size:10.5px;color:var(--obs-ink-40)}
.obs .funnel{display:grid;grid-template-columns:repeat(8,1fr);gap:8px}
.obs .fcard{background:var(--obs-surface);border:1px solid var(--obs-line);border-radius:11px;padding:13px;position:relative;display:flex;flex-direction:column;min-height:112px;cursor:pointer}
.obs .fcard:hover{border-color:var(--obs-ink-30)}
.obs .fcard .lab{font-family:var(--obs-mono);font-size:9.5px;letter-spacing:0.12em;text-transform:uppercase;color:var(--obs-ink-50)}
.obs .fcard .n{font-family:var(--obs-serif);font-size:34px;line-height:1;margin-top:5px}
.obs .fcard .conv{font-family:var(--obs-mono);font-size:10.5px;color:var(--obs-ink-50);margin-top:3px}
.obs .fcard .delta-row{margin-top:auto;display:flex;align-items:center;gap:5px;font-family:var(--obs-mono);font-size:10px;color:var(--obs-ink-50);padding-top:8px;border-top:1px dashed var(--obs-line)}
.obs .fcard .src{font-family:var(--obs-mono);font-size:8.5px;letter-spacing:0.05em;text-transform:uppercase;color:var(--obs-ink-30);position:absolute;top:11px;right:12px}
.obs .fcard.accent{background:var(--obs-accent);border-color:var(--obs-accent);color:#FAFAF7}
.obs .fcard.accent .lab,.obs .fcard.accent .conv,.obs .fcard.accent .delta-row,.obs .fcard.accent .src{color:rgba(250,250,247,0.75)}
.obs .fcard.accent .delta-row{border-top-color:rgba(250,250,247,0.25)}
.obs .fcard.money{background:var(--obs-ink);color:#FAFAF7;border-color:var(--obs-ink)}
.obs .fcard.money .lab,.obs .fcard.money .conv,.obs .fcard.money .delta-row,.obs .fcard.money .src{color:rgba(250,250,247,0.6)}
.obs .fcard.money .delta-row{border-top-color:rgba(250,250,247,0.18)}
.obs .duo{display:grid;grid-template-columns:1.55fr 1fr;gap:18px;margin-top:22px;align-items:start}
.obs .card{background:var(--obs-surface);border:1px solid var(--obs-line);border-radius:12px;overflow:hidden}
.obs .card .head{padding:13px 18px;border-bottom:1px solid var(--obs-line);display:flex;align-items:center;justify-content:space-between;gap:12px}
.obs .card .head h4{font-family:var(--obs-serif);font-size:18px;font-weight:400}
.obs .card .head .sub{font-family:var(--obs-mono);font-size:10.5px;color:var(--obs-ink-40);margin-top:1px}
.obs .card .filters{padding:9px 18px;border-bottom:1px solid var(--obs-line);background:var(--obs-surface-2);display:flex;align-items:center;gap:8px;font-size:11.5px;flex-wrap:wrap}
.obs .tbl-wrap{overflow-x:auto;max-height:520px;overflow-y:auto}
.obs table{width:100%;border-collapse:collapse;font-size:12px}
.obs thead th{background:var(--obs-surface-2);font-family:var(--obs-mono);font-size:9.5px;letter-spacing:0.1em;text-transform:uppercase;color:var(--obs-ink-50);font-weight:500;text-align:left;padding:8px 10px;border-bottom:1px solid var(--obs-line);position:sticky;top:0;z-index:2;white-space:nowrap}
.obs thead th.r{text-align:right}
.obs thead th.sortable{cursor:pointer;user-select:none}
.obs thead th.sortable:hover{color:var(--obs-ink)}
.obs thead th.sortable.active{color:var(--obs-accent)}
.obs tbody td{padding:9px 10px;border-bottom:1px solid var(--obs-line);font-size:12px;vertical-align:middle;white-space:nowrap}
.obs tbody td.r{text-align:right;font-family:var(--obs-mono);font-size:11.5px}
.obs tbody tr:hover{background:var(--obs-surface-2)}
.obs tbody tr.clickable{cursor:pointer}
.obs tbody tr.foot td{background:var(--obs-surface-3);font-weight:600;border-top:2px solid var(--obs-line-2);border-bottom:0}
.obs tbody tr.foot td.r{font-family:var(--obs-mono);font-size:12px}
.obs tbody tr.empty td{text-align:center;color:var(--obs-ink-40);padding:24px 10px;font-style:italic;font-family:var(--obs-serif);font-size:14px}
.obs .owner-chip{display:inline-flex;align-items:center;gap:5px;font-family:var(--obs-mono);font-size:10px;padding:2px 7px;border-radius:4px;background:var(--obs-surface-2);color:var(--obs-ink-65)}
.obs .owner-chip.luke{background:rgba(42,93,191,0.10);color:var(--obs-info)}
.obs .owner-chip.alex{background:rgba(184,134,11,0.12);color:var(--obs-warn)}
.obs .rate-bar{display:inline-flex;align-items:center;gap:6px;font-family:var(--obs-mono);font-size:11.5px}
.obs .rate-bar .pip{width:34px;height:5px;background:var(--obs-surface-3);border-radius:3px;overflow:hidden}
.obs .rate-bar .pip i{display:block;height:100%;background:var(--obs-ok);border-radius:3px}
.obs .rate-bar .pip i.warn{background:var(--obs-warn)}
.obs .rate-bar .pip i.danger{background:var(--obs-danger)}
.obs .rate-bar .pip i.flat{background:var(--obs-ink-30)}
.obs .dash{color:var(--obs-ink-30)}
.obs .hlog .row{padding:14px 18px;border-bottom:1px solid var(--obs-line);position:relative;cursor:pointer}
.obs .hlog .row:hover{background:var(--obs-surface-2)}
.obs .hlog .row.live{background:linear-gradient(90deg,var(--obs-accent-soft) 0%,transparent 60%)}
.obs .hlog .row .toprow{display:flex;align-items:center;gap:8px;margin-bottom:6px}
.obs .hlog .wtag{font-family:var(--obs-mono);font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:var(--obs-ink-50);background:var(--obs-surface-2);padding:2px 7px;border-radius:4px}
.obs .hlog .wtag.live{background:var(--obs-accent);color:#fff}
.obs .hlog .verdict{margin-left:auto;font-family:var(--obs-mono);font-size:9.5px;letter-spacing:0.12em;text-transform:uppercase;padding:2px 7px;border-radius:4px}
.obs .verdict-keep{background:var(--obs-ok-soft);color:var(--obs-ok)}
.obs .verdict-kill{background:var(--obs-danger-soft);color:var(--obs-danger)}
.obs .verdict-mutate{background:var(--obs-warn-soft);color:var(--obs-warn)}
.obs .verdict-pending,.obs .verdict-testing{background:var(--obs-surface-3);color:var(--obs-ink-50)}
.obs .verdict-baseline{background:var(--obs-info-soft);color:var(--obs-info)}
.obs .hlog .h{font-family:var(--obs-serif);font-size:16px;line-height:1.3;margin-bottom:6px}
.obs .hlog .metrics{display:flex;gap:12px;font-family:var(--obs-mono);font-size:11px;color:var(--obs-ink-65);flex-wrap:wrap}
.obs .hlog .metrics b{color:var(--obs-ink);font-weight:500}
.obs .integrations{display:grid;grid-template-columns:1fr 1fr;gap:9px;padding:14px 18px}
.obs .intg{background:var(--obs-surface-2);border:1px solid var(--obs-line);border-radius:9px;padding:11px 13px;display:flex;flex-direction:column;gap:4px;position:relative}
.obs .intg .src{font-family:var(--obs-mono);font-size:9.5px;letter-spacing:0.1em;text-transform:uppercase;color:var(--obs-ink-50)}
.obs .intg .desc{font-size:12px;color:var(--obs-ink)}
.obs .intg .meta{font-family:var(--obs-mono);font-size:10.5px;color:var(--obs-ink-50);margin-top:2px}
.obs .intg .dot{position:absolute;top:11px;right:11px;width:7px;height:7px;border-radius:50%}
.obs .intg .dot.ok{background:var(--obs-ok);box-shadow:0 0 0 3px var(--obs-ok-soft)}
.obs .intg .dot.warn{background:var(--obs-warn);box-shadow:0 0 0 3px var(--obs-warn-soft)}
.obs .roster .tabs{display:flex;align-items:center;gap:0;padding:6px 14px;border-bottom:1px solid var(--obs-line);background:var(--obs-surface-2);flex-wrap:wrap}
.obs .roster .tabs button{background:none;border:0;font-size:12px;padding:9px 13px;color:var(--obs-ink-65);cursor:pointer;position:relative;font-weight:500}
.obs .roster .tabs button.on{color:var(--obs-ink)}
.obs .roster .tabs button.on::after{content:"";position:absolute;left:13px;right:13px;bottom:-1px;height:2px;background:var(--obs-accent)}
.obs .roster .tabs button .ct{font-family:var(--obs-mono);font-size:10px;color:var(--obs-ink-40);margin-left:5px}
.obs .roster .tabs button.on .ct{color:var(--obs-accent)}
.obs .roster .tabs .total{margin-left:auto;font-family:var(--obs-mono);font-size:10px;color:var(--obs-ink-40);padding-right:8px}
.obs .roster .search-row{padding:10px 18px;border-bottom:1px solid var(--obs-line);background:var(--obs-surface);display:flex;align-items:center;gap:9px;flex-wrap:wrap}
.obs .roster input[type=text]{flex:1;min-width:200px;border:1px solid var(--obs-line);background:var(--obs-surface-2);padding:7px 11px;border-radius:7px;font-size:12px;color:var(--obs-ink);outline:none}
.obs .roster input[type=text]:focus{border-color:var(--obs-accent)}
.obs .status-pill{display:inline-flex;align-items:center;gap:5px;font-family:var(--obs-mono);font-size:10px;letter-spacing:0.06em;text-transform:uppercase;padding:3px 8px;border-radius:999px;border:1px solid var(--obs-line);background:var(--obs-surface-2);color:var(--obs-ink-65)}
.obs .status-pill .dot{width:6px;height:6px;border-radius:50%;background:var(--obs-ink-30)}
.obs .status-pill.sent{background:var(--obs-ok-soft);color:var(--obs-ok);border-color:transparent}
.obs .status-pill.sent .dot{background:var(--obs-ok)}
.obs .status-pill.ready{background:var(--obs-accent-soft);color:var(--obs-accent);border-color:transparent}
.obs .status-pill.ready .dot{background:var(--obs-accent)}
.obs .status-pill.draft{background:var(--obs-warn-soft);color:var(--obs-warn);border-color:transparent}
.obs .status-pill.draft .dot{background:var(--obs-warn)}
.obs .status-pill.skipped{background:var(--obs-surface-3);color:var(--obs-ink-65);border-color:transparent}
.obs .status-pill.skipped .dot{background:var(--obs-ink-40)}
.obs .status-pill.dnc{background:var(--obs-danger-soft);color:var(--obs-danger);border-color:transparent}
.obs .status-pill.dnc .dot{background:var(--obs-danger)}
.obs .star-flag{color:var(--obs-warn);font-size:12px;cursor:pointer}
.obs .star-flag.off{color:var(--obs-ink-30)}
.obs .check{color:var(--obs-ok);font-weight:600;font-family:var(--obs-mono);font-size:13px}
.obs .x{color:var(--obs-ink-30);font-family:var(--obs-mono);font-size:13px}
.obs .sentiment-chip{display:inline-flex;align-items:center;gap:4px;font-family:var(--obs-mono);font-size:9.5px;letter-spacing:0.06em;text-transform:uppercase;padding:2px 7px;border-radius:4px}
.obs .sentiment-chip.positive{background:var(--obs-ok-soft);color:var(--obs-ok)}
.obs .sentiment-chip.negative{background:var(--obs-danger-soft);color:var(--obs-danger)}
.obs .sentiment-chip.neutral{background:var(--obs-surface-3);color:var(--obs-ink-65)}
.obs .source-tag{font-family:var(--obs-mono);font-size:9.5px;color:var(--obs-ink-40);background:var(--obs-surface-2);padding:1px 6px;border-radius:3px}
.obs .pager{display:flex;align-items:center;justify-content:space-between;padding:10px 18px;border-top:1px solid var(--obs-line);background:var(--obs-surface-2);font-family:var(--obs-mono);font-size:11px;color:var(--obs-ink-65);flex-wrap:wrap;gap:8px}
.obs .pager .ctrl{display:flex;gap:6px;align-items:center}
.obs .pager .ctrl button:disabled{opacity:0.4;cursor:not-allowed}
.obs .modal-bg{position:fixed;inset:0;background:rgba(14,16,19,0.45);display:flex;align-items:center;justify-content:center;z-index:200;padding:20px}
.obs .modal{background:var(--obs-surface);border-radius:14px;width:min(640px,100%);max-height:90vh;overflow:auto;box-shadow:0 24px 64px rgba(14,16,19,0.25)}
.obs .modal .mhead{padding:18px 22px;border-bottom:1px solid var(--obs-line);display:flex;align-items:center;justify-content:space-between}
.obs .modal .mhead h3{font-family:var(--obs-serif);font-size:22px;font-weight:400}
.obs .modal .mhead .close{background:none;border:0;font-size:18px;color:var(--obs-ink-50);cursor:pointer;padding:4px 8px;border-radius:5px}
.obs .modal .mbody{padding:20px 22px}
.obs .modal .mbody label{display:block;font-family:var(--obs-mono);font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:var(--obs-ink-50);margin:14px 0 6px;font-weight:500}
.obs .modal .mbody label:first-child{margin-top:0}
.obs .modal .mbody input,.obs .modal .mbody select,.obs .modal .mbody textarea{width:100%;border:1px solid var(--obs-line);background:var(--obs-surface-2);padding:9px 12px;border-radius:7px;font-size:13px;color:var(--obs-ink);outline:none;font-family:inherit}
.obs .modal .mbody input:focus,.obs .modal .mbody select:focus,.obs .modal .mbody textarea:focus{border-color:var(--obs-accent)}
.obs .modal .mbody textarea{min-height:80px;resize:vertical;line-height:1.5}
.obs .modal .mbody .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.obs .modal .mfoot{padding:14px 22px;border-top:1px solid var(--obs-line);display:flex;justify-content:flex-end;gap:8px;background:var(--obs-surface-2)}
.obs .toast-wrap{position:fixed;bottom:24px;right:24px;display:flex;flex-direction:column;gap:8px;z-index:300;max-width:360px}
.obs .toast{background:var(--obs-ink);color:#FAFAF7;padding:11px 16px;border-radius:9px;font-size:12.5px;box-shadow:0 12px 32px rgba(14,16,19,0.25)}
.obs .toast.ok{background:var(--obs-ok)}
.obs .toast.warn{background:var(--obs-warn)}
.obs .toast.danger{background:var(--obs-danger)}
.obs .drawer-bg{position:fixed;inset:0;background:rgba(14,16,19,0.35);z-index:150}
.obs .drawer{position:fixed;top:0;right:0;bottom:0;width:min(540px,100%);background:var(--obs-surface);z-index:160;display:flex;flex-direction:column;box-shadow:-12px 0 32px rgba(14,16,19,0.20)}
.obs .drawer .dhead{padding:18px 22px;border-bottom:1px solid var(--obs-line);display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.obs .drawer .dhead h3{font-family:var(--obs-serif);font-size:22px;font-weight:400;margin-bottom:4px}
.obs .drawer .dhead p{font-family:var(--obs-mono);font-size:11.5px;color:var(--obs-ink-50)}
.obs .drawer .dbody{padding:18px 22px;overflow-y:auto;flex:1}
.obs .drawer .dbody section{margin-bottom:18px}
.obs .drawer .dbody h4{font-family:var(--obs-mono);font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:var(--obs-ink-50);margin-bottom:6px;font-weight:500}
.obs .drawer .dbody .field{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--obs-line);font-size:12.5px}
.obs .drawer .dbody .field span:first-child{color:var(--obs-ink-65);font-family:var(--obs-mono);font-size:11px}
.obs .drawer .dbody .field span:last-child{font-weight:500}
.obs .drawer .dbody .notes{background:var(--obs-surface-2);border-radius:8px;padding:12px 14px;font-size:12.5px;line-height:1.55;color:var(--obs-ink);white-space:pre-line}
.obs .drawer .dfoot{padding:14px 22px;border-top:1px solid var(--obs-line);display:flex;gap:8px;background:var(--obs-surface-2);justify-content:flex-end}
@media(max-width:1280px){.obs .funnel{grid-template-columns:repeat(4,1fr)}.obs .duo{grid-template-columns:1fr}}
`

// ─── Sub-components ─────────────────────────────────────────────────────────

function HypothesisBanner({
  hypothesis,
  liveSum,
  prev,
  prevSum,
  onOpenPrev,
}: {
  hypothesis: WeeklyHypothesisRecord
  liveSum: Funnel
  prev: WeeklyHypothesisRecord | null
  prevSum: Funnel
  onOpenPrev: () => void
}) {
  const targetSample = hypothesis.targetSample
  const targetReply = Number(hypothesis.targetReplyPct)
  const targetPositive = Number(hypothesis.targetPositivePct)
  const replyPct = pct(liveSum.replies, liveSum.sent)
  const posPct = pct(liveSum.positive, liveSum.sent)
  const prevReplyPct = pct(prevSum.replies, prevSum.sent)
  const prevPosPct = pct(prevSum.positive, prevSum.sent)
  const sentPctOfTarget = Math.min(100, Math.round((100 * liveSum.sent) / Math.max(1, targetSample)))
  const replyPctOfTarget = Math.min(100, Math.round((100 * replyPct) / Math.max(0.1, targetReply)))
  const posPctOfTarget = Math.min(100, Math.round((100 * posPct) / Math.max(0.1, targetPositive)))
  const endMs = new Date(hypothesis.endDate).getTime()
  const daysLeft = Math.max(0, Math.ceil((endMs - TODAY.getTime()) / DAY))

  const deltaSign = (a: number, t: number) => {
    const d = a - t
    if (Math.abs(d) < 0.1) return "— flat"
    return `${d > 0 ? "▲" : "▼"} ${Math.abs(d).toFixed(1)}pp`
  }
  const deltaClass = (a: number, t: number) => (a >= t ? "delta-up" : a < t * 0.85 ? "delta-down" : "delta-flat")

  return (
    <div className="hypo">
      <div className="strip">
        <span className="week-tag">{hypothesis.week} · {fmtDate(hypothesis.startDate)} → {fmtDate(hypothesis.endDate)}</span>
        <span className="label">Active hypothesis</span>
        <span className="days-left">
          <span>Ends Sun · </span>
          <b>{daysLeft === 0 ? "today" : daysLeft + (daysLeft === 1 ? " day left" : " days left")}</b>
        </span>
      </div>
      <div className="body">
        <div className="left">
          <h2>{hypothesis.title}</h2>
          <p className="quote">{hypothesis.body}</p>
          <div className="meta-row">
            <span>Owner: <b>Luke + Alex</b></span>
            <span>Sample: <b>{targetSample} sends</b></span>
            {hypothesis.replaces && <span>Replaces: <b>{hypothesis.replaces}</b></span>}
          </div>
        </div>
        <div className="right">
          <div className="targets">
            <div className="target">
              <div className="lab">Sent</div>
              <div className="actual">{liveSum.sent}<small>/ {targetSample}</small></div>
              <div className="vs">
                <span>target {targetSample}</span>
                <span className={liveSum.sent >= targetSample ? "delta-up" : sentPctOfTarget > 70 ? "delta-flat" : "delta-down"}>
                  {liveSum.sent >= targetSample ? "on target" : sentPctOfTarget > 70 ? "on pace" : "behind"}
                </span>
              </div>
              <div className="bar"><i className={liveSum.sent >= targetSample ? "ok" : ""} style={{ width: `${sentPctOfTarget}%` }} /></div>
            </div>
            <div className="target">
              <div className="lab">Reply %</div>
              <div className="actual">{replyPct.toFixed(1)}%</div>
              <div className="vs">
                <span>target {targetReply}%</span>
                <span className={deltaClass(replyPct, targetReply)}>{deltaSign(replyPct, targetReply)}</span>
              </div>
              <div className="bar"><i className={replyPct >= targetReply ? "ok" : ""} style={{ width: `${replyPctOfTarget}%` }} /></div>
            </div>
            <div className="target">
              <div className="lab">Positive %</div>
              <div className="actual">{posPct.toFixed(1)}%</div>
              <div className="vs">
                <span>target {targetPositive}%</span>
                <span className={deltaClass(posPct, targetPositive)}>{deltaSign(posPct, targetPositive)}</span>
              </div>
              <div className="bar"><i className={posPct >= targetPositive ? "ok" : ""} style={{ width: `${posPctOfTarget}%` }} /></div>
            </div>
          </div>
          {prev && (
            <div className="prev-week" onClick={onOpenPrev}>
              <div className="head">
                <span className="tag">vs {prev.week}</span>
                <span style={{ fontFamily: "var(--obs-serif)", fontSize: 14, color: "var(--obs-ink-65)" }}>{prev.title}</span>
              </div>
              <div className="vsrow">
                <span>Sent <b>{prevSum.sent}</b></span>
                <span>Reply <b>{prevReplyPct.toFixed(1)}%</b> <span className={replyPct >= prevReplyPct ? "delta-up" : "delta-down"}>{replyPct >= prevReplyPct ? "▲" : "▼"}</span></span>
                <span>Positive <b>{prevPosPct.toFixed(1)}%</b> <span className={posPct >= prevPosPct ? "delta-up" : "delta-down"}>{posPct >= prevPosPct ? "▲" : "▼"}</span></span>
                <span>Booked <b>{prevSum.booked}</b></span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function FunnelCards({ s, prev }: { s: Funnel; prev: Funnel }) {
  const delta = (cur: number, prev: number) => {
    if (prev === 0 && cur === 0) return { txt: "— flat", cls: "delta-flat" }
    if (prev === 0) return { txt: `▲ +${cur}`, cls: "delta-up" }
    const d = cur - prev
    if (d === 0) return { txt: "— flat", cls: "delta-flat" }
    return { txt: `${d > 0 ? "▲" : "▼"} ${d > 0 ? "+" : ""}${d}`, cls: d > 0 ? "delta-up" : "delta-down" }
  }
  const dSent = delta(s.sent, prev.sent)
  const dBk = delta(s.booked, prev.booked)
  const dTk = delta(s.taken, prev.taken)
  const dInt = delta(s.interested, prev.interested)
  const replyDelta = pct(s.replies, s.sent) - 11
  const posDelta = pct(s.positive, s.sent) - 4

  return (
    <div className="funnel">
      <div className="fcard accent">
        <div className="src">DB</div>
        <div className="lab">⤴ Outreach sent</div>
        <div className="n">{s.sent}</div>
        <div className="conv">{s.sent} prospects emailed</div>
        <div className="delta-row"><span className={dSent.cls}>{dSent.txt}</span><span>vs prev period</span></div>
      </div>
      <div className="fcard">
        <div className="src">DB</div>
        <div className="lab">↩ Replied</div>
        <div className="n">{s.replies}</div>
        <div className="conv">{pctStr(s.replies, s.sent)} of sent</div>
        <div className="delta-row"><span className={replyDelta >= 0 ? "delta-up" : "delta-down"}>{replyDelta >= 0 ? "▲" : "▼"} {replyDelta.toFixed(1)}pp</span><span>vs Bath floor 11%</span></div>
      </div>
      <div className="fcard">
        <div className="src">DB</div>
        <div className="lab">✓ Positive</div>
        <div className="n">{s.positive}</div>
        <div className="conv">{pctStr(s.positive, s.sent)} of sent · {pctStr(s.positive, s.replies)} of replies</div>
        <div className="delta-row"><span className={posDelta >= 0 ? "delta-up" : "delta-down"}>{posDelta >= 0 ? "▲" : "▼"} {posDelta.toFixed(1)}pp</span><span>vs floor 4%</span></div>
      </div>
      <div className="fcard">
        <div className="src">CAL</div>
        <div className="lab">⊞ Booked</div>
        <div className="n">{s.booked}</div>
        <div className="conv">{pctStr(s.booked, s.positive)} of positive</div>
        <div className="delta-row"><span className={dBk.cls}>{dBk.txt}</span><span>vs prev period</span></div>
      </div>
      <div className="fcard">
        <div className="src">CAL</div>
        <div className="lab">⌗ Taken</div>
        <div className="n">{s.taken}</div>
        <div className="conv">{pctStr(s.taken, s.booked)} turnup</div>
        <div className="delta-row"><span className={dTk.cls}>{dTk.txt}</span><span>vs prev period</span></div>
      </div>
      <div className="fcard">
        <div className="src">20</div>
        <div className="lab">★ Interested</div>
        <div className="n">{s.interested}</div>
        <div className="conv">{pctStr(s.interested, s.taken)} of taken</div>
        <div className="delta-row"><span className={dInt.cls}>{dInt.txt}</span><span>vs prev period</span></div>
      </div>
      <div className="fcard">
        <div className="src">20</div>
        <div className="lab">⊕ Closed</div>
        <div className="n">{s.closed}</div>
        <div className="conv">{pctStr(s.closed, s.interested)} of interested</div>
        <div className="delta-row"><span className="delta-flat">— still in proposal</span></div>
      </div>
      <div className="fcard money">
        <div className="src">20</div>
        <div className="lab">£ Generated</div>
        <div className="n">£{s.money.toLocaleString()}</div>
        <div className="conv">via Twenty CRM deal stages</div>
        <div className="delta-row"><span style={{ color: "rgba(250,250,247,0.55)" }}>↺ live sync</span></div>
      </div>
    </div>
  )
}

// ─── Main page component ───────────────────────────────────────────────────

export default function OutreachObservatoryPage() {
  // ─── State ────────────────────────────────────────────────────────────────
  const [timeframe, setTimeframe] = useState<Timeframe>("30d")
  const [strategy, setStrategy] = useState<StrategyFilter>("all")
  const [strategyOpen, setStrategyOpen] = useState(false)
  const [rosterTab, setRosterTab] = useState<RosterTab>("ready")
  const [rosterSearch, setRosterSearch] = useState("")
  const [rosterOwner, setRosterOwner] = useState<StrategyFilter>("all")
  const [rosterOwnerOpen, setRosterOwnerOpen] = useState(false)
  const [rosterResearched, setRosterResearched] = useState<"any" | "yes" | "no">("any")
  const [rosterResearchedOpen, setRosterResearchedOpen] = useState(false)
  const [rosterSort, setRosterSort] = useState<{ col: RosterSortCol; dir: "asc" | "desc" }>({ col: "number", dir: "asc" })
  const [rosterPage, setRosterPage] = useState(1)
  const ROSTER_PAGE_SIZE = 10
  const [daySort, setDaySort] = useState<{ col: DaySortCol; dir: "asc" | "desc" }>({ col: "date", dir: "desc" })
  const [showAllWeeks, setShowAllWeeks] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [activeDrawerLeadId, setActiveDrawerLeadId] = useState<string | null>(null)
  const [endWeekOpen, setEndWeekOpen] = useState(false)
  const [createHypoOpen, setCreateHypoOpen] = useState(false)
  const [hypoDetailWeek, setHypoDetailWeek] = useState<WeeklyHypothesisRecord | null>(null)
  const [leadAddOpen, setLeadAddOpen] = useState(false)
  const [leadBulkOpen, setLeadBulkOpen] = useState(false)
  const [sendListOpen, setSendListOpen] = useState(false)
  const [dncTarget, setDncTarget] = useState<{ id: string; name: string; company: string; email: string | null } | null>(null)
  const [dailyEdit, setDailyEdit] = useState<DailyActivityRecord | null>(null)
  const [dailyAddOpen, setDailyAddOpen] = useState(false)
  const [topTab, setTopTab] = useState<TopTab>("leads")

  // URL ?tab= round-trip — read on mount + popstate; write via replaceState to
  // keep refresh stable without triggering Next's static-bailout warning.
  useEffect(() => {
    const sync = () => {
      const t = new URLSearchParams(window.location.search).get("tab")
      if (t && (TOP_TABS as readonly string[]).includes(t)) setTopTab(t as TopTab)
    }
    sync()
    window.addEventListener("popstate", sync)
    return () => window.removeEventListener("popstate", sync)
  }, [])

  function selectTopTab(t: TopTab) {
    setTopTab(t)
    const p = new URLSearchParams(window.location.search)
    p.set("tab", t)
    window.history.replaceState(null, "", `${window.location.pathname}?${p.toString()}`)
  }

  // ─── Toast handler ────────────────────────────────────────────────────────
  function toast(msg: string, tone?: Toast["tone"]) {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, msg, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200)
  }

  // ─── Queries ──────────────────────────────────────────────────────────────
  const range = useMemo(() => rangeFromTF(timeframe), [timeframe])
  const ownerArg = strategy === "all" ? undefined : strategy

  const dailyQ = api.outreach.listDailyActivity.useQuery({
    startDate: isoDate(range.start),
    endDate: isoDate(range.end),
    owner: ownerArg,
  })
  const hyposQ = api.outreach.listHypotheses.useQuery({ limit: 20 })
  const activeQ = api.outreach.getActiveHypothesis.useQuery()
  const tabCountsQ = api.outreach.tabCounts.useQuery()
  const rosterQ = api.outreach.listLeads.useQuery({
    status: rosterTab,
    owner: rosterOwner === "all" ? undefined : rosterOwner,
    researched: rosterResearched === "any" ? undefined : rosterResearched === "yes",
    search: rosterSearch || undefined,
    limit: ROSTER_PAGE_SIZE,
    offset: (rosterPage - 1) * ROSTER_PAGE_SIZE,
  })
  const rosterCountQ = api.outreach.countLeads.useQuery({
    status: rosterTab,
    owner: rosterOwner === "all" ? undefined : rosterOwner,
    researched: rosterResearched === "any" ? undefined : rosterResearched === "yes",
    search: rosterSearch || undefined,
  })
  const drawerLeadQ = api.outreach.getLead.useQuery(
    { id: activeDrawerLeadId ?? "00000000-0000-0000-0000-000000000000" },
    { enabled: !!activeDrawerLeadId },
  )

  const utils = api.useUtils()
  const markSent = api.outreach.markLeadSent.useMutation({
    onSuccess: () => {
      utils.outreach.listLeads.invalidate()
      utils.outreach.tabCounts.invalidate()
      utils.outreach.listDailyActivity.invalidate()
      toast("Lead marked sent — activity log updated", "ok")
    },
  })
  const updateLead = api.outreach.updateLead.useMutation({
    onSuccess: () => utils.outreach.listLeads.invalidate(),
  })
  const endWeekMutation = api.outreach.endWeek.useMutation({
    onSuccess: (_data, variables) => {
      utils.outreach.getActiveHypothesis.invalidate()
      utils.outreach.listHypotheses.invalidate()
      setEndWeekOpen(false)
      if (variables.nextHypothesis) {
        toast("Week locked. Next week is now active.", "ok")
      } else {
        toast("Week locked. Open the dashboard to start the next week.", "ok")
        setTimeout(() => setCreateHypoOpen(true), 600)
      }
    },
  })
  const createHypoMutation = api.outreach.createHypothesis.useMutation({
    onSuccess: () => {
      utils.outreach.getActiveHypothesis.invalidate()
      utils.outreach.listHypotheses.invalidate()
      setCreateHypoOpen(false)
      toast("Hypothesis started — week is live", "ok")
    },
  })

  // ─── Derived ──────────────────────────────────────────────────────────────
  const daily: DailyActivityRecord[] = useMemo(() => {
    const rows = dailyQ.data ?? []
    const sorted = [...rows].sort((a, b) => {
      const av = daySort.col === "date" ? a.date : daySort.col === "sent" ? a.sent : daySort.col === "replies" ? a.replies : a.positive
      const bv = daySort.col === "date" ? b.date : daySort.col === "sent" ? b.sent : daySort.col === "replies" ? b.replies : b.positive
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return daySort.dir === "asc" ? cmp : -cmp
    })
    return sorted
  }, [dailyQ.data, daySort])

  const funnelSum = useMemo(() => sumFunnel(daily), [daily])

  const prevRangeSum = useMemo(() => {
    const span = range.end.getTime() - range.start.getTime()
    const prevStart = new Date(range.start.getTime() - span - DAY)
    const prevEnd = new Date(range.start.getTime() - DAY)
    // Approximation: filter dailyQ data — we already have prior rows if loaded
    const all = dailyQ.data ?? []
    const prev = all.filter((r) => {
      const t = new Date(r.date).getTime()
      return t >= prevStart.getTime() && t <= prevEnd.getTime()
    })
    return sumFunnel(prev)
  }, [dailyQ.data, range])

  const hyposList = hyposQ.data ?? []
  const active = activeQ.data ?? null
  const prevWeek = useMemo(() => {
    if (!active) return null
    const idx = hyposList.findIndex((h) => h.id === active.id)
    return idx >= 0 && idx + 1 < hyposList.length ? hyposList[idx + 1] : null
  }, [hyposList, active])

  function weekRowsSum(wk: WeeklyHypothesisRecord): Funnel {
    const rows = (dailyQ.data ?? []).filter((r) => {
      const t = new Date(r.date).getTime()
      return t >= new Date(wk.startDate).getTime() && t <= new Date(wk.endDate).getTime() + DAY
    })
    return sumFunnel(rows)
  }

  const liveSum = active ? weekRowsSum(active) : funnelSum
  const prevSum = prevWeek ? weekRowsSum(prevWeek) : { sent: 0, replies: 0, positive: 0, booked: 0, taken: 0, interested: 0, closed: 0, money: 0 }

  const dailyTotal = funnelSum
  const dayRowsToShow = daily

  const tabCounts = tabCountsQ.data ?? { ready: 0, sent: 0, draft: 0, skipped: 0, dnc: 0, total: 0, alex: 0, luke: 0 }
  const rosterTotal = rosterCountQ.data ?? 0
  const rosterPages = Math.max(1, Math.ceil(rosterTotal / ROSTER_PAGE_SIZE))
  const rosterRows = rosterQ.data ?? []
  const drawerLead = drawerLeadQ.data ?? null

  useEffect(() => {
    setRosterPage(1)
  }, [rosterTab, rosterSearch, rosterOwner, rosterResearched])

  // ─── Export CSV ───────────────────────────────────────────────────────────
  function exportDaily() {
    const lines = ["Date,Owner,Sent,Replies,Positive,Booked,Taken,Interested,Closed,Money"]
    for (const r of daily) {
      lines.push(`${r.date},${r.owner.toUpperCase()},${r.sent},${r.replies},${r.positive},${r.meetingsBooked},${r.meetingsTaken},${r.interested},${r.closed},${Number(r.newUpfront) + Number(r.newRetainer)}`)
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `outreach-${timeframe}-${strategy}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast(`Exported ${daily.length} rows to CSV`, "ok")
  }

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="obs">
      <style>{OBSERVATORY_CSS}</style>

      {/* ─── Topbar ──────────────────────────────────────────────── */}
      <div className="topbar">
        <div className="crumb">
          <span>Outreach</span>
          <span>/</span>
          <b>Observatory</b>
        </div>
        <div className="spacer" />
        <div className="pill-pick" onClick={() => setStrategyOpen((o) => !o)}>
          <span className="lab">Strategy</span>
          <span>{strategy === "all" ? "All" : strategy.charAt(0).toUpperCase() + strategy.slice(1)}</span>
          <span className="arr">▾</span>
          {strategyOpen && (
            <div className="pill-menu" onClick={(e) => e.stopPropagation()}>
              {(["all", "luke", "alex"] as const).map((s) => (
                <button
                  key={s}
                  className={strategy === s ? "on" : ""}
                  onClick={() => { setStrategy(s); setStrategyOpen(false) }}
                >
                  {s === "all" ? "All owners" : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="seg">
          {(["7d", "14d", "30d", "q2", "ytd", "all"] as const).map((tf) => (
            <button key={tf} className={timeframe === tf ? "on" : ""} onClick={() => setTimeframe(tf)}>
              {tf}
            </button>
          ))}
        </div>
        <div className="pill-pick" style={{ cursor: "default" }}>
          <span className="lab">Range</span>
          <span className="mono">{fmtDate(range.start)} → {fmtDate(range.end)}</span>
        </div>
        <button className="btn btn-ghost" onClick={exportDaily}>⤓ Export</button>
        {active && (
          <button className="btn btn-primary" onClick={() => setEndWeekOpen(true)}>✦ End {active.week}</button>
        )}
      </div>

      <div className="page">
        <span className="eyebrow">
          Outreach · observatory
          {active && <> · <span style={{ color: "var(--obs-accent)" }}>★</span> {active.week} live</>}
        </span>
        <h1 className="h1">
          The <span className="italic-red">{funnelSum.sent}</span> sends story.{" "}
          <span style={{ color: "var(--obs-ink-50)", fontStyle: "italic" }}>
            {funnelSum.positive} positive replies. {funnelSum.booked} booked.
          </span>
        </h1>

        {/* ─── Top tabs ─── */}
        <nav className="toptabs" aria-label="Outreach views">
          {TOP_TABS.map((t) => (
            <button
              key={t}
              type="button"
              className={topTab === t ? "on" : ""}
              onClick={() => selectTopTab(t)}
              aria-current={topTab === t ? "page" : undefined}
            >
              {TOP_TAB_LABELS[t]}
              {t === "leads" && <span className="ct">{tabCounts.total}</span>}
            </button>
          ))}
        </nav>

        {topTab === "today" && (
          <div className="today-stub">
            <h4>Today action queue</h4>
            <p>Pull-batch count, follow-ups due, unclassified replies, daily pace vs target — lands in IHR-11 task 2.</p>
          </div>
        )}

        {topTab === "hypothesis" && (
        <>
        {/* ─── Hypothesis banner or empty state ─── */}
        {active ? (
          <HypothesisBanner
            hypothesis={active}
            liveSum={liveSum}
            prev={prevWeek}
            prevSum={prevSum}
            onOpenPrev={() => prevWeek && setHypoDetailWeek(prevWeek)}
          />
        ) : (
          <div className="today-stub">
            <h4>No active hypothesis yet</h4>
            <p>
              {hyposList[0]
                ? <>The week of <b>{hyposList[0].week}</b> is closed (verdict: <b>{hyposList[0].verdict}</b>). Start the next 7-day cycle to track targets.</>
                : <>Each week you set a hypothesis to test (what changes this week vs last?) with a sample size and target reply rate.</>}
            </p>
            <button
              className="btn btn-primary"
              style={{ marginTop: 14 }}
              onClick={() => setCreateHypoOpen(true)}
            >
              ⊕ {hyposList[0] ? "Start next week" : "Create first hypothesis"}
            </button>
          </div>
        )}
        </>
        )}

        {topTab === "funnel" && (
        <>
        {/* ─── Funnel ─── */}
        <div className="section">
          <h3>Cold email funnel <span style={{ color: "var(--obs-ink-40)", fontStyle: "italic", fontFamily: "var(--obs-serif)", fontSize: 18 }}>{tfLabel(timeframe)}</span></h3>
          <span className="sub">SOURCES: PLATFORM DB · CAL MCP · TWENTY MCP</span>
        </div>
        <FunnelCards s={funnelSum} prev={prevRangeSum} />

        {/* ─── Daily activity log ─── */}
        <div style={{ marginTop: 22 }}>
          <div className="card">
            <div className="head">
              <div>
                <h4>Daily activity log</h4>
                <div className="sub">{daily.length} ROWS · {tfLabel(timeframe).toUpperCase()}</div>
              </div>
              <button className="btn btn-ghost" onClick={() => setDailyAddOpen(true)}>⊕ Add row</button>
            </div>
            <div className="filters">
              <span className="eyebrow">Filter</span>
              <span className="status-pill">{strategy === "all" ? "Both owners" : strategy === "luke" ? "Luke only" : "Alex only"}</span>
              <span style={{ marginLeft: "auto", fontFamily: "var(--obs-mono)", fontSize: 10.5, color: "var(--obs-ink-40)" }}>
                {daily.length} rows · {fmtDate(range.start)} → {fmtDate(range.end)}
              </span>
            </div>
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    {(["date", "sent", "replies", "positive"] as const).map((col) => null)}
                    <th
                      className={`sortable ${daySort.col === "date" ? "active" : ""}`}
                      onClick={() => setDaySort((s) => ({ col: "date", dir: s.col === "date" && s.dir === "desc" ? "asc" : "desc" }))}
                    >
                      Date {daySort.col === "date" ? (daySort.dir === "asc" ? "↑" : "↓") : ""}
                    </th>
                    <th>Owner</th>
                    <th
                      className={`r sortable ${daySort.col === "sent" ? "active" : ""}`}
                      onClick={() => setDaySort((s) => ({ col: "sent", dir: s.col === "sent" && s.dir === "desc" ? "asc" : "desc" }))}
                    >
                      Sent {daySort.col === "sent" ? (daySort.dir === "asc" ? "↑" : "↓") : ""}
                    </th>
                    <th
                      className={`r sortable ${daySort.col === "replies" ? "active" : ""}`}
                      onClick={() => setDaySort((s) => ({ col: "replies", dir: s.col === "replies" && s.dir === "desc" ? "asc" : "desc" }))}
                    >
                      Reply {daySort.col === "replies" ? (daySort.dir === "asc" ? "↑" : "↓") : ""}
                    </th>
                    <th className="r">Reply %</th>
                    <th
                      className={`r sortable ${daySort.col === "positive" ? "active" : ""}`}
                      onClick={() => setDaySort((s) => ({ col: "positive", dir: s.col === "positive" && s.dir === "desc" ? "asc" : "desc" }))}
                    >
                      Pos {daySort.col === "positive" ? (daySort.dir === "asc" ? "↑" : "↓") : ""}
                    </th>
                    <th className="r">Bk</th>
                    <th className="r">Tk</th>
                    <th className="r">Int</th>
                    <th className="r">£</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyQ.isLoading ? (
                    <tr><td colSpan={10} style={{ textAlign: "center", padding: 24, color: "var(--obs-ink-40)" }}>Loading…</td></tr>
                  ) : dayRowsToShow.length === 0 ? (
                    <tr className="empty"><td colSpan={10}>No activity in this window.</td></tr>
                  ) : (
                    <>
                      {dayRowsToShow.map((r) => {
                        const rPct = pct(r.replies, r.sent)
                        const barClass = rPct >= 11 ? "" : rPct >= 5 ? "warn" : rPct > 0 ? "danger" : "flat"
                        const money = Number(r.newUpfront) + Number(r.newRetainer)
                        return (
                          <tr key={r.id} className="clickable" onClick={() => setDailyEdit(r)}>
                            <td className="mono">{fmtDate(r.date)}</td>
                            <td><span className={`owner-chip ${r.owner}`}>{r.owner.toUpperCase()}</span></td>
                            <td className="r">{r.sent}</td>
                            <td className="r">{r.replies}</td>
                            <td className="r">
                              <span className="rate-bar">
                                <span className="pip"><i className={barClass} style={{ width: `${Math.min(100, rPct * 4.5)}%` }} /></span>
                                {rPct ? `${rPct.toFixed(1)}%` : "0%"}
                              </span>
                            </td>
                            <td className="r">{r.positive}</td>
                            <td className="r">{r.positive ? pctStr(r.positive, r.sent) : "—"}</td>
                            <td className={`r ${!r.meetingsBooked ? "dash" : ""}`}>{r.meetingsBooked || "—"}</td>
                            <td className={`r ${!r.meetingsTaken ? "dash" : ""}`}>{r.meetingsTaken || "—"}</td>
                            <td className={`r ${!r.interested ? "dash" : ""}`}>{r.interested || "—"}</td>
                            <td className={`r ${!money ? "dash" : ""}`}>{money ? `£${money.toLocaleString()}` : "—"}</td>
                          </tr>
                        )
                      })}
                      <tr className="foot">
                        <td colSpan={2}>TOTAL · {tfLabel(timeframe)}</td>
                        <td className="r">{dailyTotal.sent}</td>
                        <td className="r">{dailyTotal.replies}</td>
                        <td className="r">{pctStr(dailyTotal.replies, dailyTotal.sent)}</td>
                        <td className="r">{dailyTotal.positive}</td>
                        <td className="r">{pctStr(dailyTotal.positive, dailyTotal.sent)}</td>
                        <td className="r">{dailyTotal.booked || "—"}</td>
                        <td className="r">{dailyTotal.taken || "—"}</td>
                        <td className="r">{dailyTotal.interested || "—"}</td>
                        <td className="r">£{dailyTotal.money.toLocaleString()}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
            <div className="pager">
              <span>Showing {daily.length} / {daily.length}</span>
              <span>Sent column derived from leads.lastContactedAt</span>
            </div>
          </div>
        </div>
        </>
        )}

        {topTab === "hypothesis" && (
        <>
        <div className="duo">
            <div className="card hlog">
              <div className="head">
                <div>
                  <h4>Hypothesis log</h4>
                  <div className="sub">7-DAY LOOP · KEEP / KILL / MUTATE</div>
                </div>
                <button className="btn btn-ghost" onClick={() => setShowAllWeeks((s) => !s)}>
                  {showAllWeeks ? "⊟ Recent only" : "⊞ All weeks"}
                </button>
              </div>
              {(showAllWeeks ? hyposList : hyposList.slice(0, 4)).map((wk) => {
                const isLive = active ? wk.id === active.id : false
                const sum = weekRowsSum(wk)
                const rp = pct(sum.replies, sum.sent)
                const pp = pct(sum.positive, sum.sent)
                const targetReply = Number(wk.targetReplyPct)
                const targetPos = Number(wk.targetPositivePct)
                return (
                  <div key={wk.id} className={`row ${isLive ? "live" : ""}`} onClick={() => setHypoDetailWeek(wk)}>
                    <div className="toprow">
                      <span className={`wtag ${isLive ? "live" : ""}`}>{wk.week}{isLive ? " · live" : ""}</span>
                      <span style={{ fontFamily: "var(--obs-mono)", fontSize: 10.5, color: "var(--obs-ink-50)" }}>
                        {fmtDate(wk.startDate)} → {fmtDate(wk.endDate)}
                      </span>
                      <span className={`verdict verdict-${wk.verdict}`}>{wk.verdict}</span>
                    </div>
                    <div className="h">{wk.title}</div>
                    <div className="metrics">
                      <span>Sent <b>{sum.sent}</b></span>
                      <span>Reply <b>{rp.toFixed(1)}%</b> <span className={rp >= targetReply ? "delta-up" : "delta-down"}>{rp >= targetReply ? "▲" : "▼"}</span></span>
                      <span>Pos <b>{pp.toFixed(1)}%</b> <span className={pp >= targetPos ? "delta-up" : "delta-down"}>{pp >= targetPos ? "▲" : "▼"}</span></span>
                      <span>Booked <b>{sum.booked}</b></span>
                    </div>
                  </div>
                )
              })}
              {hyposList.length === 0 && (
                <div style={{ padding: 18, color: "var(--obs-ink-50)", fontStyle: "italic" }}>No hypotheses yet.</div>
              )}
            </div>

            <div className="card">
              <div className="head">
                <div>
                  <h4>Data sources</h4>
                  <div className="sub">WHICH MCP FILLED WHICH COLUMN</div>
                </div>
              </div>
              <div className="integrations">
                <div className="intg"><span className="dot ok" /><span className="src">PLATFORM DB</span><span className="desc">Sent · Replied · Positive</span><span className="meta">{tabCounts.total} leads · {tabCounts.sent} sent</span></div>
                <div className="intg"><span className="dot warn" /><span className="src">CAL · MCP</span><span className="desc">Booked · Taken</span><span className="meta">Not yet wired — task #11</span></div>
                <div className="intg"><span className="dot warn" /><span className="src">TWENTY · MCP</span><span className="desc">Interested · Closed · £</span><span className="meta">Not yet wired — task #11</span></div>
                <div className="intg"><span className="dot warn" /><span className="src">MASTER LIST .XLSX</span><span className="desc">Read-only mirror</span><span className="meta">Not yet imported — task #12</span></div>
              </div>
            </div>
        </div>
        </>
        )}

        {topTab === "inbox" && (
        <>
        {/* ─── Reply triage ─── */}
        <div className="section">
          <h3>Inbox <span style={{ color: "var(--obs-ink-40)", fontStyle: "italic", fontFamily: "var(--obs-serif)", fontSize: 18 }}>classify the replies</span></h3>
          <span className="sub">SOURCE: GMAIL PROCESSOR · LUKE / RULE CLASSIFIER</span>
        </div>
        <ReplyTriageSection />
        </>
        )}

        {topTab === "leads" && (
        <>
        {/* ─── Leads roster ─── */}
        <div className="section">
          <h3>Leads roster <span style={{ color: "var(--obs-ink-40)", fontStyle: "italic", fontFamily: "var(--obs-serif)", fontSize: 18 }}>the spreadsheet</span></h3>
          <span className="sub">SOURCE: PLATFORM.DB</span>
        </div>
        <div className="card roster">
          <div className="tabs">
            {(["ready", "sent", "draft", "skipped", "dnc"] as const).map((t) => (
              <button key={t} className={rosterTab === t ? "on" : ""} onClick={() => setRosterTab(t)}>
                {t === "dnc" ? "Do not contact" : t.charAt(0).toUpperCase() + t.slice(1)} <span className="ct">{tabCounts[t]}</span>
              </button>
            ))}
            <span className="total">{tabCounts.total} total · {tabCounts.alex} Alex · {tabCounts.luke} Luke</span>
          </div>
          <div className="search-row">
            <input
              type="text"
              placeholder="Search name, company, domain, category, notes…"
              value={rosterSearch}
              onChange={(e) => setRosterSearch(e.target.value)}
            />
            <div className="pill-pick" onClick={() => setRosterOwnerOpen((o) => !o)}>
              <span className="lab">Owner</span>
              <span>{rosterOwner === "all" ? "Both" : rosterOwner.charAt(0).toUpperCase() + rosterOwner.slice(1)}</span>
              <span className="arr">▾</span>
              {rosterOwnerOpen && (
                <div className="pill-menu" onClick={(e) => e.stopPropagation()}>
                  {(["all", "luke", "alex"] as const).map((o) => (
                    <button key={o} className={rosterOwner === o ? "on" : ""} onClick={() => { setRosterOwner(o); setRosterOwnerOpen(false) }}>
                      {o === "all" ? "Both" : o.charAt(0).toUpperCase() + o.slice(1)}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="pill-pick" onClick={() => setRosterResearchedOpen((o) => !o)}>
              <span className="lab">Researched</span>
              <span>{rosterResearched === "any" ? "Any" : rosterResearched === "yes" ? "Yes" : "No"}</span>
              <span className="arr">▾</span>
              {rosterResearchedOpen && (
                <div className="pill-menu" onClick={(e) => e.stopPropagation()}>
                  {(["any", "yes", "no"] as const).map((r) => (
                    <button key={r} className={rosterResearched === r ? "on" : ""} onClick={() => { setRosterResearched(r); setRosterResearchedOpen(false) }}>
                      {r === "any" ? "Any" : r.charAt(0).toUpperCase() + r.slice(1)}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button className="btn btn-ghost" onClick={() => setLeadAddOpen(true)}>⊕ New lead</button>
            <button className="btn btn-ghost" onClick={() => setLeadBulkOpen(true)}>⤓ CSV import</button>
            <button
              className="btn btn-primary"
              onClick={() => setSendListOpen(true)}
              disabled={rosterTab !== "ready"}
              title={rosterTab !== "ready" ? "Switch to Ready tab to pull a batch" : "Open the day's send list"}
            >
              ✉ Pull 25 → batch
            </button>
          </div>
          <div className="tbl-wrap" style={{ maxHeight: 600 }}>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Status</th>
                  <th>★</th>
                  <th>R</th>
                  <th className={`sortable ${rosterSort.col === "name" ? "active" : ""}`} onClick={() => setRosterSort((s) => ({ col: "name", dir: s.col === "name" && s.dir === "asc" ? "desc" : "asc" }))}>
                    Name {rosterSort.col === "name" ? (rosterSort.dir === "asc" ? "↑" : "↓") : ""}
                  </th>
                  <th className={`sortable ${rosterSort.col === "company" ? "active" : ""}`} onClick={() => setRosterSort((s) => ({ col: "company", dir: s.col === "company" && s.dir === "asc" ? "desc" : "asc" }))}>
                    Company {rosterSort.col === "company" ? (rosterSort.dir === "asc" ? "↑" : "↓") : ""}
                  </th>
                  <th>Category</th>
                  <th>Email</th>
                  <th>Website</th>
                  <th>Last cont.</th>
                  <th>Reply</th>
                  <th>Sentiment</th>
                  <th>Owner</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {rosterQ.isLoading ? (
                  <tr><td colSpan={13} style={{ textAlign: "center", padding: 24, color: "var(--obs-ink-40)" }}>Loading…</td></tr>
                ) : rosterRows.length === 0 ? (
                  <tr className="empty"><td colSpan={13}>No leads match. Clear a filter or try a different tab.</td></tr>
                ) : (
                  rosterRows.map((lead) => (
                    <tr key={lead.id} className="clickable" onClick={() => setActiveDrawerLeadId(lead.id)}>
                      <td className="mono" style={{ color: "var(--obs-ink-40)" }}>{String(lead.number).padStart(3, "0")}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <RowStatusDropdown
                          leadId={lead.id}
                          currentStatus={lead.status}
                          onRequestDnc={() => setDncTarget({ id: lead.id, name: lead.name, company: lead.company, email: lead.email })}
                        />
                      </td>
                      <td>
                        <span
                          className={`star-flag ${lead.followUpFlag ? "" : "off"}`}
                          onClick={(e) => { e.stopPropagation(); updateLead.mutate({ id: lead.id, followUpFlag: !lead.followUpFlag }) }}
                        >★</span>
                      </td>
                      <td>{lead.researched ? <span className="check">✓</span> : <span className="x">·</span>}</td>
                      <td>{lead.name}</td>
                      <td>{lead.company}</td>
                      <td><span className="source-tag">{lead.category || "—"}</span></td>
                      <td className="mono" style={{ fontSize: 11 }}>{lead.email || "—"}</td>
                      <td className="mono" style={{ fontSize: 11, color: "var(--obs-info)" }}>{lead.website ? `${lead.website} ↗` : "—"}</td>
                      <td className="mono" style={{ fontSize: 11 }}>{fmtDate(lead.lastContactedAt)}</td>
                      <td>{lead.reply ? <span className="check">✓</span> : <span className="dash">—</span>}</td>
                      <td>{lead.replySentiment ? <span className={`sentiment-chip ${lead.replySentiment}`}>{lead.replySentiment}</span> : <span className="dash">—</span>}</td>
                      <td><span className={`owner-chip ${lead.owner}`}>{lead.owner.toUpperCase()}</span></td>
                      <td><span className="source-tag">{lead.source || "—"}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="pager">
            <span>Showing {rosterRows.length ? (rosterPage - 1) * ROSTER_PAGE_SIZE + 1 : 0}–{(rosterPage - 1) * ROSTER_PAGE_SIZE + rosterRows.length} / {rosterTotal}</span>
            <span>Click row → drawer with research notes</span>
            <div className="ctrl">
              <button className="btn btn-ghost" disabled={rosterPage <= 1} onClick={() => setRosterPage((p) => p - 1)}>◀</button>
              <span style={{ padding: "4px 8px" }}>{rosterPage} / {rosterPages}</span>
              <button className="btn btn-ghost" disabled={rosterPage >= rosterPages} onClick={() => setRosterPage((p) => p + 1)}>▶</button>
            </div>
          </div>
        </div>
        </>
        )}
      </div>

      {/* ─── Drawer ─── */}
      {activeDrawerLeadId && drawerLead && (
        <>
          <div className="drawer-bg" onClick={() => setActiveDrawerLeadId(null)} />
          <div className="drawer">
            <div className="dhead">
              <div>
                <h3>{drawerLead.name}</h3>
                <p>{drawerLead.company} · #{String(drawerLead.number).padStart(3, "0")} · {drawerLead.email || "no email"}</p>
              </div>
              <button className="btn btn-ghost" onClick={() => setActiveDrawerLeadId(null)}>×</button>
            </div>
            <div className="dbody">
              <section>
                <h4>Status</h4>
                <div className="field"><span>Status</span><span><span className={`status-pill ${drawerLead.status}`}><span className="dot" />{drawerLead.status === "dnc" ? "DNC" : drawerLead.status[0].toUpperCase() + drawerLead.status.slice(1)}</span></span></div>
                <div className="field"><span>Owner</span><span><span className={`owner-chip ${drawerLead.owner}`}>{drawerLead.owner.toUpperCase()}</span></span></div>
                <div className="field"><span>Category</span><span>{drawerLead.category || "—"}</span></div>
                <div className="field"><span>Researched</span><span>{drawerLead.researched ? "✓ Yes" : "No"}</span></div>
                <div className="field"><span>Follow-up flagged</span><span>{drawerLead.followUpFlag ? "★ Yes" : "No"}</span></div>
              </section>
              <section>
                <h4>Touch history</h4>
                <div className="field"><span>Last contacted</span><span>{fmtDateLong(drawerLead.lastContactedAt)}</span></div>
                <div className="field"><span>Next follow-up</span><span>{fmtDateLong(drawerLead.nextFollowUpAt)}</span></div>
                <div className="field"><span>Reply received</span><span>{drawerLead.reply ? "Yes" : "No"}</span></div>
                {drawerLead.replySentiment && (
                  <div className="field"><span>Sentiment</span><span><span className={`sentiment-chip ${drawerLead.replySentiment}`}>{drawerLead.replySentiment}</span></span></div>
                )}
                <div className="field"><span>Source</span><span><span className="source-tag">{drawerLead.source || "—"}</span></span></div>
              </section>
              <section>
                <h4>Research notes</h4>
                <div className="notes">{drawerLead.researchNotes || "No research notes yet."}</div>
              </section>
              {drawerLead.website && (
                <section>
                  <h4>Web</h4>
                  <div className="field"><span>Website</span><span style={{ color: "var(--obs-info)", fontFamily: "var(--obs-mono)", fontSize: 11.5 }}>{drawerLead.website} ↗</span></div>
                </section>
              )}
            </div>
            <div className="dfoot">
              {drawerLead.status !== "dnc" && (
                <button
                  className="btn"
                  style={{ color: "var(--obs-danger)", borderColor: "var(--obs-danger)" }}
                  onClick={() => {
                    setDncTarget({ id: drawerLead.id, name: drawerLead.name, company: drawerLead.company, email: drawerLead.email })
                    setActiveDrawerLeadId(null)
                  }}
                >⊘ Add to DNC</button>
              )}
              {drawerLead.status === "ready" && (
                <button
                  className="btn btn-primary"
                  disabled={markSent.isPending}
                  onClick={() => {
                    markSent.mutate({ id: drawerLead.id })
                    setActiveDrawerLeadId(null)
                  }}
                >✓ Mark sent</button>
              )}
              <button className="btn" onClick={() => setActiveDrawerLeadId(null)}>Close</button>
            </div>
          </div>
        </>
      )}

      {/* ─── End-week modal ─── */}
      {endWeekOpen && active && (
        <EndWeekModal
          hypothesis={active}
          prev={prevWeek}
          liveSum={liveSum}
          prevSum={prevSum}
          onClose={() => setEndWeekOpen(false)}
          onConfirm={(resultSummary, verdict) => endWeekMutation.mutate({ hypothesisId: active.id, resultSummary, verdict })}
          isPending={endWeekMutation.isPending}
        />
      )}

      {/* ─── Week detail modal ─── */}
      {hypoDetailWeek && (
        <WeekDetailModal
          hypothesis={hypoDetailWeek}
          sum={weekRowsSum(hypoDetailWeek)}
          onClose={() => setHypoDetailWeek(null)}
        />
      )}

      {/* ─── Create hypothesis modal (from in-app, mid-active) ─── */}
      {createHypoOpen && (
        <CreateHypothesisModal
          prevWeek={active}
          onClose={() => setCreateHypoOpen(false)}
          onConfirm={(input) => createHypoMutation.mutate(input)}
          isPending={createHypoMutation.isPending}
        />
      )}

      {/* ─── Lead add ─── */}
      <LeadAddModal
        open={leadAddOpen}
        onClose={() => setLeadAddOpen(false)}
        onCreated={() => toast("Lead added — visible in Ready tab", "ok")}
      />

      {/* ─── CSV bulk import ─── */}
      <LeadBulkImportModal
        open={leadBulkOpen}
        onClose={() => setLeadBulkOpen(false)}
        onCreated={() => toast("Bulk import complete — see roster", "ok")}
      />

      {/* ─── Add to DNC ─── */}
      <AddToDncDialog
        open={!!dncTarget}
        lead={dncTarget}
        onClose={() => setDncTarget(null)}
        onAdded={() => toast("Added to DNC", "ok")}
      />

      {/* ─── Send list (Pull 25 → batch) ─── */}
      {sendListOpen && (
        <SendListModal
          open={sendListOpen}
          owner={rosterOwner === "all" ? "luke" : rosterOwner}
          count={25}
          hypothesisId={active?.id}
          onClose={() => setSendListOpen(false)}
        />
      )}

      {/* ─── Daily activity edit / add ─── */}
      <DailyActivityEditModal
        open={!!dailyEdit}
        row={dailyEdit}
        onClose={() => setDailyEdit(null)}
      />
      <DailyActivityEditModal
        open={dailyAddOpen}
        row={null}
        defaultOwner={strategy === "all" ? "luke" : strategy}
        onClose={() => setDailyAddOpen(false)}
      />

      {/* ─── Toasts ─── */}
      <div className="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.tone || ""}`}>{t.msg}</div>
        ))}
      </div>
    </div>
  )
}

// ─── Modal components ───────────────────────────────────────────────────────

function EndWeekModal({
  hypothesis,
  prev,
  liveSum,
  prevSum,
  onClose,
  onConfirm,
  isPending,
}: {
  hypothesis: WeeklyHypothesisRecord
  prev: WeeklyHypothesisRecord | null
  liveSum: Funnel
  prevSum: Funnel
  onClose: () => void
  onConfirm: (summary: string, verdict: OutreachHypothesisVerdict) => void
  isPending: boolean
}) {
  const replyPct = pct(liveSum.replies, liveSum.sent)
  const posPct = pct(liveSum.positive, liveSum.sent)
  const prevReplyPct = pct(prevSum.replies, prevSum.sent)
  const [summary, setSummary] = useState("")
  const [verdict, setVerdict] = useState<OutreachHypothesisVerdict>("mutate")

  return (
    <div className="modal-bg" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="mhead">
          <h3>End {hypothesis.week} · {fmtDate(hypothesis.startDate)} → {fmtDate(hypothesis.endDate)}</h3>
          <button className="close" onClick={onClose}>×</button>
        </div>
        <div className="mbody">
          <p style={{ color: "var(--obs-ink-65)", marginBottom: 16 }}>
            Lock this week's result. Numbers below are live.
          </p>
          <div style={{ background: "var(--obs-surface-2)", borderRadius: 9, padding: "13px 14px", marginBottom: 16 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Outcome vs target</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, fontFamily: "var(--obs-mono)", fontSize: 12 }}>
              <div><div style={{ color: "var(--obs-ink-50)" }}>Sent</div><b>{liveSum.sent} / {hypothesis.targetSample}</b></div>
              <div><div style={{ color: "var(--obs-ink-50)" }}>Reply %</div><b>{replyPct.toFixed(1)}% vs {Number(hypothesis.targetReplyPct)}%</b></div>
              <div><div style={{ color: "var(--obs-ink-50)" }}>Positive %</div><b>{posPct.toFixed(1)}% vs {Number(hypothesis.targetPositivePct)}%</b></div>
            </div>
            {prev && (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px dashed var(--obs-line-2)", fontFamily: "var(--obs-mono)", fontSize: 11, color: "var(--obs-ink-65)" }}>
                vs {prev.week}: reply {prevReplyPct.toFixed(1)}% → {replyPct.toFixed(1)}% ({replyPct >= prevReplyPct ? "▲" : "▼"} {Math.abs(replyPct - prevReplyPct).toFixed(1)}pp)
              </div>
            )}
          </div>
          <label>Result summary</label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder={`What did ${hypothesis.week} actually show?`}
          />
          <label>Verdict</label>
          <select value={verdict} onChange={(e) => setVerdict(e.target.value as OutreachHypothesisVerdict)}>
            <option value="keep">Keep — same hypothesis next week</option>
            <option value="mutate">Mutate — adjust one variable</option>
            <option value="kill">Kill — revert to baseline</option>
            <option value="baseline">Baseline — preserve as the bar to beat</option>
          </select>
        </div>
        <div className="mfoot">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            disabled={isPending || !summary.trim()}
            onClick={() => onConfirm(summary, verdict)}
          >
            ✦ Lock week
          </button>
        </div>
      </div>
    </div>
  )
}

function WeekDetailModal({
  hypothesis,
  sum,
  onClose,
}: {
  hypothesis: WeeklyHypothesisRecord
  sum: Funnel
  onClose: () => void
}) {
  return (
    <div className="modal-bg" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="mhead">
          <h3>{hypothesis.week} — {hypothesis.title}</h3>
          <button className="close" onClick={onClose}>×</button>
        </div>
        <div className="mbody">
          <p style={{ color: "var(--obs-ink-65)", lineHeight: 1.55, marginBottom: 14 }}>{hypothesis.body}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 18 }}>
            <div style={{ background: "var(--obs-surface-2)", padding: "10px 12px", borderRadius: 8 }}>
              <div className="eyebrow">Sent</div>
              <div style={{ fontFamily: "var(--obs-serif)", fontSize: 22 }}>{sum.sent}</div>
            </div>
            <div style={{ background: "var(--obs-surface-2)", padding: "10px 12px", borderRadius: 8 }}>
              <div className="eyebrow">Reply %</div>
              <div style={{ fontFamily: "var(--obs-serif)", fontSize: 22 }}>{pctStr(sum.replies, sum.sent)}</div>
            </div>
            <div style={{ background: "var(--obs-surface-2)", padding: "10px 12px", borderRadius: 8 }}>
              <div className="eyebrow">Pos %</div>
              <div style={{ fontFamily: "var(--obs-serif)", fontSize: 22 }}>{pctStr(sum.positive, sum.sent)}</div>
            </div>
            <div style={{ background: "var(--obs-surface-2)", padding: "10px 12px", borderRadius: 8 }}>
              <div className="eyebrow">Booked</div>
              <div style={{ fontFamily: "var(--obs-serif)", fontSize: 22 }}>{sum.booked}</div>
            </div>
          </div>
          <label>Verdict</label>
          <input type="text" value={hypothesis.verdict} disabled />
          <label>Result summary</label>
          <textarea value={hypothesis.resultSummary || ""} placeholder="Not yet filled" disabled />
        </div>
        <div className="mfoot">
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

// ─── Create Hypothesis modal ────────────────────────────────────────────────

function CreateHypothesisModal({
  prevWeek,
  onClose,
  onConfirm,
  isPending,
}: {
  prevWeek: WeeklyHypothesisRecord | null
  onClose: () => void
  onConfirm: (input: {
    week: string
    startDate: string
    endDate: string
    title: string
    body: string
    targetSample: number
    targetReplyPct: number
    targetPositivePct: number
    targetBooked?: number
    replaces?: string | null
    prevWeekId?: string | null
  }) => void
  isPending: boolean
}) {
  // Default dates: Mon-Sun of the week AFTER prevWeek (or current week if no prev)
  function nextWeekRange(): { week: string; start: string; end: string } {
    let baseStart: Date
    if (prevWeek) {
      baseStart = new Date(prevWeek.endDate)
      baseStart.setDate(baseStart.getDate() + 1)
    } else {
      const today = new Date()
      const day = (today.getDay() + 6) % 7
      baseStart = new Date(today)
      baseStart.setDate(today.getDate() - day)
    }
    const end = new Date(baseStart)
    end.setDate(baseStart.getDate() + 6)
    return { week: isoWeek(baseStart), start: isoDate(baseStart), end: isoDate(end) }
  }

  const seed = nextWeekRange()
  const [week, setWeek] = useState(seed.week)
  const [startDate, setStartDate] = useState(seed.start)
  const [endDate, setEndDate] = useState(seed.end)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [targetSample, setTargetSample] = useState<number>(prevWeek?.targetSample ?? 100)
  const [targetReplyPct, setTargetReplyPct] = useState<number>(prevWeek ? Number(prevWeek.targetReplyPct) : 11)
  const [targetPositivePct, setTargetPositivePct] = useState<number>(prevWeek ? Number(prevWeek.targetPositivePct) : 4)
  const [targetBooked, setTargetBooked] = useState<number>(prevWeek?.targetBooked ?? 2)

  const canSubmit = week.trim() && startDate && endDate && title.trim() && body.trim() && targetSample > 0

  return (
    <div className="modal-bg" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="mhead">
          <h3>Start week {week}</h3>
          <button className="close" onClick={onClose}>×</button>
        </div>
        <div className="mbody">
          <p style={{ color: "var(--obs-ink-65)", marginBottom: 16 }}>
            Lock the hypothesis you&apos;re testing this week. Targets become the goal-line on the dashboard. Verdict gets set when you end the week.
          </p>
          <div className="grid">
            <div><label>Week label</label><input type="text" value={week} onChange={(e) => setWeek(e.target.value)} placeholder="2026-W25" /></div>
            <div><label>Sample target</label><input type="number" value={targetSample} onChange={(e) => setTargetSample(+e.target.value || 0)} /></div>
          </div>
          <div className="grid">
            <div><label>Start (Mon)</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
            <div><label>End (Sun)</label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
          </div>
          <label>Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Observation-first + raised cap to 15/day"
          />
          <label>Hypothesis (what changes vs last week?)</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What one variable are you changing? Why? What's the prediction?"
          />
          <div className="grid">
            <div><label>Target reply %</label><input type="number" step="0.1" value={targetReplyPct} onChange={(e) => setTargetReplyPct(+e.target.value || 0)} /></div>
            <div><label>Target positive %</label><input type="number" step="0.1" value={targetPositivePct} onChange={(e) => setTargetPositivePct(+e.target.value || 0)} /></div>
          </div>
          <div className="grid">
            <div><label>Target booked</label><input type="number" value={targetBooked} onChange={(e) => setTargetBooked(+e.target.value || 0)} /></div>
            <div><label>Replaces</label><input type="text" value={prevWeek?.week ?? ""} disabled /></div>
          </div>
        </div>
        <div className="mfoot">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            disabled={isPending || !canSubmit}
            onClick={() =>
              onConfirm({
                week,
                startDate,
                endDate,
                title,
                body,
                targetSample,
                targetReplyPct,
                targetPositivePct,
                targetBooked,
                replaces: prevWeek?.week ?? null,
                prevWeekId: prevWeek?.id ?? null,
              })
            }
          >
            ✦ Start {week}
          </button>
        </div>
      </div>
    </div>
  )
}
