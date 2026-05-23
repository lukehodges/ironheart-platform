import type { FormField } from "../../forms.types"

export const slug = "questionnaire-quick-pulse"
export const name = "Quick Pulse Check"
export const description =
  "Short 10-question pulse check for any employee. Takes about 5 minutes. Covers wasted time, decision speed, efficiency rating, and one key change. [audience: any-employee]"

export const fields: FormField[] = [
  {
    id: "name",
    type: "TEXT",
    label: "Your name",
    required: false,
    placeholder: "Name",
  },
  {
    id: "role",
    type: "TEXT",
    label: "Your role",
    required: false,
    placeholder: "Role",
  },
  {
    id: "repetitive_task",
    type: "TEXTAREA",
    label: "What is the most repetitive task you do each week?",
    required: false,
  },
  {
    id: "frustrating_tool",
    type: "TEXT",
    label: "What tool or system frustrates you most?",
    required: false,
    placeholder: "One sentence",
  },
  {
    id: "wasted_time",
    type: "SELECT",
    label: "How much time per week do you waste on things that should not need you?",
    required: false,
    options: ["0–2 hours", "2–5 hours", "5–10 hours", "10+ hours"],
  },
  {
    id: "decision_speed",
    type: "SELECT",
    label: "When you need a decision from someone, how long does it take?",
    required: false,
    options: ["Minutes", "Hours", "A day", "Days"],
  },
  {
    id: "one_fix",
    type: "TEXTAREA",
    label: "What is the one thing you would fix about how this business operates?",
    required: false,
  },
  {
    id: "efficiency",
    type: "SELECT",
    label: "How would you rate the efficiency of your team? (1 = Very inefficient, 10 = Highly efficient)",
    required: false,
    options: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
  },
  {
    id: "duct_tape",
    type: "TEXTAREA",
    label: "Is there anything held together with \"duct tape\" — workarounds or hacks that everyone just accepts?",
    required: false,
  },
  {
    id: "right_tools",
    type: "SELECT",
    label: "Do you feel you have the right tools to do your job well?",
    required: false,
    options: ["Yes", "Mostly", "No"],
  },
  {
    id: "anything_else",
    type: "TEXTAREA",
    label: "Anything else we should know?",
    required: false,
  },
]
