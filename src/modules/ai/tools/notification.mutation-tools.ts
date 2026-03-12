// src/modules/ai/tools/notification.mutation-tools.ts

import type { MutatingAgentTool } from "../ai.types"
import { inngest } from "@/shared/inngest"

export const notificationMutationTools: MutatingAgentTool[] = [
  {
    name: "notification.sendEmail",
    description: "Send an email notification. Requires a recipient email address, subject, and body. Use for follow-ups, confirmations, or custom communications.",
    module: "notification",
    permission: "notifications:write",
    guardrailTier: "CONFIRM",
    mutationDescription: "Sends an email to a recipient",
    isReversible: false,
    inputSchema: {
      type: "object",
      properties: {
        to: { type: "string", description: "Recipient email address" },
        subject: { type: "string", description: "Email subject line" },
        body: { type: "string", description: "Email body (plain text)" },
      },
      required: ["to", "subject", "body"],
    },
    execute: async (input: unknown, ctx) => {
      const { to, subject, body } = input as { to: string; subject: string; body: string }
      await inngest.send({
        name: "notification/send.email",
        data: {
          to,
          subject,
          html: `<p>${body.replace(/\n/g, "</p><p>")}</p>`,
          text: body,
          tenantId: ctx.tenantId,
          trigger: "ai-agent",
        },
      })
      return { sent: true, to, subject }
    },
  },
  {
    name: "notification.sendSms",
    description: "Send an SMS notification. Requires a phone number and message body.",
    module: "notification",
    permission: "notifications:write",
    guardrailTier: "CONFIRM",
    mutationDescription: "Sends an SMS to a phone number",
    isReversible: false,
    inputSchema: {
      type: "object",
      properties: {
        to: { type: "string", description: "Recipient phone number (E.164 format)" },
        body: { type: "string", description: "SMS message body (max 160 chars recommended)" },
      },
      required: ["to", "body"],
    },
    execute: async (input: unknown, ctx) => {
      const { to, body } = input as { to: string; body: string }
      await inngest.send({
        name: "notification/send.sms",
        data: {
          to,
          body,
          tenantId: ctx.tenantId,
          trigger: "ai-agent",
        },
      })
      return { sent: true, to }
    },
  },
]
