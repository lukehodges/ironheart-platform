import type { FormField } from "../../forms.types"

export const slug = "questionnaire-team-member"
export const name = "Team Member Questionnaire"
export const description =
  "Pre-audit questionnaire for general staff and team members. Covers day-to-day tasks, communication, decision speed, and candid feedback on what could work better. [audience: team-member]"

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
    id: "time_here",
    type: "TEXT",
    label: "How long have you worked here?",
    required: false,
    placeholder: "e.g. 18 months",
  },
  {
    id: "typical_day",
    type: "TEXTAREA",
    label: "Describe a typical day — what do you spend most of your time on?",
    required: false,
  },
  {
    id: "tedious_tasks",
    type: "TEXTAREA",
    label: "What is the most repetitive or tedious part of your job?",
    required: false,
  },
  {
    id: "daily_tools",
    type: "TEXTAREA",
    label: "What tools or software do you use daily?",
    required: false,
    placeholder: "List everything — email, spreadsheets, specific software, etc.",
  },
  {
    id: "double_entry",
    type: "TEXTAREA",
    label: "Is there anything you have to type into more than one place?",
    required: false,
    placeholder: "e.g. I update a spreadsheet AND email the same info to my manager",
  },
  {
    id: "morning_priorities",
    type: "SELECT",
    label: "How do you know what to work on each morning?",
    required: false,
    options: [
      "My manager tells me",
      "I check a system or task board",
      "I just know from experience",
      "It varies day to day",
    ],
  },
  {
    id: "decision_speed",
    type: "SELECT",
    label: "When you need information or a decision from someone else, how long does it usually take?",
    required: false,
    options: ["Minutes", "Hours", "A day", "Longer", "It depends"],
  },
  {
    id: "comms_methods",
    type: "MULTISELECT",
    label: "How does your team communicate? (select all that apply)",
    required: false,
    options: [
      "Email",
      "WhatsApp",
      "Slack / Teams",
      "In person",
      "Phone calls",
      "Meetings",
      "Other",
    ],
  },
  {
    id: "frustration",
    type: "TEXTAREA",
    label: "What is one thing that frustrates you about how work gets done here?",
    required: false,
  },
  {
    id: "one_change",
    type: "TEXTAREA",
    label: "If you could change one thing about your daily workflow, what would it be?",
    required: false,
  },
  {
    id: "ground_truth",
    type: "TEXTAREA",
    label: "Is there anything the business should know about how things actually work on the ground?",
    required: false,
  },
]
