/**
 * GET /api/reports/[reportId]/pdf
 *
 * Streams a branded Ironheart PDF for the given audit report.
 *
 * Auth:
 *   - WorkOS session required (platform admin OR tenant member with access to
 *     the report's tenantId).
 *
 * Flow:
 *   1. Authenticate caller via WorkOS session cookie.
 *   2. Load report from DB.
 *   3. Verify caller has access to this report's tenant.
 *   4. Render PDF buffer via renderPdf().
 *   5. Return bytes with correct Content-Type + Content-Disposition headers.
 *
 * Note (0.4): PDFs are rendered on-demand. No blob storage is configured yet.
 *   In 0.5, if pdfStorageUrl is set on the row (from exportPdf on publish), we
 *   could redirect there instead of re-rendering — left as a future optimisation.
 */

import { withAuth } from "@workos-inc/authkit-nextjs"
import { eq } from "drizzle-orm"
import { db } from "@/shared/db"
import { users, tenants } from "@/shared/db/schema"
import { reportGeneratorRepository } from "@/modules/report-generator/report-generator.repository"
import { reportGeneratorService } from "@/modules/report-generator/report-generator.service"
import { logger } from "@/shared/logger"
import type { ReportContentJson } from "@/modules/report-generator/report-generator.types"

const log = logger.child({ module: "api.reports.pdf" })

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const { reportId } = await params

  // 1. Authenticate
  const authResult = await withAuth()
  if (!authResult.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }

  // 2. Load report
  const report = await reportGeneratorRepository.findById(reportId)
  if (!report) {
    return new Response(JSON.stringify({ error: "Report not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    })
  }

  // 3. Verify caller has access to this report's tenant.
  //    Platform admin (users.isPlatformAdmin = true) can read any report.
  //    Regular users must have a user row matching report.tenantId.
  const dbUser = await db.query.users.findFirst({
    where: eq(users.workosUserId, authResult.user.id),
    columns: { id: true, tenantId: true, isPlatformAdmin: true },
  })

  if (!dbUser) {
    return new Response(JSON.stringify({ error: "User not found" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }

  const isPlatformAdmin = dbUser.isPlatformAdmin === true
  const isTenantMember = dbUser.tenantId === report.tenantId

  if (!isPlatformAdmin && !isTenantMember) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    })
  }

  // 4. Render PDF
  try {
    const content = report.contentJson as ReportContentJson
    const customerName = content?.clientName ?? ""
    const engagementTitle = content?.title ?? "Operational Audit Report"

    const pdfBuffer = await reportGeneratorService.renderPdf(
      report,
      customerName,
      engagementTitle,
    )

    // 5. Build a safe filename
    const safeName = (engagementTitle || "audit-report")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
    const filename = `ironheart-${safeName}.pdf`

    log.info({ reportId, userId: dbUser.id, size: pdfBuffer.length }, "PDF streamed")

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(pdfBuffer.length),
        "Cache-Control": "no-store",
      },
    })
  } catch (err) {
    log.error({ reportId, err }, "PDF render failed")
    return new Response(JSON.stringify({ error: "PDF render failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
