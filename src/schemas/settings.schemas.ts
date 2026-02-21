import { z } from 'zod';

export const generalSettingsSchema = z.object({
  businessName: z.string().min(1).max(100),
  address: z.string().max(200),
  timezone: z.string(),
  currency: z.string().length(3), // ISO 4217
  logoUrl: z.string().url().optional(),
});

export const notificationSettingsSchema = z.object({
  emailEnabled: z.boolean(),
  smsEnabled: z.boolean(),
  reminderTiming: z.number().int().min(1).max(72),
  confirmationTemplate: z.string(),
  reminderTemplate: z.string(),
  cancellationTemplate: z.string(),
});

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(50),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

export type GeneralSettingsInput = z.infer<typeof generalSettingsSchema>;
export type NotificationSettingsInput = z.infer<typeof notificationSettingsSchema>;
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
