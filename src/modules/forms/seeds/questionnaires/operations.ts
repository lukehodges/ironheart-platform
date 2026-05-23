import type { FormField } from "../../forms.types"

export const slug = "questionnaire-operations"
export const name = "Operations Questionnaire"
export const description =
  "Pre-audit questionnaire for operations managers and delivery leads. Covers day-to-day work, workflow and handoffs, quality control, and tools. [audience: operations]"

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
    placeholder: "e.g. 3 years",
  },
  {
    id: "typical_day",
    type: "TEXTAREA",
    label: "Describe a typical day from start to finish — what do you actually do?",
    required: false,
    placeholder: "Walk us through it as if we were shadowing you",
  },
  {
    id: "repetitive_tasks",
    type: "TEXTAREA",
    label: "What is the most repetitive part of your job?",
    required: false,
  },
  {
    id: "new_work_flow",
    type: "TEXTAREA",
    label: "Walk us through what happens when a new order, project, or client comes in — from first touch to completion.",
    required: false,
  },
  {
    id: "bottlenecks",
    type: "TEXTAREA",
    label: "Where do things most often get stuck or delayed?",
    required: false,
  },
  {
    id: "overloaded",
    type: "TEXTAREA",
    label: "How do you know when someone on your team is overloaded?",
    required: false,
  },
  {
    id: "task_assignment",
    type: "SELECT",
    label: "How are tasks assigned to team members?",
    required: false,
    options: [
      "Verbally / in-person",
      "Email",
      "Project management software",
      "WhatsApp / messaging",
      "Other",
    ],
  },
  {
    id: "handoffs",
    type: "TEXTAREA",
    label: "When work passes from one person to another, how does that handoff happen? Does anything fall through the cracks?",
    required: false,
  },
  {
    id: "quality_control",
    type: "TEXTAREA",
    label: "What is your quality control process? How do you catch mistakes before they reach the customer?",
    required: false,
  },
  {
    id: "daily_tools",
    type: "TEXTAREA",
    label: "What tools or software do you use daily?",
    required: false,
    placeholder: "List everything — even if it's just spreadsheets and email",
  },
  {
    id: "duplicate_entry",
    type: "SELECT",
    label: "Is there anything you type into multiple places or copy between systems?",
    required: false,
    options: ["Yes", "No"],
  },
  {
    id: "duplicate_detail",
    type: "TEXTAREA",
    label: "If yes, please describe what you copy between systems:",
    required: false,
  },
  {
    id: "wasted_hours",
    type: "TEXT",
    label: "How many hours per week do you spend on tasks that could probably be done faster or differently?",
    required: false,
    placeholder: "e.g. 8",
  },
  {
    id: "smoothness",
    type: "SELECT",
    label: "On a scale of 1–10, how smooth are your current operations? (1 = Constant firefighting, 10 = Smooth sailing)",
    required: false,
    options: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
  },
  {
    id: "one_change",
    type: "TEXTAREA",
    label: "What is one thing you would change about how work flows through the business?",
    required: false,
  },
]
