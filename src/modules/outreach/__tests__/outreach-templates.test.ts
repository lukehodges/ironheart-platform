import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock dependencies before imports
vi.mock("@/shared/db", () => ({
  db: { select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn(), transaction: vi.fn() },
}))
vi.mock("@/shared/inngest", () => ({
  inngest: { send: vi.fn().mockResolvedValue(undefined) },
}))
vi.mock("@/shared/logger", () => ({
  logger: { child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }) },
}))
vi.mock("@/modules/outreach/outreach.repository", () => ({
  outreachRepository: {
    findContactById: vi.fn(),
    findSequenceById: vi.fn(),
    categorizeContact: vi.fn(),
    snoozeContact: vi.fn(),
    logActivity: vi.fn(),
    updateContactStatus: vi.fn(),
    reactivateSnoozedContacts: vi.fn(),
    findActivityById: vi.fn(),
    getDueContacts: vi.fn(),
    getOverdueContacts: vi.fn(),
    getRecentReplies: vi.fn(),
    getTodayStats: vi.fn(),
    listSequences: vi.fn(),
    getContactActivities: vi.fn(),
    listTemplates: vi.fn(),
    findTemplateById: vi.fn(),
    createTemplate: vi.fn(),
    updateTemplate: vi.fn(),
    deleteTemplate: vi.fn(),
    listSnippets: vi.fn(),
    findSnippetById: vi.fn(),
    createSnippet: vi.fn(),
    updateSnippet: vi.fn(),
    deleteSnippet: vi.fn(),
  },
}))
vi.mock("@/modules/pipeline", () => ({
  pipelineService: { addMember: vi.fn() },
}))

import { outreachService } from "../outreach.service"
import { outreachRepository } from "../outreach.repository"

const repo = outreachRepository as unknown as Record<string, ReturnType<typeof vi.fn>>

const TENANT_ID = "t-00000000-0000-0000-0000-000000000001"
const TEMPLATE_ID = "tpl-00000000-0000-0000-0000-000000000001"
const SNIPPET_ID = "snp-00000000-0000-0000-0000-000000000001"

const ctx = {
  tenantId: TENANT_ID,
  user: { id: "user-1", tenantId: TENANT_ID },
  db: {},
  session: null,
  requestId: "req-1",
  req: {} as unknown,
  tenantSlug: "test-tenant",
} as unknown as import("@/shared/trpc").Context

