import { useMemo } from 'react';
import type { ChartDataPoint } from '@/types/analytics';

export function useChartData(rawData: unknown[] | undefined) {
  return useMemo(() => {
    if (!rawData) return [];
    return rawData.map((item: any) => ({
      date: item.date,
      value: item.value ?? 0,
      label: item.label,
    }));
  }, [rawData]);
}

export function useChartColors() {
  return {
    primary: 'hsl(var(--primary))',
    success: 'hsl(var(--success))',
    warning: 'hsl(var(--warning))',
    danger: 'hsl(var(--destructive))',
    muted: 'hsl(var(--muted-foreground))',
  };
}
