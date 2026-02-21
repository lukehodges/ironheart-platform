'use client';

import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { TopServiceData } from '@/types/analytics';

interface TopServicesChartProps {
  data?: TopServiceData[];
  isLoading?: boolean;
  className?: string;
}

// Recharts requires a specific format for horizontal bar charts
interface ChartData {
  name: string;
  revenue: number;
  fullName: string;
}

const PRIMARY_COLOR = 'hsl(var(--primary))';

// Truncate long service names to max 20 characters
const truncateName = (name: string, maxLength: number = 20): string => {
  if (name.length <= maxLength) return name;
  return name.substring(0, maxLength - 1) + '…';
};

// Format currency for display
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Custom tooltip to show full service name and formatted revenue
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length > 0) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
        <p className="text-sm font-medium text-card-foreground">{data.fullName}</p>
        <p className="text-sm font-semibold text-primary">
          {formatCurrency(data.revenue)}
        </p>
      </div>
    );
  }
  return null;
};

export function TopServicesChart({
  data,
  isLoading = false,
  className = '',
}: TopServicesChartProps) {
  // Transform data for Recharts horizontal bar chart
  const chartData: ChartData[] = useMemo(() => {
    if (!data || data.length === 0) return [];

    return data.map((service) => ({
      name: truncateName(service.serviceName),
      fullName: service.serviceName,
      revenue: service.revenue,
    }));
  }, [data]);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Top Services</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-6 w-32 shrink-0" />
                <Skeleton className="h-8 flex-1" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Top Services</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">No service data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Top Services</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              type="number"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              tickFormatter={formatCurrency}
            />
            <YAxis
              dataKey="name"
              type="category"
              width={115}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: 'hsl(var(--primary)/0.1)' }}
            />
            <Bar dataKey="revenue" fill={PRIMARY_COLOR} radius={[0, 8, 8, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={PRIMARY_COLOR}
                  opacity={0.8 + (index % 2) * 0.1}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
