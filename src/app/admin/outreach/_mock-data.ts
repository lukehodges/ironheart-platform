"use client"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MockContact {
  id: string
  companyName: string
  contactName: string
  email: string
  sequenceName: string
  sequenceColor: string
  sector: string
  currentStep: number
  totalSteps: number
  stepLabel: string
  channel: "EMAIL" | "LINKEDIN" | "CALL"
  dueAt: string
  isOverdue: boolean
  status: "ACTIVE" | "REPLIED" | "BOUNCED" | "OPTED_OUT" | "CONVERTED" | "PAUSED" | "COMPLETED"
}

export interface MockReply {
  id: string
  companyName: string
  contactName: string
  messagePreview: string
  timeAgo: string
  sequenceName: string
}

export interface MockSequence {
  id: string
  name: string
  sector: string
  status: "ACTIVE" | "PAUSED" | "ARCHIVED"
  abVariant: string | null
  pairedSequenceId: string | null
  enrolled: number
  active: number
  replied: number
  converted: number
  completed: number
  bounced: number
  optedOut: number
  stepsCount: number
  replyRateByStep: number[]
}

export interface MockActivity {
  id: string
  timestamp: string
  type: "SENT" | "REPLIED" | "BOUNCED" | "MEETING_BOOKED" | "CONVERTED" | "OPTED_OUT"
  contactName: string
  companyName: string
  sequenceName: string
  channel: "EMAIL" | "LINKEDIN" | "CALL"
  stepPosition: number
}

export interface MockSectorStats {
  sector: string
  totalSent: number
  replies: number
  replyRate: number
  conversions: number
  convRate: number
  avgStepsToReply: number
  bestSequence: string
}

// ---------------------------------------------------------------------------
// State machine totals
// ---------------------------------------------------------------------------

export const stateMachineTotals = {
  ACTIVE: 234,
  REPLIED: 28,
  CONVERTED: 6,
  BOUNCED: 12,
  OPTED_OUT: 4,
  COMPLETED: 89,
}

// ---------------------------------------------------------------------------
// Mock contacts — 15 due today (3 overdue, 12 today)
// ---------------------------------------------------------------------------

