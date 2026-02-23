# Testing

## Configuration

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    pool: 'forks',  // Prevents cross-file mock contamination
    setupFiles: ['./vitest.setup.ts'],
  },
})
```

## Test structure

```typescript
// src/modules/loyalty/__tests__/loyalty.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { loyaltyService } from '../loyalty.service'
import { loyaltyRepository } from '../loyalty.repository'
import { inngest } from '@/shared/inngest'
import { NotFoundError, ConflictError } from '@/shared/errors'

// ---- Mocks ----

// Always mock db to prevent DATABASE_URL errors
vi.mock('@/shared/db', () => ({
  db: {
    transaction: vi.fn((fn) => fn({
      execute: vi.fn().mockResolvedValue([]),
    })),
  },
}))

vi.mock('../loyalty.repository', () => ({
  loyaltyRepository: {
    findProgram: vi.fn(),
    createProgram: vi.fn(),
    getBalance: vi.fn(),
    addPoints: vi.fn(),
  },
}))

vi.mock('@/shared/inngest', () => ({
  inngest: { send: vi.fn().mockResolvedValue(undefined) },
}))

vi.mock('@/shared/redis', () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
  },
}))

// ---- Helpers ----

const TENANT_ID = '00000000-0000-0000-0000-000000000001'

function makeProgram(overrides = {}) {
  return {
    id: '00000000-0000-0000-0000-000000000002',
    tenantId: TENANT_ID,
    name: 'Gold',
    pointsPerBooking: 10,
    isActive: true,
    ...overrides,
  }
}

// ---- Tests ----

describe('loyaltyService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getProgram', () => {
    it('returns program when found', async () => {
      const program = makeProgram()
      vi.mocked(loyaltyRepository.findProgram).mockResolvedValue(program)

      const result = await loyaltyService.getProgram(TENANT_ID)
      expect(result).toEqual(program)
      expect(loyaltyRepository.findProgram).toHaveBeenCalledWith(TENANT_ID)
    })

    it('returns null when not found', async () => {
      vi.mocked(loyaltyRepository.findProgram).mockResolvedValue(null)

      const result = await loyaltyService.getProgram(TENANT_ID)
      expect(result).toBeNull()
    })
  })

  describe('awardPoints', () => {
    it('throws NotFoundError when balance does not exist', async () => {
      vi.mocked(loyaltyRepository.getBalance).mockResolvedValue(null)

      await expect(
        loyaltyService.awardPoints(TENANT_ID, 'customer-1', 10, 'test')
      ).rejects.toThrow(NotFoundError)
    })
  })
})
```

## Key testing rules

1. **Always mock `@/shared/db`** — prevents `DATABASE_URL` errors in CI
2. **Always mock `@/shared/redis`** — prevents Upstash connection errors
3. **Always mock `@/shared/inngest`** — prevents Inngest API calls
4. **Mock at the repository level** — test services by mocking their repository
5. **Use `vi.clearAllMocks()` in `beforeEach`**
6. **Use factory functions** (`makeProgram()`, `makeBooking()`) for test data
7. **Use `pool: "forks"`** in vitest config — prevents cross-file mock contamination
8. **Test error paths** — verify domain errors are thrown correctly

## Running tests

```bash
npm test           # Run all tests once
npm run test:watch # Watch mode
npm run test:coverage # With coverage report
```
