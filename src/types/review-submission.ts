import { z } from 'zod';

/**
 * Review submission state
 */
export interface ReviewSubmissionState {
  rating: number;
  feedback: string;
  bookingId: string | null;
  token: string | null;
  isAnonymous: boolean;
}

export const ReviewSubmissionStateSchema = z.object({
  rating: z.number().int().min(1).max(5),
  feedback: z.string().min(1, 'Feedback is required'),
  bookingId: z.uuid().nullable(),
  token: z.string().nullable(),
  isAnonymous: z.boolean().default(false),
});

/**
 * Review token validation state
 */
export interface ReviewTokenState {
  isValid: boolean;
  isExpired: boolean;
  bookingId: string | null;
  customerId: string | null;
  serviceName: string | null;
  errorMessage: string | null;
}

export const ReviewTokenStateSchema = z.object({
  isValid: z.boolean(),
  isExpired: z.boolean(),
  bookingId: z.uuid().nullable(),
  customerId: z.uuid().nullable(),
  serviceName: z.string().nullable(),
  errorMessage: z.string().nullable(),
});

/**
 * Public review submission payload
 */
export interface PublicReviewSubmission {
  token: string;
  rating: number;
  feedback: string;
  isAnonymous: boolean;
}

export const PublicReviewSubmissionSchema = z.object({
  token: z.string().min(1, 'Review token is required'),
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
  feedback: z.string().min(10, 'Feedback must be at least 10 characters'),
  isAnonymous: z.boolean().default(false),
});

/**
 * Review display (for showing submitted review)
 */
export interface ReviewDisplay {
  id: string;
  rating: number;
  feedback: string;
  customerName: string | null;
  serviceName: string;
  submittedAt: Date;
  isPublished: boolean;
}

export const ReviewDisplaySchema = z.object({
  id: z.uuid(),
  rating: z.number().int().min(1).max(5),
  feedback: z.string(),
  customerName: z.string().nullable(),
  serviceName: z.string(),
  submittedAt: z.coerce.date(),
  isPublished: z.boolean(),
});
