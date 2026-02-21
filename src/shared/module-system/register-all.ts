import { ModuleRegistry } from './registry'

// Module manifests are registered here as they are created.
// Each module adds one import + one register() call.

export const moduleRegistry = new ModuleRegistry()

// --- Core modules (isCore: true, cannot be disabled) ---

// --- Standard modules ---

// --- Addon modules ---

// --- Custom modules ---

// Validate dependency graph at startup
moduleRegistry.validate()
