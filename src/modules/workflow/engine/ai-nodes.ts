// ──────────────────────────────────────────────────────────────────────────────
// AI node executors - AI_DECISION, AI_GENERATE, and AI error recovery
// ──────────────────────────────────────────────────────────────────────────────

import { logger } from '@/shared/logger'
import type {
  WorkflowNode,
  WorkflowExecutionContext,
  AIDecisionNodeConfig,
  AIGenerateNodeConfig,
} from '../workflow.types'
import { resolveContext, resolveField } from './context'

const log = logger.child({ module: 'workflow.ai-nodes' })

// ---------------------------------------------------------------------------
// Lazy-init Anthropic client
// ---------------------------------------------------------------------------

import Anthropic from '@anthropic-ai/sdk'

let client: Anthropic | null = null

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic()
  }
  return client
}

// ---------------------------------------------------------------------------
// Prompt interpolation
// ---------------------------------------------------------------------------

/**
 * Replace all {{variable}} placeholders in a template string using
 * resolveField against the flattened execution context.
 * Missing fields are replaced with empty string.
 */
export function interpolatePrompt(
  template: string,
  context: WorkflowExecutionContext
): string {
  const flat = resolveContext(context)
  return template.replace(/\{\{([^}]+)\}\}/g, (_, path: string) => {
    const value = resolveField(path.trim(), flat)
    return value != null ? String(value) : ''
  })
}

// ---------------------------------------------------------------------------
// AI_DECISION executor
// ---------------------------------------------------------------------------

export interface AIDecisionResult {
  decision: string
  reasoning: string
  handle: string
}

/**
 * Execute an AI_DECISION node.
 *
 * Sends the interpolated prompt to Claude Haiku along with a structured
 * system prompt listing all possible outcomes. Parses the JSON response
 * and validates the returned handle against the configured outcomes list.
 * Falls back to defaultHandle on any parsing or validation failure.
 */
export async function executeAIDecision(
  node: WorkflowNode,
  context: WorkflowExecutionContext
): Promise<AIDecisionResult> {
  const cfg = node.config as AIDecisionNodeConfig
  const prompt = interpolatePrompt(cfg.prompt, context)

  const outcomesDescription = cfg.outcomes
    .map((o) => `  - handle: "${o.handle}" — ${o.label}: ${o.description}`)
    .join('\n')

  const validHandles = cfg.outcomes.map((o) => o.handle)

  const systemPrompt = [
    'You are a decision-making assistant embedded in an automated workflow.',
    'Based on the user prompt below, choose exactly ONE of the following outcomes.',
    '',
    'Outcomes:',
    outcomesDescription,
    '',
    'Respond with ONLY valid JSON (no markdown, no code fences):',
    '{ "handle": "<one of the handles above>", "reasoning": "<brief explanation>" }',
  ].join('\n')

  const model = cfg.model ?? 'claude-haiku-4-5-20251001'
  const maxTokens = cfg.maxTokens ?? 512

  try {
    const anthropic = getClient()
    const response = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    })

    const text =
      response.content[0]?.type === 'text' ? response.content[0].text : ''

    let parsed: { handle?: string; reasoning?: string }
    try {
      parsed = JSON.parse(text)
    } catch {
      log.warn(
        { nodeId: node.id, rawResponse: text },
        'AI_DECISION returned invalid JSON, using defaultHandle'
      )
      return {
        decision: cfg.defaultHandle,
        reasoning: 'Failed to parse AI response JSON',
        handle: cfg.defaultHandle,
      }
    }

    const handle = validHandles.includes(parsed.handle ?? '')
      ? parsed.handle!
      : cfg.defaultHandle

    if (handle !== parsed.handle) {
      log.warn(
        { nodeId: node.id, returnedHandle: parsed.handle, fallbackHandle: handle },
        'AI_DECISION returned invalid handle, falling back to default'
      )
    }

    const result: AIDecisionResult = {
      decision: handle,
      reasoning: parsed.reasoning ?? '',
      handle,
    }

    log.info({ nodeId: node.id, handle }, 'AI_DECISION resolved')
    return result
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    log.error({ nodeId: node.id, error }, 'AI_DECISION API call failed, using defaultHandle')
    return {
      decision: cfg.defaultHandle,
      reasoning: `AI API error: ${error}`,
      handle: cfg.defaultHandle,
    }
  }
}

// ---------------------------------------------------------------------------
// AI_GENERATE executor
// ---------------------------------------------------------------------------

export interface AIGenerateResult {
  content: string
  model: string
  tokens: number
}

