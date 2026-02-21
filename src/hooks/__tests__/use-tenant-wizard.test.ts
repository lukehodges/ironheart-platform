import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTenantWizard } from '../use-tenant-wizard'

// Mock tRPC
vi.mock('@/lib/trpc/react', () => ({
  api: {
    platform: {
      createTenant: {
        useMutation: () => ({
          mutate: vi.fn(),
          isPending: false,
        }),
      },
    },
  },
}))

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}))


describe('useTenantWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('initializes with step 1', () => {
    const { result } = renderHook(() => useTenantWizard())
    expect(result.current.state.step).toBe(1)
  })

  it('advances to next step', () => {
    const { result } = renderHook(() => useTenantWizard())

    act(() => {
      result.current.nextStep()
    })

    expect(result.current.state.step).toBe(2)
  })

  it('goes back to previous step', () => {
    const { result } = renderHook(() => useTenantWizard())

    act(() => {
      result.current.nextStep()
    })

    act(() => {
      result.current.prevStep()
    })

    expect(result.current.state.step).toBe(1)
  })

  it('updates business details', () => {
    const { result } = renderHook(() => useTenantWizard())

    act(() => {
      result.current.updateBusinessDetails({ businessName: 'Acme Corp' })
    })

    expect(result.current.state.businessDetails.businessName).toBe('Acme Corp')
  })

  it('updates selected plan', () => {
    const { result } = renderHook(() => useTenantWizard())

    act(() => {
      result.current.updatePlan('PROFESSIONAL')
    })

    expect(result.current.state.plan).toBe('PROFESSIONAL')
  })

  it('resets wizard state', () => {
    const { result } = renderHook(() => useTenantWizard())

    act(() => {
      result.current.nextStep()
      result.current.updatePlan('ENTERPRISE')
      result.current.reset()
    })

    expect(result.current.state.step).toBe(1)
    expect(result.current.state.plan).toBe('TRIAL')
  })
})
