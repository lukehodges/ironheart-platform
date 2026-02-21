// Analytics dashboard types

export interface KPICard {
  label: string;
  value: number | string;
  change: number; // percentage
  trend: 'up' | 'down' | 'neutral';
  period: string; // "vs last week"
}

export interface DateRangePreset {
  label: string;
  value: string; // '7d' | '30d' | '90d' | '12m'
  from: Date;
  to: Date;
}

export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface TopServiceData {
  serviceId: string;
  serviceName: string;
  revenue: number;
  bookingCount: number;
}

export interface StaffUtilizationData {
  staffId: string;
  staffName: string;
  hourSlots: { hour: number; utilizationPercent: number }[];
}

export interface ChurnRiskCustomer {
  customerId: string;
  customerName: string;
  email: string;
  lastBookingDate: Date;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  daysSinceLastBooking: number;
  totalSpend: number;
}

export type AnalyticsView = 'week' | 'month' | 'quarter' | 'year';
