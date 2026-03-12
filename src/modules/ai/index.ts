// src/modules/ai/index.ts

export { aiRouter } from "./ai.router"
export { aiFunctions } from "./ai.events"
export { aiService } from "./ai.service"
export { agentActionsRepository } from "./ai.actions.repository"
export { aiConfigRepository } from "./ai.config.repository"
export { generateWorkflowFromDescription } from "./ai.workflow-generator"
export { suggestionsRepository } from "./ai.suggestions.repository"
export { knowledgeRepository } from "./knowledge/repository"
export { correctionsRepository } from "./memory/corrections"
export { hotMemory } from "./memory/hot"
export { getVerticalProfile, listVerticalProfiles } from "./verticals"
export type { AgentTool, AgentContext, ConversationRecord, MessageRecord, AgentResponse, GuardrailTier, TenantAIConfig, VerticalProfile, CorrectionRecord, KnowledgeChunkRecord, RAGResult } from "./ai.types"
