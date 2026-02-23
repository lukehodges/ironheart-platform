# Error Handling

## Domain errors (service/repository layer)

```typescript
import {
  NotFoundError,     // Resource not found → 404
  ForbiddenError,    // Permission denied → 403
  UnauthorizedError, // Not authenticated → 401
  ValidationError,   // Business rule violation → 400
  ConflictError,     // State conflict (e.g. duplicate, version mismatch) → 409
  BadRequestError,   // Invalid input → 400
} from '@/shared/errors'

// In repository/service:
throw new NotFoundError('Booking', bookingId)
throw new ConflictError('Slot is at full capacity')
throw new ValidationError('Cannot cancel a completed booking')
```

## Automatic conversion

The `errorConversionMiddleware` in `src/shared/trpc.ts` automatically converts `IronheartError` subclasses to `TRPCError` with the correct HTTP status code. You do **not** need to catch and re-throw.

## Sentry integration

- `INTERNAL_SERVER_ERROR` is automatically captured to Sentry via the tRPC error formatter
- Domain errors (4xx) are NOT sent to Sentry (they're expected)

## Frontend error handling

```typescript
// Mutations
const mutation = api.module.action.useMutation({
  onError: (error) => toast.error(error.message),
})

// Global: sonner toast for all user-facing errors
// NEVER use alert() or window.alert()
```
