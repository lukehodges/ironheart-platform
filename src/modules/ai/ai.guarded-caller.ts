// src/modules/ai/ai.guarded-caller.ts

import { logger } from "@/shared/logger"
import { resolveGuardrailTier } from "./ai.guardrails"
import { agentActionsRepository } from "./ai.actions.repository"
import { aiConfigRepository } from "./ai.config.repository"
import { getModuleMap } from "./ai.introspection"
import type { GuardrailTier } from "./ai.types"

const log = logger.child({ module: "ai.guarded-caller" })

/**
 * Error thrown when a mutation requires user approval.
 * The service layer catches this, emits the approval event,
 * and waits for the user's decision.
 */
export class ApprovalRequiredError extends Error {
  constructor(
    public readonly actionId: string,
    public readonly procedurePath: string,
    public readonly procedureInput: unknown,
    public readonly description: string
  ) {
    super(`Approval required for ${procedurePath}`)
    this.name = "ApprovalRequiredError"
  }
}

/**
 * Error thrown when a RESTRICT mutation is attempted.
 */
export class RestrictedProcedureError extends Error {
  constructor(public readonly procedurePath: string) {
    super(`Procedure "${procedurePath}" is restricted and cannot be called by the AI agent.`)
    this.name = "RestrictedProcedureError"
  }
}

interface GuardedCallerOptions {
  tenantId: string
  userId: string
  conversationId: string
  /** Set of procedure paths that have been approved in this execution */
  approvedProcedures?: Set<string>
}

/**
 * Wrap a tRPC caller with guardrail enforcement.
 *
 * For query procedures: pass through unchanged.
 * For mutation procedures:
 *   - AUTO: Log to agent_actions, execute
 *   - CONFIRM: Create pending agent_action, throw ApprovalRequiredError
 *   - RESTRICT: Throw RestrictedProcedureError
 *
 * Uses ES Proxy to intercept property access on the caller.
 * The tRPC caller is shaped like: caller.module.procedure(input)
 * So we need a two-level proxy: first for module access, then for procedure call.
 */