function makeTemplate(overrides: Record<string, unknown> = {}) {
  return {
    id: TEMPLATE_ID,
    tenantId: TENANT_ID,
    name: "Intro Email",
    category: "intro",
    channel: "EMAIL",
    subject: "Hey {{firstName}}",
    bodyMarkdown: "Hi {{firstName}}, I wanted to reach out...",
    tags: ["recruitment"],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function makeSnippet(overrides: Record<string, unknown> = {}) {
  return {
    id: SNIPPET_ID,
    tenantId: TENANT_ID,
    name: "Social Proof Block",
    category: "social-proof",
    bodyMarkdown: "We've helped 50+ companies...",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

beforeEach(() => vi.clearAllMocks())

// -------------------------------------------------------------------
// TEMPLATES
// -------------------------------------------------------------------

describe("outreachService.listTemplates", () => {
  it("returns templates and passes category filter", async () => {
    const templates = [makeTemplate(), makeTemplate({ id: "tpl-2", name: "Follow-up" })]
    repo.listTemplates.mockResolvedValue(templates)

    const result = await outreachService.listTemplates(ctx, { category: "intro" })

    expect(repo.listTemplates).toHaveBeenCalledWith(TENANT_ID, { category: "intro" })
    expect(result).toEqual(templates)
  })
})

describe("outreachService.getTemplateById", () => {
  it("returns a template by ID", async () => {
    const template = makeTemplate()
    repo.findTemplateById.mockResolvedValue(template)

    const result = await outreachService.getTemplateById(ctx, TEMPLATE_ID)

    expect(repo.findTemplateById).toHaveBeenCalledWith(TENANT_ID, TEMPLATE_ID)
    expect(result).toEqual(template)
  })
})

describe("outreachService.createTemplate", () => {
  it("creates and returns a template", async () => {
    const template = makeTemplate()
    repo.createTemplate.mockResolvedValue(template)

    const input = {
      name: "Intro Email",
      category: "intro",
      channel: "EMAIL",
      subject: "Hey {{firstName}}",
      bodyMarkdown: "Hi {{firstName}}, I wanted to reach out...",
      tags: ["recruitment"],
    }

    const result = await outreachService.createTemplate(ctx, input)

    expect(repo.createTemplate).toHaveBeenCalledWith(TENANT_ID, input)
    expect(result).toEqual(template)
  })
})

describe("outreachService.updateTemplate", () => {
  it("updates and returns a template", async () => {
    const updated = makeTemplate({ name: "Updated Email" })
    repo.updateTemplate.mockResolvedValue(updated)

    const result = await outreachService.updateTemplate(ctx, TEMPLATE_ID, { name: "Updated Email" })

    expect(repo.updateTemplate).toHaveBeenCalledWith(TENANT_ID, TEMPLATE_ID, { name: "Updated Email" })
    expect(result.name).toBe("Updated Email")
  })
})

describe("outreachService.deleteTemplate", () => {
  it("deletes a template", async () => {
    const template = makeTemplate()
    repo.deleteTemplate.mockResolvedValue(template)

    const result = await outreachService.deleteTemplate(ctx, TEMPLATE_ID)

    expect(repo.deleteTemplate).toHaveBeenCalledWith(TENANT_ID, TEMPLATE_ID)
    expect(result).toEqual(template)
  })
})

describe("outreachService.duplicateTemplate", () => {
  it("finds source template and creates copy with (copy) suffix", async () => {
    const source = makeTemplate()
    const copy = makeTemplate({ id: "tpl-copy", name: "Intro Email (copy)" })

    repo.findTemplateById.mockResolvedValue(source)
    repo.createTemplate.mockResolvedValue(copy)

    const result = await outreachService.duplicateTemplate(ctx, TEMPLATE_ID)

    expect(repo.findTemplateById).toHaveBeenCalledWith(TENANT_ID, TEMPLATE_ID)
    expect(repo.createTemplate).toHaveBeenCalledWith(TENANT_ID, {
      name: "Intro Email (copy)",
      category: "intro",
      channel: "EMAIL",
      subject: "Hey {{firstName}}",
      bodyMarkdown: "Hi {{firstName}}, I wanted to reach out...",
      tags: ["recruitment"],
      isActive: true,
    })
    expect(result.name).toBe("Intro Email (copy)")
  })
})

// -------------------------------------------------------------------
// SNIPPETS
// -------------------------------------------------------------------

describe("outreachService.listSnippets", () => {
  it("returns snippets", async () => {
    const snippets = [makeSnippet()]
    repo.listSnippets.mockResolvedValue(snippets)

    const result = await outreachService.listSnippets(ctx)

    expect(repo.listSnippets).toHaveBeenCalledWith(TENANT_ID, undefined)
    expect(result).toEqual(snippets)
  })
})

describe("outreachService.createSnippet", () => {
  it("creates and returns a snippet", async () => {
    const snippet = makeSnippet()
    repo.createSnippet.mockResolvedValue(snippet)

    const input = {
      name: "Social Proof Block",
      category: "social-proof",
      bodyMarkdown: "We've helped 50+ companies...",
    }

    const result = await outreachService.createSnippet(ctx, input)

    expect(repo.createSnippet).toHaveBeenCalledWith(TENANT_ID, input)
    expect(result).toEqual(snippet)
  })
})

describe("outreachService.updateSnippet", () => {
  it("updates and returns a snippet", async () => {
    const updated = makeSnippet({ name: "Updated Block" })
    repo.updateSnippet.mockResolvedValue(updated)

    const result = await outreachService.updateSnippet(ctx, SNIPPET_ID, { name: "Updated Block" })

    expect(repo.updateSnippet).toHaveBeenCalledWith(TENANT_ID, SNIPPET_ID, { name: "Updated Block" })
    expect(result.name).toBe("Updated Block")
  })
})

describe("outreachService.deleteSnippet", () => {
  it("deletes a snippet", async () => {
    const snippet = makeSnippet()
    repo.deleteSnippet.mockResolvedValue(snippet)

    const result = await outreachService.deleteSnippet(ctx, SNIPPET_ID)

    expect(repo.deleteSnippet).toHaveBeenCalledWith(TENANT_ID, SNIPPET_ID)
    expect(result).toEqual(snippet)
  })
})
