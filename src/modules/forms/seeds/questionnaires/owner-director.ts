import type { FormField } from "../../forms.types"

export const slug = "questionnaire-owner-director"
export const name = "Owner / Director Questionnaire"
export const description =
  "Pre-audit questionnaire for business owners, directors, CEOs and founders. Covers business overview, products/customers, challenges, tools/processes, and overall efficiency. [audience: owner-director]"

export const fields: FormField[] = [
  {
    id: "biz_name",
    type: "TEXT",
    label: "Business name",
    required: false,
    placeholder: "e.g. Acme Solutions Ltd",
  },
  {
    id: "your_name",
    type: "TEXT",
    label: "Your name",
    required: false,
  },
  {
    id: "your_role",
    type: "TEXT",
    label: "Your role / title",
    required: false,
    placeholder: "e.g. Managing Director",
  },
  {
    id: "years_running",
    type: "TEXT",
    label: "How long have you been running this business?",
    required: false,
    placeholder: "e.g. 6 years",
  },
  {
    id: "staff_ft",
    type: "TEXT",
    label: "How many full-time people work in the business?",
    required: false,
    placeholder: "Full-time",
  },
  {
    id: "staff_pt",
    type: "TEXT",
    label: "How many part-time people work in the business?",
    required: false,
    placeholder: "Part-time",
  },
  {
    id: "staff_contractors",
    type: "TEXT",
    label: "How many contractors work in the business?",
    required: false,
    placeholder: "Contractors",
  },
  {
    id: "revenue",
    type: "SELECT",
    label: "What is your approximate annual revenue?",
    required: false,
    options: [
      "Under £100k",
      "£100k – £250k",
      "£250k – £500k",
      "£500k – £1M",
      "£1M – £5M",
      "£5M+",
    ],
  },
  {
    id: "top_services",
    type: "TEXTAREA",
    label: "What are the top 3 services or products you offer?",
    required: false,
    placeholder: "1.\n2.\n3.",
  },
  {
    id: "customer_sources",
    type: "TEXTAREA",
    label: "Where do most of your customers come from? Rank the main channels (referrals, social media, paid ads, Google/search, word of mouth, partnerships, other).",
    required: false,
    placeholder: "e.g. 1. Referrals, 2. Word of mouth, 3. Google...",
  },
  {
    id: "holding_back",
    type: "TEXTAREA",
    label: "What is the number one thing holding your business back right now?",
    required: false,
    placeholder: "Be as honest as you like — this is confidential",
  },
  {
    id: "fix_overnight",
    type: "TEXTAREA",
    label: "If you could fix one thing overnight, what would it be?",
    required: false,
  },
  {
    id: "hours_admin",
    type: "TEXT",
    label: "How many hours per week do you spend on admin / operational tasks?",
    required: false,
    placeholder: "e.g. 25",
  },
  {
    id: "hours_growth",
    type: "TEXT",
    label: "How many hours per week do you spend on strategy / growth?",
    required: false,
    placeholder: "e.g. 15",
  },
  {
    id: "financial_visibility",
    type: "SELECT",
    label: "Do you have clear visibility on your cash flow, profit margins, and financial health?",
    required: false,
    options: ["Yes", "Somewhat", "No"],
  },
  {
    id: "tools_used",
    type: "TEXTAREA",
    label: "What software or tools does the business use?",
    required: false,
    placeholder: "List everything — accounting, project management, CRM, email, spreadsheets, etc.",
  },
  {
    id: "manual_processes",
    type: "TEXTAREA",
    label: "What processes or tasks are still done manually that you think shouldn't be?",
    required: false,
  },
  {
    id: "key_person_risk",
    type: "TEXTAREA",
    label: "If a key team member was sick for a month, what would break?",
    required: false,
  },
  {
    id: "previous_improvements",
    type: "TEXTAREA",
    label: "Have you tried to improve or automate operations before? What happened?",
    required: false,
  },
  {
    id: "efficiency",
    type: "SELECT",
    label: "On a scale of 1–10, how efficient do you think your current operations are? (1 = Chaos, 10 = Runs like clockwork)",
    required: false,
    options: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
  },
  {
    id: "anything_else",
    type: "TEXTAREA",
    label: "Is there anything else you think we should know before the audit?",
    required: false,
    placeholder: "Anything at all — the more context, the better",
  },
]
