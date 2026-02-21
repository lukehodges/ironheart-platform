import {
  LayoutDashboard,
  Calendar,
  Users,
  UserCheck,
  Clock,
  Zap,
  FileText,
  Star,
  CreditCard,
  BarChart3,
  Search,
  Code2,
  Building2,
  Settings,
  ScrollText,
  Shield,
  type LucideIcon,
} from "lucide-react"

export interface NavItem {
  title: string
  href: string
  icon: LucideIcon
  permission?: string      // required permission, e.g. 'bookings:read'
  isPlatformAdmin?: boolean // only for platform admins
  badge?: string           // optional badge text
  moduleSlug?: string      // if set, item hidden when module is disabled
}

export interface NavSection {
  title?: string
  items: NavItem[]
}

export const navSections: NavSection[] = [
  {
    items: [
      {
        title: "Dashboard",
        href: "/admin",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: "Operations",
    items: [
      {
        title: "Bookings",
        href: "/admin/bookings",
        icon: Calendar,
        permission: "bookings:read",
        moduleSlug: "booking",
      },
      {
        title: "Customers",
        href: "/admin/customers",
        icon: Users,
        permission: "customers:read",
        moduleSlug: "customer",
      },
      {
        title: "Team",
        href: "/admin/team",
        icon: UserCheck,
        permission: "team:read",
        moduleSlug: "team",
      },
      {
        title: "Scheduling",
        href: "/admin/scheduling",
        icon: Clock,
        permission: "scheduling:read",
        moduleSlug: "scheduling",
      },
    ],
  },
  {
    title: "Automation",
    items: [
      {
        title: "Workflows",
        href: "/admin/workflows",
        icon: Zap,
        permission: "workflows:read",
        moduleSlug: "workflow",
      },
      {
        title: "Forms",
        href: "/admin/forms",
        icon: FileText,
        permission: "forms:read",
        moduleSlug: "forms",
      },
      {
        title: "Reviews",
        href: "/admin/reviews",
        icon: Star,
        permission: "reviews:read",
        moduleSlug: "review",
      },
    ],
  },
  {
    title: "Finance",
    items: [
      {
        title: "Payments",
        href: "/admin/payments",
        icon: CreditCard,
        permission: "payments:read",
        moduleSlug: "payment",
      },
    ],
  },
  {
    title: "Intelligence",
    items: [
      {
        title: "Analytics",
        href: "/admin/analytics",
        icon: BarChart3,
        permission: "analytics:read",
      },
      {
        title: "Search",
        href: "/admin/search",
        icon: Search,
      },
    ],
  },
  {
    title: "Developer",
    items: [
      {
        title: "Developer",
        href: "/admin/developer",
        icon: Code2,
        permission: "developer:read",
        moduleSlug: "developer",
      },
    ],
  },
  {
    title: "Platform",
    items: [
      {
        title: "Tenants",
        href: "/platform/tenants",
        icon: Building2,
        isPlatformAdmin: true,
      },
    ],
  },
  {
    title: "Account",
    items: [
      {
        title: "Settings",
        href: "/admin/settings",
        icon: Settings,
      },
      {
        title: "Audit Log",
        href: "/admin/audit",
        icon: ScrollText,
        permission: "audit:view",
      },
    ],
  },
  {
    title: "Platform Admin",
    items: [
      {
        title: "Platform Admin",
        href: "/platform",
        icon: Shield,
        isPlatformAdmin: true,
      },
    ],
  },
]