export const mockContacts: MockContact[] = [
  {
    id: "c1",
    companyName: "NorthStar Recruitment",
    contactName: "James Whitfield",
    email: "james@northstarrecruit.co.uk",
    sequenceName: "Recruitment A",
    sequenceColor: "#6366f1",
    sector: "Recruitment",
    currentStep: 3,
    totalSteps: 5,
    stepLabel: "Case study follow-up",
    channel: "EMAIL",
    dueAt: "Overdue — 2d",
    isOverdue: true,
    status: "ACTIVE",
  },
  {
    id: "c2",
    companyName: "Jani-King Cleaning",
    contactName: "Sarah Thompson",
    email: "sarah.t@jani-king.co.uk",
    sequenceName: "Cleaning Outreach",
    sequenceColor: "#10b981",
    sector: "Cleaning",
    currentStep: 2,
    totalSteps: 4,
    stepLabel: "Value prop email",
    channel: "EMAIL",
    dueAt: "Overdue — 1d",
    isOverdue: true,
    status: "ACTIVE",
  },
  {
    id: "c3",
    companyName: "Oakfield Dental Practice",
    contactName: "Dr. Priya Patel",
    email: "priya@oakfielddental.co.uk",
    sequenceName: "Dental Clinics",
    sequenceColor: "#f59e0b",
    sector: "Dental",
    currentStep: 1,
    totalSteps: 5,
    stepLabel: "Initial outreach",
    channel: "LINKEDIN",
    dueAt: "Overdue — 3d",
    isOverdue: true,
    status: "ACTIVE",
  },
  {
    id: "c4",
    companyName: "Apex Plumbing & Heating",
    contactName: "David Morris",
    email: "david@apexplumbing.co.uk",
    sequenceName: "Trades Outreach",
    sequenceColor: "#ef4444",
    sector: "Trades",
    currentStep: 2,
    totalSteps: 5,
    stepLabel: "Follow-up email",
    channel: "EMAIL",
    dueAt: "9:00 AM",
    isOverdue: false,
    status: "ACTIVE",
  },
  {
    id: "c5",
    companyName: "Brightside Recruitment",
    contactName: "Emma Collins",
    email: "emma@brightsiderec.co.uk",
    sequenceName: "Recruitment B",
    sequenceColor: "#8b5cf6",
    sector: "Recruitment",
    currentStep: 1,
    totalSteps: 5,
    stepLabel: "Cold intro email",
    channel: "EMAIL",
    dueAt: "9:15 AM",
    isOverdue: false,
    status: "ACTIVE",
  },
  {
    id: "c6",
    companyName: "Premier Office Cleaning",
    contactName: "Mark Jenkins",
    email: "mark@premieroffice.co.uk",
    sequenceName: "Cleaning Outreach",
    sequenceColor: "#10b981",
    sector: "Cleaning",
    currentStep: 3,
    totalSteps: 4,
    stepLabel: "Testimonial share",
    channel: "EMAIL",
    dueAt: "9:30 AM",
    isOverdue: false,
    status: "ACTIVE",
  },
  {
    id: "c7",
    companyName: "SmileCare Dental Group",
    contactName: "Dr. Robert Chen",
    email: "robert@smilecaredental.co.uk",
    sequenceName: "Dental Clinics",
    sequenceColor: "#f59e0b",
    sector: "Dental",
    currentStep: 2,
    totalSteps: 5,
    stepLabel: "ROI calculator send",
    channel: "EMAIL",
    dueAt: "10:00 AM",
    isOverdue: false,
    status: "ACTIVE",
  },
  {
    id: "c8",
    companyName: "Sullivan & Partners Recruitment",
    contactName: "Catherine Wright",
    email: "cwright@sullivanpartners.co.uk",
    sequenceName: "Recruitment A",
    sequenceColor: "#6366f1",
    sector: "Recruitment",
    currentStep: 4,
    totalSteps: 5,
    stepLabel: "Break-up email",
    channel: "EMAIL",
    dueAt: "10:15 AM",
    isOverdue: false,
    status: "ACTIVE",
  },
  {
    id: "c9",
    companyName: "CityGlow Facilities",
    contactName: "Andrew Blake",
    email: "ablake@cityglow.co.uk",
    sequenceName: "Cleaning Outreach",
    sequenceColor: "#10b981",
    sector: "Cleaning",
    currentStep: 1,
    totalSteps: 4,
    stepLabel: "Initial outreach",
    channel: "LINKEDIN",
    dueAt: "10:30 AM",
    isOverdue: false,
    status: "ACTIVE",
  },
  {
    id: "c10",
    companyName: "Elite Electrical Services",
    contactName: "Tom Richardson",
    email: "tom@eliteelectrical.co.uk",
    sequenceName: "Trades Outreach",
    sequenceColor: "#ef4444",
    sector: "Trades",
    currentStep: 3,
    totalSteps: 5,
    stepLabel: "Case study follow-up",
    channel: "CALL",
    dueAt: "11:00 AM",
    isOverdue: false,
    status: "ACTIVE",
  },
  {
    id: "c11",
    companyName: "Parkway Dental",
    contactName: "Dr. Lisa Ahmed",
    email: "lisa@parkwaydental.co.uk",
    sequenceName: "Dental Clinics",
    sequenceColor: "#f59e0b",
    sector: "Dental",
    currentStep: 4,
    totalSteps: 5,
    stepLabel: "Meeting request",
    channel: "EMAIL",
    dueAt: "11:30 AM",
    isOverdue: false,
    status: "ACTIVE",
  },
  {
    id: "c12",
    companyName: "Phoenix Recruitment Solutions",
    contactName: "Daniel Hughes",
    email: "dhughes@phoenixrecruitment.co.uk",
    sequenceName: "Recruitment A",
    sequenceColor: "#6366f1",
    sector: "Recruitment",
    currentStep: 2,
    totalSteps: 5,
    stepLabel: "Follow-up email",
    channel: "EMAIL",
    dueAt: "1:00 PM",
    isOverdue: false,
    status: "ACTIVE",
  },
  {
    id: "c13",
    companyName: "Heritage Builders",
    contactName: "Michael O'Brien",
    email: "michael@heritagebuilders.co.uk",
    sequenceName: "Trades Outreach",
    sequenceColor: "#ef4444",
    sector: "Trades",
    currentStep: 1,
    totalSteps: 5,
    stepLabel: "Cold intro email",
    channel: "EMAIL",
    dueAt: "2:00 PM",
    isOverdue: false,
    status: "ACTIVE",
  },
  {
    id: "c14",
    companyName: "Absolute Cleaning Co",
    contactName: "Rachel Green",
    email: "rachel@absolutecleaning.co.uk",
    sequenceName: "Cleaning Outreach",
    sequenceColor: "#10b981",
    sector: "Cleaning",
    currentStep: 4,
    totalSteps: 4,
    stepLabel: "Final follow-up",
    channel: "EMAIL",
    dueAt: "3:00 PM",
    isOverdue: false,
    status: "ACTIVE",
  },
  {
    id: "c15",
    companyName: "Bridgewater Recruitment",
    contactName: "Sophie Turner",
    email: "sturner@bridgewaterrecruit.co.uk",
    sequenceName: "Recruitment B",
    sequenceColor: "#8b5cf6",
    sector: "Recruitment",
    currentStep: 3,
    totalSteps: 5,
    stepLabel: "LinkedIn connection request",
    channel: "LINKEDIN",
    dueAt: "4:00 PM",
    isOverdue: false,
    status: "ACTIVE",
  },
]

