/**
 * Ironheart Branded PDF Template
 *
 * Uses @react-pdf/renderer to produce a structured, on-brand PDF.
 *
 * Design tokens:
 *   Warm bg:     #FAFAF7
 *   Ink:         #0E1013
 *   Accent red:  #D13A1F
 *   Moss green:  #2F6F5C
 *   Gold:        #C9A84C
 *   Heading:     Georgia (Instrument Serif fallback — custom font registration is optional)
 *   Body:        Helvetica (Inter fallback)
 *
 * NOTE: @react-pdf/renderer runs in Node — no DOM APIs. Keep imports clean.
 */

import React from "react"
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer"
import type { ReportContentJson, ReportLensSection, ReportRoadmapPhase } from "./report-generator.types"

// ── Design tokens ────────────────────────────────────────────────────────────
const COLORS = {
  warmBg: "#FAFAF7",
  ink: "#0E1013",
  inkMuted: "#4B5563",
  accentRed: "#D13A1F",
  mossGreen: "#2F6F5C",
  gold: "#C9A84C",
  border: "#E5E3DC",
  coverBg: "#0E1013",
  coverText: "#FAFAF7",
  ragGreen: "#2F6F5C",
  ragAmber: "#D97706",
  ragRed: "#D13A1F",
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Cover page
  coverPage: {
    backgroundColor: COLORS.coverBg,
    padding: 0,
    flexDirection: "column",
  },
  coverTopBar: {
    backgroundColor: COLORS.accentRed,
    height: 6,
  },
  coverBody: {
    flex: 1,
    paddingHorizontal: 56,
    paddingTop: 80,
    paddingBottom: 56,
    flexDirection: "column",
    justifyContent: "space-between",
  },
  coverLogo: {
    fontFamily: "Times-Roman",
    fontSize: 14,
    color: COLORS.coverText,
    letterSpacing: 6,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  coverTagline: {
    fontSize: 9,
    color: "#9CA3AF",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 64,
  },
  coverTitle: {
    fontFamily: "Times-Roman",
    fontSize: 36,
    color: COLORS.coverText,
    lineHeight: 1.2,
    marginBottom: 16,
  },
  coverSubtitle: {
    fontSize: 16,
    color: COLORS.gold,
    fontFamily: "Times-Roman",
    marginBottom: 8,
  },
  coverCompany: {
    fontSize: 12,
    color: "#D1D5DB",
    marginBottom: 4,
  },
  coverDate: {
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 8,
  },
  coverBottomBar: {
    backgroundColor: COLORS.mossGreen,
    height: 4,
  },

  // Content pages
  page: {
    backgroundColor: COLORS.warmBg,
    paddingHorizontal: 52,
    paddingTop: 48,
    paddingBottom: 48,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: COLORS.ink,
    flexDirection: "column",
  },

  // Page header (appears on every content page)
  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pageHeaderLogo: {
    fontFamily: "Times-Roman",
    fontSize: 9,
    color: COLORS.accentRed,
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  pageHeaderRight: {
    fontSize: 8,
    color: COLORS.inkMuted,
  },

  // Section headings
  h2: {
    fontFamily: "Times-Roman",
    fontSize: 20,
    color: COLORS.ink,
    marginBottom: 12,
    marginTop: 4,
  },
  h3: {
    fontFamily: "Times-Roman",
    fontSize: 14,
    color: COLORS.ink,
    marginBottom: 8,
    marginTop: 16,
  },

  // Body text
  body: {
    fontSize: 10,
    color: COLORS.ink,
    lineHeight: 1.6,
    marginBottom: 8,
  },
  muted: {
    fontSize: 9,
    color: COLORS.inkMuted,
    lineHeight: 1.5,
  },

  // Divider
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginVertical: 16,
  },

  // Section rule (coloured left border)
  sectionRule: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accentRed,
    paddingLeft: 12,
    marginBottom: 16,
  },

  // RAG badge
  ragBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  // Lens card
  lensCard: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: "#F5F4EF",
    borderRadius: 4,
  },
  lensHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  lensName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    color: COLORS.ink,
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  // Finding row
  findingRow: {
    flexDirection: "row",
    marginBottom: 4,
    alignItems: "flex-start",
  },
  findingBullet: {
    width: 16,
    fontSize: 9,
    color: COLORS.accentRed,
    marginTop: 1,
  },
  findingText: {
    flex: 1,
    fontSize: 9,
    color: COLORS.ink,
    lineHeight: 1.5,
  },

  // Roadmap phase
  phaseCard: {
    marginBottom: 16,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.mossGreen,
    backgroundColor: "#F0F4F2",
    borderRadius: 4,
  },
  phaseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  phaseName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    color: COLORS.mossGreen,
  },
  phaseDuration: {
    fontSize: 8,
    color: COLORS.inkMuted,
  },
  phaseDesc: {
    fontSize: 9,
    color: COLORS.inkMuted,
    marginBottom: 8,
    lineHeight: 1.5,
  },
  recommendationRow: {
    flexDirection: "row",
    marginBottom: 3,
    alignItems: "flex-start",
  },
  recommendationBullet: {
    width: 14,
    fontSize: 9,
    color: COLORS.mossGreen,
    marginTop: 1,
  },
  recommendationText: {
    flex: 1,
    fontSize: 9,
    color: COLORS.ink,
    lineHeight: 1.5,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 24,
    left: 52,
    right: 52,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerLeft: {
    fontSize: 7,
    color: COLORS.inkMuted,
  },
  footerRight: {
    fontSize: 7,
    color: COLORS.inkMuted,
  },

  // Waste highlight box
  wasteBox: {
    backgroundColor: "#FEF3E2",
    borderLeftWidth: 3,
    borderLeftColor: COLORS.gold,
    padding: 12,
    borderRadius: 4,
    marginBottom: 16,
  },
  wasteLabel: {
    fontSize: 8,
    color: COLORS.inkMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  wasteValue: {
    fontFamily: "Times-Roman",
    fontSize: 22,
    color: COLORS.gold,
  },
  wasteSubtext: {
    fontSize: 8,
    color: COLORS.inkMuted,
    marginTop: 4,
  },
})

