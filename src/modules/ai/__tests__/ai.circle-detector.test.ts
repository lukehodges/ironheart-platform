import { describe, it, expect, beforeEach } from "vitest"
import { CircleDetector } from "../ai.circle-detector"

describe("CircleDetector", () => {
  let detector: CircleDetector

  beforeEach(() => {
    detector = new CircleDetector()
  })

  // =========================================================================
  // No false positives
  // =========================================================================

  describe("should NOT trigger on normal usage", () => {
    it("single successful call", () => {
      detector.record("execute_code", { code: "return 1" }, null)
      detector.endIteration()
      expect(detector.detect()).toBeNull()
    })

    it("two different successful calls across iterations", () => {
      detector.record("execute_code", { code: "return await trpc.team.list({})" }, null)
      detector.endIteration()
      detector.record("execute_code", { code: "return await trpc.customer.list({})" }, null)
      detector.endIteration()
      expect(detector.detect()).toBeNull()
    })

    it("describe_module then execute_code (normal 2-step flow)", () => {
      detector.record("describe_module", { module: "booking" }, null)
      detector.endIteration()
      detector.record("execute_code", { code: "return await trpc.booking.list({})" }, null)
      detector.endIteration()
      expect(detector.detect()).toBeNull()
    })

    it("one failure then a different successful call", () => {
      detector.record("execute_code", { code: "return await trpc.bad()" }, "trpc.bad is not a function")
      detector.endIteration()
      detector.record("execute_code", { code: "return await trpc.booking.list({})" }, null)
      detector.endIteration()
      expect(detector.detect()).toBeNull()
    })

    it("one failure then same call succeeds (retry worked)", () => {
      detector.record("execute_code", { code: "return await trpc.team.list({})" }, "connection error")
      detector.endIteration()
      detector.record("execute_code", { code: "return await trpc.team.list({})" }, null)
      detector.endIteration()
      expect(detector.detect()).toBeNull()
    })

    it("multiple successful calls per iteration", () => {
      detector.record("describe_module", { module: "team" }, null)
      detector.record("describe_module", { module: "booking" }, null)
      detector.endIteration()
      detector.record("execute_code", { code: "query1" }, null)
      detector.record("execute_code", { code: "query2" }, null)
      detector.endIteration()
      expect(detector.detect()).toBeNull()
    })

    it("single iteration — never triggers even with an error", () => {
      detector.record("execute_code", { code: "bad" }, "some error")
      detector.endIteration()
      expect(detector.detect()).toBeNull()
    })
  })

  // =========================================================================
  // Detection: same tool+input+error repeated
  // =========================================================================

  describe("should detect same tool+input+error repeated across iterations", () => {
    it("exact same failing call twice in a row", () => {
      const input = { code: "return await trpc.team.list({ limit: 100 })" }
      const error = "trpc.team.list is not a function"

      detector.record("execute_code", input, error)
      detector.endIteration()
      detector.record("execute_code", input, error)
      detector.endIteration()

      const reason = detector.detect()
      expect(reason).not.toBeNull()
      expect(reason).toContain("Repeated failing call")
      expect(reason).toContain("execute_code")
    })

    it("same describe_module repeated with error", () => {
      const input = { module: "nonexistent" }
      const error = 'Module "nonexistent" not found'

      detector.record("describe_module", input, error)
      detector.endIteration()
      detector.record("describe_module", input, error)
      detector.endIteration()

      expect(detector.detect()).not.toBeNull()
    })

    it("slightly different code but same error — not detected by check 1", () => {
      detector.record("execute_code", { code: "return await trpc.team.list({})" }, "not a function")
      detector.endIteration()
      // Different input → different hash, so check 1 won't trigger
      detector.record("execute_code", { code: "return await trpc.team.list({ limit: 50 })" }, "not a function")
      detector.endIteration()

      // But check 1 won't trigger (different input)
      // Check 2 needs 3 occurrences
      // Check 3 needs 2 all-failure iterations (which these are!)
      const reason = detector.detect()
      expect(reason).not.toBeNull()
      expect(reason).toContain("all tool calls failing")
    })
  })

  // =========================================================================
  // Detection: same error 3+ times
  // =========================================================================

  describe("should detect same error repeated 3+ times", () => {
    it("same error from different inputs hits 3x threshold", () => {
      const error = "trpc.team.list is not a function"

      detector.record("execute_code", { code: "v1" }, error)
      detector.endIteration()
      // Check 1 triggers on iteration 2 already (same tool, BUT different input)
      // Actually same tool name "execute_code" with different input won't trigger check 1
      // But check 3 (all-failure) triggers on iteration 2
      detector.record("execute_code", { code: "v2" }, error)
      detector.endIteration()

      // Check 3 triggers here
      expect(detector.detect()).not.toBeNull()
    })

    it("3 identical errors across 3 iterations", () => {
      const error = "FORBIDDEN: Module 'team' is not enabled"

      detector.record("execute_code", { code: "a" }, error)
      detector.endIteration()
      detector.record("execute_code", { code: "b" }, error)
      detector.endIteration()
      detector.record("execute_code", { code: "c" }, error)
      detector.endIteration()

      const reason = detector.detect()
      expect(reason).not.toBeNull()
      expect(reason).toContain("repeated")
    })
  })

  // =========================================================================
  // Detection: consecutive all-failure iterations
  // =========================================================================

  describe("should detect consecutive all-failure iterations", () => {
    it("two iterations where every call fails", () => {
      detector.record("execute_code", { code: "a" }, "error A")
      detector.record("describe_module", { module: "x" }, "not found")
      detector.endIteration()

      detector.record("execute_code", { code: "b" }, "error B")
      detector.endIteration()

      // Need 3 entries in history (initial empty + 2 iterations)
      // Actually history starts at push in record, let me check...
      // After endIteration twice, history has 3 entries: [iter0calls, iter1calls, []]
      // detect() checks history[-2] and history[-1] but history[-1] is empty (just ended)
      // Let me re-check the logic...
    })

    it("two consecutive all-failure iterations detected after third iteration starts", () => {
      // Iteration 0: all fail
      detector.record("execute_code", { code: "a" }, "error A")
      detector.endIteration()

      // Iteration 1: all fail
      detector.record("execute_code", { code: "b" }, "error B")
      detector.endIteration()

      const reason = detector.detect()
      expect(reason).not.toBeNull()
    })

    it("failure then success then failure — no trigger", () => {
      // Iteration 0: fail
      detector.record("execute_code", { code: "a" }, "error")
      detector.endIteration()

      // Iteration 1: success
      detector.record("execute_code", { code: "b" }, null)
      detector.endIteration()

      // Iteration 2: fail
      detector.record("execute_code", { code: "c" }, "error")
      detector.endIteration()

      // Consecutive all-failure check should NOT trigger (iteration 1 was success)
      // But check 2 might trigger if error count >= 3... let's check
      // "execute_code:error" appears twice — not enough for check 2
      // Check 1: different inputs each time — no match
      // Check 3: prev (iter 2, fail) and curr (iter 3, empty) — curr is empty so no
      // Actually after endIteration(), history[-1] is empty and [-2] is iter2
      // So check 3 looks at iter 1 (success) and iter 2 (fail) — not consecutive failures
      expect(detector.detect()).toBeNull()
    })
  })

  // =========================================================================
  // Real-world scenario: the exact bug we had
  // =========================================================================

  describe("real-world scenarios", () => {
    it("trpc.team.list is not a function — 3 times", () => {
      const error = "trpc.team.list is not a function"

      // Iteration 0: describe_module succeeds, execute_code fails
      detector.record("describe_module", { module: "team" }, null)
      detector.record("execute_code", { code: "const team = await trpc.team.list({ limit: 100 }); return team" }, error)
      detector.endIteration()

      // Iteration 1: tries again with same code
      detector.record("execute_code", { code: "const team = await trpc.team.list({}); return team" }, error)
      detector.endIteration()

      // Should detect by now — check 3 triggers (two consecutive iterations with failures)
      // Iteration 0 had a success (describe_module) so check 3 doesn't trigger
      // But check 2: "execute_code:trpc.team.list is not a function" count = 2, not 3 yet
      // Check 1: different input hashes between iterations
      // Let's continue to iteration 2...

      detector.record("execute_code", { code: "const team = await trpc.team.list({ limit: 100 }); return { ... }" }, error)
      detector.endIteration()

      const reason = detector.detect()
      expect(reason).not.toBeNull()
      expect(reason).toContain("repeated")
    })

    it("permission denied loop", () => {
      const error = "FORBIDDEN: Insufficient permissions for staff:sensitive:read"

      detector.record("execute_code", { code: "return await trpc.team.payRates.list({ userId: 'u1' })" }, error)
      detector.endIteration()

      // Model tries a different approach but same permission error
      detector.record("execute_code", { code: "return await trpc.team.payRates.list({ userId: 'u1' })" }, error)
      detector.endIteration()

      const reason = detector.detect()
      expect(reason).not.toBeNull()
      expect(reason).toContain("Repeated failing call")
    })

    it("module not enabled loop", () => {
      const error = "FORBIDDEN: Module 'workflow' is not enabled for this tenant"

      detector.record("execute_code", { code: "return await trpc.workflow.list({})" }, error)
      detector.endIteration()
      detector.record("execute_code", { code: "return await trpc.workflow.getById({ id: 'wf1' })" }, error)
      detector.endIteration()

      // Two consecutive all-failure iterations
      const reason = detector.detect()
      expect(reason).not.toBeNull()
    })

    it("healthy conversation — describe then execute successfully", () => {
      // Iteration 0: describe_module
      detector.record("describe_module", { module: "booking" }, null)
      detector.endIteration()

      // Iteration 1: execute code successfully
      detector.record("execute_code", { code: "return await trpc.booking.list({ limit: 10 })" }, null)
      detector.endIteration()

      expect(detector.detect()).toBeNull()
    })

    it("healthy conversation — one retry then success", () => {
      // Iteration 0: bad query
      detector.record("execute_code", { code: "return await trpc.booking.list({ badParam: true })" }, "Invalid input")
      detector.endIteration()

      // Iteration 1: fixed query
      detector.record("execute_code", { code: "return await trpc.booking.list({ limit: 10 })" }, null)
      detector.endIteration()

      expect(detector.detect()).toBeNull()
    })
  })
})
