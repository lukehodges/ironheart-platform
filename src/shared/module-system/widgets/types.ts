export interface KPIWidgetData {
  value: number | string
  change: number
  trend: 'up' | 'down' | 'neutral'
  period: string
}

export interface LineWidgetData {
  points: { date: string; value: number }[]
}

export interface BarWidgetData {
  bars: { label: string; value: number }[]
}

export interface DonutWidgetData {
  segments: { label: string; value: number; color: string }[]
}

export interface HeatmapWidgetData {
  rows: { label: string; cells: { hour: number; value: number }[] }[]
}

export interface TableWidgetData {
  columns: string[]
  rows: Record<string, unknown>[]
}

export interface CustomWidgetProps {
  data: unknown
  label: string
  filters: { from: Date; to: Date }
  isLoading: boolean
}

export type StandardWidgetData =
  | KPIWidgetData
  | LineWidgetData
  | BarWidgetData
  | DonutWidgetData
  | HeatmapWidgetData
  | TableWidgetData