/**
 * Execute an AI_GENERATE node.
 *
 * Sends the interpolated prompt to Claude Sonnet and returns the generated
 * content. When an outputSchema is provided, the system prompt instructs
 * the model to return valid JSON conforming to that schema.
 */
export async function executeAIGenerate(
  node: WorkflowNode,
  context: WorkflowExecutionContext
): Promise<AIGenerateResult> {
  const cfg = node.config as AIGenerateNodeConfig
  const prompt = interpolatePrompt(cfg.prompt, context)

  const systemParts: string[] = [
    'You are a content generation assistant embedded in an automated workflow.',
  ]

  if (cfg.outputSchema) {
    systemParts.push(
      '',
      'You MUST respond with valid JSON that conforms to the following JSON schema:',
      JSON.stringify(cfg.outputSchema, null, 2),
      '',
      'Respond with ONLY valid JSON (no markdown, no code fences).'
    )
  }

  const systemPrompt = systemParts.join('\n')
  const model = cfg.model ?? 'claude-sonnet-4-20250514'
  const maxTokens = cfg.maxTokens ?? 2048

  const anthropic = getClient()
  const response = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: prompt }],
  })

  const text =
    response.content[0]?.type === 'text' ? response.content[0].text : ''

  const tokens =
    (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0)

  log.info(
    { nodeId: node.id, model, tokens, contentLength: text.length },
    'AI_GENERATE completed'
  )

  return { content: text, model, tokens }
}

// ---------------------------------------------------------------------------
// AI error recovery
// ---------------------------------------------------------------------------

export interface AIRecoveryAction {
  action: 'retry' | 'skip' | 'substitute'
  value?: unknown
  reasoning: string
}

/**
 * Attempt AI-assisted recovery from a node execution failure.
 *
 * Sends the error details along with a summary of the execution context
 * to Claude Haiku and asks for a recovery action (retry, skip, or substitute
 * a fallback value).
 */
export async function attemptAIRecovery(
  failedNode: WorkflowNode,
  error: Error | string,
  context: WorkflowExecutionContext
): Promise<AIRecoveryAction> {
  const errorMessage = error instanceof Error ? error.message : String(error)

  const contextSummary = {
    nodeId: failedNode.id,
    nodeType: failedNode.type,
    nodeLabel: failedNode.label,
    error: errorMessage,
    variableKeys: Object.keys(context.variables),
    triggerDataKeys: Object.keys(context.triggerData),
    completedNodes: Object.keys(context.nodes),
    loopDepth: context.loopStack.length,
  }

  const systemPrompt = [
    'You are an error recovery assistant embedded in an automated workflow engine.',
    'A workflow node has failed. Analyze the error and context, then decide the best recovery action.',
    '',
    'You MUST respond with ONLY valid JSON (no markdown, no code fences):',
    '{ "action": "retry" | "skip" | "substitute", "value": <if action is substitute, provide a fallback value>, "reasoning": "<brief explanation>" }',
    '',
    'Guidelines:',
    '- Use "retry" if the error seems transient (network timeout, rate limit, etc.)',
    '- Use "skip" if the node is non-critical and the workflow can continue without it',
    '- Use "substitute" if you can provide a reasonable fallback value',
  ].join('\n')

  const userPrompt = [
    'A workflow node failed with the following details:',
    '',
    JSON.stringify(contextSummary, null, 2),
    '',
    'What recovery action should be taken?',
  ].join('\n')

  try {
    const anthropic = getClient()
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text =
      response.content[0]?.type === 'text' ? response.content[0].text : ''

    let parsed: { action?: string; value?: unknown; reasoning?: string }
    try {
      parsed = JSON.parse(text)
    } catch {
      log.warn(
        { nodeId: failedNode.id, rawResponse: text },
        'AI recovery returned invalid JSON, defaulting to skip'
      )
      return {
        action: 'skip',
        reasoning: 'Failed to parse AI recovery response JSON',
      }
    }

    const validActions = ['retry', 'skip', 'substitute']
    const action = validActions.includes(parsed.action ?? '')
      ? (parsed.action as AIRecoveryAction['action'])
      : 'skip'

    const result: AIRecoveryAction = {
      action,
      reasoning: parsed.reasoning ?? '',
      ...(action === 'substitute' && parsed.value !== undefined
        ? { value: parsed.value }
        : {}),
    }

    log.info(
      { nodeId: failedNode.id, action: result.action },
      'AI recovery action determined'
    )
    return result
  } catch (err) {
    const apiError = err instanceof Error ? err.message : String(err)
    log.error(
      { nodeId: failedNode.id, error: apiError },
      'AI recovery API call failed, defaulting to skip'
    )
    return {
      action: 'skip',
      reasoning: `AI recovery API error: ${apiError}`,
    }
  }
}
