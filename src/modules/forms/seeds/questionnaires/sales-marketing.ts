import type { FormField } from "../../forms.types"

export const slug = "questionnaire-sales-marketing"
export const name = "Sales & Marketing Questionnaire"
export const description =
  "Pre-audit questionnaire for sales, marketing, and business development roles. Covers lead generation, the sales process, conversion rates, tools, and time allocation. [audience: sales-marketing]"

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
    placeholder: "e.g. 2 years",
  },
  {
    id: "lead_channels",
    type: "TEXTAREA",
    label: "Where do your leads come from? List all channels.",
    required: false,
    placeholder: "e.g. Google, Instagram, referrals from existing clients, networking events...",
  },
  {
    id: "leads_per_week",
    type: "TEXT",
    label: "How many new enquiries or leads do you get per week, approximately?",
    required: false,
    placeholder: "e.g. 12",
  },
  {
    id: "track_source",
    type: "SELECT",
    label: "Do you track where your best customers come from?",
    required: false,
    options: ["Yes", "Somewhat", "No"],
  },
  {
    id: "enquiry_process",
    type: "TEXTAREA",
    label: "What happens when a new enquiry comes in? Walk us through the process step by step — from first touch to paying customer (or not).",
    required: false,
  },
  {
    id: "response_time",
    type: "SELECT",
    label: "How quickly do you typically respond to a new enquiry?",
    required: false,
    options: [
      "Within 1 hour",
      "Same day",
      "Next day",
      "2–3 days",
      "It varies",
    ],
  },
  {
    id: "conversion_rate_known",
    type: "SELECT",
    label: "Do you know your conversion rate from enquiry to paying customer?",
    required: false,
    options: ["Yes", "Roughly", "No idea"],
  },
  {
    id: "conversion_rate_val",
    type: "TEXT",
    label: "If you know it (even roughly), what is your conversion rate?",
    required: false,
    placeholder: "e.g. about 30%",
  },
  {
    id: "follow_up",
    type: "TEXTAREA",
    label: "What is your follow-up process for leads who don't buy immediately?",
    required: false,
    placeholder: "e.g. We send a follow-up email after a week, then nothing...",
  },
  {
    id: "why_not_convert",
    type: "TEXTAREA",
    label: "What is the biggest reason prospects don't convert?",
    required: false,
  },
  {
    id: "sales_tools",
    type: "TEXTAREA",
    label: "What tools do you use for sales and marketing? (CRM, email marketing, social media tools, spreadsheets, etc.)",
    required: false,
  },
  {
    id: "hours_admin",
    type: "TEXT",
    label: "Hours on admin per week (data entry, reporting, chasing)",
    required: false,
    placeholder: "e.g. 10",
  },
  {
    id: "hours_selling",
    type: "TEXT",
    label: "Hours actually selling / talking to prospects per week",
    required: false,
    placeholder: "e.g. 15",
  },
  {
    id: "close_more",
    type: "TEXTAREA",
    label: "What is one thing that would help you close more deals?",
    required: false,
  },
]
