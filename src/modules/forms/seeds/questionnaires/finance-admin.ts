import type { FormField } from "../../forms.types"

export const slug = "questionnaire-finance-admin"
export const name = "Finance & Admin Questionnaire"
export const description =
  "Pre-audit questionnaire for finance managers, administrators, bookkeepers, and accountants. Covers invoicing, payments, expenses, cash flow, and financial admin tools. [audience: finance-admin]"

export const fields: FormField[] = [
  {
    id: "your_name",
    type: "TEXT",
    label: "Your name",
    required: false,
  },
  {
    id: "your_role",
    type: "TEXT",
    label: "Your role",
    required: false,
  },
  {
    id: "time_in_role",
    type: "TEXT",
    label: "How long in this role?",
    required: false,
    placeholder: "e.g. 4 years",
  },
  {
    id: "invoice_method",
    type: "TEXT",
    label: "How do you create and send invoices?",
    required: false,
    placeholder: "e.g. Xero, QuickBooks, manually in Word, etc.",
  },
  {
    id: "invoice_delay",
    type: "SELECT",
    label: "How long does it typically take from completing work to sending the invoice?",
    required: false,
    options: [
      "Same day",
      "Within a week",
      "2+ weeks",
      "It varies",
    ],
  },
  {
    id: "overdue_pct",
    type: "TEXT",
    label: "What percentage of invoices are currently overdue?",
    required: false,
    placeholder: "Your best estimate — e.g. about 20%",
  },
  {
    id: "chasing_process",
    type: "TEXTAREA",
    label: "What is your process for chasing late payments?",
    required: false,
    placeholder: "e.g. We send a reminder after 7 days, then call after 14...",
  },
  {
    id: "expense_tracking",
    type: "TEXT",
    label: "How do you track expenses?",
    required: false,
    placeholder: "e.g. Xero, spreadsheet, shoebox of receipts...",
  },
  {
    id: "cash_position",
    type: "SELECT",
    label: "Can you tell me the business's cash position right now without looking it up?",
    required: false,
    options: ["Yes", "Roughly", "No"],
  },
  {
    id: "financial_reports",
    type: "TEXTAREA",
    label: "What financial reports do you produce? How often? Who reads them?",
    required: false,
  },
  {
    id: "admin_hours",
    type: "TEXT",
    label: "How many hours per week do you spend on financial admin? (invoicing, reconciliation, data entry, chasing payments, etc.)",
    required: false,
    placeholder: "e.g. 12",
  },
  {
    id: "duplicate_entry",
    type: "TEXTAREA",
    label: "Is there anything you type into multiple systems or reconcile manually between tools?",
    required: false,
    placeholder: "e.g. I copy invoice totals from our CRM into Xero manually each week",
  },
  {
    id: "finance_software",
    type: "TEXTAREA",
    label: "What accounting or finance software do you use?",
    required: false,
    placeholder: "List all tools",
  },
  {
    id: "most_time_consuming",
    type: "TEXTAREA",
    label: "What is the most time-consuming part of your financial admin?",
    required: false,
  },
  {
    id: "confidence",
    type: "SELECT",
    label: "On a scale of 1–10, how confident are you in the accuracy of your financial data? (1 = Not confident at all, 10 = Rock solid)",
    required: false,
    options: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
  },
]
