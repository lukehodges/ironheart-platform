import { db } from "@/shared/db";
import { logger } from "@/shared/logger";
import { tenants } from "@/shared/db/schemas/tenant.schema";
import { eq } from "drizzle-orm";

const log = logger.child({ module: "subscription.repository" });

async function findTenantByStripeSubscriptionId(
  subscriptionId: string
): Promise<{ id: string; productId: string | null } | null> {
  const rows = await db
    .select({ id: tenants.id, productId: tenants.productId })
    .from(tenants)
    .where(eq(tenants.subscriptionId, subscriptionId))
    .limit(1);
  return rows[0] ?? null;
}

async function findTenantByStripeCustomerId(
  customerId: string
): Promise<{ id: string; productId: string | null } | null> {
  const rows = await db
    .select({ id: tenants.id, productId: tenants.productId })
    .from(tenants)
    .where(eq(tenants.stripeCustomerId, customerId))
    .limit(1);
  return rows[0] ?? null;
}

async function updateTenantSubscription(
  tenantId: string,
  fields: {
    stripeCustomerId?: string;
    subscriptionId?: string;
    status?: string;
    productId?: string;
    planId?: string;
  }
): Promise<void> {
  const updateFields: Record<string, unknown> = { updatedAt: new Date() };
  if (fields.stripeCustomerId !== undefined)
    updateFields.stripeCustomerId = fields.stripeCustomerId;
  if (fields.subscriptionId !== undefined)
    updateFields.subscriptionId = fields.subscriptionId;
  if (fields.status !== undefined) updateFields.status = fields.status;
  if (fields.productId !== undefined) updateFields.productId = fields.productId;
  if (fields.planId !== undefined) updateFields.planId = fields.planId;

  await db.update(tenants).set(updateFields).where(eq(tenants.id, tenantId));
  log.info({ tenantId, fields }, "Tenant subscription updated");
}

export const subscriptionRepository = {
  findTenantByStripeSubscriptionId,
  findTenantByStripeCustomerId,
  updateTenantSubscription,
};
