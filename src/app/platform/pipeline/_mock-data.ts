// ---------------------------------------------------------------------------
// Mock data for pipeline forecast and activity views
// ---------------------------------------------------------------------------

export interface ForecastMetric {
  label: string
  value: number
  delta: number // percentage change
  deltaLabel: string
}

export interface FunnelStep {
  stage: string
  count: number
  percentage: number
  color: string
}

export interface ActivityItem {
  id: string
  type: "moved" | "added" | "won" | "lost" | "note"
  text: string
  timestamp: string
  color: string
}

export interface HeatmapCell {
  stage: string
  band: string
  count: number
}

export interface MonthForecast {
  month: string
  actual: number
  forecast: number
}

export interface StageVelocity {
  stage: string
  avgDays: number
  color: string
}

// ---------------------------------------------------------------------------
// Forecast metrics
// ---------------------------------------------------------------------------

export const forecastMetrics: ForecastMetric[] = [
  { label: "Weighted Pipeline", value: 127500, delta: 12, deltaLabel: "vs last month" },
  { label: "Committed", value: 84000, delta: 8, deltaLabel: "vs last month" },
  { label: "Best Case", value: 195000, delta: 15, deltaLabel: "vs last month" },
  { label: "Worst Case", value: 62000, delta: -3, deltaLabel: "vs last month" },
]

// ---------------------------------------------------------------------------
// Revenue forecast (monthly)
// ---------------------------------------------------------------------------

export const monthlyForecast: MonthForecast[] = [
  { month: "Jan", actual: 42000, forecast: 38000 },
  { month: "Feb", actual: 51000, forecast: 45000 },
  { month: "Mar", actual: 38000, forecast: 48000 },
  { month: "Apr", actual: 0, forecast: 55000 },
  { month: "May", actual: 0, forecast: 62000 },
  { month: "Jun", actual: 0, forecast: 71000 },
]

// ---------------------------------------------------------------------------
// Pipeline heatmap
// ---------------------------------------------------------------------------

const heatmapStages = ["New Lead", "Contacted", "Qualified", "Proposal", "Negotiation"]
const dealBands = ["£0-5k", "£5-10k", "£10-25k", "£25k+"]

export const heatmapData: HeatmapCell[] = [
  // New Lead
  { stage: "New Lead", band: "£0-5k", count: 8 },
  { stage: "New Lead", band: "£5-10k", count: 5 },
  { stage: "New Lead", band: "£10-25k", count: 3 },
  { stage: "New Lead", band: "£25k+", count: 1 },
  // Contacted
  { stage: "Contacted", band: "£0-5k", count: 6 },
  { stage: "Contacted", band: "£5-10k", count: 4 },
  { stage: "Contacted", band: "£10-25k", count: 2 },
  { stage: "Contacted", band: "£25k+", count: 1 },
  // Qualified
  { stage: "Qualified", band: "£0-5k", count: 3 },
  { stage: "Qualified", band: "£5-10k", count: 5 },
  { stage: "Qualified", band: "£10-25k", count: 4 },
  { stage: "Qualified", band: "£25k+", count: 2 },
  // Proposal
  { stage: "Proposal", band: "£0-5k", count: 1 },
  { stage: "Proposal", band: "£5-10k", count: 3 },
  { stage: "Proposal", band: "£10-25k", count: 3 },
  { stage: "Proposal", band: "£25k+", count: 2 },
  // Negotiation
  { stage: "Negotiation", band: "£0-5k", count: 0 },
  { stage: "Negotiation", band: "£5-10k", count: 2 },
  { stage: "Negotiation", band: "£10-25k", count: 2 },
  { stage: "Negotiation", band: "£25k+", count: 3 },
]

export { heatmapStages, dealBands }

// ---------------------------------------------------------------------------
// Stage velocity (avg days per stage)
// ---------------------------------------------------------------------------

export const stageVelocity: StageVelocity[] = [
  { stage: "New Lead", avgDays: 3, color: "#8b5cf6" },
  { stage: "Contacted", avgDays: 7, color: "#3b82f6" },
  { stage: "Qualified", avgDays: 12, color: "#06b6d4" },
  { stage: "Proposal", avgDays: 8, color: "#f59e0b" },
  { stage: "Negotiation", avgDays: 15, color: "#10b981" },
]

// ---------------------------------------------------------------------------
// Recent activity feed
// ---------------------------------------------------------------------------

export const recentActivity: ActivityItem[] = [
  {
    id: "a1",
    type: "won",
    text: "Precision Auto Services moved to Won — £18,500",
    timestamp: "2h ago",
    color: "#10b981",
  },
  {
    id: "a2",
    type: "moved",
    text: "Sparkle Clean Ltd moved to Proposal",
    timestamp: "4h ago",
    color: "#3b82f6",
  },
  {
    id: "a3",
    type: "added",
    text: "Thames Valley Electrical added to pipeline",
    timestamp: "6h ago",
    color: "#8b5cf6",
  },
  {
    id: "a4",
    type: "moved",
    text: "Bright Smile Dental moved to Qualified",
    timestamp: "1d ago",
    color: "#06b6d4",
  },
  {
    id: "a5",
    type: "lost",
    text: "Northern Recruitment Group marked as Lost — budget constraints",
    timestamp: "1d ago",
    color: "#ef4444",
  },
  {
    id: "a6",
    type: "note",
    text: "Reynolds Plumbing — follow-up call scheduled for Friday",
    timestamp: "2d ago",
    color: "#f59e0b",
  },
]
