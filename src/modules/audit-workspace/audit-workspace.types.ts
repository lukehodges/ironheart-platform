export type AuditSessionStatus = "IN_PROGRESS" | "PROCESSING" | "READY_FOR_REPORT" | "COMPLETE";
export type AuditLens = "REVENUE" | "OPERATIONS" | "FINANCE" | "TECHNOLOGY" | "TEAM";
export type RagScore = "RED" | "AMBER" | "GREEN";
export type FindingImpact = "HIGH" | "MEDIUM" | "LOW";

export const ALL_LENSES: AuditLens[] = ["REVENUE", "OPERATIONS", "FINANCE", "TECHNOLOGY", "TEAM"];

export interface AuditSessionRecord {
  id: string;
  tenantId: string;
  engagementId: string;
  status: AuditSessionStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditCallNoteRecord {
  id: string;
  auditSessionId: string;
  contactUserId: string;
  rawNotes: string;
  callDate: Date | null;
  callDuration: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLensAnalysisRecord {
  id: string;
  auditSessionId: string;
  lens: AuditLens;
  ragScore: RagScore | null;
  ragJustification: string | null;
  currentState: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditFindingRecord {
  id: string;
  lensAnalysisId: string;
  finding: string;
  impact: FindingImpact;
  evidence: string | null;
  priority: number;
  estimatedAnnualWaste: number | null;
  createdAt: Date;
}

export interface AuditRecommendationRecord {
  id: string;
  lensAnalysisId: string;
  action: string;
  estimatedEffort: string | null;
  estimatedCost: number | null;
  priority: number;
  createdAt: Date;
}

export interface AuditSessionWithLenses extends AuditSessionRecord {
  lenses: (AuditLensAnalysisRecord & {
    findings: AuditFindingRecord[];
    recommendations: AuditRecommendationRecord[];
  })[];
  callNotes: AuditCallNoteRecord[];
}

export interface AuditValidationResult {
  isReady: boolean;
  missingLenses: AuditLens[];
  lensesWithoutFindings: AuditLens[];
  lensesWithoutRag: AuditLens[];
}
