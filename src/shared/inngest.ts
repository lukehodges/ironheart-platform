import { Inngest, EventSchemas } from "inngest";

/**
 * Typed event catalog for the entire Ironheart platform.
 *
 * Each event value MUST be wrapped in { data: ... } - Inngest v3 requirement.
 *
 * To add a new event: add it here, then use it in the relevant module's *.events.ts file.
 */
type IronheartEvents = {
  "booking/created": {
    data: { bookingId: string; tenantId: string };
  };
  "booking/confirmed": {
    data: { bookingId: string; tenantId: string };
  };
  "booking/cancelled": {
    data: { bookingId: string; tenantId: string; reason?: string };
  };
  "booking/completed": {
    data: { bookingId: string; tenantId: string };
  };
  "booking/reservation.expired": {
    data: { bookingId: string; tenantId: string };
  };
  "slot/reserved": {
    data: {
      slotId: string;
      bookingId: string;
      tenantId: string;
      expiresAt: string; // ISO 8601 UTC string - always use .toISOString()
    };
  };
  "slot/released": {
    data: { slotId: string; bookingId: string; tenantId: string };
  };
  "notification/send.email": {
    data: {
      to: string;
      subject: string;
      html: string;
      text?: string;
      replyTo?: string;
      bookingId?: string;
      tenantId: string;
      templateId?: string;
      trigger: string;
    };
  };
  "notification/send.sms": {
    data: {
      to: string;
      body: string;
      bookingId?: string;
      tenantId: string;
      templateId?: string;
      trigger: string;
    };
  };
  "calendar/sync.push": {
    data: { bookingId: string; userId: string; tenantId: string };
  };
  "calendar/sync.pull": {
    data: { userId: string; userIntegrationId?: string; tenantId?: string };
  };
  "calendar/webhook.received": {
    data: { channelId: string; resourceId: string };
  };
  "workflow/trigger": {
    data: { workflowId: string; event: string; data: Record<string, unknown> };
  };
  "review/request.send": {
    data: { bookingId: string; customerId: string; delay?: string };
  };
  "workflow/execute": {
    data: {
      workflowId: string;
      tenantId: string;
      triggerEvent: string;
      triggerData: Record<string, unknown>;
    };
  };
  "workflow/completed": {
    data: {
      workflowId: string;
      executionId: string;
      correlationId?: string;
      tenantId: string;
      output?: Record<string, unknown>;
      success: boolean;
    };
  };
  "forms/submitted": {
    data: {
      formId: string;
      bookingId: string | null;
      tenantId: string;
      customerId: string | null;
    };
  };
  "review/submitted": {
    data: {
      reviewId: string;
      bookingId: string;
      tenantId: string;
      customerId: string;
      rating: number;
    };
  };
  "pipeline/member.added": {
    data: {
      memberId: string;
      pipelineId: string;
      customerId: string;
      stageId: string;
      tenantId: string;
    };
  };
  "pipeline/member.moved": {
    data: {
      memberId: string;
      pipelineId: string;
      customerId: string;
      fromStageId: string;
      toStageId: string;
      dealValue: number | null;
      tenantId: string;
    };
  };
  "pipeline/member.removed": {
    data: {
      memberId: string;
      pipelineId: string;
      customerId: string;
      tenantId: string;
    };
  };
  "pipeline/member.closed": {
    data: {
      memberId: string;
      pipelineId: string;
      customerId: string;
      stageType: string;
      dealValue: number | null;
      tenantId: string;
    };
  };
  "stripe/webhook.received": {
    data: {
      eventType: string;
      stripeEventId: string;
      payload: Record<string, unknown>;
    };
  };
  "payment/intent.succeeded": {
    data: {
      paymentIntentId: string;
      bookingId: string;
      tenantId: string;
      amount: number;
    };
  };
  "payment/intent.failed": {
    data: {
      paymentIntentId: string;
      bookingId: string;
      tenantId: string;
      error: string;
    };
  };
  "payment/dispute.created": {
    data: {
      disputeId: string;
      paymentId: string;
      tenantId: string;
      amount: number;
    };
  };
  "calendar/sync.delete": {
    data: {
      bookingId: string;
      userId: string;
      tenantId: string;
    };
  };
  "waitlist/slot.available": {
    data: {
      waitlistEntryId: string;
      tenantId: string;
      customerId: string;
      serviceId: string;
      date: string;
    };
  };
  "team/created": {
    data: { userId: string; tenantId: string; employeeType: string };
  };
  "team/updated": {
    data: { userId: string; tenantId: string; changes: string[] };
  };
  "team/deactivated": {
    data: { userId: string; tenantId: string };
  };
  "team/onboarding.completed": {
    data: { userId: string; tenantId: string; templateId: string };
  };
  "team/offboarding.completed": {
    data: { userId: string; tenantId: string; templateId: string };
  };
  "ai/chat.completed": {
    data: { conversationId: string; tenantId: string; tokensUsed: number };
  };
  "ai/workflow.suggested": {
    data: { suggestionId: string; tenantId: string; title: string };
  };
  "ai/mcp.tools.refresh": {
    data: { connectionId: string; tenantId: string };
  };
  "ai/mcp.health.check": {
    data: { connectionId: string; tenantId: string };
  };
  "ai/briefing.generated": {
    data: { tenantId: string; briefingId: string };
  };
  "ai/ghost-operator.completed": {
    data: { tenantId: string; actionsExecuted: number; actionsQueued: number };
  };
  "outreach/contact.enrolled": {
    data: {
      contactId: string;
      customerId: string;
      sequenceId: string;
      tenantId: string;
    };
  };
  "outreach/activity.logged": {
    data: {
      contactId: string;
      sequenceId: string;
      customerId: string;
      activityType: string;
      sector: string;
      tenantId: string;
    };
  };
  "outreach/contact.converted": {
    data: {
      contactId: string;
      customerId: string;
      sequenceId: string;
      pipelineId: string;
      pipelineMemberId: string;
      tenantId: string;
    };
  };
  "subscription/checkout.completed": {
    data: {
      stripeSessionId: string;
      stripeCustomerId: string;
      stripeSubscriptionId: string;
      productSlug: string;
      businessName: string;
      email: string;
      planId: string;
    };
  };
  "subscription/payment.failed": {
    data: {
      stripeSubscriptionId: string;
      tenantId: string;
      stripeCustomerId: string;
    };
  };
  "subscription/cancelled": {
    data: {
      stripeSubscriptionId: string;
      tenantId: string;
    };
  };
};

/**
 * The single Inngest client instance.
 * Import this wherever you need to send events or define functions.
 *
 * @example
 * // Sending an event from a service:
 * await inngest.send({ name: "booking/created", data: { bookingId, tenantId } });
 *
 * // Defining a function in a module's *.events.ts:
 * export const myFunction = inngest.createFunction(...)
 */
export const inngest = new Inngest({
  id: "ironheart",
  schemas: new EventSchemas().fromRecord<IronheartEvents>(),
});