// ---------------------------------------------------------------------------
// Mock replies — 4 recent
// ---------------------------------------------------------------------------

export const mockReplies: MockReply[] = [
  {
    id: "r1",
    companyName: "NorthStar Recruitment",
    contactName: "James Whitfield",
    messagePreview: "Hi, thanks for reaching out. We've actually been looking at AI solutions for our candidate screening process. Could you send over some more details?",
    timeAgo: "12m ago",
    sequenceName: "Recruitment A",
  },
  {
    id: "r2",
    companyName: "SmileCare Dental Group",
    contactName: "Dr. Robert Chen",
    messagePreview: "Interesting timing — we're expanding to a second location next month and need to sort out our booking system. Let's chat.",
    timeAgo: "1h ago",
    sequenceName: "Dental Clinics",
  },
  {
    id: "r3",
    companyName: "Premier Office Cleaning",
    contactName: "Mark Jenkins",
    messagePreview: "Not the right time for us but please follow up in Q3 when our contracts renew.",
    timeAgo: "3h ago",
    sequenceName: "Cleaning Outreach",
  },
  {
    id: "r4",
    companyName: "Apex Plumbing & Heating",
    contactName: "David Morris",
    messagePreview: "We'd be open to a 15-min call next week. Can you send a calendar link?",
    timeAgo: "5h ago",
    sequenceName: "Trades Outreach",
  },
]

// ---------------------------------------------------------------------------
// Mock sequences — 6 total, including A/B test pair
// ---------------------------------------------------------------------------

export const mockSequences: MockSequence[] = [
  {
    id: "s1",
    name: "Recruitment A",
    sector: "Recruitment",
    status: "ACTIVE",
    abVariant: "A",
    pairedSequenceId: "s2",
    enrolled: 45,
    active: 32,
    replied: 8,
    converted: 2,
    completed: 12,
    bounced: 3,
    optedOut: 1,
    stepsCount: 5,
    replyRateByStep: [12, 8, 18, 5, 3],
  },
  {
    id: "s2",
    name: "Recruitment B",
    sector: "Recruitment",
    status: "ACTIVE",
    abVariant: "B",
    pairedSequenceId: "s1",
    enrolled: 43,
    active: 28,
    replied: 5,
    converted: 1,
    completed: 14,
    bounced: 2,
    optedOut: 1,
    stepsCount: 5,
    replyRateByStep: [9, 6, 11, 4, 2],
  },
  {
    id: "s3",
    name: "Cleaning Outreach",
    sector: "Cleaning",
    status: "ACTIVE",
    abVariant: null,
    pairedSequenceId: null,
    enrolled: 62,
    active: 41,
    replied: 7,
    converted: 2,
    completed: 18,
    bounced: 3,
    optedOut: 1,
    stepsCount: 4,
    replyRateByStep: [10, 14, 8, 4],
  },
  {
    id: "s4",
    name: "Dental Clinics",
    sector: "Dental",
    status: "ACTIVE",
    abVariant: null,
    pairedSequenceId: null,
    enrolled: 38,
    active: 24,
    replied: 5,
    converted: 1,
    completed: 11,
    bounced: 2,
    optedOut: 0,
    stepsCount: 5,
    replyRateByStep: [8, 11, 15, 6, 3],
  },
  {
    id: "s5",
    name: "Trades Outreach",
    sector: "Trades",
    status: "ACTIVE",
    abVariant: null,
    pairedSequenceId: null,
    enrolled: 54,
    active: 38,
    replied: 3,
    converted: 0,
    completed: 16,
    bounced: 2,
    optedOut: 1,
    stepsCount: 5,
    replyRateByStep: [6, 5, 8, 3, 2],
  },
  {
    id: "s6",
    name: "Dental Retarget",
    sector: "Dental",
    status: "PAUSED",
    abVariant: null,
    pairedSequenceId: null,
    enrolled: 22,
    active: 0,
    replied: 0,
    converted: 0,
    completed: 18,
    bounced: 0,
    optedOut: 0,
    stepsCount: 3,
    replyRateByStep: [5, 3, 2],
  },
]

