# Logging

## Setup

```typescript
import { logger } from '@/shared/logger'

const log = logger.child({ module: 'loyalty.service' })
```

## Usage

```typescript
// CORRECT — object first, message second (Pino v8)
log.info({ tenantId, programId }, 'Loyalty program created')
log.error({ err, bookingId }, 'Failed to award points')
log.warn({ customerId }, 'Customer has no loyalty balance')
log.debug({ points, reason }, 'Points calculation complete')

// WRONG — message first
log.info('Created program', { programId })  // DON'T DO THIS
```

## Convention

- Always create a child logger per file: `logger.child({ module: 'module.layer' })`
- Include `tenantId` in all log entries for filtering
- Use `err` (not `error`) as the key for Error objects
- Log at appropriate levels:
  - `debug` — development diagnostics
  - `info` — business events (created, updated, deleted)
  - `warn` — unexpected but recoverable situations
  - `error` — failures requiring attention
