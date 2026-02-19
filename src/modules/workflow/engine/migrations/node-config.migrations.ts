import type { WorkflowNodeType } from '../../workflow.types'

/**
 * Node config migration registry.
 * Each array entry is a migration function from version N to N+1 (0-indexed).
 * Applied in order starting from node.configVersion.
 *
 * When adding a breaking change to a node config:
 * 1. Add a migration function to the appropriate node type array
 * 2. Increment the default configVersion for new nodes
 */
const nodeConfigMigrations: Partial<Record<
  WorkflowNodeType,
  Array<(config: Record<string, unknown>) => Record<string, unknown>>
>> = {
  IF: [
    // v1 → v2: wrap flat conditions array in ConditionGroup shape
    (config) => ({
      ...config,
      conditions: Array.isArray(config['conditions'])
        ? { logic: 'AND', conditions: config['conditions'], groups: [] }
        : config['conditions'],
    }),
  ],
}

/**
 * Apply all pending migrations to a node config.
 * Called before executing any node in the GraphEngine.
 */
export function migrateNodeConfig(node: {
  type: WorkflowNodeType
  configVersion?: number
  config: unknown
}): { config: unknown; configVersion: number } {
  const migrations   = nodeConfigMigrations[node.type] ?? []
  const startVersion = (node.configVersion ?? 1) - 1 // 0-indexed into migrations array
  let config = node.config as Record<string, unknown>

  for (let i = startVersion; i < migrations.length; i++) {
    config = migrations[i]!(config)
  }

  return { config, configVersion: migrations.length + 1 }
}
