import type { AgentTool } from "../ai.types"
import { reviewRepository } from "@/modules/review/review.repository"

export const reviewTools: AgentTool[] = [
  {
    name: "review.list",
    description:
      "List reviews with optional filters. Returns rating, comment, customer, staff, public/private status, and issue category. Use to analyze customer feedback.",
    module: "review",
    permission: "reviews:read",
    inputSchema: {
      type: "object",
      properties: {
        isPublic: { type: "boolean", description: "Filter by public/private" },
        staffId: { type: "string", description: "Filter by staff member ID" },
        minRating: {
          type: "number",
          description: "Minimum rating (1-5)",
        },
        maxRating: {
          type: "number",
          description: "Maximum rating (1-5)",
        },
        hasIssue: {
          type: "boolean",
          description: "Filter for reviews with/without issue categories",
        },
        limit: { type: "number", description: "Max results (default 20)" },
      },
    },
    execute: async (input: unknown, ctx) => {
      const params = input as Record<string, unknown>
      const result = await reviewRepository.listReviews(ctx.tenantId, {
        isPublic: params.isPublic as boolean | undefined,
        staffId: params.staffId as string | undefined,
        minRating: params.minRating as number | undefined,
        maxRating: params.maxRating as number | undefined,
        hasIssue: params.hasIssue as boolean | undefined,
        limit: (params.limit as number) ?? 20,
      })
      return result
    },
  },
  {
    name: "review.getById",
    description:
      "Get full details of a specific review by its ID. Returns rating, comment, customer, staff, resolution status, and timestamps.",
    module: "review",
    permission: "reviews:read",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "The review ID" },
      },
      required: ["id"],
    },
    execute: async (input: unknown, ctx) => {
      const { id } = input as { id: string }
      return reviewRepository.findReviewById(ctx.tenantId, id)
    },
  },
]
