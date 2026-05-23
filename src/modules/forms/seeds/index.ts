import type { FormField } from "../forms.types"

import * as ownerDirector from "./questionnaires/owner-director"
import * as operations from "./questionnaires/operations"
import * as financeAdmin from "./questionnaires/finance-admin"
import * as salesMarketing from "./questionnaires/sales-marketing"
import * as teamMember from "./questionnaires/team-member"
import * as quickPulse from "./questionnaires/quick-pulse"

export interface QuestionnaireSeed {
  slug: string
  name: string
  description: string
  fields: FormField[]
}

export const QUESTIONNAIRE_SEEDS: QuestionnaireSeed[] = [
  ownerDirector,
  operations,
  financeAdmin,
  salesMarketing,
  teamMember,
  quickPulse,
]
