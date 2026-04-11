// src/modules/integrations/integrations.schemas.ts
import { z } from 'zod'

export const initiateOAuthSchema = z.object({
  providerSlug: z.string().min(1),
  redirectUri: z.string().url(),
})

export const completeOAuthSchema = z.object({
  code: z.string().min(1),
  providerSlug: z.string().min(1),
  redirectUri: z.string().url(),
})

export const disconnectSchema = z.object({
  providerSlug: z.string().min(1),
})
