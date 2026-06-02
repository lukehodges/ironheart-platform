// src/modules/integrations/index.ts
export { integrationsRouter } from './integrations.router'
export { integrationsFunctions } from './integrations.events'
export { integrationsService } from './integrations.service'
export { getProvider, getAllProviders } from './integrations.registry'
export type { IntegrationProvider, DomainEvent, DomainEventType } from './integrations.types'

// ─── New (event-framework phase) ──────────────────────────────────────────────
export { integrationConnectionsRouter } from './integration-connections.router'
export { integrationConnectionsService } from './integration-connections.service'
export { integrationConnectionsRepository } from './integration-connections.repository'

// Register processors at module load — side-effect import.
import './processors/gmail-email-received.processor'
