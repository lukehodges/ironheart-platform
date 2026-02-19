import { z } from 'zod'

export const submitReviewSchema = z.object({
  token: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(5000).optional(),
  isPublic: z.boolean().default(false),
})

export const createReviewRequestSchema = z.object({
  bookingId: z.string(),
  customerId: z.string().optional(),
  delay: z.string().optional(),
})

export const updateAutomationSchema = z.object({
  enabled: z.boolean().optional(),
  preScreenEnabled: z.boolean().optional(),
  autoPublicMinRating: z.number().min(1).max(5).optional(),
  delay: z.string().optional(),
  googleEnabled: z.boolean().optional(),
  googleUrl: z.string().url().optional(),
  privateEnabled: z.boolean().optional(),
  facebookEnabled: z.boolean().optional(),
  facebookUrl: z.string().url().optional(),
  channels: z.array(z.enum(['EMAIL', 'SMS', 'WHATSAPP'])).optional(),
  messageTemplate: z.string().max(2000).optional(),
  smsTemplate: z.string().max(160).optional(),
})

export const resolveIssueSchema = z.object({
  reviewId: z.string(),
  resolutionStatus: z.enum(['CONTACTED', 'RESOLVED', 'DISMISSED']),
  resolutionNotes: z.string().max(2000).optional(),
})

export const listReviewsSchema = z.object({
  isPublic: z.boolean().optional(),
  staffId: z.string().optional(),
  minRating: z.number().optional(),
  maxRating: z.number().optional(),
  hasIssue: z.boolean().optional(),
  limit: z.number().default(50),
  cursor: z.string().optional(),
})
