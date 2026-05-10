import { logger } from "@/shared/logger";
import { BadRequestError, NotFoundError } from "@/shared/errors";
import { inngest } from "@/shared/inngest";
import { platformService } from "@/modules/platform/platform.service";
import { consultingRepository } from "./consulting.repository";
import type { z } from "zod";
import type { provisionClientTenantSchema } from "./consulting.schemas";

const log = logger.child({ module: "consulting.provisioning" });

/** Module slugs enabled for client tenants */
const CLIENT_MODULE_SLUGS = [
  "consulting",
  "team",
  "forms",
  "booking",
  "customer",
  "notification",
];

export const provisioningService = {
  /**
   * Provision a client tenant for an engagement.
   *
   * 1. Create tenant via platformService.provisionTenant()
   * 2. Set clientTenantId on engagement
   * 3. Emit event for downstream automation (WorkOS org, Drive folder, welcome email)
   */
  async provisionClientTenant(
    ironheartTenantId: string,
    input: z.infer<typeof provisionClientTenantSchema>
  ) {
    // Verify engagement exists and is at CONTRACTED stage
    const engagement = await consultingRepository.findEngagementById(
      ironheartTenantId,
      input.engagementId
    );
    if (!engagement) throw new NotFoundError("Engagement", input.engagementId);

    const stage = (engagement.stage ?? "DISCOVERY") as string;
    if (stage !== "CONTRACTED" && stage !== "ONBOARDING") {
      throw new BadRequestError(
        `Cannot provision client tenant — engagement is at ${stage}, must be CONTRACTED or ONBOARDING`
      );
    }

    if (engagement.clientTenantId) {
      throw new BadRequestError("Client tenant already provisioned for this engagement");
    }

    // Provision tenant with client module set
    const tenant = await platformService.provisionTenant({
      businessName: input.companyName,
      email: input.ownerEmail,
      plan: "STARTER",
      moduleSlugs: CLIENT_MODULE_SLUGS,
    });

    log.info(
      { engagementId: input.engagementId, clientTenantId: tenant.id, companyName: input.companyName },
      "client tenant provisioned"
    );

    // Link tenant to engagement
    await consultingRepository.setClientTenantId(
      ironheartTenantId,
      input.engagementId,
      tenant.id
    );

    // Emit event for downstream automation
    await inngest.send({
      name: "engagement/tenant-provisioned",
      data: {
        engagementId: input.engagementId,
        tenantId: ironheartTenantId,
        clientTenantId: tenant.id,
        ownerEmail: input.ownerEmail,
      },
    });

    return {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      engagementId: input.engagementId,
    };
  },
};
