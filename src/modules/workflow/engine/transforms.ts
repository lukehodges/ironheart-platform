// ──────────────────────────────────────────────────────────────────────────────
// Transform utilities - used by TRANSFORM node mappings
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Apply a named transform to a value.
 *
 * Supported transforms:
 *   - 'uppercase'  → String to uppercase
 *   - 'lowercase'  → String to lowercase
 *   - 'trim'       → Trim whitespace from string
 *   - 'toNumber'   → Parse to number (NaN on failure)
 *   - 'toDate'     → Parse to ISO date string (invalid = original string)
 *   - 'toBoolean'  → Convert to boolean
 *   - 'toString'   → Convert to string
 */
export function applyTransform(value: unknown, transform: string): unknown {
  switch (transform) {
    case 'uppercase':
      return typeof value === 'string' ? value.toUpperCase() : String(value).toUpperCase()

    case 'lowercase':
      return typeof value === 'string' ? value.toLowerCase() : String(value).toLowerCase()

    case 'trim':
      return typeof value === 'string' ? value.trim() : String(value).trim()

    case 'toNumber': {
      const n = Number(value)
      return isNaN(n) ? null : n
    }

    case 'toDate': {
      const str = String(value)
      const d = new Date(str)
      return isNaN(d.getTime()) ? str : d.toISOString()
    }

    case 'toBoolean': {
      if (typeof value === 'boolean') return value
      if (value === 'true' || value === '1' || value === 1) return true
      if (value === 'false' || value === '0' || value === 0) return false
      return Boolean(value)
    }

    case 'toString':
      return value == null ? '' : String(value)

    default:
      return value
  }
}
