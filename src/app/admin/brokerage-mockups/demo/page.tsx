"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  ExternalLink,
  LayoutDashboard,
  UserPlus,
  MapPin,
  ClipboardCheck,
  FileSearch,
  Calculator,
  FileSignature,
  Leaf,
  Users,
  GitCompareArrows,
  Receipt,
  Handshake,
  PoundSterling,
  ShieldCheck,
  Bot,
  CheckCircle2,
  AlertCircle,
  Clock,
  TrendingUp,
  ArrowRight,
  FileText,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

// ─── Step 1: Dashboard Preview ───────────────────────────────────────────────

function DashboardPreview() {
  return (
    <div className="h-full flex flex-col gap-4 p-6">
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800">
          <CardContent className="p-4">
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium uppercase tracking-wide">Pipeline Value</p>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">£8.4M</p>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3 text-blue-500" />
              <p className="text-xs text-blue-500">+12% this month</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-violet-200 bg-violet-50 dark:bg-violet-950/30 dark:border-violet-800">
          <CardContent className="p-4">
            <p className="text-xs text-violet-600 dark:text-violet-400 font-medium uppercase tracking-wide">Active Deals</p>
            <p className="text-2xl font-bold text-violet-700 dark:text-violet-300 mt-1">42</p>
            <p className="text-xs text-violet-500 mt-1">across 5 catchments</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800">
          <CardContent className="p-4">
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium uppercase tracking-wide">Active Sites</p>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">12</p>
            <p className="text-xs text-emerald-500 mt-1">48.2–320 kg/yr each</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
          <CardContent className="p-4">
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium uppercase tracking-wide">Overdue Items</p>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-300 mt-1">7</p>
            <p className="text-xs text-amber-500 mt-1">compliance deadlines</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Deal Lifecycle Funnel</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          {[
            { label: "Lead", count: 42, pct: 100, colour: "bg-blue-500" },
            { label: "Assessed", count: 31, pct: 74, colour: "bg-indigo-500" },
            { label: "Legal", count: 22, pct: 52, colour: "bg-violet-500" },
            { label: "Matched", count: 14, pct: 33, colour: "bg-purple-500" },
            { label: "Completed", count: 8, pct: 19, colour: "bg-emerald-500" },
          ].map((row) => (
            <div key={row.label} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-16 shrink-0">{row.label}</span>
              <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
                <div
                  className={`h-full ${row.colour} rounded-full flex items-center justify-end pr-2`}
                  style={{ width: `${row.pct}%` }}
                >
                  <span className="text-white text-xs font-semibold">{row.count}</span>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Step 2: New Contact Preview ─────────────────────────────────────────────

function ContactPreview() {
  return (
    <div className="h-full flex items-center justify-center p-6">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">New Contact</CardTitle>
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200">Supply</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Full name</p>
            <div className="border rounded-md px-3 py-2 text-sm font-medium bg-muted/30">Robert Whiteley</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Type</p>
              <Badge variant="outline" className="text-xs font-normal">Landowner / Farmer</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Side</p>
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 text-xs">Supply</Badge>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Catchment</p>
            <div className="border rounded-md px-3 py-2 text-sm flex items-center justify-between bg-muted/30">
              <span>Solent</span>
              <div className="flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span className="text-xs">Auto-detected</span>
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {["Arable", "Hampshire", "Nitrogen credits"].map((t) => (
                <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground bg-muted/50 rounded px-2.5 py-1.5 flex items-center gap-1.5">
            <MapPin className="h-3 w-3 shrink-0" />
            Catchment auto-detected from postcode SO30 2EJ
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Step 3: Site Onboarding Preview ─────────────────────────────────────────

function SitePreview() {
  return (
    <div className="h-full flex items-center justify-center p-6">
      <Card className="w-full max-w-sm shadow-lg">
        <div className="h-1.5 bg-amber-500 rounded-t-xl" />
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Whiteley Farm</CardTitle>
            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 text-xs">Pending Assessment</Badge>
          </div>
          <p className="text-xs text-muted-foreground font-mono">BGS-SOL-2024-0847</p>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {[
            { label: "Area", value: "60 ha" },
            { label: "Land use", value: "Arable" },
            { label: "Catchment", value: "Solent" },
            { label: "Unit type", value: "Nitrogen Credits" },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
              <span className="text-xs text-muted-foreground">{row.label}</span>
              <span className="text-sm font-medium">{row.value}</span>
            </div>
          ))}
          <div className="flex items-center justify-between pt-1">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              Catchment auto-detected
            </div>
            <Button size="sm" className="h-7 text-xs gap-1">
              Send for Assessment
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Step 4: Schedule Assessment Preview ─────────────────────────────────────

function AssessmentSchedulePreview() {
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const dates = [
    [null, null, null, null, null, 1, 2],
    [3, 4, 5, 6, 7, 8, 9],
    [10, 11, 12, 13, 14, 15, 16],
    [17, 18, 19, 20, 21, 22, 23],
    [24, 25, 26, 27, 28, 29, 30],
    [31, null, null, null, null, null, null],
  ];
  return (
    <div className="h-full flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4">
        <Card className="shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-center">March 2026</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {days.map((d, i) => (
                <div key={i} className="text-center text-xs text-muted-foreground font-medium py-1">{d}</div>
              ))}
            </div>
            {dates.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 gap-0.5">
                {week.map((d, di) => (
                  <div
                    key={di}
                    className={`text-center text-xs py-1.5 rounded transition-colors ${
                      d === 12
                        ? "bg-blue-600 text-white font-bold rounded-full"
                        : d === null
                          ? ""
                          : "text-foreground hover:bg-muted"
                    }`}
                  >
                    {d}
                  </div>
                ))}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-violet-600 dark:text-violet-300">SC</span>
              </div>
              <div>
                <p className="text-sm font-semibold">Sarah Chen</p>
                <p className="text-xs text-muted-foreground">Ecological Surveyor</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Specialisms: Nutrient surveys, BNG baseline assessments</p>
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs">NN Baseline Assessment</Badge>
              <div className="flex items-center gap-1 text-blue-600 text-xs font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                12 Mar 2026
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Step 5: Assessment Results Preview ──────────────────────────────────────

function AssessmentResultsPreview() {
  return (
    <div className="h-full flex items-center justify-center p-6">
      <Card className="w-full max-w-sm shadow-lg">
        <div className="bg-emerald-600 rounded-t-xl px-4 py-3 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-white" />
          <span className="text-sm font-semibold text-white">Assessment Complete</span>
        </div>
        <CardContent className="p-4 space-y-2.5">
          {[
            { label: "Baseline N loading", value: "48.2 kg N/yr", muted: false },
            { label: "Proposed loading", value: "0 kg N/yr", muted: false },
            { label: "Credit yield", value: "48.2 kg N/yr", muted: false, highlight: true },
            { label: "Land area assessed", value: "60 ha", muted: false },
            { label: "Assessor", value: "Sarah Chen", muted: false },
          ].map((row) => (
            <div
              key={row.label}
              className={`flex items-center justify-between py-1.5 border-b border-border/50 last:border-0 ${
                row.highlight ? "bg-emerald-50 dark:bg-emerald-950/30 -mx-2 px-2 rounded" : ""
              }`}
            >
              <span className="text-xs text-muted-foreground">{row.label}</span>
              <span className={`text-sm font-semibold ${row.highlight ? "text-emerald-600 dark:text-emerald-400" : ""}`}>{row.value}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 pt-1 bg-muted/40 rounded px-2.5 py-2">
            <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground truncate">NN-Baseline-WhiteleyFarm-2026.pdf</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 ml-auto shrink-0" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Step 6: Nutrient Calculator Preview ─────────────────────────────────────

function CalculatorPreview() {
  return (
    <div className="h-full flex items-center justify-center p-6">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Nutrient Budget Calculator</CardTitle>
          <p className="text-xs text-muted-foreground">Natural England Catchment Load Methodology</p>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1 space-y-2.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Inputs</p>
              {[
                { label: "Current use", value: "Arable" },
                { label: "Area", value: "60 ha" },
                { label: "Soil type", value: "Sandy loam" },
                { label: "Methodology", value: "NE Catchment Load" },
              ].map((row) => (
                <div key={row.label} className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">{row.label}</p>
                  <div className="border rounded px-2.5 py-1.5 text-sm bg-muted/30">{row.value}</div>
                </div>
              ))}
            </div>

            <div className="flex items-center self-center px-2 pt-6">
              <div className="flex flex-col items-center gap-1">
                <ArrowRight className="h-6 w-6 text-indigo-400" />
              </div>
            </div>

            <div className="flex-1 space-y-2.5">
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Output</p>
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">Nitrogen load</p>
                  <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">48.2 kg/yr</p>
                </div>
                <div className="h-px bg-emerald-200 dark:bg-emerald-800" />
                <div>
                  <p className="text-xs text-muted-foreground">Credit yield</p>
                  <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">48.2 kg/yr</p>
                </div>
                <div className="h-px bg-emerald-200 dark:bg-emerald-800" />
                <div>
                  <p className="text-xs text-muted-foreground">Est. market value</p>
                  <p className="text-base font-bold text-emerald-700 dark:text-emerald-300">£120,500</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-500">@ £2,500 / kg</p>
                </div>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-3 italic">No more spreadsheets emailed back and forth.</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Step 7: Legal & Documents Preview ───────────────────────────────────────

function LegalPreview() {
  return (
    <div className="h-full flex items-center justify-center p-6">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Documents — Whiteley Farm</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {[
            {
              name: "S106 Agreement — Whiteley Farm",
              status: "Awaiting signature",
              statusColour: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
              detail: "2 of 3 parties signed",
            },
            {
              name: "Conservation Covenant",
              status: "Signed",
              statusColour: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
              detail: "30-year term · All parties",
            },
            {
              name: "HMMP v1.0",
              status: "Draft",
              statusColour: "bg-muted text-muted-foreground",
              detail: "In preparation",
            },
          ].map((doc) => (
            <div key={doc.name} className="border rounded-lg p-3 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="text-sm font-medium leading-snug">{doc.name}</span>
                </div>
                <Badge className={`${doc.statusColour} border text-xs shrink-0`}>{doc.status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground pl-5">{doc.detail}</p>
            </div>
          ))}
          <div className="pt-1 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>S106 signatures</span>
              <span className="font-medium text-amber-600">2 / 3 parties signed</span>
            </div>
            <Progress value={66} className="h-2" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Step 8: Site Goes Live Preview ──────────────────────────────────────────

function SiteLivePreview() {
  return (
    <div className="h-full flex items-center justify-center p-6">
      <Card className="w-full max-w-sm shadow-lg">
        <div className="bg-emerald-600 rounded-t-xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-white">Whiteley Farm</p>
            <p className="text-xs text-emerald-200 font-mono">BGS-SOL-2024-0847</p>
          </div>
          <Badge className="bg-white/20 text-white border-white/30 text-xs">Active</Badge>
        </div>
        <CardContent className="p-4 space-y-3">
          {[
            { label: "Unit type", value: "Nitrogen Credits" },
            { label: "Total credits", value: "48.2 kg/yr" },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between py-1 border-b border-border/50">
              <span className="text-xs text-muted-foreground">{row.label}</span>
              <span className="text-sm font-semibold">{row.value}</span>
            </div>
          ))}

          <div className="space-y-2 pt-1">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Allocated</span>
                <span className="text-muted-foreground">0 kg/yr · 0%</span>
              </div>
              <Progress value={0} className="h-2.5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Available</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">48.2 kg/yr · 100%</span>
              </div>
              <Progress value={100} className="h-2.5 [&>div]:bg-emerald-500" />
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-medium pt-1">
            <CheckCircle2 className="h-4 w-4" />
            Ready for matching
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Step 9: Developer Requirement Preview ────────────────────────────────────

function DeveloperPreview() {
  return (
    <div className="h-full flex items-center justify-center p-6">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Taylor Wimpey plc</CardTitle>
            <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 text-xs">Demand</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className="text-xs">Developer / Housebuilder</Badge>
          </div>
          {[
            { label: "Requirement", value: "30 kg/yr nitrogen credits" },
            { label: "Catchment", value: "Solent" },
            { label: "Planning authority", value: "Eastleigh BC" },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
              <span className="text-xs text-muted-foreground">{row.label}</span>
              <span className="text-sm font-medium">{row.value}</span>
            </div>
          ))}
          <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2.5 mt-1">
            <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-300">Cannot break ground until BNG secured. 200-home scheme.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Step 10: Supply Matching Preview ────────────────────────────────────────

function MatchingPreview() {
  return (
    <div className="h-full flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-3">
        <div className="text-xs text-muted-foreground bg-muted/50 rounded px-3 py-1.5 flex items-center gap-2">
          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
          Solent catchment
          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
          Sufficient units
          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
          Price range
        </div>

        <Card className="border-2 border-emerald-400 shadow-lg shadow-emerald-100 dark:shadow-emerald-950/30">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold">Whiteley Farm</p>
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 text-xs">Best match</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">BGS-SOL-2024-0847 · Solent</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">£2,500/kg</p>
                <p className="text-xs text-muted-foreground">48.2 kg/yr avail.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {[
          { name: "Test Valley Grassland", ref: "BGS-SOL-2024-0631", avail: "22.0 kg/yr", price: "£2,750/kg" },
          { name: "Hamble Valley", ref: "BGS-SOL-2023-0418", avail: "15.5 kg/yr", price: "£3,100/kg" },
        ].map((site) => (
          <Card key={site.name} className="shadow">
            <CardContent className="p-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium">{site.name}</p>
                  <p className="text-xs text-muted-foreground">{site.ref} · Solent</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{site.price}</p>
                  <p className="text-xs text-muted-foreground">{site.avail} avail.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Step 11: Generate Quote Preview ─────────────────────────────────────────

function QuotePreview() {
  return (
    <div className="h-full flex items-center justify-center p-6">
      <Card className="w-full max-w-sm shadow-lg">
        <div className="bg-muted/50 rounded-t-xl px-4 py-3 border-b">
          <p className="text-xs text-muted-foreground">Quote — D-0038</p>
          <p className="text-sm font-semibold">Taylor Wimpey plc</p>
        </div>
        <CardContent className="p-4 space-y-2">
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex justify-between py-1 border-b">
              <span>Site</span>
              <span className="font-medium text-foreground text-right">Whiteley Farm (BGS-SOL-2024-0847)</span>
            </div>
            <div className="flex justify-between py-1 border-b">
              <span>Units</span>
              <span className="font-medium text-foreground">30 kg/yr nitrogen credits</span>
            </div>
            <div className="flex justify-between py-1 border-b">
              <span>Unit price</span>
              <span className="font-medium text-foreground">£2,500 / kg</span>
            </div>
            <div className="flex justify-between py-1.5 border-b">
              <span>Subtotal</span>
              <span className="font-semibold text-foreground text-base">£75,000</span>
            </div>
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-emerald-700 dark:text-emerald-300 font-medium">Your commission (20%)</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-300 text-base">£15,000</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Net to landowner</span>
              <span className="font-medium">£60,000</span>
            </div>
          </div>

          <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" size="sm">
            Send Quote
            <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Step 12: Deal in Progress Preview ───────────────────────────────────────

function DealPreview() {
  const stages = ["Lead", "Qualified", "Legal", "NE Reg.", "Matched", "Quote", "Contracted"];
  const currentStage = 6;
  return (
    <div className="h-full flex items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-4">
        <Card className="shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-mono text-muted-foreground">D-0038</CardTitle>
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 text-xs">Contract Signed</Badge>
            </div>
            <p className="text-sm font-semibold">Taylor Wimpey / Whiteley Farm</p>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="relative flex items-center">
              <div className="absolute top-3 left-0 right-0 h-0.5 bg-muted" />
              <div className="absolute top-3 left-0 h-0.5 bg-emerald-500 transition-all" style={{ width: "93%" }} />
              <div className="relative flex w-full justify-between">
                {stages.map((s, i) => (
                  <div key={s} className="flex flex-col items-center gap-1.5">
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center z-10 transition-colors ${
                        i < currentStage
                          ? "bg-emerald-500 border-emerald-500"
                          : i === currentStage
                            ? "bg-blue-600 border-blue-600"
                            : "bg-background border-muted"
                      }`}
                    >
                      {i < currentStage && <CheckCircle2 className="h-3 w-3 text-white" />}
                      {i === currentStage && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <span className={`text-xs text-center leading-none ${i === currentStage ? "font-semibold text-blue-600 dark:text-blue-400" : "text-muted-foreground"}`}>
                      {s}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs py-1">Robert Whiteley · Supply</Badge>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <Badge variant="outline" className="text-xs py-1">Rachel Thompson · Demand</Badge>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <Badge variant="outline" className="text-xs py-1">Whiteley Farm · Site</Badge>
        </div>
      </div>
    </div>
  );
}

// ─── Step 13: Payment & Commission Preview ────────────────────────────────────

function PaymentPreview() {
  return (
    <div className="h-full flex items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-4">
        <div className="flex items-stretch gap-2">
          {[
            {
              label: "Taylor Wimpey",
              amount: "£75,000",
              direction: "in",
              status: "Received",
              statusColour: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200",
              bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800",
            },
            {
              label: "Ironheart",
              amount: "£15,000",
              direction: "commission",
              status: "Earned",
              statusColour: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 border-violet-200",
              bg: "bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800",
            },
            {
              label: "Robert Whiteley",
              amount: "£60,000",
              direction: "out",
              status: "Disbursed",
              statusColour: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200",
              bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800",
            },
          ].map((party, i, arr) => (
            <div key={party.label} className="flex items-center gap-2 flex-1 min-w-0">
              <Card className={`border flex-1 ${party.bg}`}>
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground truncate">{party.label}</p>
                  <p className="text-base font-bold mt-1">{party.amount}</p>
                  <Badge className={`${party.statusColour} border text-xs mt-1.5`}>{party.status}</Badge>
                </CardContent>
              </Card>
              {i < arr.length - 1 && (
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </div>
          ))}
        </div>

        <Card className="shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PoundSterling className="h-4 w-4 text-emerald-500" />
              <span className="text-sm text-muted-foreground">Commission YTD</span>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">£312,500</span>
              <p className="text-xs text-muted-foreground">this year</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Step 14: Compliance Timeline Preview ─────────────────────────────────────

function CompliancePreview() {
  const startYear = 2026;
  const endYear = 2056;
  const totalYears = endYear - startYear;
  const currentYear = 2026;

  const events: { year: number; type: "annual" | "condition" | "audit" }[] = [];
  for (let y = startYear; y <= endYear; y++) {
    events.push({ year: y, type: "annual" });
    if ([5, 10, 15, 20, 25, 30].includes(y - startYear)) events.push({ year: y, type: "condition" });
    if ([10, 20, 30].includes(y - startYear)) events.push({ year: y, type: "audit" });
  }

  return (
    <div className="h-full flex items-center justify-center p-6">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Whiteley Farm — 30-Year Obligation</CardTitle>
          <p className="text-xs text-muted-foreground">2026 → 2056 · Habitat Management Monitoring Plan</p>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="relative h-16">
            <div className="absolute top-4 left-0 right-0 h-1 bg-muted rounded-full" />

            {[0, 5, 10, 15, 20, 25, 30].map((offset) => {
              const pct = (offset / totalYears) * 100;
              const year = startYear + offset;
              return (
                <div key={offset} className="absolute top-1" style={{ left: `${pct}%`, transform: "translateX(-50%)" }}>
                  <div className="flex flex-col items-center gap-1">
                    <div className={`rounded-full ${offset === 0 ? "w-3 h-3 bg-blue-600" : [10, 20, 30].includes(offset) ? "w-3 h-3 bg-amber-500" : "w-2.5 h-2.5 bg-blue-400"}`} />
                    <span className="text-xs text-muted-foreground mt-0.5">{year}</span>
                  </div>
                </div>
              );
            })}

            {Array.from({ length: totalYears + 1 }, (_, i) => i).map((offset) => {
              const pct = (offset / totalYears) * 100;
              const isMajor = [0, 5, 10, 15, 20, 25, 30].includes(offset);
              if (isMajor) return null;
              return (
                <div
                  key={`dot-${offset}`}
                  className="absolute top-3.5 w-1.5 h-1.5 rounded-full bg-emerald-400"
                  style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
                />
              );
            })}
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-muted-foreground">Annual survey</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
              <span className="text-muted-foreground">Condition assessment</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-muted-foreground">NE Audit</span>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2.5">
            <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <p className="text-xs text-blue-700 dark:text-blue-300">Next: Annual survey due Dec 2026</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Step 15: AI Assistant Preview ───────────────────────────────────────────

function AIAssistantPreview() {
  return (
    <div className="h-full flex items-center justify-center p-6">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="pb-2 border-b">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-sm">Ironheart AI</CardTitle>
              <p className="text-xs text-emerald-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                Online · Portfolio reviewed overnight
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <div className="bg-muted/50 rounded-xl rounded-tl-sm px-3 py-2.5 max-w-[90%]">
            <p className="text-xs leading-relaxed">Good morning. I&apos;ve reviewed your portfolio overnight and found some items that need your attention.</p>
          </div>

          {[
            { icon: "🔍", label: "Checking compliance deadlines...", done: true },
            { icon: "📋", label: "Scanning 42 active deals...", done: true },
          ].map((tool) => (
            <div key={tool.label} className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 rounded px-2.5 py-1.5">
              <span>{tool.icon}</span>
              <span className="flex-1">{tool.label}</span>
              {tool.done ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
              )}
            </div>
          ))}

          <div className="bg-muted/50 rounded-xl rounded-tl-sm px-3 py-2.5 max-w-[95%] space-y-1.5">
            <p className="text-xs leading-relaxed">
              <span className="font-semibold text-amber-600 dark:text-amber-400">7 overdue compliance items</span> need attention today.
            </p>
            <p className="text-xs leading-relaxed">Deal <span className="font-mono font-semibold">D-0038</span> is ready for payment disbursement.</p>
            <p className="text-xs leading-relaxed">Whiteley Farm annual survey due in <span className="font-semibold">9 months</span> — recommend scheduling now.</p>
          </div>

          <div className="border rounded-lg px-3 py-2.5 flex items-center gap-2 text-muted-foreground">
            <span className="text-xs flex-1">Ask anything about your portfolio...</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Step definitions ─────────────────────────────────────────────────────────

const DEMO_STEPS = [
  {
    step: 1,
    title: "Command Centre",
    page: "/admin/brokerage-mockups/dashboard",
    icon: LayoutDashboard,
    accent: "bg-blue-500",
    accentText: "text-blue-500",
    narrative:
      "Your daily command centre. £8.4M pipeline, 42 active deals, 7 overdue compliance items. The lifecycle funnel shows where every deal sits across your entire business at a glance.",
    facts: [
      "£8.4M total pipeline value",
      "42 active deals across 5 catchments",
      "7 compliance items need attention today",
    ],
    Preview: DashboardPreview,
  },
  {
    step: 2,
    title: "New Supply Contact",
    page: "/admin/brokerage-mockups/contacts",
    icon: UserPlus,
    accent: "bg-emerald-500",
    accentText: "text-emerald-500",
    narrative:
      "A landowner calls in. We capture Robert Whiteley — farmer in the Solent catchment, 60 hectares of arable land. Catchment is auto-detected from his postcode. He's tagged as a Supply partner.",
    facts: [
      "Auto-detects catchment from postcode SO30 2EJ",
      "Tags: Arable, Hampshire, Nitrogen credits",
      "Linked to 1 site and 1 deal in progress",
    ],
    Preview: ContactPreview,
  },
  {
    step: 3,
    title: "Onboard Site",
    page: "/admin/brokerage-mockups/sites",
    icon: MapPin,
    accent: "bg-amber-500",
    accentText: "text-amber-500",
    narrative:
      "We onboard Whiteley Farm as a candidate supply site. Land area, current use, catchment, and credit type captured. A BGS reference is auto-assigned and assessment is triggered.",
    facts: [
      "60 ha arable land, Solent catchment",
      "Nitrogen credit potential: 48.2 kg/yr",
      "BGS Ref auto-assigned on registration",
    ],
    Preview: SitePreview,
  },
  {
    step: 4,
    title: "Schedule Assessment",
    page: "/admin/brokerage-mockups/assessments/schedule",
    icon: ClipboardCheck,
    accent: "bg-violet-500",
    accentText: "text-violet-500",
    narrative:
      "Time to send an ecologist. We pick the site, choose assessment type, and assign Sarah Chen — she's available Thursday 12th and specialises in nutrient surveys and BNG baseline work.",
    facts: [
      "Sarah Chen available Thursday 12 Mar",
      "NN Baseline Assessment: £650 fee",
      "Results uploaded directly to the platform",
    ],
    Preview: AssessmentSchedulePreview,
  },
  {
    step: 5,
    title: "Assessment Results",
    page: "/admin/brokerage-mockups/assessments",
    icon: FileSearch,
    accent: "bg-cyan-500",
    accentText: "text-cyan-500",
    narrative:
      "Sarah visits the site and records baseline data. The system calculates: 48.2 kg N/yr credit yield from 60 ha converted to buffer strips. Photos, field notes, and report attached.",
    facts: [
      "48.2 kg/yr credit yield calculated",
      "Photos and field notes attached to record",
      "PDF report stored with the site record",
    ],
    Preview: AssessmentResultsPreview,
  },
  {
    step: 6,
    title: "Nutrient Calculator",
    page: "/admin/brokerage-mockups/assessments/metric",
    icon: Calculator,
    accent: "bg-indigo-500",
    accentText: "text-indigo-500",
    narrative:
      "The Natural England nutrient budget methodology runs inside the platform. Input land use, area, soil type — get credit yield and market value instantly. No more spreadsheets.",
    facts: [
      "Natural England methodology built-in",
      "No spreadsheets — calculation lives in the platform",
      "Auditable and version-controlled",
    ],
    Preview: CalculatorPreview,
  },
  {
    step: 7,
    title: "Legal & Documents",
    page: "/admin/brokerage-mockups/documents",
    icon: FileSignature,
    accent: "bg-rose-500",
    accentText: "text-rose-500",
    narrative:
      "Legal kicks off. The S106 agreement is generated from a template in minutes, sent for signatures. We track who's signed and who hasn't. 80-year legal commitment secured.",
    facts: [
      "S106 generated from template in under 2 minutes",
      "DocuSign-style party tracking built in",
      "80-year legal commitment secured",
    ],
    Preview: LegalPreview,
  },
  {
    step: 8,
    title: "Site Goes Live",
    page: "/admin/brokerage-mockups/sites/S-0001",
    icon: Leaf,
    accent: "bg-emerald-600",
    accentText: "text-emerald-600",
    narrative:
      "Legal is complete. Whiteley Farm is now an active gain site with 48.2 kg/yr nitrogen credits available. The capacity gauge shows available and allocated units in real time.",
    facts: [
      "48.2 kg/yr available for immediate matching",
      "Capacity visible across all brokers instantly",
      "Supply-side deal flow begins",
    ],
    Preview: SiteLivePreview,
  },
  {
    step: 9,
    title: "Developer Requirement",
    page: "/admin/brokerage-mockups/contacts",
    icon: Users,
    accent: "bg-sky-500",
    accentText: "text-sky-500",
    narrative:
      "Meanwhile, Taylor Wimpey needs 30 kg/yr of nitrogen credits for a 200-home development in Eastleigh. Their planning condition says they cannot break ground until BNG is secured.",
    facts: [
      "200-home scheme needs 30 kg/yr off-site",
      "Planning blocked until BNG credit secured",
      "Eastleigh Borough Council requirement",
    ],
    Preview: DeveloperPreview,
  },
  {
    step: 10,
    title: "Supply Matching",
    page: "/admin/brokerage-mockups/matching",
    icon: GitCompareArrows,
    accent: "bg-purple-500",
    accentText: "text-purple-500",
    narrative:
      "One click. The system finds matching supply sites in the Solent catchment, ranked by price, availability, and fit. Whiteley Farm is the clear best match.",
    facts: [
      "3 Solent sites matched in under 1 second",
      "Ranked by price, availability, and catchment fit",
      "Whiteley Farm: best price, right catchment",
    ],
    Preview: MatchingPreview,
  },
  {
    step: 11,
    title: "Generate Quote",
    page: "/admin/brokerage-mockups/deals/D-0038",
    icon: Receipt,
    accent: "bg-orange-500",
    accentText: "text-orange-500",
    narrative:
      "We generate a quote: 30 kg/yr at £2,500/kg = £75,000. Your 20% commission is £15,000. Robert Whiteley receives £60,000. One click sends it to the client.",
    facts: [
      "30 kg × £2,500 = £75,000 deal value",
      "Your 20% commission: £15,000 earned",
      "Sent to client in one click",
    ],
    Preview: QuotePreview,
  },
  {
    step: 12,
    title: "Deal in Progress",
    page: "/admin/brokerage-mockups/deals/D-0038",
    icon: Handshake,
    accent: "bg-blue-600",
    accentText: "text-blue-600",
    narrative:
      "Deal D-0038 is now in its final stage. The lifecycle bar shows exactly where we are. All parties, documents, site, and financials are linked in a single view.",
    facts: [
      "Contract signed 14 Jan 2026",
      "All parties, docs, and financials linked",
      "Deal D-0038 at Contract Signed stage",
    ],
    Preview: DealPreview,
  },
  {
    step: 13,
    title: "Payment & Commission",
    page: "/admin/brokerage-mockups/financials",
    icon: PoundSterling,
    accent: "bg-green-500",
    accentText: "text-green-500",
    narrative:
      "Payment comes through. £75,000 from Taylor Wimpey. £60,000 disbursed to Robert Whiteley. £15,000 is your commission. Every penny tracked, recorded, and reported.",
    facts: [
      "£75,000 received from Taylor Wimpey",
      "£60,000 disbursed to Robert Whiteley",
      "£15,000 commission earned — £312k YTD",
    ],
    Preview: PaymentPreview,
  },
  {
    step: 14,
    title: "Ongoing Compliance",
    page: "/admin/brokerage-mockups/compliance",
    icon: ShieldCheck,
    accent: "bg-red-500",
    accentText: "text-red-500",
    narrative:
      "The deal closes, but 30 years of habitat management begins. Annual condition assessments auto-scheduled, NE audits tracked, HMMP milestones monitored. Your compliance dashboard runs itself.",
    facts: [
      "30 years of monitoring auto-scheduled",
      "Annual surveys, NE audits, HMMP reviews",
      "Never miss a deadline — alerts built in",
    ],
    Preview: CompliancePreview,
  },
  {
    step: 15,
    title: "AI Operations Assistant",
    page: "/admin/brokerage-mockups/ai-assistant",
    icon: Bot,
    accent: "bg-violet-600",
    accentText: "text-violet-600",
    narrative:
      "Your AI assistant reviews the entire portfolio overnight. It drafts compliance reminders, flags overdue obligations, matches developer requirements to supply, and briefs you each morning.",
    facts: [
      "Reviews your entire portfolio overnight",
      "Drafts compliance reminders automatically",
      "Briefs you each morning on what matters",
    ],
    Preview: AIAssistantPreview,
  },
];

// ─── Closing Screen ───────────────────────────────────────────────────────────

function ClosingScreen({ onRestart }: { onRestart: () => void }) {
  return (
    <div className="h-screen flex flex-col items-center justify-center px-8 bg-background">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center mx-auto">
          <span className="text-white text-xl font-bold">IH</span>
        </div>

        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-3">Running a BNG brokerage with Ironheart.</h1>
          <p className="text-lg text-muted-foreground">
            From first landowner call to 30 years of compliance — one platform.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
          {[
            { label: "Active deals", value: "42", colour: "border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800" },
            { label: "Pipeline value", value: "£8.4M", colour: "border-violet-200 bg-violet-50 dark:bg-violet-950/30 dark:border-violet-800" },
            { label: "Sites managed", value: "12", colour: "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800" },
            { label: "Commission YTD", value: "£312k", colour: "border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800" },
          ].map((m) => (
            <Card key={m.label} className={`border ${m.colour}`}>
              <CardContent className="p-5 text-center">
                <p className="text-2xl font-bold">{m.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{m.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Button asChild size="lg">
            <Link href="/admin/brokerage-mockups/dashboard">
              Explore the platform
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
          <Button variant="outline" size="lg" onClick={onRestart}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Start over
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DemoWalkthroughPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [showClosing, setShowClosing] = useState(false);

  const step = DEMO_STEPS[currentStep];
  const Icon = step.icon;
  const Preview = step.Preview;

  const goNext = () => {
    if (currentStep < DEMO_STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      setShowClosing(true);
    }
  };

  const goPrev = () => {
    if (showClosing) {
      setShowClosing(false);
    } else if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  };

  const restart = () => {
    setCurrentStep(0);
    setShowClosing(false);
  };

  if (showClosing) {
    return <ClosingScreen onRestart={restart} />;
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] flex overflow-hidden">
      {/* ── Left panel ─────────────────────────────────────────────────────── */}
      <div className="w-[40%] min-w-80 max-w-sm xl:max-w-md flex flex-col border-r border-border bg-card overflow-hidden">
        {/* Accent stripe */}
        <div className={`h-1.5 shrink-0 ${step.accent} transition-all duration-300`} />

        {/* Step counter + dots */}
        <div className="px-6 pt-5 pb-3 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted-foreground font-medium">
              Step {currentStep + 1} of {DEMO_STEPS.length}
            </span>
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {DEMO_STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => { setCurrentStep(i); setShowClosing(false); }}
                className={`h-2 rounded-full transition-all duration-200 cursor-pointer ${
                  i === currentStep
                    ? `${step.accent} w-6`
                    : i < currentStep
                      ? "bg-emerald-500 w-2"
                      : "bg-border w-2"
                }`}
                aria-label={`Go to step ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Main content — scrollable internally */}
        <div className="flex-1 px-6 overflow-y-auto space-y-5 pb-6 min-h-0">
          {/* Icon + title */}
          <div className="flex items-center gap-3 pt-1">
            <div className={`shrink-0 w-10 h-10 rounded-xl ${step.accent} flex items-center justify-center`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-bold tracking-tight leading-tight">{step.title}</h2>
          </div>

          {/* Narrative */}
          <p className="text-sm text-muted-foreground leading-relaxed">{step.narrative}</p>

          {/* Key facts */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Key facts</p>
            <ul className="space-y-1.5">
              {step.facts.map((fact) => (
                <li key={fact} className="flex items-start gap-2 text-sm">
                  <div className={`w-1.5 h-1.5 rounded-full ${step.accent} mt-1.5 shrink-0`} />
                  {fact}
                </li>
              ))}
            </ul>
          </div>

          {/* Open page link */}
          <Link
            href={step.page}
            className="flex items-center justify-between group border rounded-lg px-3 py-2.5 hover:border-primary/40 transition-colors text-sm"
          >
            <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Open page</span>
            </div>
            <ArrowRight className={`h-3.5 w-3.5 ${step.accentText} shrink-0`} />
          </Link>
        </div>

        {/* Navigation controls */}
        <div className="px-6 py-4 border-t border-border bg-card shrink-0">
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={goPrev}
              disabled={currentStep === 0}
              className="flex-1"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              size="sm"
              onClick={goNext}
              className={`flex-1 ${step.accent} hover:opacity-90 text-white border-0`}
            >
              {currentStep === DEMO_STEPS.length - 1 ? "Finish" : "Next"}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Right panel ────────────────────────────────────────────────────── */}
      <div className="flex-1 bg-muted/20 overflow-y-auto relative transition-all duration-300">
        {/* Subtle step label top-right */}
        <div className="absolute top-4 right-4 z-10">
          <Badge variant="outline" className="text-xs bg-background/80 backdrop-blur-sm">
            {step.step} / {DEMO_STEPS.length}
          </Badge>
        </div>

        {/* Preview component */}
        <div className="h-full min-h-full">
          <Preview />
        </div>
      </div>
    </div>
  );
}
