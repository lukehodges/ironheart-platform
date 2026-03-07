export type PropertyType = "Office" | "Retail" | "Industrial" | "Trade Counter" | "Leisure"
export type DealValueType = "pa" | "sale"
export type Stage = "instruction" | "under-offer" | "exchanged" | "completed"

export interface DealParty {
  name: string
  contact: string
  solicitorFirm?: string
  solicitorContact?: string
}

export interface DocumentItem {
  id: string
  label: string
  status: "complete" | "pending" | "awaiting" | "na"
  date?: string
  note?: string
}

export interface DealActivity {
  date: string
  type: "milestone" | "legal" | "financial" | "note" | "communication"
  text: string
  agent?: string
  detail?: string
}

export interface DealDetail {
  id: string
  address: string
  propertyType: PropertyType
  dealValue: number
  dealValueType: DealValueType
  counterpartyLabel: "Tenant" | "Buyer" | "Vendor"
  counterpartyName: string
  daysInStage: number
  agentInitials: string
  stage: Stage
  propertyId: number | null
  instructionDate: string
  targetCompletion: string
  leaseTerm?: string
  rentFreeMonths?: number
  breakClause?: string
  landlord: DealParty
  counterparty: DealParty
  documents: DocumentItem[]
  activity: DealActivity[]
  nextActions: string[]
  notes?: string
}

