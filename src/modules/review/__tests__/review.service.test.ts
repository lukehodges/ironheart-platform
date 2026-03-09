import { describe, it, expect, vi, beforeEach } from 'vitest'
import { reviewService } from '../review.service'
import { reviewRepository } from '../review.repository'
import { inngest } from '@/shared/inngest'
import { bookingRepository } from '@/modules/booking/booking.repository'
import { NotFoundError, ValidationError } from '@/shared/errors'
import type { ReviewRecord, ReviewRequestRecord, ReviewAutomationSettings } from '../review.types'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../review.repository', () => ({
  reviewRepository: {
    createRequest: vi.fn(),
    updateRequestStatus: vi.fn(),
    findRequestByToken: vi.fn(),
    listRequests: vi.fn(),
    createReview: vi.fn(),
    findReviewById: vi.fn(),
    findByCustomer: vi.fn(),
    listReviews: vi.fn(),
    updateResolution: vi.fn(),
    getAutomationSettings: vi.fn(),
    upsertAutomationSettings: vi.fn(),
  },
}))

vi.mock('@/shared/inngest', () => ({
  inngest: { send: vi.fn().mockResolvedValue(undefined) },
}))

vi.mock('@/modules/booking/booking.repository', () => ({
  bookingRepository: {
    findById: vi.fn(),
  },
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TENANT_ID = '00000000-0000-0000-0000-000000000001'
const BOOKING_ID = '00000000-0000-0000-0000-000000000002'
const CUSTOMER_ID = '00000000-0000-0000-0000-000000000003'
const REVIEW_ID = '00000000-0000-0000-0000-000000000004'
const REQUEST_ID = '00000000-0000-0000-0000-000000000005'
const TOKEN = 'review-request-token-uuid'

function makeAutomationSettings(
  overrides: Partial<ReviewAutomationSettings> = {}
): ReviewAutomationSettings {
  return {
    id: '00000000-0000-0000-0000-000000000099',
    tenantId: TENANT_ID,
    enabled: true,
    preScreenEnabled: true,
    autoPublicMinRating: 4,
    delay: null,
    googleEnabled: false,
    googleUrl: null,
    privateEnabled: true,
    facebookEnabled: false,
    facebookUrl: null,
    channels: [],
    messageTemplate: null,
    smsTemplate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function makeReview(overrides: Partial<ReviewRecord> = {}): ReviewRecord {
  return {
    id: REVIEW_ID,
    tenantId: TENANT_ID,
    bookingId: BOOKING_ID,
    customerId: CUSTOMER_ID,
    staffId: null,
    rating: 5,
    comment: 'Great service!',
    isPublic: false,
    platform: null,
    issueCategory: null,
    resolutionStatus: null,
    resolutionNotes: null,
    resolvedBy: null,
    resolvedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function makeReviewRequest(
  overrides: Partial<ReviewRequestRecord> = {}
): ReviewRequestRecord {
  return {
    id: REQUEST_ID,
    tenantId: TENANT_ID,
    bookingId: BOOKING_ID,
    customerId: CUSTOMER_ID,
    status: 'PENDING',
    channel: null,
    sentAt: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// reviewService.shouldRequestReview
// ---------------------------------------------------------------------------

describe('reviewService.shouldRequestReview', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns false when automation disabled', async () => {
    const settings = makeAutomationSettings({ enabled: false })
    const result = await reviewService.shouldRequestReview(TENANT_ID, BOOKING_ID, settings)
    expect(result.proceed).toBe(false)
    expect(result.reason).toBe('automation-disabled')
  })

  it('returns true when preScreen disabled', async () => {
    const settings = makeAutomationSettings({ enabled: true, preScreenEnabled: false })
    const result = await reviewService.shouldRequestReview(TENANT_ID, BOOKING_ID, settings)
    expect(result.proceed).toBe(true)
    // bookingRepository.findById should not be called - we short-circuit
    expect(bookingRepository.findById).not.toHaveBeenCalled()
  })

  it('returns true for new customer with no reviews', async () => {
    vi.mocked(bookingRepository.findById).mockResolvedValue({
      customerId: CUSTOMER_ID,
    } as never)
    vi.mocked(reviewRepository.findByCustomer).mockResolvedValue([] as never)

    const settings = makeAutomationSettings()
    const result = await reviewService.shouldRequestReview(TENANT_ID, BOOKING_ID, settings)
    expect(result.proceed).toBe(true)
  })

  it('returns true when avg rating meets threshold', async () => {
    vi.mocked(bookingRepository.findById).mockResolvedValue({
      customerId: CUSTOMER_ID,
    } as never)
    // avg = (5 + 4 + 5) / 3 = 4.67 >= 4 threshold
    vi.mocked(reviewRepository.findByCustomer).mockResolvedValue([
      makeReview({ rating: 5 }),
      makeReview({ rating: 4 }),
      makeReview({ rating: 5 }),
    ] as never)

    const settings = makeAutomationSettings({ autoPublicMinRating: 4 })
    const result = await reviewService.shouldRequestReview(TENANT_ID, BOOKING_ID, settings)
    expect(result.proceed).toBe(true)
  })

  it('returns false when avg rating below threshold', async () => {
    vi.mocked(bookingRepository.findById).mockResolvedValue({
      customerId: CUSTOMER_ID,
    } as never)
    // avg = (2 + 1 + 3) / 3 = 2 < 4 threshold
    vi.mocked(reviewRepository.findByCustomer).mockResolvedValue([
      makeReview({ rating: 2 }),
      makeReview({ rating: 1 }),
      makeReview({ rating: 3 }),
    ] as never)

    const settings = makeAutomationSettings({ autoPublicMinRating: 4 })
    const result = await reviewService.shouldRequestReview(TENANT_ID, BOOKING_ID, settings)
    expect(result.proceed).toBe(false)
    expect(result.reason).toMatch(/pre-screen/)
  })
})

// ---------------------------------------------------------------------------
// reviewService.submitReview
// ---------------------------------------------------------------------------

describe('reviewService.submitReview', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('throws NotFoundError for invalid token', async () => {
    vi.mocked(reviewRepository.findRequestByToken).mockResolvedValue(null as never)

    await expect(
      reviewService.submitReview(TOKEN, { rating: 5, comment: 'Great!' })
    ).rejects.toThrow(NotFoundError)
  })

  it('throws ValidationError if request already completed', async () => {
    vi.mocked(reviewRepository.findRequestByToken).mockResolvedValue(
      makeReviewRequest({ status: 'COMPLETED' }) as never
    )

    await expect(
      reviewService.submitReview(TOKEN, { rating: 5, comment: 'Great!' })
    ).rejects.toThrow(ValidationError)
  })

  it('creates review and emits review/submitted event', async () => {
    vi.mocked(reviewRepository.findRequestByToken).mockResolvedValue(
      makeReviewRequest() as never
    )
    vi.mocked(reviewRepository.createReview).mockResolvedValue(makeReview() as never)
    vi.mocked(reviewRepository.updateRequestStatus).mockResolvedValue(undefined)

    const result = await reviewService.submitReview(TOKEN, { rating: 5, comment: 'Great!' })

    expect(result.id).toBe(REVIEW_ID)
    expect(result.rating).toBe(5)

    expect(inngest.send).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'review/submitted' })
    )
    expect(reviewRepository.updateRequestStatus).toHaveBeenCalledWith(
      REQUEST_ID,
      'COMPLETED',
      expect.objectContaining({ completedAt: expect.any(Date) }),
    )
  })
})
