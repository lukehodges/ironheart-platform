import { z } from "zod";

// ---------------------------------------------------------------------------
// Settings module - Zod schemas for tRPC input validation
// ---------------------------------------------------------------------------

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.string()).optional(),
  expiresAt: z.date().optional(),
});

export const revokeApiKeySchema = z.object({
  id: z.string(),
});

export const getModuleTabsSchema = z.object({}).optional();
