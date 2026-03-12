// src/modules/ai/ai.guardrails.ts

import { aiConfigRepository } from "./ai.config.repository"
import type { GuardrailTier } from "./ai.types"

/**
 * Default guardrail tiers for mutation procedures.
 * Key = full tRPC procedure path (e.g., "booking.updateStatus").
 * Procedures not listed default to CONFIRM.
 */
const DEFAULT_GUARDRAIL_TIERS: Record<string, GuardrailTier> = {
  // --- AUTO: Low-risk, append-only operations ---
  "booking.addNote": "AUTO",
  "customer.addNote": "AUTO",
  "customer.updateTags": "AUTO",

  // --- CONFIRM: Significant state changes ---
  "booking.updateStatus": "CONFIRM",
  "booking.create": "CONFIRM",
  "booking.cancel": "CONFIRM",
  "customer.create": "CONFIRM",
  "customer.update": "CONFIRM",
  "customer.merge": "CONFIRM",
  "scheduling.createSlot": "CONFIRM",
  "scheduling.deleteSlot": "CONFIRM",
  "review.respond": "CONFIRM",
  "workflow.create": "CONFIRM",
  "workflow.update": "CONFIRM",
  "workflow.execute": "CONFIRM",
  "team.updateAvailability": "CONFIRM",
  "team.updateCapacity": "CONFIRM",

  // --- RESTRICT: Dangerous / irreversible ---
  "customer.delete": "RESTRICT",
  "tenant.updateSettings": "RESTRICT",
  "platform.createTenant": "RESTRICT",
  "platform.deleteTenant": "RESTRICT",
}

/**
 * Resolve the effective guardrail tier for a procedure.
 * Priority: tenant override > default registry > CONFIRM fallback.
 */
export async function resolveGuardrailTier(
  tenantId: string,
  procedurePath: string
): Promise<GuardrailTier> {
  const config = await aiConfigRepository.getOrCreate(tenantId)
  return (
    config.guardrailOverrides[procedurePath] ??
    DEFAULT_GUARDRAIL_TIERS[procedurePath] ??
    "CONFIRM"
  )
}

/**
 * Get the default tier (without tenant overrides) for a procedure.
 * Used for display/documentation purposes.
 */
export function getDefaultGuardrailTier(procedurePath: string): GuardrailTier {
  return DEFAULT_GUARDRAIL_TIERS[procedurePath] ?? "CONFIRM"
}

/**
 * List all procedures with explicit guardrail classifications.
 * Used by admin UI and trust ratchet.
 */
export function listGuardrailDefaults(): Record<string, GuardrailTier> {
  return { ...DEFAULT_GUARDRAIL_TIERS }
}
