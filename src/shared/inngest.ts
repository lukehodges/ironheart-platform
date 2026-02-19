import { Inngest, EventSchemas } from "inngest";

/**
 * Typed event catalog for the entire Ironheart platform.
 *
 * Each event value MUST be wrapped in { data: ... } — Inngest v3 requirement.
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
      expiresAt: string; // ISO 8601 UTC string — always use .toISOString()
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