// ── Helpers ──────────────────────────────────────────────────────────────────

function ragColor(rag: string): string {
  const upper = rag?.toUpperCase() ?? ""
  if (upper === "GREEN") return COLORS.ragGreen
  if (upper === "RED") return COLORS.ragRed
  return COLORS.ragAmber // AMBER or unknown
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(n)
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  } catch {
    return dateStr
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PageHeader({ title }: { title: string }) {
  return (
    <View style={styles.pageHeader}>
      <Text style={styles.pageHeaderLogo}>Ironheart</Text>
      <Text style={styles.pageHeaderRight}>{title}</Text>
    </View>
  )
}

function PageFooter({ year }: { year: number }) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerLeft}>© {year} Ironheart Ltd — Confidential</Text>
      <Text style={styles.footerRight} render={({ pageNumber, totalPages }) =>
        `Page ${pageNumber} of ${totalPages}`
      } />
    </View>
  )
}

function LensCard({ lens }: { lens: ReportLensSection }) {
  const rag = lens.ragScore ?? "AMBER"
  const color = ragColor(rag)

  return (
    <View style={styles.lensCard} wrap={false}>
      <View style={styles.lensHeader}>
        <Text style={styles.lensName}>{lens.lens}</Text>
        <Text
          style={[
            styles.ragBadge,
            { backgroundColor: color + "20", color },
          ]}
        >
          {rag}
        </Text>
      </View>

      {!!lens.ragJustification && (
        <Text style={styles.muted}>{lens.ragJustification}</Text>
      )}

      {!!lens.narrative && (
        <Text style={[styles.body, { marginTop: 6 }]}>{lens.narrative}</Text>
      )}

      {lens.findings.length > 0 && (
        <View style={{ marginTop: 8 }}>
          <Text style={[styles.muted, { fontFamily: "Helvetica-Bold", marginBottom: 4 }]}>
            Key Findings
          </Text>
          {lens.findings.slice(0, 4).map((f, i) => (
            <View key={i} style={styles.findingRow}>
              <Text style={styles.findingBullet}>▸</Text>
              <Text style={styles.findingText}>
                {f.finding}
                {f.estimatedAnnualWaste ? ` (${formatCurrency(f.estimatedAnnualWaste)}/yr)` : ""}
              </Text>
            </View>
          ))}
        </View>
      )}

      {lens.recommendations.length > 0 && (
        <View style={{ marginTop: 8 }}>
          <Text style={[styles.muted, { fontFamily: "Helvetica-Bold", marginBottom: 4 }]}>
            Recommendations
          </Text>
          {lens.recommendations.slice(0, 3).map((r, i) => (
            <View key={i} style={styles.findingRow}>
              <Text style={[styles.findingBullet, { color: COLORS.mossGreen }]}>→</Text>
              <Text style={styles.findingText}>{r.action}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

function RoadmapPhase({ phase }: { phase: ReportRoadmapPhase }) {
  return (
    <View style={styles.phaseCard} wrap={false}>
      <View style={styles.phaseHeader}>
        <Text style={styles.phaseName}>Phase {phase.phase}: {phase.name}</Text>
        <Text style={styles.phaseDuration}>{phase.estimatedDuration}</Text>
      </View>
      {!!phase.description && (
        <Text style={styles.phaseDesc}>{phase.description}</Text>
      )}
      {phase.recommendations.map((r, i) => (
        <View key={i} style={styles.recommendationRow}>
          <Text style={styles.recommendationBullet}>•</Text>
          <Text style={styles.recommendationText}>
            {r.action}
            {r.estimatedEffort ? ` — ${r.estimatedEffort}` : ""}
            {r.estimatedCost ? ` (${formatCurrency(r.estimatedCost)})` : ""}
          </Text>
        </View>
      ))}
    </View>
  )
}

// ── Main document component ──────────────────────────────────────────────────

export interface ReportPdfDocumentProps {
  content: ReportContentJson
  customerName: string
  engagementTitle: string
  publishedDate?: string
}

export function ReportPdfDocument({
  content,
  customerName,
  engagementTitle,
  publishedDate,
}: ReportPdfDocumentProps) {
  const year = new Date().getFullYear()
  const displayDate = publishedDate
    ? formatDate(publishedDate)
    : formatDate(content.auditDate ?? new Date().toISOString())

  const clientDisplay = customerName || content.clientName || "Client"

  return (
    <Document
      title={`${engagementTitle} — Ironheart Audit Report`}
      author="Ironheart Ltd"
      subject="Operational Audit Report"
      creator="Ironheart Platform"
    >
      {/* ── Cover page ── */}
      <Page size="A4" style={styles.coverPage}>
        <View style={styles.coverTopBar} />
        <View style={styles.coverBody}>
          {/* Logo + tagline */}
          <View>
            <Text style={styles.coverLogo}>Ironheart</Text>
            <Text style={styles.coverTagline}>Operations Consultancy</Text>

            {/* Main title */}
            <Text style={styles.coverTitle}>Operational{"\n"}Audit Report</Text>

            <Text style={styles.coverSubtitle}>{engagementTitle}</Text>
            <Text style={styles.coverCompany}>{clientDisplay}</Text>
            <Text style={styles.coverDate}>Prepared: {displayDate}</Text>
          </View>

          {/* Bottom disclaimer */}
          <Text style={[styles.muted, { color: "#6B7280" }]}>
            This document is confidential and prepared exclusively for {clientDisplay}.
            Distribution without written consent from Ironheart Ltd is prohibited.
          </Text>
        </View>
        <View style={styles.coverBottomBar} />
      </Page>

      {/* ── Executive Summary ── */}
      <Page size="A4" style={styles.page}>
        <PageHeader title="Executive Summary" />

        {/* Waste callout */}
        {(content.totalEstimatedWaste ?? 0) > 0 && (
          <View style={styles.wasteBox}>
            <Text style={styles.wasteLabel}>Total Estimated Annual Waste Identified</Text>
            <Text style={styles.wasteValue}>{formatCurrency(content.totalEstimatedWaste)}</Text>
            <Text style={styles.wasteSubtext}>
              Based on findings across all five audit lenses
            </Text>
          </View>
        )}

        <View style={styles.sectionRule}>
          <Text style={styles.h2}>Executive Summary</Text>
        </View>

        <Text style={styles.body}>
          {content.executiveSummary || "Executive summary not yet available."}
        </Text>

        {content.topFindings.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <Text style={styles.h3}>Top Findings</Text>
            {content.topFindings.map((f, i) => (
              <View key={i} style={styles.findingRow}>
                <Text style={styles.findingBullet}>▸</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.findingText}>
                    <Text style={{ fontFamily: "Helvetica-Bold" }}>{f.finding}</Text>
                    {" — "}{f.impact} impact
                    {f.estimatedAnnualWaste ? ` · ${formatCurrency(f.estimatedAnnualWaste)}/yr` : ""}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <PageFooter year={year} />
      </Page>

      {/* ── Lens Analysis ── */}
      <Page size="A4" style={styles.page}>
        <PageHeader title="Lens Analysis" />

        <View style={styles.sectionRule}>
          <Text style={styles.h2}>Lens Analysis</Text>
        </View>

        <Text style={[styles.muted, { marginBottom: 16 }]}>
          Each operational lens is assessed as Green (on track), Amber (needs attention),
          or Red (critical issue requiring immediate action).
        </Text>

        {content.lenses.map((lens, i) => (
          <LensCard key={i} lens={lens} />
        ))}

        <PageFooter year={year} />
      </Page>

      {/* ── Implementation Roadmap ── */}
      <Page size="A4" style={styles.page}>
        <PageHeader title="Implementation Roadmap" />

        <View style={styles.sectionRule}>
          <Text style={styles.h2}>Implementation Roadmap</Text>
        </View>

        <Text style={[styles.muted, { marginBottom: 16 }]}>
          Recommendations are grouped into phases by priority and effort. Quick Wins can
          typically be implemented without external resource; Core Fixes and Strategic
          Changes may require additional budget or capability.
        </Text>

        {content.implementationRoadmap.length > 0 ? (
          content.implementationRoadmap.map((phase, i) => (
            <RoadmapPhase key={i} phase={phase} />
          ))
        ) : (
          <Text style={styles.muted}>No roadmap phases defined.</Text>
        )}

        <PageFooter year={year} />
      </Page>
    </Document>
  )
}
