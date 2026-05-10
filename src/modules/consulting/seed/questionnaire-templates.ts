import type { FormField } from "@/modules/forms/forms.types";

export interface QuestionnaireSeedTemplate {
  slug: string;
  name: string;
  description: string;
  fields: FormField[];
}

function field(
  id: string,
  type: FormField["type"],
  label: string,
  required = true,
  options?: string[],
  placeholder?: string
): FormField {
  return { id, type, label, required, placeholder, options };
}

export const QUESTIONNAIRE_TEMPLATES: QuestionnaireSeedTemplate[] = [
  // ── Owner / Director ─────────────────────────────────────────────────
  {
    slug: "questionnaire-owner-director",
    name: "Owner / Director Questionnaire",
    description: "Strategy, revenue, big picture — for the business owner",
    fields: [
      field("business_name", "TEXT", "Business name"),
      field("your_name", "TEXT", "Your name"),
      field("your_role", "TEXT", "Your role / title"),
      field("years_running", "TEXT", "How long have you been running this business?"),
      field("employee_count", "TEXT", "How many people work in the business?"),
      field("annual_revenue", "SELECT", "Approximate annual revenue", true, [
        "Under £100k", "£100k–£250k", "£250k–£500k", "£500k–£1M", "£1M–£5M", "£5M+",
      ]),
      field("top_services", "TEXTAREA", "What are the top 3 services or products you offer?"),
      field("customer_source", "TEXTAREA", "Where do most of your customers come from? Rank if possible."),
      field("biggest_blocker", "TEXTAREA", "What is the number one thing holding your business back right now?"),
      field("overnight_fix", "TEXTAREA", "If you could fix one thing overnight, what would it be?"),
      field("admin_hours", "TEXT", "Hours per week on admin / operational tasks"),
      field("strategy_hours", "TEXT", "Hours per week on strategy / revenue-generating work"),
      field("cash_flow_visibility", "SELECT", "Do you have clear visibility on your cash flow, profit margins, and financial health?", true, [
        "Yes", "Somewhat", "No",
      ]),
      field("software_tools", "TEXTAREA", "What software or tools does the business use? List everything you can think of."),
      field("manual_processes", "TEXTAREA", "What processes or tasks are still done manually that you think shouldn't be?"),
      field("key_person_risk", "TEXTAREA", "If a key team member was sick for a month, what would break?"),
      field("previous_improvements", "TEXTAREA", "Have you tried to improve or automate operations before? What happened?"),
      field("ops_efficiency", "SELECT", "On a scale of 1-10, how efficient do you think your current operations are?", true, [
        "1", "2", "3", "4", "5", "6", "7", "8", "9", "10",
      ]),
      field("anything_else", "TEXTAREA", "Is there anything else you think we should know before the audit?", false),
    ],
  },

  // ── Operations ───────────────────────────────────────────────────────
  {
    slug: "questionnaire-operations",
    name: "Operations Questionnaire",
    description: "Workflows, bottlenecks, quality — for the ops lead",
    fields: [
      field("your_name", "TEXT", "Your name"),
      field("your_role", "TEXT", "Your role"),
      field("time_in_role", "TEXT", "How long in this role?"),
      field("typical_day", "TEXTAREA", "Describe a typical day from start to finish — what do you actually do?"),
      field("most_repetitive", "TEXTAREA", "What is the most repetitive part of your job?"),
      field("new_order_flow", "TEXTAREA", "Walk us through what happens when a new order, project, or client comes in — from first touch to completion."),
      field("bottlenecks", "TEXTAREA", "Where do things most often get stuck or delayed?"),
      field("overload_detection", "TEXTAREA", "How do you know when someone on your team is overloaded?"),
      field("task_assignment", "SELECT", "How are tasks assigned to team members?", true, [
        "Verbally / in-person", "Email", "Project management software", "WhatsApp / messaging", "Other",
      ]),
      field("handoff_issues", "TEXTAREA", "When work passes from one person to another, how does that handoff happen? Does anything fall through the cracks?"),
      field("quality_control", "TEXTAREA", "What is your quality control process?"),
      field("daily_tools", "TEXTAREA", "What tools or software do you use daily?"),
      field("duplicate_entry", "SELECT", "Is there anything you type into multiple places or copy between systems?", true, ["Yes", "No"]),
      field("duplicate_entry_detail", "TEXTAREA", "If yes, please describe:", false),
      field("ops_smoothness", "SELECT", "On a scale of 1-10, how smooth are your current operations?", true, [
        "1", "2", "3", "4", "5", "6", "7", "8", "9", "10",
      ]),
    ],
  },

  // ── Finance / Admin ──────────────────────────────────────────────────
  {
    slug: "questionnaire-finance-admin",
    name: "Finance / Admin Questionnaire",
    description: "Invoicing, cash flow, expenses — for the finance person",
    fields: [
      field("your_name", "TEXT", "Your name"),
      field("your_role", "TEXT", "Your role"),
      field("time_in_role", "TEXT", "How long in this role?"),
      field("invoice_process", "TEXTAREA", "How do you create and send invoices?"),
      field("invoice_delay", "SELECT", "How long from completing work to sending the invoice?", true, [
        "Same day", "Within a week", "2+ weeks", "It varies",
      ]),
      field("overdue_percentage", "TEXTAREA", "What percentage of invoices are currently overdue?"),
      field("chasing_process", "TEXTAREA", "What is your process for chasing late payments?"),
      field("expense_tracking", "TEXTAREA", "How do you track expenses?"),
      field("cash_position", "SELECT", "Can you tell me the business's cash position right now without looking it up?", true, [
        "Yes", "Roughly", "No",
      ]),
      field("financial_reports", "TEXTAREA", "What financial reports do you produce? How often? Who reads them?"),
      field("admin_hours", "TEXT", "How many hours per week do you spend on financial admin?"),
      field("finance_software", "TEXTAREA", "What accounting or finance software do you use?"),
      field("financial_confidence", "SELECT", "On a scale of 1-10, how confident are you in the accuracy of your financial data?", true, [
        "1", "2", "3", "4", "5", "6", "7", "8", "9", "10",
      ]),
    ],
  },

  // ── Sales / Marketing ────────────────────────────────────────────────
  {
    slug: "questionnaire-sales-marketing",
    name: "Sales / Marketing Questionnaire",
    description: "Lead flow, conversion, tools — for the sales person",
    fields: [
      field("your_name", "TEXT", "Your name"),
      field("your_role", "TEXT", "Your role"),
      field("time_in_role", "TEXT", "How long in this role?"),
      field("lead_channels", "TEXTAREA", "Where do your leads come from? List all channels."),
      field("weekly_leads", "TEXT", "How many new enquiries or leads do you get per week, approximately?"),
      field("lead_tracking", "SELECT", "Do you track where your best customers come from?", true, [
        "Yes", "Somewhat", "No",
      ]),
      field("enquiry_process", "TEXTAREA", "What happens when a new enquiry comes in? Walk us through step by step."),
      field("response_time", "SELECT", "How quickly do you typically respond to a new enquiry?", true, [
        "Within 1 hour", "Same day", "Next day", "2-3 days", "It varies",
      ]),
      field("conversion_rate_known", "SELECT", "Do you know your conversion rate from enquiry to paying customer?", true, [
        "Yes", "Roughly", "No idea",
      ]),
      field("conversion_rate", "TEXT", "If you know it (even roughly), what is it?", false),
      field("follow_up_process", "TEXTAREA", "What is your follow-up process for leads who don't buy immediately?"),
      field("biggest_reason_no_convert", "TEXTAREA", "What is the biggest reason prospects don't convert?"),
      field("sales_tools", "TEXTAREA", "What tools do you use for sales and marketing?"),
      field("admin_vs_selling", "TEXT", "Hours per week on sales admin vs actually selling?"),
      field("close_more_deals", "TEXTAREA", "What is one thing that would help you close more deals?"),
    ],
  },

  // ── Team Member ──────────────────────────────────────────────────────
  {
    slug: "questionnaire-team-member",
    name: "Team Member Questionnaire",
    description: "Daily experience, frustrations — for any staff member",
    fields: [
      field("your_name", "TEXT", "Your name"),
      field("your_role", "TEXT", "Your role"),
      field("time_at_company", "TEXT", "How long have you worked here?"),
      field("typical_day", "TEXTAREA", "Describe a typical day — what do you spend most of your time on?"),
      field("most_tedious", "TEXTAREA", "What is the most repetitive or tedious part of your job?"),
      field("daily_tools", "TEXTAREA", "What tools or software do you use daily?"),
      field("duplicate_entry", "TEXTAREA", "Is there anything you have to type into more than one place?"),
      field("morning_priority", "SELECT", "How do you know what to work on each morning?", true, [
        "My manager tells me", "I check a system or task board", "I just know from experience", "It varies day to day",
      ]),
      field("decision_speed", "SELECT", "When you need information or a decision from someone else, how long does it usually take?", true, [
        "Minutes", "Hours", "A day", "Longer", "It depends",
      ]),
      field("frustration", "TEXTAREA", "What is one thing that frustrates you about how work gets done here?"),
      field("workflow_change", "TEXTAREA", "If you could change one thing about your daily workflow, what would it be?"),
      field("honest_feedback", "TEXTAREA", "Is there anything the business should know about how things actually work on the ground? This is completely confidential.", false),
    ],
  },

  // ── Quick Pulse Check ────────────────────────────────────────────────
  {
    slug: "questionnaire-quick-pulse",
    name: "Quick Pulse Check",
    description: "5 minutes, 10 questions — for all employees",
    fields: [
      field("name_role", "TEXT", "Your name and role"),
      field("repetitive_task", "TEXTAREA", "What is the most repetitive task you do each week?"),
      field("frustrating_tool", "TEXTAREA", "What tool or system frustrates you most?"),
      field("wasted_time", "SELECT", "How much time per week do you waste on things that should not need you?", true, [
        "0-2 hours", "2-5 hours", "5-10 hours", "10+ hours",
      ]),
      field("decision_time", "SELECT", "When you need a decision from someone, how long does it take?", true, [
        "Minutes", "Hours", "A day", "Days",
      ]),
      field("one_fix", "TEXTAREA", "What is the one thing you would fix about how this business operates?"),
      field("team_efficiency", "SELECT", "How would you rate the efficiency of your team?", true, [
        "1", "2", "3", "4", "5", "6", "7", "8", "9", "10",
      ]),
      field("duct_tape", "TEXTAREA", "Is there anything held together with 'duct tape' — workarounds or hacks that everyone just accepts?", false),
      field("right_tools", "SELECT", "Do you feel you have the right tools to do your job well?", true, [
        "Yes", "Mostly", "No",
      ]),
      field("anything_else", "TEXTAREA", "Anything else we should know?", false),
    ],
  },

  // ── General Pre-Audit ────────────────────────────────────────────────
  {
    slug: "questionnaire-general",
    name: "General Pre-Audit Questionnaire",
    description: "Comprehensive catch-all questionnaire (6 sections)",
    fields: [
      field("business_name", "TEXT", "Business name"),
      field("industry", "TEXT", "Industry / sector"),
      field("years_trading", "TEXT", "Years trading"),
      field("employee_count", "TEXT", "Number of employees (FT / PT / Contractors)"),
      field("annual_revenue", "SELECT", "Approximate annual revenue", true, [
        "Under £100k", "£100k–£250k", "£250k–£500k", "£500k–£1M", "£1M–£5M", "£5M+",
      ]),
      field("core_product", "TEXTAREA", "What is your core product or service?"),
      field("main_customers", "TEXTAREA", "Who are your main customers?"),
      field("typical_day", "TEXTAREA", "Describe a typical day in your business from open to close"),
      field("time_wasters", "TEXTAREA", "What tasks take up most of your time that you wish didn't?"),
      field("team_time", "TEXTAREA", "What does your team spend most time on?"),
      field("documented_processes", "SELECT", "Do you have documented processes for how things get done?", true, [
        "Yes", "No", "Partially",
      ]),
      field("key_person_risk", "TEXTAREA", "If a key team member was sick for a week, what would break?"),
      field("spreadsheet_use", "TEXTAREA", "What do you use spreadsheets for?"),
      field("manual_tasks", "TEXTAREA", "What tasks are still done on paper or manually?"),
      field("tool_integration", "SELECT", "Do your tools talk to each other, or do you re-enter data between them?", true, [
        "They integrate", "Some do", "Mostly manual",
      ]),
      field("cash_flow_visibility", "SELECT", "Do you have clear visibility of your cash flow?", true, [
        "Yes", "Somewhat", "No",
      ]),
      field("invoice_method", "TEXTAREA", "How do you invoice clients?"),
      field("time_to_payment", "SELECT", "Average time to get paid after invoicing?", true, [
        "Under 7 days", "7-14 days", "14-30 days", "30-60 days", "60+ days",
      ]),
      field("profit_margin_known", "SELECT", "Do you know your profit margin per service or product?", true, [
        "Yes", "Roughly", "No",
      ]),
      field("biggest_blocker", "TEXTAREA", "What's the #1 thing holding your business back right now?"),
      field("overnight_fix", "TEXTAREA", "If you could fix one thing overnight, what would it be?"),
      field("preferred_dates", "TEXT", "Preferred audit date(s)", false),
      field("site_contact", "TEXT", "On-site contact person and phone number", false),
      field("site_address", "TEXTAREA", "Site address", false),
      field("anything_else", "TEXTAREA", "Anything else we should know before arriving?", false),
    ],
  },
];
