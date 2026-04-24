"use client"

import Link from "next/link"
import {
  Users,
  Briefcase,
  Map,
  Smartphone,
  FileText,
  UserCheck,
  CreditCard,
  QrCode,
  Wrench,
  ShieldCheck,
  Receipt,
  FolderKanban,
  Kanban,
  GitBranch,
  Bell,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface MockupEntry {
  label: string
  description: string
  slug: string
  icon: React.ElementType
  accent: string
  bg: string
}

// ─── Mockup registry ──────────────────────────────────────────────────────────

const MOCKUPS: MockupEntry[] = [
  {
    label: "Resources",
    description: "Field resource management",
    slug: "resources",
    icon: Users,
    accent: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    label: "Jobs",
    description: "Job scheduling and dispatch",
    slug: "jobs",
    icon: Briefcase,
    accent: "text-violet-600",
    bg: "bg-violet-50",
  },
  {
    label: "Route Jobs",
    description: "Live dispatcher map view",
    slug: "route-jobs",
    icon: Map,
    accent: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    label: "Driver",
    description: "Mobile field app (dark)",
    slug: "driver",
    icon: Smartphone,
    accent: "text-zinc-500",
    bg: "bg-zinc-100",
  },
  {
    label: "Contracts",
    description: "Recurring contract management",
    slug: "contracts",
    icon: FileText,
    accent: "text-indigo-600",
    bg: "bg-indigo-50",
  },
  {
    label: "Classes",
    description: "Class participant check-in",
    slug: "classes",
    icon: UserCheck,
    accent: "text-teal-600",
    bg: "bg-teal-50",
  },
  {
    label: "Memberships",
    description: "Membership plans and usage",
    slug: "memberships",
    icon: CreditCard,
    accent: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    label: "Check-in",
    description: "QR code check-in (mobile)",
    slug: "check-in",
    icon: QrCode,
    accent: "text-sky-600",
    bg: "bg-sky-50",
  },
  {
    label: "Field",
    description: "Engineer mobile view (dark)",
    slug: "field",
    icon: Wrench,
    accent: "text-orange-600",
    bg: "bg-orange-50",
  },
  {
    label: "Certifications",
    description: "Staff certification tracking",
    slug: "certifications",
    icon: ShieldCheck,
    accent: "text-green-600",
    bg: "bg-green-50",
  },
  {
    label: "Job Billing",
    description: "Revenue split and invoicing",
    slug: "job-billing",
    icon: Receipt,
    accent: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    label: "Projects",
    description: "Project and task management",
    slug: "projects",
    icon: FolderKanban,
    accent: "text-rose-600",
    bg: "bg-rose-50",
  },
  {
    label: "CRM",
    description: "Customer pipeline (kanban)",
    slug: "crm",
    icon: Kanban,
    accent: "text-cyan-600",
    bg: "bg-cyan-50",
  },
  {
    label: "Split Rules",
    description: "Revenue distribution rules",
    slug: "split-rules",
    icon: GitBranch,
    accent: "text-pink-600",
    bg: "bg-pink-50",
  },
  {
    label: "Notification Triggers",
    description: "Automated notification setup",
    slug: "notification-triggers",
    icon: Bell,
    accent: "text-yellow-600",
    bg: "bg-yellow-50",
  },
]

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function MockupsIndexPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">UI Mockups</h1>
        <p className="text-sm text-zinc-500 mt-1">Browse all prototype screens</p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {MOCKUPS.map(({ label, description, slug, icon: Icon, accent, bg }) => (
          <Link
            key={slug}
            href={`/admin/mockups/${slug}`}
            className="group rounded-xl border border-zinc-200 bg-white p-5 flex items-start gap-4 hover:border-zinc-300 hover:shadow-sm transition-all"
          >
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${bg} group-hover:scale-105 transition-transform`}>
              <Icon className={`h-5 w-5 ${accent}`} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-900 group-hover:text-zinc-700 transition-colors">
                {label}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{description}</p>
            </div>
          </Link>
        ))}

        {/* Placeholder for future mockups */}
        <div className="rounded-xl border-2 border-dashed border-zinc-200 bg-white p-5 flex items-center justify-center text-zinc-400 min-h-[84px]">
          <p className="text-xs font-medium">More screens coming soon…</p>
        </div>
      </div>
    </div>
  )
}