export async function createGuardedCaller(
  caller: unknown,
  options: GuardedCallerOptions
): Promise<unknown> {
  const moduleMap = await getModuleMap()

  return new Proxy(caller as Record<string, unknown>, {
    get(target, moduleName: string) {
      const moduleValue = target[moduleName]
      if (typeof moduleValue !== "object" || moduleValue === null) {
        return moduleValue
      }

      // Check if this module has any procedures we know about
      const moduleMeta = moduleMap.get(moduleName)
      if (!moduleMeta) {
        // Unknown module — still wrap with CONFIRM-by-default guardrails
        // so mutations never silently bypass approval
        log.warn({ moduleName }, "Module not in introspection map — wrapping all functions with CONFIRM guardrail")
        return new Proxy(moduleValue as Record<string, unknown>, {
          get(moduleTarget, procedureName: string) {
            const procedureValue = moduleTarget[procedureName]
            if (typeof procedureValue !== "function") {
              return procedureValue
            }

            // Treat all functions on unknown modules as mutations requiring CONFIRM
            return async (input: unknown) => {
              const procedurePath = `${moduleName}.${procedureName}`
              const tier = await resolveGuardrailTier(options.tenantId, procedurePath)

              if (tier === "RESTRICT") {
                throw new RestrictedProcedureError(procedurePath)
              }

              if (tier === "AUTO") {
                const action = await agentActionsRepository.create({
                  conversationId: options.conversationId,
                  tenantId: options.tenantId,
                  userId: options.userId,
                  toolName: procedurePath,
                  toolInput: input,
                  guardrailTier: "AUTO",
                  isReversible: false,
                })
                try {
                  const result = await (procedureValue as (input: unknown) => Promise<unknown>)(input)
                  await agentActionsRepository.updateStatus(action.id, { status: "auto_executed", toolOutput: result })
                  log.info({ procedurePath, actionId: action.id }, "AUTO mutation executed (unknown module)")
                  return result
                } catch (err) {
                  const errorMsg = err instanceof Error ? err.message : "Execution failed"
                  await agentActionsRepository.updateStatus(action.id, { status: "failed", error: errorMsg })
                  throw err
                }
              }

              // CONFIRM — check if already approved, otherwise throw for approval
              if (options.approvedProcedures?.has(procedurePath)) {
                const action = await agentActionsRepository.create({
                  conversationId: options.conversationId,
                  tenantId: options.tenantId,
                  userId: options.userId,
                  toolName: procedurePath,
                  toolInput: input,
                  guardrailTier: "CONFIRM",
                  isReversible: false,
                })
                try {
                  const result = await (procedureValue as (input: unknown) => Promise<unknown>)(input)
                  await agentActionsRepository.updateStatus(action.id, { status: "executed", toolOutput: result, approvedBy: options.userId })
                  await aiConfigRepository.recordApprovalDecision(options.tenantId, procedurePath, true)
                  return result
                } catch (err) {
                  const errorMsg = err instanceof Error ? err.message : "Execution failed"
                  await agentActionsRepository.updateStatus(action.id, { status: "failed", error: errorMsg })
                  throw err
                }
              }

              const action = await agentActionsRepository.create({
                conversationId: options.conversationId,
                tenantId: options.tenantId,
                userId: options.userId,
                toolName: procedurePath,
                toolInput: input,
                guardrailTier: "CONFIRM",
                isReversible: false,
              })
              throw new ApprovalRequiredError(action.id, procedurePath, input, `Execute ${procedurePath}`)
            }
          },
        })
      }

      // Proxy the module object to intercept procedure calls
      return new Proxy(moduleValue as Record<string, unknown>, {
        get(moduleTarget, procedureName: string) {
          const procedureValue = moduleTarget[procedureName]
          if (typeof procedureValue !== "function") {
            return procedureValue
          }

          const procedurePath = `${moduleName}.${procedureName}`
          const procMeta = moduleMeta.procedures.find((p) => p.name === procedureName)

          // If it's a query or unknown type, pass through
          if (!procMeta || procMeta.type === "query") {
            return procedureValue
          }

          // It's a mutation — wrap with guardrail check
          return async (input: unknown) => {
            const tier = await resolveGuardrailTier(options.tenantId, procedurePath)
            log.info({ procedurePath, tier }, "Guardrail check for mutation")

            if (tier === "RESTRICT") {
              throw new RestrictedProcedureError(procedurePath)
            }

            if (tier === "AUTO") {
              // Log and execute
              const action = await agentActionsRepository.create({
                conversationId: options.conversationId,
                tenantId: options.tenantId,
                userId: options.userId,
                toolName: procedurePath,
                toolInput: input,
                guardrailTier: "AUTO",
                isReversible: false,
              })

              try {
                const result = await (procedureValue as (input: unknown) => Promise<unknown>)(input)
                await agentActionsRepository.updateStatus(action.id, {
                  status: "auto_executed",
                  toolOutput: result,
                })
                log.info({ procedurePath, actionId: action.id }, "AUTO mutation executed")
                return result
              } catch (err) {
                const errorMsg = err instanceof Error ? err.message : "Execution failed"
                await agentActionsRepository.updateStatus(action.id, {
                  status: "failed",
                  error: errorMsg,
                })
                throw err
              }
            }

            // CONFIRM tier
            // Check if already approved in this execution cycle
            if (options.approvedProcedures?.has(procedurePath)) {
              // Already approved — execute
              const action = await agentActionsRepository.create({
                conversationId: options.conversationId,
                tenantId: options.tenantId,
                userId: options.userId,
                toolName: procedurePath,
                toolInput: input,
                guardrailTier: "CONFIRM",
                isReversible: false,
              })

              try {
                const result = await (procedureValue as (input: unknown) => Promise<unknown>)(input)
                await agentActionsRepository.updateStatus(action.id, {
                  status: "executed",
                  toolOutput: result,
                  approvedBy: options.userId,
                })
                await aiConfigRepository.recordApprovalDecision(options.tenantId, procedurePath, true)
                return result
              } catch (err) {
                const errorMsg = err instanceof Error ? err.message : "Execution failed"
                await agentActionsRepository.updateStatus(action.id, {
                  status: "failed",
                  error: errorMsg,
                })
                throw err
              }
            }

            // Create pending action and throw for approval
            const action = await agentActionsRepository.create({
              conversationId: options.conversationId,
              tenantId: options.tenantId,
              userId: options.userId,
              toolName: procedurePath,
              toolInput: input,
              guardrailTier: "CONFIRM",
              isReversible: false,
            })

            throw new ApprovalRequiredError(
              action.id,
              procedurePath,
              input,
              `Execute ${procedurePath}`
            )
          }
        },
      })
    },
  })
}
