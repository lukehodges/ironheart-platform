// src/modules/integrations/index.ts
export { integrationsRouter } from './integrations.router'
export { integrationsFunctions } from './integrations.events'
export { integrationsService } from './integrations.service'
export { getProvider, getAllProviders } from './integrations.registry'
export type { IntegrationProvider, DomainEvent, DomainEventType } from './integrations.types'
