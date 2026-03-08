// ── Contacts ──
export type ContactSide = "supply" | "demand";
export type ContactType = "Landowner" | "Farmer" | "Developer" | "Housebuilder" | "Land Agent" | "Assessor";

export interface Contact {
  id: string;
  name: string;
  initials: string;
  company: string;
  type: ContactType;
  side: ContactSide;
  email: string;
  phone: string;
  location: string;
  activeDeals: number;
  tags: string[];
  lastActivity: string;
  avatarColor: string;
  role?: string;
}

// ── Sites ──
export type SiteStatus = "Active" | "Registered" | "Under Assessment" | "Legal In Progress" | "Prospecting" | "Fully Allocated";
export type UnitType = "Nitrogen" | "Phosphorus" | "BNG";
export type Catchment = "Solent" | "Test Valley" | "Stour" | "Exe" | "Tees";
export type LPA = "Eastleigh" | "Fareham" | "Winchester" | "Test Valley" | "New Forest";

export interface Site {
  ref: string;
  name: string;
  status: SiteStatus;
  contact: string;        // Contact.id
  contactName: string;
  catchment: Catchment;
  unitType: UnitType;
  total: number;
  totalLabel: string;
  allocated: number;
  allocatedLabel: string;
  available: number;
  availableLabel: string;
  price: number;
  priceLabel: string;
  lpa: LPA;
  lat: number;
  lng: number;
  address: string;
  areaHectares: number;
  currentUse: string;
  soilType: string;
  registrationRef?: string;
  registeredDate?: string;
  legalAgreement?: string;
  commitmentYears?: number;
}

// ── Deals ──
export type DealStage =
  | "Prospecting" | "Initial Contact" | "Requirements Gathered"
  | "Site Matched" | "Quote Sent" | "Quote Accepted"
  | "Legal Drafting" | "Legal Review" | "Contracts Signed"
  | "Payment Pending" | "Payment Received" | "Credits Allocated"
  | "LPA Confirmed" | "Completed";

export type DealSide = "supply" | "demand" | "matched";

export interface Deal {
  id: string;
  title: string;
  stage: DealStage;
  side: DealSide;
  supplyContact: string;    // Contact.id
  supplyContactName: string;
  demandContact: string;    // Contact.id
  demandContactName: string;
  siteRef: string;           // Site.ref
  siteName: string;
  unitType: UnitType;
  units: number;
  unitsLabel: string;
  catchment: Catchment;
  value: number;
  displayValue: string;
  commission: number;
  commissionRate: number;
  probability: number;
  broker: string;
  brokerInitials: string;
  expectedClose: string;
  createdDate: string;
}

// ── Assessments ──
export type AssessmentType = "NN Baseline" | "BNG Habitat Survey" | "Annual Monitoring" | "Reassessment";
export type AssessmentStatus = "Scheduled" | "In Progress" | "Data Submitted" | "Under Review" | "Approved" | "Revision Requested";

export interface Assessor {
  id: string;
  name: string;
  initials: string;
  specialism: string[];
  region: string;
  email: string;
  phone: string;
  avatarColor: string;
  availability: string[];  // ISO date strings of available days
}

export interface Assessment {
  id: string;
  siteRef: string;
  siteName: string;
  assessorId: string;
  assessorName: string;
  type: AssessmentType;
  date: string;
  status: AssessmentStatus;
  findings?: string;
  creditYield?: number;
  creditYieldLabel?: string;
  habitatTypes?: string[];
  conditionScore?: number;
  reportDocId?: string;
}

// ── Documents ──
export type DocumentType = "S106" | "Conservation Covenant" | "Purchase Agreement" | "Heads of Terms" | "HMMP" | "Reservation Agreement" | "Invoice" | "Survey Report" | "Metric Calculation" | "Site Photos";
export type DocumentStatus = "Draft" | "Sent" | "Viewed" | "Signed" | "Completed" | "Expired";

export interface Document {
  id: string;
  name: string;
  type: DocumentType;
  linkedEntityType: "deal" | "site" | "contact";
  linkedEntityId: string;
  linkedEntityLabel: string;
  uploadedBy: string;
  uploadedDate: string;
  status: DocumentStatus;
  fileSize: string;
  signatories?: { name: string; signed: boolean; signedDate?: string }[];
  versions?: { version: number; date: string; author: string }[];
}

// ── Compliance ──
export type ComplianceStatus = "Overdue" | "Due Soon" | "Upcoming" | "Completed";
export type ComplianceCategory = "Monitoring" | "Legal" | "Registration" | "Financial";
export type Frequency = "One-off" | "Annual" | "Quarterly" | "Monthly" | "5-yearly";

export interface ComplianceItem {
  id: string;
  title: string;
  category: ComplianceCategory;
  siteRef?: string;
  siteName?: string;
  dealRef?: string;
  dealTitle?: string;
  dueDate: string;
  status: ComplianceStatus;
  assigned: string;
  assignedInitials: string;
  frequency: Frequency;
  completedDate?: string;
  description?: string;
}

// ── Financials ──
export type InvoiceStatus = "Draft" | "Sent" | "Viewed" | "Paid" | "Overdue";
export type PaymentDirection = "incoming" | "outgoing";

export interface Invoice {
  id: string;
  invoiceNumber: string;
  dealId: string;
  dealTitle: string;
  contactId: string;
  contactName: string;
  amount: number;
  commissionRate: number;
  commissionAmount: number;
  status: InvoiceStatus;
  issuedDate: string;
  dueDate: string;
  paidDate?: string;
}

export interface Payment {
  id: string;
  date: string;
  direction: PaymentDirection;
  contactId: string;
  contactName: string;
  dealId: string;
  dealTitle: string;
  amount: number;
  method: string;
  status: string;
}

// ── Lifecycle ──
export type LifecycleStage =
  | "Prospect" | "Assess" | "Legal" | "Match"
  | "Quote" | "Agreement" | "Payment" | "Allocate"
  | "Confirm" | "Compliance";

export interface DealLifecycle {
  dealId: string;
  currentStage: LifecycleStage;
  completedStages: LifecycleStage[];
  track: "supply" | "demand" | "matched";
}
