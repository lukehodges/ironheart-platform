// ---------------------------------------------------------------------------
// Settings module - type definitions
// ---------------------------------------------------------------------------

export interface ApiKey {
  id: string;
  tenantId: string;
  name: string;
  keyPrefix: string; // first 8 chars shown to user
  scopes: string[] | null;
  rateLimit: number;
  lastUsedAt: Date | null;
  usageCount: number;
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  createdBy: string | null;
}

/** Returned once on creation - the only time the full key is visible. */
export interface ApiKeyWithSecret extends ApiKey {
  rawKey: string;
}

export interface ModuleTab {
  slug: string;
  label: string;
  icon: string;
  section: "module";
}
