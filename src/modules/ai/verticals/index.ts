import { VERTICAL_PROFILES } from "./profiles"
import { aiConfigRepository } from "../ai.config.repository"
import type { VerticalProfile } from "../ai.types"

export { VERTICAL_PROFILES } from "./profiles"

export async function getVerticalProfile(tenantId: string): Promise<VerticalProfile> {
  const config = await aiConfigRepository.getOrCreate(tenantId)
  const slug = (config as any).verticalProfile ?? "generic"
  return VERTICAL_PROFILES[slug] ?? VERTICAL_PROFILES.generic
}

export function listVerticalProfiles(): Array<{ slug: string; name: string; description: string }> {
  return Object.values(VERTICAL_PROFILES).map((p) => ({
    slug: p.slug,
    name: p.name,
    description: p.description,
  }))
}
