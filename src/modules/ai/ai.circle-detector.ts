// src/modules/ai/ai.circle-detector.ts

interface ToolCallFingerprint {
  name: string
  inputHash: string
  error: string | null
}

/**
 * Tracks tool call results per iteration and detects repeated failures.
 *
 * Detects:
 * 1. Same tool+input producing the same error twice in a row
 * 2. Same error message appearing 3+ times across any tools
 * 3. Every tool call in an iteration failing (complete failure iteration) happening twice
 */
export class CircleDetector {
  private history: ToolCallFingerprint[][] = []
  private errorCounts = new Map<string, number>()

  /** Record a completed tool call for the current iteration. */
  record(name: string, input: unknown, error: string | null): void {
    if (this.history.length === 0) this.history.push([])
    const current = this.history[this.history.length - 1]
    const inputHash = this.hashInput(name, input)
    current.push({ name, inputHash, error })

    if (error) {
      const key = `${name}:${error}`
      this.errorCounts.set(key, (this.errorCounts.get(key) ?? 0) + 1)
    }
  }

  /** Call at the end of each iteration to finalise it. */
  endIteration(): void {
    this.history.push([])
  }

  /** Returns a reason string if circling is detected, null otherwise. */
  detect(): string | null {
    // Need at least 2 completed iterations to detect a pattern
    // history has N+1 entries (N completed + 1 empty for next iteration)
    if (this.history.length < 3) return null

    const prevIter = this.history[this.history.length - 3]
    const currIter = this.history[this.history.length - 2]

    // Check 1: same tool+input+error repeated across consecutive iterations
    if (prevIter && currIter && prevIter.length > 0 && currIter.length > 0) {
      const prevFingerprints = new Set(prevIter.filter(f => f.error).map(f => `${f.inputHash}:${f.error}`))
      const repeats = currIter.filter(f => f.error && prevFingerprints.has(`${f.inputHash}:${f.error}`))
      if (repeats.length > 0) {
        return `Repeated failing call: ${repeats[0].name} with same error "${repeats[0].error?.slice(0, 80)}"`
      }
    }

    // Check 2: same error message 3+ times total
    for (const [key, count] of this.errorCounts) {
      if (count >= 3) {
        return `Error repeated ${count} times: ${key.slice(0, 100)}`
      }
    }

    // Check 3: two consecutive all-failure iterations
    if (prevIter && currIter) {
      if (
        prevIter.length > 0 && prevIter.every(f => f.error) &&
        currIter.length > 0 && currIter.every(f => f.error)
      ) {
        return "Two consecutive iterations with all tool calls failing"
      }
    }

    return null
  }

  private hashInput(name: string, input: unknown): string {
    try {
      return `${name}:${JSON.stringify(input)}`
    } catch {
      return `${name}:unhashable`
    }
  }
}
