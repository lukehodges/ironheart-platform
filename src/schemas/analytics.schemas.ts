import { z } from 'zod';

export const dateRangePresetSchema = z.enum(['7d', '30d', '90d', '12m', 'custom']);

export const analyticsFiltersSchema = z.object({
  preset: dateRangePresetSchema.optional(),
  from: z.date().optional(),
  to: z.date().optional(),
  staffIds: z.array(z.uuid()).optional(),
  serviceIds: z.array(z.uuid()).optional(),
});

export const exportFormatSchema = z.enum(['csv', 'pdf']);

export type AnalyticsFilters = z.infer<typeof analyticsFiltersSchema>;
export type DateRangePreset = z.infer<typeof dateRangePresetSchema>;
export type ExportFormat = z.infer<typeof exportFormatSchema>;