// ---------------------------------------------------------------------------
// Mock activity feed — 10 items
// ---------------------------------------------------------------------------

export const mockActivities: MockActivity[] = [
  {
    id: "a1",
    timestamp: "09:42 AM",
    type: "REPLIED",
    contactName: "James Whitfield",
    companyName: "NorthStar Recruitment",
    sequenceName: "Recruitment A",
    channel: "EMAIL",
    stepPosition: 3,
  },
  {
    id: "a2",
    timestamp: "09:38 AM",
    type: "SENT",
    contactName: "Emma Collins",
    companyName: "Brightside Recruitment",
    sequenceName: "Recruitment B",
    channel: "EMAIL",
    stepPosition: 1,
  },
  {
    id: "a3",
    timestamp: "09:15 AM",
    type: "MEETING_BOOKED",
    contactName: "David Morris",
    companyName: "Apex Plumbing & Heating",
    sequenceName: "Trades Outreach",
    channel: "EMAIL",
    stepPosition: 2,
  },
  {
    id: "a4",
    timestamp: "08:50 AM",
    type: "BOUNCED",
    contactName: "Karen Mitchell",
    companyName: "ClearView Window Cleaning",
    sequenceName: "Cleaning Outreach",
    channel: "EMAIL",
    stepPosition: 1,
  },
  {
    id: "a5",
    timestamp: "08:32 AM",
    type: "SENT",
    contactName: "Dr. Robert Chen",
    companyName: "SmileCare Dental Group",
    sequenceName: "Dental Clinics",
    channel: "EMAIL",
    stepPosition: 2,
  },
  {
    id: "a6",
    timestamp: "08:15 AM",
    type: "REPLIED",
    contactName: "Dr. Robert Chen",
    companyName: "SmileCare Dental Group",
    sequenceName: "Dental Clinics",
    channel: "EMAIL",
    stepPosition: 2,
  },
  {
    id: "a7",
    timestamp: "08:01 AM",
    type: "OPTED_OUT",
    contactName: "Brian Foster",
    companyName: "Foster Roofing Ltd",
    sequenceName: "Trades Outreach",
    channel: "EMAIL",
    stepPosition: 3,
  },
  {
    id: "a8",
    timestamp: "Yesterday",
    type: "CONVERTED",
    contactName: "Sarah Thompson",
    companyName: "Jani-King Cleaning",
    sequenceName: "Cleaning Outreach",
    channel: "EMAIL",
    stepPosition: 4,
  },
  {
    id: "a9",
    timestamp: "Yesterday",
    type: "SENT",
    contactName: "Tom Richardson",
    companyName: "Elite Electrical Services",
    sequenceName: "Trades Outreach",
    channel: "CALL",
    stepPosition: 3,
  },
  {
    id: "a10",
    timestamp: "Yesterday",
    type: "SENT",
    contactName: "Catherine Wright",
    companyName: "Sullivan & Partners Recruitment",
    sequenceName: "Recruitment A",
    channel: "EMAIL",
    stepPosition: 4,
  },
]

// ---------------------------------------------------------------------------
// Mock sector stats — 4 sectors
// ---------------------------------------------------------------------------

export const mockSectorStats: MockSectorStats[] = [
  {
    sector: "Recruitment",
    totalSent: 156,
    replies: 22,
    replyRate: 14.1,
    conversions: 3,
    convRate: 1.9,
    avgStepsToReply: 2.4,
    bestSequence: "Recruitment A",
  },
  {
    sector: "Cleaning",
    totalSent: 98,
    replies: 12,
    replyRate: 12.2,
    conversions: 2,
    convRate: 2.0,
    avgStepsToReply: 2.1,
    bestSequence: "Cleaning Outreach",
  },
  {
    sector: "Dental",
    totalSent: 74,
    replies: 8,
    replyRate: 10.8,
    conversions: 1,
    convRate: 1.4,
    avgStepsToReply: 2.8,
    bestSequence: "Dental Clinics",
  },
  {
    sector: "Trades",
    totalSent: 82,
    replies: 5,
    replyRate: 6.1,
    conversions: 0,
    convRate: 0,
    avgStepsToReply: 3.2,
    bestSequence: "Trades Outreach",
  },
]