export const DEALS: DealDetail[] = [
  // ─── INSTRUCTION ───────────────────────────────────────────────────────────
  {
    id: "i1",
    address: "Unit 4, Kingsway, Swansea",
    propertyType: "Office",
    dealValue: 28000,
    dealValueType: "pa",
    counterpartyLabel: "Tenant",
    counterpartyName: "Davies & Partners",
    daysInStage: 3,
    agentInitials: "DB",
    stage: "instruction",
    propertyId: null,
    instructionDate: "2026-03-01",
    targetCompletion: "2026-06-01",
    leaseTerm: "5 years from completion",
    rentFreeMonths: 3,
    breakClause: "Tenant break at year 3 on 6 months' notice",
    landlord: {
      name: "Kingsway Estates Ltd",
      contact: "07700 900 112",
      solicitorFirm: "Morgan Cole LLP",
      solicitorContact: "Emma Griffiths · 029 2038 5300",
    },
    counterparty: {
      name: "Davies & Partners",
      contact: "07700 900 210",
      solicitorFirm: "Watkins & Gunn",
      solicitorContact: "James Watkins · 01792 655 000",
    },
    documents: [
      { id: "hot", label: "Heads of Terms", status: "pending" },
      { id: "sol", label: "Solicitors Instructed", status: "pending" },
      { id: "epc", label: "Energy Performance Certificate", status: "complete", date: "2026-02-15" },
      { id: "searches", label: "Searches Ordered", status: "na" },
      { id: "draft", label: "Draft Lease / Contract", status: "na" },
      { id: "survey", label: "Survey / Structural Report", status: "na" },
      { id: "enquiries", label: "Replies to Enquiries", status: "pending" },
      { id: "exchange", label: "Exchange of Contracts", status: "pending" },
      { id: "completion", label: "Completion", status: "pending" },
      { id: "sdlt", label: "SDLT / Registration", status: "na" },
    ],
    activity: [
      {
        date: "2026-03-01",
        type: "milestone",
        text: "Instruction received from Kingsway Estates Ltd",
        agent: "DB",
        detail: "Client confirmed BP2 as sole agent. Marketing to commence immediately.",
      },
      {
        date: "2026-03-01",
        type: "communication",
        text: "Initial call with Davies & Partners to discuss requirements",
        agent: "DB",
        detail: "Confirmed 1,800–2,200 sq ft requirement. Preference for open-plan with meeting room.",
      },
      {
        date: "2026-02-28",
        type: "note",
        text: "EPC certificate confirmed — rating C (58)",
        agent: "DB",
      },
    ],
    nextActions: [
      "Chase landlord for signed Heads of Terms",
      "Instruct solicitors on both sides",
      "Prepare marketing particulars and upload to portals",
      "Arrange accompanied viewing with Davies & Partners",
    ],
    notes:
      "Davies & Partners are keen to move before their current lease expires in July. Strong covenant — likely to exchange quickly once HoT are agreed.",
  },

  {
    id: "i2",
    address: "47 Queen Street, Cardiff",
    propertyType: "Retail",
    dealValue: 45000,
    dealValueType: "pa",
    counterpartyLabel: "Vendor",
    counterpartyName: "Cardiff Retail Ltd",
    daysInStage: 7,
    agentInitials: "RJ",
    stage: "instruction",
    propertyId: null,
    instructionDate: "2026-02-25",
    targetCompletion: "2026-06-30",
    leaseTerm: "10 years from completion",
    rentFreeMonths: 6,
    landlord: {
      name: "Cardiff Retail Ltd",
      contact: "07700 900 331",
      solicitorFirm: "Blake Morgan LLP",
      solicitorContact: "Sarah Pearce · 029 2068 6688",
    },
    counterparty: {
      name: "Prospective Tenant TBC",
      contact: "—",
    },
    documents: [
      { id: "hot", label: "Heads of Terms", status: "pending" },
      { id: "sol", label: "Solicitors Instructed", status: "pending" },
      { id: "epc", label: "Energy Performance Certificate", status: "complete", date: "2026-01-20" },
      { id: "searches", label: "Searches Ordered", status: "na" },
      { id: "draft", label: "Draft Lease / Contract", status: "na" },
      { id: "survey", label: "Survey / Structural Report", status: "na" },
      { id: "enquiries", label: "Replies to Enquiries", status: "pending" },
      { id: "exchange", label: "Exchange of Contracts", status: "pending" },
      { id: "completion", label: "Completion", status: "pending" },
      { id: "sdlt", label: "SDLT / Registration", status: "na" },
    ],
    activity: [
      {
        date: "2026-02-25",
        type: "milestone",
        text: "Property brought to market — Queen Street prime retail",
        agent: "RJ",
        detail: "Cardiff Retail Ltd instructed BP2 as sole agent. Quoting £45,000 pa.",
      },
      {
        date: "2026-02-26",
        type: "communication",
        text: "Two enquiries received via Rightmove Commercial within 24 hours of listing",
        agent: "RJ",
      },
      {
        date: "2026-02-27",
        type: "note",
        text: "Viewing booked with national fashion retailer for w/c 3 March",
        agent: "RJ",
      },
    ],
    nextActions: [
      "Complete accompanied viewings with shortlisted occupiers",
      "Obtain landlord approval before issuing Heads of Terms",
      "Confirm EPC is registered on the national register",
    ],
    notes:
      "High footfall location — client expects multiple offers. Advise against accepting first offer at asking without testing market for 2 further weeks.",
  },

  {
    id: "i3",
    address: "Riverside Business Park, Newport",
    propertyType: "Industrial",
    dealValue: 62000,
    dealValueType: "pa",
    counterpartyLabel: "Tenant",
    counterpartyName: "Newport Logistics",
    daysInStage: 2,
    agentInitials: "DB",
    stage: "instruction",
    propertyId: null,
    instructionDate: "2026-03-02",
    targetCompletion: "2026-07-01",
    leaseTerm: "10 years from completion",
    rentFreeMonths: 6,
    breakClause: "Mutual break at year 5 on 12 months' notice",
    landlord: {
      name: "Riverside Park Developments",
      contact: "07700 900 440",
      solicitorFirm: "Geldards LLP",
      solicitorContact: "Phil Morse · 029 2023 8239",
    },
    counterparty: {
      name: "Newport Logistics",
      contact: "07700 900 552",
      solicitorFirm: "Acuity Law",
      solicitorContact: "Claire Hughes · 029 2167 0001",
    },
    documents: [
      { id: "hot", label: "Heads of Terms", status: "pending" },
      { id: "sol", label: "Solicitors Instructed", status: "pending" },
      { id: "epc", label: "Energy Performance Certificate", status: "complete", date: "2026-02-01" },
      { id: "searches", label: "Searches Ordered", status: "na" },
      { id: "draft", label: "Draft Lease / Contract", status: "na" },
      { id: "survey", label: "Survey / Structural Report", status: "na" },
      { id: "enquiries", label: "Replies to Enquiries", status: "pending" },
      { id: "exchange", label: "Exchange of Contracts", status: "pending" },
      { id: "completion", label: "Completion", status: "pending" },
      { id: "sdlt", label: "SDLT / Registration", status: "na" },
    ],
    activity: [
      {
        date: "2026-03-02",
        type: "milestone",
        text: "Newport Logistics confirmed as preferred tenant",
        agent: "DB",
        detail: "Following two viewings, landlord has selected Newport Logistics. Instruction to proceed to HoT.",
      },
      {
        date: "2026-03-01",
        type: "communication",
        text: "Second viewing with Newport Logistics — 22,000 sq ft warehouse unit",
        agent: "DB",
      },
      {
        date: "2026-02-20",
        type: "communication",
        text: "First viewing conducted with Newport Logistics",
        agent: "DB",
      },
    ],
    nextActions: [
      "Draft and issue Heads of Terms to both solicitors",
      "Instruct solicitors on both sides",
      "Confirm tenant's fit-out schedule and handover date requirement",
    ],
    notes:
      "Newport Logistics expanding from 10,000 to 22,000 sq ft — strong growth story. Landlord eager to avoid void period; expect quick progression to HoT.",
  },

  // ─── UNDER OFFER ──────────────────────────────────────────────────────────
  {
    id: "u1",
    address: "Ground Floor, Wind Street, Swansea",
    propertyType: "Leisure",
    dealValue: 38500,
    dealValueType: "pa",
    counterpartyLabel: "Tenant",
    counterpartyName: "Cornerstone Bars Ltd",
    daysInStage: 18,
    agentInitials: "DB",
    stage: "under-offer",
    propertyId: 22,
    instructionDate: "2026-02-01",
    targetCompletion: "2026-05-01",
    leaseTerm: "10 years from completion",
    rentFreeMonths: 4,
    breakClause: "Tenant break at year 5 on 6 months' notice",
    landlord: {
      name: "Swansea Leisure Properties Ltd",
      contact: "07700 900 663",
      solicitorFirm: "JCP Solicitors",
      solicitorContact: "Mark Rees · 01792 773 773",
    },
    counterparty: {
      name: "Cornerstone Bars Ltd",
      contact: "07700 900 774",
      solicitorFirm: "Capital Law",
      solicitorContact: "Anna Thomas · 029 2047 2300",
    },
    documents: [
      { id: "hot", label: "Heads of Terms", status: "complete", date: "2026-02-14" },
      { id: "sol", label: "Solicitors Instructed", status: "complete", date: "2026-02-17" },
      { id: "epc", label: "Energy Performance Certificate", status: "complete", date: "2026-01-30" },
      { id: "searches", label: "Searches Ordered", status: "na" },
      { id: "draft", label: "Draft Lease / Contract", status: "pending" },
      { id: "survey", label: "Survey / Structural Report", status: "na" },
      { id: "enquiries", label: "Replies to Enquiries", status: "pending" },
      { id: "exchange", label: "Exchange of Contracts", status: "pending" },
      { id: "completion", label: "Completion", status: "pending" },
      { id: "sdlt", label: "SDLT / Registration", status: "na" },
    ],
    activity: [
      {
        date: "2026-02-20",
        type: "legal",
        text: "Both solicitors instructed — draft lease to follow within 10 working days",
        agent: "DB",
      },
      {
        date: "2026-02-17",
        type: "milestone",
        text: "Solicitors instructed on both sides",
        agent: "DB",
      },
      {
        date: "2026-02-14",
        type: "milestone",
        text: "Heads of Terms agreed and issued",
        agent: "DB",
        detail: "£38,500 pa agreed. 4 months rent free. 10-year term with tenant break at year 5.",
      },
      {
        date: "2026-02-10",
        type: "financial",
        text: "Rent deposit agreed at 6 months — £19,250",
        agent: "DB",
      },
      {
        date: "2026-02-05",
        type: "communication",
        text: "Offer received from Cornerstone Bars Ltd — negotiation commenced",
        agent: "DB",
        detail: "Initial offer at £35,000. Counter at £40,000. Final agreement at £38,500.",
      },
      {
        date: "2026-02-03",
        type: "communication",
        text: "Third viewing with Cornerstone Bars — board-level decision expected imminently",
        agent: "DB",
      },
    ],
    nextActions: [
      "Await draft lease from landlord's solicitors",
      "Confirm rent deposit arrangements with both parties",
      "Chase Cornerstone for fit-out schedule and proposed start date",
    ],
    notes:
      "Cornerstone Bars operating 4 other venues across Wales — strong covenant. Landlord very motivated. Aim to exchange by end of March.",
  },

  {
    id: "u2",
    address: "Unit 12, Baglan Energy Park",
    propertyType: "Industrial",
    dealValue: 1200000,
    dealValueType: "sale",
    counterpartyLabel: "Buyer",
    counterpartyName: "Capital Industrial Fund",
    daysInStage: 24,
    agentInitials: "RJ",
    stage: "under-offer",
    propertyId: 12,
    instructionDate: "2026-01-15",
    targetCompletion: "2026-05-15",
    landlord: {
      name: "Baglan Energy Park Estates",
      contact: "07700 900 885",
      solicitorFirm: "Eversheds Sutherland",
      solicitorContact: "David Owen · 029 2047 7170",
    },
    counterparty: {
      name: "Capital Industrial Fund",
      contact: "07700 900 996",
      solicitorFirm: "Addleshaw Goddard LLP",
      solicitorContact: "Patricia Walsh · 0113 209 2000",
    },
    documents: [
      { id: "hot", label: "Heads of Terms", status: "complete", date: "2026-02-05" },
      { id: "sol", label: "Solicitors Instructed", status: "complete", date: "2026-02-08" },
      { id: "epc", label: "Energy Performance Certificate", status: "complete", date: "2026-01-20" },
      { id: "searches", label: "Searches Ordered", status: "awaiting" },
      { id: "draft", label: "Draft Lease / Contract", status: "pending" },
      { id: "survey", label: "Survey / Structural Report", status: "awaiting" },
      { id: "enquiries", label: "Replies to Enquiries", status: "pending" },
      { id: "exchange", label: "Exchange of Contracts", status: "pending" },
      { id: "completion", label: "Completion", status: "pending" },
      { id: "sdlt", label: "SDLT / Registration", status: "pending" },
    ],
    activity: [
      {
        date: "2026-03-01",
        type: "legal",
        text: "Buyer's solicitors raised enquiries on title — vendor's team to respond within 5 working days",
        agent: "RJ",
      },
      {
        date: "2026-02-22",
        type: "financial",
        text: "Buyer's survey and structural report commissioned — expected 2 weeks",
        agent: "RJ",
      },
      {
        date: "2026-02-15",
        type: "legal",
        text: "Draft contract issued by vendor's solicitors",
        agent: "RJ",
      },
      {
        date: "2026-02-08",
        type: "milestone",
        text: "Solicitors instructed on both sides",
        agent: "RJ",
      },
      {
        date: "2026-02-05",
        type: "milestone",
        text: "Heads of Terms agreed — £1.2m sale price",
        agent: "RJ",
        detail: "10% deposit payable on exchange. Completion 10 weeks post-exchange.",
      },
      {
        date: "2026-01-28",
        type: "financial",
        text: "Capital Industrial Fund's offer of £1.15m rejected; counter at £1.25m; agreed at £1.2m",
        agent: "RJ",
      },
    ],
    nextActions: [
      "Await results of buyer's structural survey",
      "Chase vendor's solicitors for replies to enquiries",
      "Confirm search results ETA with buyer's solicitors",
    ],
    notes:
      "Capital Industrial Fund acquiring for portfolio. No finance contingency — cash purchase. Good chance of exchange in 4 weeks if survey clean.",
  },

  {
    id: "u3",
    address: "Station Road, Neath",
    propertyType: "Trade Counter",
    dealValue: 22000,
    dealValueType: "pa",
    counterpartyLabel: "Tenant",
    counterpartyName: "Toolstation Holdings",
    daysInStage: 12,
    agentInitials: "MW",
    stage: "under-offer",
    propertyId: null,
    instructionDate: "2026-02-10",
    targetCompletion: "2026-04-28",
    leaseTerm: "5 years from completion",
    rentFreeMonths: 2,
    landlord: {
      name: "Neath Port Talbot Commercial Estates",
      contact: "07700 901 007",
      solicitorFirm: "Harding Evans LLP",
      solicitorContact: "Sian Price · 01633 244 233",
    },
    counterparty: {
      name: "Toolstation Holdings",
      contact: "07700 901 118",
      solicitorFirm: "Foot Anstey LLP",
      solicitorContact: "Rob Carmichael · 01752 675 000",
    },
    documents: [
      { id: "hot", label: "Heads of Terms", status: "complete", date: "2026-02-20" },
      { id: "sol", label: "Solicitors Instructed", status: "complete", date: "2026-02-22" },
      { id: "epc", label: "Energy Performance Certificate", status: "complete", date: "2026-02-05" },
      { id: "searches", label: "Searches Ordered", status: "na" },
      { id: "draft", label: "Draft Lease / Contract", status: "pending" },
      { id: "survey", label: "Survey / Structural Report", status: "na" },
      { id: "enquiries", label: "Replies to Enquiries", status: "pending" },
      { id: "exchange", label: "Exchange of Contracts", status: "pending" },
      { id: "completion", label: "Completion", status: "pending" },
      { id: "sdlt", label: "SDLT / Registration", status: "na" },
    ],
    activity: [
      {
        date: "2026-02-25",
        type: "legal",
        text: "Draft lease issued by landlord's solicitors — Toolstation team reviewing",
        agent: "MW",
      },
      {
        date: "2026-02-22",
        type: "milestone",
        text: "Solicitors instructed on both sides",
        agent: "MW",
      },
      {
        date: "2026-02-20",
        type: "milestone",
        text: "Heads of Terms signed by both parties",
        agent: "MW",
        detail: "£22,000 pa agreed, 2 months rent free, 5-year term.",
      },
      {
        date: "2026-02-15",
        type: "communication",
        text: "Toolstation property director approved deal — formal offer issued",
        agent: "MW",
      },
      {
        date: "2026-02-12",
        type: "communication",
        text: "Viewing with Toolstation regional estates manager",
        agent: "MW",
      },
    ],
    nextActions: [
      "Await draft lease comments from Toolstation's solicitors",
      "Confirm rent deposit figure with landlord",
      "Chase Toolstation on proposed occupation date",
    ],
    notes:
      "National operator — covenant is excellent. Landlord anxious to get lease exchange. Draft lease comments expected from Toolstation's solicitors within the week.",
  },

  {
    id: "u4",
    address: "Meridian Point, Milland Road, Neath, SA11 1NJ",
    propertyType: "Office",
    dealValue: 3400000,
    dealValueType: "sale",
    counterpartyLabel: "Buyer",
    counterpartyName: "Welsh Development Corp",
    daysInStage: 31,
    agentInitials: "DB",
    stage: "under-offer",
    propertyId: 4,
    instructionDate: "2026-01-05",
    targetCompletion: "2026-06-01",
    landlord: {
      name: "Meridian Point Holdings",
      contact: "07700 901 229",
      solicitorFirm: "Eversheds Sutherland",
      solicitorContact: "Karen Lloyd · 029 2047 7170",
    },
    counterparty: {
      name: "Welsh Development Corp",
      contact: "07700 901 340",
      solicitorFirm: "Blake Morgan LLP",
      solicitorContact: "Tom Griffiths · 029 2068 6688",
    },
    documents: [
      { id: "hot", label: "Heads of Terms", status: "complete", date: "2026-01-28" },
      { id: "sol", label: "Solicitors Instructed", status: "complete", date: "2026-02-01" },
      { id: "epc", label: "Energy Performance Certificate", status: "complete", date: "2026-01-10" },
      { id: "searches", label: "Searches Ordered", status: "awaiting" },
      { id: "draft", label: "Draft Lease / Contract", status: "pending" },
      { id: "survey", label: "Survey / Structural Report", status: "awaiting" },
      { id: "enquiries", label: "Replies to Enquiries", status: "pending" },
      { id: "exchange", label: "Exchange of Contracts", status: "pending" },
      { id: "completion", label: "Completion", status: "pending" },
      { id: "sdlt", label: "SDLT / Registration", status: "pending" },
    ],
    activity: [
      {
        date: "2026-03-01",
        type: "financial",
        text: "Funding committee approval granted by Welsh Development Corp board",
        agent: "DB",
      },
      {
        date: "2026-02-18",
        type: "legal",
        text: "Draft contract received — buyer's solicitors reviewing and raising enquiries",
        agent: "DB",
      },
      {
        date: "2026-02-10",
        type: "financial",
        text: "Building survey commissioned by buyer — 3 week turnaround expected",
        agent: "DB",
      },
      {
        date: "2026-02-01",
        type: "milestone",
        text: "Solicitors instructed on both sides",
        agent: "DB",
      },
      {
        date: "2026-01-28",
        type: "milestone",
        text: "Heads of Terms signed — £3.4m acquisition price",
        agent: "DB",
        detail: "10% deposit on exchange. 12-week completion target.",
      },
      {
        date: "2026-01-20",
        type: "communication",
        text: "Final round of negotiations — price agreed at £3.4m after three rounds of offers",
        agent: "DB",
      },
    ],
    nextActions: [
      "Await results of buyer's full building survey",
      "Chase both solicitors on contract timeline",
      "Confirm planning position for proposed change of use",
    ],
    notes:
      "Highest value deal in current pipeline. Welsh Development Corp acquiring for their regional HQ. Planning position for proposed extension should be confirmed before exchange.",
  },

  // ─── EXCHANGED ────────────────────────────────────────────────────────────
  {
    id: "e1",
    address: "Pontardawe Business Centre",
    propertyType: "Office",
    dealValue: 18500,
    dealValueType: "pa",
    counterpartyLabel: "Tenant",
    counterpartyName: "Hughes & Co Solicitors",
    daysInStage: 45,
    agentInitials: "DB",
    stage: "exchanged",
    propertyId: null,
    instructionDate: "2026-01-06",
    targetCompletion: "2026-04-01",
    leaseTerm: "3 years with option to renew",
    rentFreeMonths: 1,
    landlord: {
      name: "Pontardawe Commercial Properties",
      contact: "07700 901 451",
      solicitorFirm: "JCP Solicitors",
      solicitorContact: "Gwyn Morris · 01792 773 773",
    },
    counterparty: {
      name: "Hughes & Co Solicitors",
      contact: "07700 901 562",
      solicitorFirm: "Acting in person",
      solicitorContact: "Richard Hughes · 01792 455 900",
    },
    documents: [
      { id: "hot", label: "Heads of Terms", status: "complete", date: "2026-01-20" },
      { id: "sol", label: "Solicitors Instructed", status: "complete", date: "2026-01-22" },
      { id: "epc", label: "Energy Performance Certificate", status: "complete", date: "2026-01-10" },
      { id: "searches", label: "Searches Ordered", status: "na" },
      { id: "draft", label: "Draft Lease / Contract", status: "complete", date: "2026-02-05" },
      { id: "survey", label: "Survey / Structural Report", status: "na" },
      { id: "enquiries", label: "Replies to Enquiries", status: "complete", date: "2026-02-18" },
      { id: "exchange", label: "Exchange of Contracts", status: "complete", date: "2026-02-18" },
      { id: "completion", label: "Completion", status: "pending" },
      { id: "sdlt", label: "SDLT / Registration", status: "na" },
    ],
    activity: [
      {
        date: "2026-02-18",
        type: "milestone",
        text: "Contracts exchanged — completion date set for 1 April 2026",
        agent: "DB",
        detail: "Rent deposit of £9,250 (6 months) paid on exchange.",
      },
      {
        date: "2026-02-18",
        type: "legal",
        text: "All replies to enquiries received and satisfactory — exchange confirmed",
        agent: "DB",
      },
      {
        date: "2026-02-10",
        type: "legal",
        text: "Hughes & Co raised 3 minor enquiries — landlord to respond",
        agent: "DB",
      },
      {
        date: "2026-02-05",
        type: "legal",
        text: "Draft lease received from landlord's solicitors",
        agent: "DB",
      },
      {
        date: "2026-01-22",
        type: "milestone",
        text: "Solicitors instructed on both sides",
        agent: "DB",
      },
      {
        date: "2026-01-20",
        type: "milestone",
        text: "Heads of Terms agreed and signed",
        agent: "DB",
        detail: "£18,500 pa, 3-year term, 1 month rent free.",
      },
    ],
    nextActions: [
      "Agree keys handover arrangements with building manager",
      "Confirm completion date with both solicitors",
      "Prepare BP2 invoice for issue on completion",
    ],
    notes:
      "Smooth transaction — tenant is themselves a solicitors firm so negotiations were efficient. Keys handover to be coordinated with building facilities manager.",
  },

  {
    id: "e2",
    address: "Cross Hands Food Park",
    propertyType: "Industrial",
    dealValue: 875000,
    dealValueType: "sale",
    counterpartyLabel: "Buyer",
    counterpartyName: "Greens Logistics",
    daysInStage: 38,
    agentInitials: "RJ",
    stage: "exchanged",
    propertyId: 13,
    instructionDate: "2025-12-15",
    targetCompletion: "2026-04-15",
    landlord: {
      name: "Cross Hands Developments Ltd",
      contact: "07700 901 673",
      solicitorFirm: "Geldards LLP",
      solicitorContact: "Helen James · 029 2023 8239",
    },
    counterparty: {
      name: "Greens Logistics",
      contact: "07700 901 784",
      solicitorFirm: "Hugh James LLP",
      solicitorContact: "Stuart Evans · 029 2022 4871",
    },
    documents: [
      { id: "hot", label: "Heads of Terms", status: "complete", date: "2026-01-08" },
      { id: "sol", label: "Solicitors Instructed", status: "complete", date: "2026-01-10" },
      { id: "epc", label: "Energy Performance Certificate", status: "complete", date: "2025-12-20" },
      { id: "searches", label: "Searches Ordered", status: "complete", date: "2026-01-15" },
      { id: "draft", label: "Draft Lease / Contract", status: "complete", date: "2026-01-22" },
      { id: "survey", label: "Survey / Structural Report", status: "complete", date: "2026-02-01" },
      { id: "enquiries", label: "Replies to Enquiries", status: "complete", date: "2026-02-10" },
      { id: "exchange", label: "Exchange of Contracts", status: "complete", date: "2026-01-25" },
      { id: "completion", label: "Completion", status: "pending" },
      { id: "sdlt", label: "SDLT / Registration", status: "pending" },
    ],
    activity: [
      {
        date: "2026-01-25",
        type: "milestone",
        text: "Exchange of contracts completed — £875,000 purchase price",
        agent: "RJ",
        detail: "10% deposit (£87,500) received by vendor's solicitors. Completion 15 April 2026.",
      },
      {
        date: "2026-02-10",
        type: "legal",
        text: "All replies to enquiries received — buyer's solicitors satisfied",
        agent: "RJ",
      },
      {
        date: "2026-02-01",
        type: "financial",
        text: "Building survey report received — minor damp noted in eaves, £12k remediation quoted; price held",
        agent: "RJ",
      },
      {
        date: "2026-01-22",
        type: "legal",
        text: "Draft contract issued — clean title, no unusual restrictions",
        agent: "RJ",
      },
      {
        date: "2026-01-15",
        type: "legal",
        text: "Searches ordered by buyer's solicitors",
        agent: "RJ",
      },
      {
        date: "2026-01-10",
        type: "milestone",
        text: "Solicitors instructed on both sides",
        agent: "RJ",
      },
      {
        date: "2026-01-08",
        type: "milestone",
        text: "Heads of Terms agreed — £875,000 agreed after negotiation from asking £925,000",
        agent: "RJ",
      },
    ],
    nextActions: [
      "Confirm completion date with both solicitors (15 April)",
      "Arrange keys handover and meter readings",
      "Issue BP2 agency invoice on completion",
    ],
    notes:
      "Minor damp issue surfaced in survey but Greens Logistics accepted without price reduction — strong motivation to acquire this specific building for logistics fit-out.",
  },

  // ─── COMPLETED ───────────────────────────────────────────────────────────
  {
    id: "c1",
    address: "High Street, Llanelli",
    propertyType: "Retail",
    dealValue: 26000,
    dealValueType: "pa",
    counterpartyLabel: "Tenant",
    counterpartyName: "Greggs PLC",
    daysInStage: 67,
    agentInitials: "DB",
    stage: "completed",
    propertyId: null,
    instructionDate: "2025-11-01",
    targetCompletion: "2026-01-06",
    leaseTerm: "10 years from completion",
    rentFreeMonths: 3,
    landlord: {
      name: "Llanelli High Street Estates",
      contact: "07700 901 895",
      solicitorFirm: "Howells LLP",
      solicitorContact: "Bethan Davies · 029 2034 0000",
    },
    counterparty: {
      name: "Greggs PLC",
      contact: "07700 901 906",
      solicitorFirm: "Eversheds Sutherland",
      solicitorContact: "Mark Collins · 0191 261 1661",
    },
    documents: [
      { id: "hot", label: "Heads of Terms", status: "complete", date: "2025-11-20" },
      { id: "sol", label: "Solicitors Instructed", status: "complete", date: "2025-11-24" },
      { id: "epc", label: "Energy Performance Certificate", status: "complete", date: "2025-11-05" },
      { id: "searches", label: "Searches Ordered", status: "na" },
      { id: "draft", label: "Draft Lease / Contract", status: "complete", date: "2025-12-05" },
      { id: "survey", label: "Survey / Structural Report", status: "na" },
      { id: "enquiries", label: "Replies to Enquiries", status: "complete", date: "2025-12-20" },
      { id: "exchange", label: "Exchange of Contracts", status: "complete", date: "2025-12-22" },
      { id: "completion", label: "Completion", status: "complete", date: "2026-01-06" },
      { id: "sdlt", label: "SDLT / Registration", status: "na" },
    ],
    activity: [
      {
        date: "2026-01-06",
        type: "milestone",
        text: "Completion — keys handed over to Greggs PLC fit-out team",
        agent: "DB",
      },
      {
        date: "2025-12-22",
        type: "milestone",
        text: "Exchange of contracts confirmed",
        agent: "DB",
      },
      {
        date: "2025-12-20",
        type: "legal",
        text: "All enquiries resolved — both parties ready to exchange",
        agent: "DB",
      },
      {
        date: "2025-12-05",
        type: "legal",
        text: "Draft lease issued by landlord's solicitors",
        agent: "DB",
      },
      {
        date: "2025-11-24",
        type: "milestone",
        text: "Solicitors instructed on both sides",
        agent: "DB",
      },
      {
        date: "2025-11-20",
        type: "milestone",
        text: "Heads of Terms agreed — £26,000 pa, 10 years, 3 months rent free",
        agent: "DB",
      },
      {
        date: "2025-11-10",
        type: "communication",
        text: "Greggs PLC estates team confirmed acquisition — formal offer issued",
        agent: "DB",
      },
    ],
    nextActions: [
      "Issue invoice to landlord client",
      "File deal on completion register",
      "Request testimonial from Llanelli High Street Estates",
    ],
    notes:
      "Greggs PLC — national covenant. Completed within 9 weeks of instruction. Landlord delighted. Good candidate for case study on our website.",
  },

  {
    id: "c2",
    address: "Bridgend Trade Park",
    propertyType: "Trade Counter",
    dealValue: 34000,
    dealValueType: "pa",
    counterpartyLabel: "Tenant",
    counterpartyName: "Screwfix Ltd",
    daysInStage: 52,
    agentInitials: "MW",
    stage: "completed",
    propertyId: 8,
    instructionDate: "2025-11-15",
    targetCompletion: "2026-01-20",
    leaseTerm: "5 years from completion",
    rentFreeMonths: 2,
    breakClause: "Tenant break at year 3 on 3 months' notice",
    landlord: {
      name: "Bridgend Trade Park Ltd",
      contact: "07700 902 017",
      solicitorFirm: "Geldards LLP",
      solicitorContact: "Andrew Price · 029 2023 8239",
    },
    counterparty: {
      name: "Screwfix Ltd",
      contact: "07700 902 128",
      solicitorFirm: "Burges Salmon LLP",
      solicitorContact: "Kate Jameson · 0117 939 2000",
    },
    documents: [
      { id: "hot", label: "Heads of Terms", status: "complete", date: "2025-12-01" },
      { id: "sol", label: "Solicitors Instructed", status: "complete", date: "2025-12-05" },
      { id: "epc", label: "Energy Performance Certificate", status: "complete", date: "2025-11-20" },
      { id: "searches", label: "Searches Ordered", status: "na" },
      { id: "draft", label: "Draft Lease / Contract", status: "complete", date: "2025-12-15" },
      { id: "survey", label: "Survey / Structural Report", status: "na" },
      { id: "enquiries", label: "Replies to Enquiries", status: "complete", date: "2026-01-05" },
      { id: "exchange", label: "Exchange of Contracts", status: "complete", date: "2026-01-10" },
      { id: "completion", label: "Completion", status: "complete", date: "2026-01-20" },
      { id: "sdlt", label: "SDLT / Registration", status: "na" },
    ],
    activity: [
      {
        date: "2026-01-20",
        type: "milestone",
        text: "Completion — Screwfix Ltd in occupation from today",
        agent: "MW",
      },
      {
        date: "2026-01-10",
        type: "milestone",
        text: "Exchange of contracts confirmed",
        agent: "MW",
      },
      {
        date: "2026-01-05",
        type: "legal",
        text: "All replies to enquiries received and accepted — exchange confirmed for 10 January",
        agent: "MW",
      },
      {
        date: "2025-12-15",
        type: "legal",
        text: "Draft lease agreed in principle between both legal teams",
        agent: "MW",
      },
      {
        date: "2025-12-05",
        type: "milestone",
        text: "Solicitors instructed on both sides",
        agent: "MW",
      },
      {
        date: "2025-12-01",
        type: "milestone",
        text: "Heads of Terms agreed — £34,000 pa, 5 years, break at year 3",
        agent: "MW",
      },
    ],
    nextActions: [
      "Issue invoice to landlord client",
      "File deal on completion register",
      "Request client testimonial from Bridgend Trade Park Ltd",
    ],
    notes:
      "Screwfix national rollout — sixth South Wales location. MW built strong relationship with their estates team. Refer future Screwfix requirements to MW directly.",
  },

  {
    id: "c3",
    address: "Celtic Business Park, Port Talbot",
    propertyType: "Industrial",
    dealValue: 2100000,
    dealValueType: "sale",
    counterpartyLabel: "Buyer",
    counterpartyName: "Atlantic Property Partners",
    daysInStage: 89,
    agentInitials: "RJ",
    stage: "completed",
    propertyId: null,
    instructionDate: "2025-10-01",
    targetCompletion: "2025-12-15",
    landlord: {
      name: "Celtic Industrial Holdings",
      contact: "07700 902 239",
      solicitorFirm: "Blake Morgan LLP",
      solicitorContact: "Nigel Thomas · 029 2068 6688",
    },
    counterparty: {
      name: "Atlantic Property Partners",
      contact: "07700 902 340",
      solicitorFirm: "Simmons & Simmons LLP",
      solicitorContact: "Jonathan Wood · 020 7628 2020",
    },
    documents: [
      { id: "hot", label: "Heads of Terms", status: "complete", date: "2025-10-22" },
      { id: "sol", label: "Solicitors Instructed", status: "complete", date: "2025-10-25" },
      { id: "epc", label: "Energy Performance Certificate", status: "complete", date: "2025-10-08" },
      { id: "searches", label: "Searches Ordered", status: "complete", date: "2025-10-28" },
      { id: "draft", label: "Draft Lease / Contract", status: "complete", date: "2025-11-05" },
      { id: "survey", label: "Survey / Structural Report", status: "complete", date: "2025-11-18" },
      { id: "enquiries", label: "Replies to Enquiries", status: "complete", date: "2025-11-28" },
      { id: "exchange", label: "Exchange of Contracts", status: "complete", date: "2025-12-05" },
      { id: "completion", label: "Completion", status: "complete", date: "2025-12-15" },
      { id: "sdlt", label: "SDLT / Registration", status: "complete", date: "2026-01-10" },
    ],
    activity: [
      {
        date: "2026-01-10",
        type: "legal",
        text: "SDLT submitted and Land Registry registration confirmed",
        agent: "RJ",
      },
      {
        date: "2025-12-15",
        type: "milestone",
        text: "Completion — £2.1m received. Keys handed to Atlantic Property Partners",
        agent: "RJ",
      },
      {
        date: "2025-12-05",
        type: "milestone",
        text: "Exchange of contracts — 10% deposit (£210,000) received",
        agent: "RJ",
      },
      {
        date: "2025-11-28",
        type: "legal",
        text: "All replies to enquiries satisfactory — buyer confirmed ready to exchange",
        agent: "RJ",
      },
      {
        date: "2025-11-18",
        type: "financial",
        text: "Survey clean — no material defects noted. Price held at £2.1m",
        agent: "RJ",
      },
      {
        date: "2025-11-05",
        type: "legal",
        text: "Draft contract issued by vendor's solicitors",
        agent: "RJ",
      },
      {
        date: "2025-10-22",
        type: "milestone",
        text: "Heads of Terms agreed — £2.1m following bidding process (3 competing offers)",
        agent: "RJ",
      },
    ],
    nextActions: [
      "Confirm BP2 invoice paid in full",
      "Archive deal file and issue completion certificate",
      "Chase client for Google review and testimonial",
    ],
    notes:
      "Largest completed sale in 2025. Three-party bidding process drove price above initial expectation. Atlantic acquired for industrial investment portfolio. Excellent outcome for client.",
  },

  {
    id: "c4",
    address: "Sketty Lane, Swansea",
    propertyType: "Office",
    dealValue: 14500,
    dealValueType: "pa",
    counterpartyLabel: "Tenant",
    counterpartyName: "Apex Accountants",
    daysInStage: 71,
    agentInitials: "DB",
    stage: "completed",
    propertyId: null,
    instructionDate: "2025-11-20",
    targetCompletion: "2026-01-31",
    leaseTerm: "3 years with option to renew",
    rentFreeMonths: 1,
    landlord: {
      name: "Sketty Lane Properties Ltd",
      contact: "07700 902 451",
      solicitorFirm: "Watkins & Gunn",
      solicitorContact: "Helen Price · 01792 655 000",
    },
    counterparty: {
      name: "Apex Accountants",
      contact: "07700 902 562",
      solicitorFirm: "Robertsons Solicitors",
      solicitorContact: "David Lewis · 01792 655 822",
    },
    documents: [
      { id: "hot", label: "Heads of Terms", status: "complete", date: "2025-12-05" },
      { id: "sol", label: "Solicitors Instructed", status: "complete", date: "2025-12-08" },
      { id: "epc", label: "Energy Performance Certificate", status: "complete", date: "2025-11-25" },
      { id: "searches", label: "Searches Ordered", status: "na" },
      { id: "draft", label: "Draft Lease / Contract", status: "complete", date: "2025-12-20" },
      { id: "survey", label: "Survey / Structural Report", status: "na" },
      { id: "enquiries", label: "Replies to Enquiries", status: "complete", date: "2026-01-12" },
      { id: "exchange", label: "Exchange of Contracts", status: "complete", date: "2026-01-20" },
      { id: "completion", label: "Completion", status: "complete", date: "2026-01-31" },
      { id: "sdlt", label: "SDLT / Registration", status: "na" },
    ],
    activity: [
      {
        date: "2026-01-31",
        type: "milestone",
        text: "Completion — Apex Accountants take occupation",
        agent: "DB",
      },
      {
        date: "2026-01-20",
        type: "milestone",
        text: "Exchange of contracts completed",
        agent: "DB",
      },
      {
        date: "2026-01-12",
        type: "legal",
        text: "Replies to enquiries finalised — both teams ready to exchange",
        agent: "DB",
      },
      {
        date: "2025-12-20",
        type: "legal",
        text: "Draft lease agreed with minor amendments to repairing obligations",
        agent: "DB",
      },
      {
        date: "2025-12-08",
        type: "milestone",
        text: "Solicitors instructed on both sides",
        agent: "DB",
      },
      {
        date: "2025-12-05",
        type: "milestone",
        text: "Heads of Terms agreed — £14,500 pa, 3 years, 1 month rent free",
        agent: "DB",
      },
    ],
    nextActions: [
      "Issue invoice to landlord client",
      "File deal on completion register",
      "Request testimonial from Apex Accountants",
    ],
    notes:
      "Repeat client — Apex Accountants previously instructed BP2 for their Mumbles office in 2023. Long-term relationship. Send completion card and follow up in 6 months.",
  },
]
