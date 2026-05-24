export type AuditReportStatus = "GENERATING" | "DRAFT" | "IN_REVIEW" | "PUBLISHED";

export interface AuditReportRecord {
  id: string;
  tenantId: string;
  engagementId: string;
  auditSessionId: string;
  status: AuditReportStatus;
  contentHtml: string;
  contentJson: ReportContentJson;
  executiveSummary: string;
  totalEstimatedWaste: number;
  driveFileId: string | null;
  pdfStorageKey: string | null;
  pdfStorageUrl: string | null;
  publishedAt: Date | null;
  generatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportContentJson {
  title: string;
  clientName: string;
  auditDate: string;
  executiveSummary: string;
  totalEstimatedWaste: number;
  topFindings: ReportFinding[];
  lenses: ReportLensSection[];
  implementationRoadmap: ReportRoadmapPhase[];
}

export interface ReportLensSection {
  lens: string;
  ragScore: string;
  ragJustification: string;
  currentState: string;
  /** AI-generated narrative paragraph for this lens. Empty string before generation. */
  narrative?: string;
  findings: ReportFinding[];
  recommendations: ReportRecommendation[];
}

export interface ReportFinding {
  finding: string;
  impact: string;
  evidence: string;
  priority: number;
  estimatedAnnualWaste: number | null;
}

export interface ReportRecommendation {
  action: string;
  estimatedEffort: string;
  estimatedCost: number | null;
  priority: number;
}

export interface ReportRoadmapPhase {
  phase: number;
  name: string;
  description: string;
  recommendations: ReportRecommendation[];
  estimatedDuration: string;
}
