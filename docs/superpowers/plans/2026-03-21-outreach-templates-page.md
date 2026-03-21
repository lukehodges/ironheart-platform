# Outreach Templates Page — Implementation Plan (Plan 5)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Templates page at `/admin/outreach/templates` with full CRUD for outreach templates and snippets — new DB tables, backend module extensions, and a two-tab UI with card grids and dialog editors.

**Architecture:** Add two new Drizzle tables (`outreach_templates`, `outreach_snippets`) to the outreach schema, extend the outreach module with types/schemas/repository/service/router for both resources, then build the frontend page with sub-tabs (Templates | Snippets), card grids, category filters, and dialog-based editors.

**Tech Stack:** Drizzle ORM, tRPC 11, Zod v4, React 19, Tailwind 4, Lucide icons, Sonner toasts

**Spec:** `docs/superpowers/specs/2026-03-21-outreach-ui-design.md` (Section 6: Templates)

**Depends on:** Plan 1 (Backend Extensions) — completed. Plans 2-4 are independent of this plan.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/shared/db/schemas/outreach.schema.ts` | Modify | Add `outreachTemplates` + `outreachSnippets` tables |
| `src/shared/db/schema.ts` | No change | Already re-exports `outreach.schema.ts` |
| `src/modules/outreach/outreach.types.ts` | Modify | Add template + snippet record interfaces |
| `src/modules/outreach/outreach.schemas.ts` | Modify | Add Zod input schemas for template + snippet CRUD |
| `src/modules/outreach/outreach.repository.ts` | Modify | Add template + snippet repository methods |
| `src/modules/outreach/outreach.service.ts` | Modify | Add template + snippet service methods |
| `src/modules/outreach/outreach.router.ts` | Modify | Add template + snippet tRPC procedures |
| `src/modules/outreach/index.ts` | Modify | Export new types |
| `src/app/admin/outreach/templates/page.tsx` | Create | Templates page with sub-tabs |
| `src/app/admin/outreach/templates/_components/template-cards.tsx` | Create | Template cards grid with category filter |
| `src/app/admin/outreach/templates/_components/template-editor.tsx` | Create | Template editor dialog |
| `src/app/admin/outreach/templates/_components/snippet-cards.tsx` | Create | Snippet cards grid |
| `src/app/admin/outreach/templates/_components/snippet-editor.tsx` | Create | Snippet editor dialog |
| `src/modules/outreach/__tests__/outreach-templates.test.ts` | Create | Tests for template + snippet service methods |

---

### Task 1: Schema — Add outreach_templates and outreach_snippets tables

**Files:**
- Modify: `src/shared/db/schemas/outreach.schema.ts`

- [ ] **Step 1: Read the current schema file**

Read `src/shared/db/schemas/outreach.schema.ts` to understand the current structure.

- [ ] **Step 2: Add the `outreachTemplates` table after the `outreachActivities` table (before the type aliases section)**

```typescript
// ---------------------------------------------------------------------------
// Templates & Snippets
// ---------------------------------------------------------------------------

export const outreachTemplates = pgTable("outreach_templates", {
  id: uuid().primaryKey().default(sql`gen_random_uuid()`).notNull(),
  tenantId: uuid().notNull(),
  name: text().notNull(),
  category: text().notNull(),
  channel: text().notNull(),
  subject: text(),
  bodyMarkdown: text().notNull(),
  tags: text("tags").array(),
  isActive: boolean().default(true).notNull(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("outreach_templates_tenantId_idx").on(table.tenantId),
  index("outreach_templates_tenantId_category_idx").on(table.tenantId, table.category),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "outreach_templates_tenantId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
])
```

- [ ] **Step 3: Add the `outreachSnippets` table immediately after**

```typescript
export const outreachSnippets = pgTable("outreach_snippets", {
  id: uuid().primaryKey().default(sql`gen_random_uuid()`).notNull(),
  tenantId: uuid().notNull(),
  name: text().notNull(),
  category: text().notNull(),
  bodyMarkdown: text().notNull(),
  isActive: boolean().default(true).notNull(),
  createdAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp({ precision: 3, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
  index("outreach_snippets_tenantId_idx").on(table.tenantId),
  index("outreach_snippets_tenantId_category_idx").on(table.tenantId, table.category),
  foreignKey({
    columns: [table.tenantId],
    foreignColumns: [tenants.id],
    name: "outreach_snippets_tenantId_fkey",
  }).onUpdate("cascade").onDelete("cascade"),
])
```

- [ ] **Step 4: Add type aliases at the bottom of the file (after the existing type aliases)**

```typescript
export type OutreachTemplateRow = typeof outreachTemplates.$inferSelect
export type OutreachSnippetRow = typeof outreachSnippets.$inferSelect
```

- [ ] **Step 5: Run type check**

Run: `npx tsc --noEmit 2>&1 | grep -i "outreach" | head -20`
Expected: No new errors.

- [ ] **Step 6: Commit**

```bash
git add src/shared/db/schemas/outreach.schema.ts
git commit -m "feat(outreach): add outreach_templates and outreach_snippets schema tables"
```

---

### Task 2: Types — Add template and snippet interfaces

**Files:**
- Modify: `src/modules/outreach/outreach.types.ts`

- [ ] **Step 1: Read the current types file**

Read `src/modules/outreach/outreach.types.ts`.

- [ ] **Step 2: Add template category and channel types after the existing enum types**

These use the existing `OutreachChannel` type for the channel field. Add a template category type:

```typescript
export type OutreachTemplateCategory =
  | "intro"
  | "follow-up"
  | "break-up"
  | "case-study"
  | "linkedin"
  | "custom"
```

- [ ] **Step 3: Add record interfaces before the "Derived types" section**

```typescript
// ---------------------------------------------------------------------------
// Template & Snippet records
// ---------------------------------------------------------------------------

export interface OutreachTemplateRecord {
  id: string
  tenantId: string
  name: string
  category: string
  channel: string
  subject: string | null
  bodyMarkdown: string
  tags: string[] | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface OutreachSnippetRecord {
  id: string
  tenantId: string
  name: string
  category: string
  bodyMarkdown: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
```

- [ ] **Step 4: Commit**

```bash
git add src/modules/outreach/outreach.types.ts
git commit -m "feat(outreach): add template and snippet type interfaces"
```

---

### Task 3: Zod schemas — Add input validation for template and snippet CRUD

**Files:**
- Modify: `src/modules/outreach/outreach.schemas.ts`

- [ ] **Step 1: Read the current schemas file**

Read `src/modules/outreach/outreach.schemas.ts`.

- [ ] **Step 2: Add template schemas at the end of the file**

```typescript
// ---------------------------------------------------------------------------
// Template schemas
// ---------------------------------------------------------------------------

const templateCategoryEnum = z.enum([
  'intro',
  'follow-up',
  'break-up',
  'case-study',
  'linkedin',
  'custom',
])

const templateChannelEnum = z.enum([
  'EMAIL',
  'LINKEDIN_REQUEST',
  'LINKEDIN_MESSAGE',
  'CALL',
])

export const listTemplatesSchema = z.object({
  category: templateCategoryEnum.optional(),
  isActive: z.boolean().optional(),
})

export const getTemplateByIdSchema = z.object({
  templateId: z.uuid(),
})

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  category: templateCategoryEnum,
  channel: templateChannelEnum,
  subject: z.string().max(500).optional(),
  bodyMarkdown: z.string().min(1).max(10000),
  tags: z.array(z.string().max(50)).max(20).optional(),
  isActive: z.boolean().optional(),
})

export const updateTemplateSchema = z.object({
  templateId: z.uuid(),
  name: z.string().min(1).max(200).optional(),
  category: templateCategoryEnum.optional(),
  channel: templateChannelEnum.optional(),
  subject: z.string().max(500).nullable().optional(),
  bodyMarkdown: z.string().min(1).max(10000).optional(),
  tags: z.array(z.string().max(50)).max(20).nullable().optional(),
  isActive: z.boolean().optional(),
})

export const deleteTemplateSchema = z.object({
  templateId: z.uuid(),
})
```

- [ ] **Step 3: Add snippet schemas immediately after**

```typescript
// ---------------------------------------------------------------------------
// Snippet schemas
// ---------------------------------------------------------------------------

export const listSnippetsSchema = z.object({
  category: z.string().max(100).optional(),
  isActive: z.boolean().optional(),
})

export const getSnippetByIdSchema = z.object({
  snippetId: z.uuid(),
})

export const createSnippetSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().min(1).max(100),
  bodyMarkdown: z.string().min(1).max(10000),
  isActive: z.boolean().optional(),
})

export const updateSnippetSchema = z.object({
  snippetId: z.uuid(),
  name: z.string().min(1).max(200).optional(),
  category: z.string().min(1).max(100).optional(),
  bodyMarkdown: z.string().min(1).max(10000).optional(),
  isActive: z.boolean().optional(),
})

export const deleteSnippetSchema = z.object({
  snippetId: z.uuid(),
})
```

- [ ] **Step 4: Commit**

```bash
git add src/modules/outreach/outreach.schemas.ts
git commit -m "feat(outreach): add Zod schemas for template and snippet CRUD"
```

---

### Task 4: Repository — Add template and snippet query methods

**Files:**
- Modify: `src/modules/outreach/outreach.repository.ts`

- [ ] **Step 1: Read the current repository file**

Read `src/modules/outreach/outreach.repository.ts`.

- [ ] **Step 2: Add imports for the new tables at the top**

Add `outreachTemplates` and `outreachSnippets` to the import from `@/shared/db/schema`:

```typescript
import {
  outreachSequences,
  outreachContacts,
  outreachActivities,
  outreachTemplates,
  outreachSnippets,
  customers,
} from "@/shared/db/schema";
```

- [ ] **Step 3: Add type imports**

Add to the type imports from `./outreach.types`:

```typescript
import type {
  // ... existing imports ...
  OutreachTemplateRecord,
  OutreachSnippetRecord,
} from "./outreach.types";
```

- [ ] **Step 4: Add row types and mappers for templates and snippets**

After the existing row type definitions and mappers:

```typescript
type TemplateRow = typeof outreachTemplates.$inferSelect;
type SnippetRow = typeof outreachSnippets.$inferSelect;

function toTemplateRecord(row: TemplateRow): OutreachTemplateRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    category: row.category,
    channel: row.channel,
    subject: row.subject ?? null,
    bodyMarkdown: row.bodyMarkdown,
    tags: row.tags ?? null,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toSnippetRecord(row: SnippetRow): OutreachSnippetRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    category: row.category,
    bodyMarkdown: row.bodyMarkdown,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
```

- [ ] **Step 5: Add template repository methods**

Add a new section inside the `outreachRepository` object, before the closing `};`:

```typescript
  // -------------------------------------------------------------------
  // TEMPLATES
  // -------------------------------------------------------------------

  async listTemplates(
    tenantId: string,
    filters?: { category?: string; isActive?: boolean },
  ): Promise<OutreachTemplateRecord[]> {
    const conditions = [eq(outreachTemplates.tenantId, tenantId)];

    if (filters?.category) {
      conditions.push(eq(outreachTemplates.category, filters.category));
    }
    if (filters?.isActive !== undefined) {
      conditions.push(eq(outreachTemplates.isActive, filters.isActive));
    }

    const rows = await db
      .select()
      .from(outreachTemplates)
      .where(and(...conditions))
      .orderBy(desc(outreachTemplates.createdAt));

    return rows.map(toTemplateRecord);
  },

  async findTemplateById(
    tenantId: string,
    templateId: string,
  ): Promise<OutreachTemplateRecord> {
    const [row] = await db
      .select()
      .from(outreachTemplates)
      .where(
        and(
          eq(outreachTemplates.id, templateId),
          eq(outreachTemplates.tenantId, tenantId),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundError("OutreachTemplate", templateId);
    return toTemplateRecord(row);
  },

  async createTemplate(
    tenantId: string,
    input: {
      name: string;
      category: string;
      channel: string;
      subject?: string | null;
      bodyMarkdown: string;
      tags?: string[] | null;
      isActive?: boolean;
    },
  ): Promise<OutreachTemplateRecord> {
    const now = new Date();

    const [row] = await db
      .insert(outreachTemplates)
      .values({
        tenantId,
        name: input.name,
        category: input.category,
        channel: input.channel,
        subject: input.subject ?? null,
        bodyMarkdown: input.bodyMarkdown,
        tags: input.tags ?? null,
        isActive: input.isActive ?? true,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    log.info({ tenantId, templateId: row!.id }, "Outreach template created");
    return toTemplateRecord(row!);
  },

  async updateTemplate(
    tenantId: string,
    templateId: string,
    input: Partial<{
      name: string;
      category: string;
      channel: string;
      subject: string | null;
      bodyMarkdown: string;
      tags: string[] | null;
      isActive: boolean;
    }>,
  ): Promise<OutreachTemplateRecord> {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.category !== undefined) updateData.category = input.category;
    if (input.channel !== undefined) updateData.channel = input.channel;
    if (input.subject !== undefined) updateData.subject = input.subject;
    if (input.bodyMarkdown !== undefined) updateData.bodyMarkdown = input.bodyMarkdown;
    if (input.tags !== undefined) updateData.tags = input.tags;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;

    const [updated] = await db
      .update(outreachTemplates)
      .set(updateData as Partial<typeof outreachTemplates.$inferInsert>)
      .where(
        and(
          eq(outreachTemplates.id, templateId),
          eq(outreachTemplates.tenantId, tenantId),
        ),
      )
      .returning();

    if (!updated) throw new NotFoundError("OutreachTemplate", templateId);
    log.info({ tenantId, templateId }, "Outreach template updated");
    return toTemplateRecord(updated);
  },

  async deleteTemplate(tenantId: string, templateId: string): Promise<void> {
    const [deleted] = await db
      .delete(outreachTemplates)
      .where(
        and(
          eq(outreachTemplates.id, templateId),
          eq(outreachTemplates.tenantId, tenantId),
        ),
      )
      .returning();

    if (!deleted) throw new NotFoundError("OutreachTemplate", templateId);
    log.info({ tenantId, templateId }, "Outreach template deleted");
  },
```

- [ ] **Step 6: Add snippet repository methods immediately after**

```typescript
  // -------------------------------------------------------------------
  // SNIPPETS
  // -------------------------------------------------------------------

  async listSnippets(
    tenantId: string,
    filters?: { category?: string; isActive?: boolean },
  ): Promise<OutreachSnippetRecord[]> {
    const conditions = [eq(outreachSnippets.tenantId, tenantId)];

    if (filters?.category) {
      conditions.push(eq(outreachSnippets.category, filters.category));
    }
    if (filters?.isActive !== undefined) {
      conditions.push(eq(outreachSnippets.isActive, filters.isActive));
    }

    const rows = await db
      .select()
      .from(outreachSnippets)
      .where(and(...conditions))
      .orderBy(desc(outreachSnippets.createdAt));

    return rows.map(toSnippetRecord);
  },

  async findSnippetById(
    tenantId: string,
    snippetId: string,
  ): Promise<OutreachSnippetRecord> {
    const [row] = await db
      .select()
      .from(outreachSnippets)
      .where(
        and(
          eq(outreachSnippets.id, snippetId),
          eq(outreachSnippets.tenantId, tenantId),
        ),
      )
      .limit(1);

    if (!row) throw new NotFoundError("OutreachSnippet", snippetId);
    return toSnippetRecord(row);
  },

  async createSnippet(
    tenantId: string,
    input: {
      name: string;
      category: string;
      bodyMarkdown: string;
      isActive?: boolean;
    },
  ): Promise<OutreachSnippetRecord> {
    const now = new Date();

    const [row] = await db
      .insert(outreachSnippets)
      .values({
        tenantId,
        name: input.name,
        category: input.category,
        bodyMarkdown: input.bodyMarkdown,
        isActive: input.isActive ?? true,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    log.info({ tenantId, snippetId: row!.id }, "Outreach snippet created");
    return toSnippetRecord(row!);
  },

  async updateSnippet(
    tenantId: string,
    snippetId: string,
    input: Partial<{
      name: string;
      category: string;
      bodyMarkdown: string;
      isActive: boolean;
    }>,
  ): Promise<OutreachSnippetRecord> {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.category !== undefined) updateData.category = input.category;
    if (input.bodyMarkdown !== undefined) updateData.bodyMarkdown = input.bodyMarkdown;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;

    const [updated] = await db
      .update(outreachSnippets)
      .set(updateData as Partial<typeof outreachSnippets.$inferInsert>)
      .where(
        and(
          eq(outreachSnippets.id, snippetId),
          eq(outreachSnippets.tenantId, tenantId),
        ),
      )
      .returning();

    if (!updated) throw new NotFoundError("OutreachSnippet", snippetId);
    log.info({ tenantId, snippetId }, "Outreach snippet updated");
    return toSnippetRecord(updated);
  },

  async deleteSnippet(tenantId: string, snippetId: string): Promise<void> {
    const [deleted] = await db
      .delete(outreachSnippets)
      .where(
        and(
          eq(outreachSnippets.id, snippetId),
          eq(outreachSnippets.tenantId, tenantId),
        ),
      )
      .returning();

    if (!deleted) throw new NotFoundError("OutreachSnippet", snippetId);
    log.info({ tenantId, snippetId }, "Outreach snippet deleted");
  },
```

- [ ] **Step 7: Verify `delete` is imported from drizzle-orm**

Check that the drizzle-orm import at the top of the file includes all needed functions. The `db.delete()` method is on the `db` object itself, so no extra import is needed. However, verify the existing imports cover `eq, and, desc` which are used in the new methods.

- [ ] **Step 8: Commit**

```bash
git add src/modules/outreach/outreach.repository.ts
git commit -m "feat(outreach): add template and snippet repository methods"
```

---

### Task 5: Service — Add template and snippet service methods

**Files:**
- Modify: `src/modules/outreach/outreach.service.ts`

- [ ] **Step 1: Read the current service file**

Read `src/modules/outreach/outreach.service.ts`.

- [ ] **Step 2: Add type imports for the new record types**

Add to the existing type imports from `./outreach.types`:

```typescript
import type {
  // ... existing imports ...
  OutreachTemplateRecord,
  OutreachSnippetRecord,
} from "./outreach.types";
```

- [ ] **Step 3: Add template service methods**

Add a new section inside the `outreachService` object, before the closing `};`:

```typescript
  // -------------------------------------------------------------------
  // TEMPLATES
  // -------------------------------------------------------------------

  async listTemplates(
    ctx: Context,
    filters?: { category?: string; isActive?: boolean },
  ): Promise<OutreachTemplateRecord[]> {
    return outreachRepository.listTemplates(ctx.tenantId, filters);
  },

  async getTemplateById(ctx: Context, templateId: string): Promise<OutreachTemplateRecord> {
    return outreachRepository.findTemplateById(ctx.tenantId, templateId);
  },

  async createTemplate(
    ctx: Context,
    input: {
      name: string;
      category: string;
      channel: string;
      subject?: string | null;
      bodyMarkdown: string;
      tags?: string[] | null;
      isActive?: boolean;
    },
  ): Promise<OutreachTemplateRecord> {
    const template = await outreachRepository.createTemplate(ctx.tenantId, input);
    log.info({ tenantId: ctx.tenantId, templateId: template.id }, "Outreach template created");
    return template;
  },

  async updateTemplate(
    ctx: Context,
    templateId: string,
    input: Partial<{
      name: string;
      category: string;
      channel: string;
      subject: string | null;
      bodyMarkdown: string;
      tags: string[] | null;
      isActive: boolean;
    }>,
  ): Promise<OutreachTemplateRecord> {
    return outreachRepository.updateTemplate(ctx.tenantId, templateId, input);
  },

  async deleteTemplate(ctx: Context, templateId: string): Promise<void> {
    await outreachRepository.deleteTemplate(ctx.tenantId, templateId);
    log.info({ tenantId: ctx.tenantId, templateId }, "Outreach template deleted");
  },

  async duplicateTemplate(ctx: Context, templateId: string): Promise<OutreachTemplateRecord> {
    const source = await outreachRepository.findTemplateById(ctx.tenantId, templateId);
    const duplicate = await outreachRepository.createTemplate(ctx.tenantId, {
      name: `${source.name} (copy)`,
      category: source.category,
      channel: source.channel,
      subject: source.subject,
      bodyMarkdown: source.bodyMarkdown,
      tags: source.tags,
      isActive: source.isActive,
    });
    log.info({ tenantId: ctx.tenantId, sourceId: templateId, duplicateId: duplicate.id }, "Outreach template duplicated");
    return duplicate;
  },
```

- [ ] **Step 4: Add snippet service methods immediately after**

```typescript
  // -------------------------------------------------------------------
  // SNIPPETS
  // -------------------------------------------------------------------

  async listSnippets(
    ctx: Context,
    filters?: { category?: string; isActive?: boolean },
  ): Promise<OutreachSnippetRecord[]> {
    return outreachRepository.listSnippets(ctx.tenantId, filters);
  },

  async getSnippetById(ctx: Context, snippetId: string): Promise<OutreachSnippetRecord> {
    return outreachRepository.findSnippetById(ctx.tenantId, snippetId);
  },

  async createSnippet(
    ctx: Context,
    input: {
      name: string;
      category: string;
      bodyMarkdown: string;
      isActive?: boolean;
    },
  ): Promise<OutreachSnippetRecord> {
    const snippet = await outreachRepository.createSnippet(ctx.tenantId, input);
    log.info({ tenantId: ctx.tenantId, snippetId: snippet.id }, "Outreach snippet created");
    return snippet;
  },

  async updateSnippet(
    ctx: Context,
    snippetId: string,
    input: Partial<{
      name: string;
      category: string;
      bodyMarkdown: string;
      isActive: boolean;
    }>,
  ): Promise<OutreachSnippetRecord> {
    return outreachRepository.updateSnippet(ctx.tenantId, snippetId, input);
  },

  async deleteSnippet(ctx: Context, snippetId: string): Promise<void> {
    await outreachRepository.deleteSnippet(ctx.tenantId, snippetId);
    log.info({ tenantId: ctx.tenantId, snippetId }, "Outreach snippet deleted");
  },
```

- [ ] **Step 5: Commit**

```bash
git add src/modules/outreach/outreach.service.ts
git commit -m "feat(outreach): add template and snippet service methods"
```

---

### Task 6: Router — Add template and snippet tRPC procedures

**Files:**
- Modify: `src/modules/outreach/outreach.router.ts`

- [ ] **Step 1: Read the current router file**

Read `src/modules/outreach/outreach.router.ts`.

- [ ] **Step 2: Add the new schema imports**

Add to the existing import block from `./outreach.schemas`:

```typescript
  listTemplatesSchema,
  getTemplateByIdSchema,
  createTemplateSchema,
  updateTemplateSchema,
  deleteTemplateSchema,
  listSnippetsSchema,
  getSnippetByIdSchema,
  createSnippetSchema,
  updateSnippetSchema,
  deleteSnippetSchema,
```

- [ ] **Step 3: Add template procedures to the router object**

Add after the Analytics section (at the end of the router object, before the closing `}`):

```typescript
  // Templates
  listTemplates: moduleProcedure
    .input(listTemplatesSchema)
    .query(async ({ ctx, input }) => outreachService.listTemplates(ctx, input)),

  getTemplateById: moduleProcedure
    .input(getTemplateByIdSchema)
    .query(async ({ ctx, input }) => outreachService.getTemplateById(ctx, input.templateId)),

  createTemplate: modulePermission("outreach:write")
    .input(createTemplateSchema)
    .mutation(async ({ ctx, input }) => outreachService.createTemplate(ctx, input)),

  updateTemplate: modulePermission("outreach:write")
    .input(updateTemplateSchema)
    .mutation(async ({ ctx, input }) =>
      outreachService.updateTemplate(ctx, input.templateId, {
        name: input.name,
        category: input.category,
        channel: input.channel,
        subject: input.subject,
        bodyMarkdown: input.bodyMarkdown,
        tags: input.tags,
        isActive: input.isActive,
      })
    ),

  deleteTemplate: modulePermission("outreach:write")
    .input(deleteTemplateSchema)
    .mutation(async ({ ctx, input }) => outreachService.deleteTemplate(ctx, input.templateId)),

  duplicateTemplate: modulePermission("outreach:write")
    .input(getTemplateByIdSchema)
    .mutation(async ({ ctx, input }) => outreachService.duplicateTemplate(ctx, input.templateId)),

  // Snippets
  listSnippets: moduleProcedure
    .input(listSnippetsSchema)
    .query(async ({ ctx, input }) => outreachService.listSnippets(ctx, input)),

  getSnippetById: moduleProcedure
    .input(getSnippetByIdSchema)
    .query(async ({ ctx, input }) => outreachService.getSnippetById(ctx, input.snippetId)),

  createSnippet: modulePermission("outreach:write")
    .input(createSnippetSchema)
    .mutation(async ({ ctx, input }) => outreachService.createSnippet(ctx, input)),

  updateSnippet: modulePermission("outreach:write")
    .input(updateSnippetSchema)
    .mutation(async ({ ctx, input }) =>
      outreachService.updateSnippet(ctx, input.snippetId, {
        name: input.name,
        category: input.category,
        bodyMarkdown: input.bodyMarkdown,
        isActive: input.isActive,
      })
    ),

  deleteSnippet: modulePermission("outreach:write")
    .input(deleteSnippetSchema)
    .mutation(async ({ ctx, input }) => outreachService.deleteSnippet(ctx, input.snippetId)),
```

- [ ] **Step 4: Commit**

```bash
git add src/modules/outreach/outreach.router.ts
git commit -m "feat(outreach): add template and snippet tRPC procedures"
```

---

### Task 7: Index — Export new types

**Files:**
- Modify: `src/modules/outreach/index.ts`

- [ ] **Step 1: Read the current index file**

Read `src/modules/outreach/index.ts`.

- [ ] **Step 2: Add new type exports**

Add `OutreachTemplateRecord` and `OutreachSnippetRecord` to the type export block:

```typescript
export type {
  OutreachSequenceRecord,
  OutreachContactRecord,
  OutreachActivityRecord,
  DailyDashboard,
  ImportResult,
  OutreachTemplateRecord,
  OutreachSnippetRecord,
} from "./outreach.types"
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/outreach/index.ts
git commit -m "feat(outreach): export template and snippet types"
```

---

### Task 8: Tests — Template and snippet service tests

**Files:**
- Create: `src/modules/outreach/__tests__/outreach-templates.test.ts`

- [ ] **Step 1: Create the test file**

```typescript
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
    // Existing mocks (needed to prevent import errors)
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
    // Template mocks
    listTemplates: vi.fn(),
    findTemplateById: vi.fn(),
    createTemplate: vi.fn(),
    updateTemplate: vi.fn(),
    deleteTemplate: vi.fn(),
    // Snippet mocks
    listSnippets: vi.fn(),
    findSnippetById: vi.fn(),
    createSnippet: vi.fn(),
    updateSnippet: vi.fn(),
    deleteSnippet: vi.fn(),
  },
}))
vi.mock("@/modules/pipeline/pipeline.service", () => ({
  pipelineService: { addMember: vi.fn() },
}))

import { outreachService } from "../outreach.service"
import { outreachRepository } from "../outreach.repository"

const repo = outreachRepository as unknown as Record<string, ReturnType<typeof vi.fn>>

const TENANT_ID = "t-00000000-0000-0000-0000-000000000001"
const TEMPLATE_ID = "tpl-00000000-0000-0000-0000-000000000001"
const SNIPPET_ID = "snp-00000000-0000-0000-0000-000000000001"

const ctx = { tenantId: TENANT_ID, userId: "user-1", permissions: ["outreach:write"] }

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

// ---------------------------------------------------------------------------
// TEMPLATES
// ---------------------------------------------------------------------------

describe("outreachService.listTemplates", () => {
  it("returns templates from repository", async () => {
    const templates = [makeTemplate(), makeTemplate({ id: "tpl-2", name: "Follow-up" })]
    repo.listTemplates.mockResolvedValue(templates)

    const result = await outreachService.listTemplates(ctx)

    expect(repo.listTemplates).toHaveBeenCalledWith(TENANT_ID, undefined)
    expect(result).toHaveLength(2)
  })

  it("passes category filter", async () => {
    repo.listTemplates.mockResolvedValue([])

    await outreachService.listTemplates(ctx, { category: "intro" })

    expect(repo.listTemplates).toHaveBeenCalledWith(TENANT_ID, { category: "intro" })
  })
})

describe("outreachService.getTemplateById", () => {
  it("returns template by ID", async () => {
    repo.findTemplateById.mockResolvedValue(makeTemplate())

    const result = await outreachService.getTemplateById(ctx, TEMPLATE_ID)

    expect(repo.findTemplateById).toHaveBeenCalledWith(TENANT_ID, TEMPLATE_ID)
    expect(result.id).toBe(TEMPLATE_ID)
  })
})

describe("outreachService.createTemplate", () => {
  it("creates a template", async () => {
    const input = {
      name: "New Template",
      category: "intro",
      channel: "EMAIL",
      subject: "Hello",
      bodyMarkdown: "Hi there",
      tags: ["test"],
    }
    repo.createTemplate.mockResolvedValue(makeTemplate(input))

    const result = await outreachService.createTemplate(ctx, input)

    expect(repo.createTemplate).toHaveBeenCalledWith(TENANT_ID, input)
    expect(result.name).toBe("New Template")
  })
})

describe("outreachService.updateTemplate", () => {
  it("updates a template", async () => {
    repo.updateTemplate.mockResolvedValue(makeTemplate({ name: "Updated" }))

    const result = await outreachService.updateTemplate(ctx, TEMPLATE_ID, { name: "Updated" })

    expect(repo.updateTemplate).toHaveBeenCalledWith(TENANT_ID, TEMPLATE_ID, { name: "Updated" })
    expect(result.name).toBe("Updated")
  })
})

describe("outreachService.deleteTemplate", () => {
  it("deletes a template", async () => {
    repo.deleteTemplate.mockResolvedValue(undefined)

    await outreachService.deleteTemplate(ctx, TEMPLATE_ID)

    expect(repo.deleteTemplate).toHaveBeenCalledWith(TENANT_ID, TEMPLATE_ID)
  })
})

describe("outreachService.duplicateTemplate", () => {
  it("duplicates a template with (copy) suffix", async () => {
    const source = makeTemplate()
    repo.findTemplateById.mockResolvedValue(source)
    repo.createTemplate.mockResolvedValue(makeTemplate({ id: "tpl-copy", name: "Intro Email (copy)" }))

    const result = await outreachService.duplicateTemplate(ctx, TEMPLATE_ID)

    expect(repo.findTemplateById).toHaveBeenCalledWith(TENANT_ID, TEMPLATE_ID)
    expect(repo.createTemplate).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({ name: "Intro Email (copy)" }),
    )
    expect(result.name).toBe("Intro Email (copy)")
  })
})

// ---------------------------------------------------------------------------
// SNIPPETS
// ---------------------------------------------------------------------------

describe("outreachService.listSnippets", () => {
  it("returns snippets from repository", async () => {
    const snippets = [makeSnippet()]
    repo.listSnippets.mockResolvedValue(snippets)

    const result = await outreachService.listSnippets(ctx)

    expect(repo.listSnippets).toHaveBeenCalledWith(TENANT_ID, undefined)
    expect(result).toHaveLength(1)
  })
})

describe("outreachService.createSnippet", () => {
  it("creates a snippet", async () => {
    const input = { name: "CTA Block", category: "cta", bodyMarkdown: "Book a call!" }
    repo.createSnippet.mockResolvedValue(makeSnippet(input))

    const result = await outreachService.createSnippet(ctx, input)

    expect(repo.createSnippet).toHaveBeenCalledWith(TENANT_ID, input)
    expect(result.name).toBe("CTA Block")
  })
})

describe("outreachService.updateSnippet", () => {
  it("updates a snippet", async () => {
    repo.updateSnippet.mockResolvedValue(makeSnippet({ name: "Updated Snippet" }))

    const result = await outreachService.updateSnippet(ctx, SNIPPET_ID, { name: "Updated Snippet" })

    expect(repo.updateSnippet).toHaveBeenCalledWith(TENANT_ID, SNIPPET_ID, { name: "Updated Snippet" })
    expect(result.name).toBe("Updated Snippet")
  })
})

describe("outreachService.deleteSnippet", () => {
  it("deletes a snippet", async () => {
    repo.deleteSnippet.mockResolvedValue(undefined)

    await outreachService.deleteSnippet(ctx, SNIPPET_ID)

    expect(repo.deleteSnippet).toHaveBeenCalledWith(TENANT_ID, SNIPPET_ID)
  })
})
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run src/modules/outreach/__tests__/outreach-templates.test.ts 2>&1 | tail -20`
Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/modules/outreach/__tests__/outreach-templates.test.ts
git commit -m "test(outreach): add template and snippet service tests"
```

---

### Task 9: Templates page — Sub-tabs layout

**Files:**
- Create: `src/app/admin/outreach/templates/page.tsx`

- [ ] **Step 1: Verify the directory exists**

Run: `ls src/app/admin/outreach/` to confirm the outreach route folder exists. Create `templates/` and `templates/_components/` directories.

- [ ] **Step 2: Create the templates page**

Create `src/app/admin/outreach/templates/page.tsx`:

```tsx
"use client"

import { useState } from "react"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Plus, FileText, Scissors } from "lucide-react"
import { TemplateCards } from "./_components/template-cards"
import { SnippetCards } from "./_components/snippet-cards"

export default function TemplatesPage() {
  const [tab, setTab] = useState<"templates" | "snippets">("templates")
  const [showNewTemplate, setShowNewTemplate] = useState(false)
  const [showNewSnippet, setShowNewSnippet] = useState(false)

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Templates"
        description="Reusable email templates and content snippets"
      >
        {tab === "templates" ? (
          <Button size="sm" onClick={() => setShowNewTemplate(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" /> New Template
          </Button>
        ) : (
          <Button size="sm" onClick={() => setShowNewSnippet(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" /> New Snippet
          </Button>
        )}
      </PageHeader>

      {/* Sub-tab toggle */}
      <div className="flex items-center gap-1 border rounded-lg p-0.5 bg-muted/50 w-fit">
        <Button
          variant={tab === "templates" ? "default" : "ghost"}
          size="sm"
          onClick={() => setTab("templates")}
        >
          <FileText className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" /> Templates
        </Button>
        <Button
          variant={tab === "snippets" ? "default" : "ghost"}
          size="sm"
          onClick={() => setTab("snippets")}
        >
          <Scissors className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" /> Snippets
        </Button>
      </div>

      {tab === "templates" && (
        <TemplateCards
          showNew={showNewTemplate}
          onShowNewChange={setShowNewTemplate}
        />
      )}
      {tab === "snippets" && (
        <SnippetCards
          showNew={showNewSnippet}
          onShowNewChange={setShowNewSnippet}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/outreach/templates/page.tsx
git commit -m "feat(outreach): add templates page with sub-tab layout"
```

---

### Task 10: Template cards grid + category filter

**Files:**
- Create: `src/app/admin/outreach/templates/_components/template-cards.tsx`
- Create: `src/app/admin/outreach/templates/_components/template-editor.tsx`

- [ ] **Step 1: Create the template cards component**

Create `src/app/admin/outreach/templates/_components/template-cards.tsx`:

```tsx
"use client"

import { useState } from "react"
import { api } from "@/lib/trpc/react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Pencil, Copy, Trash2 } from "lucide-react"
import { TemplateEditor } from "./template-editor"
import type { OutreachTemplateRecord } from "@/modules/outreach/outreach.types"

const CATEGORIES = [
  { value: null, label: "All" },
  { value: "intro", label: "Intro" },
  { value: "follow-up", label: "Follow-up" },
  { value: "break-up", label: "Break-up" },
  { value: "case-study", label: "Case Study" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "custom", label: "Custom" },
] as const

const CATEGORY_COLORS: Record<string, string> = {
  intro: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "follow-up": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  "break-up": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  "case-study": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  linkedin: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
  custom: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
}

interface TemplateCardsProps {
  showNew: boolean
  onShowNewChange: (show: boolean) => void
}

export function TemplateCards({ showNew, onShowNewChange }: TemplateCardsProps) {
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<OutreachTemplateRecord | null>(null)

  const utils = api.useUtils()

  const templatesQuery = api.outreach.listTemplates.useQuery({
    category: categoryFilter ?? undefined,
  })

  const duplicateTemplate = api.outreach.duplicateTemplate.useMutation({
    onSuccess: () => {
      void utils.outreach.listTemplates.invalidate()
      toast.success("Template duplicated")
    },
    onError: (err) => toast.error(err.message),
  })

  const deleteTemplate = api.outreach.deleteTemplate.useMutation({
    onSuccess: () => {
      void utils.outreach.listTemplates.invalidate()
      toast.success("Template deleted")
    },
    onError: (err) => toast.error(err.message),
  })

  const templates = templatesQuery.data ?? []

  return (
    <div className="space-y-4">
      {/* Category filter pills */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => (
          <Button
            key={cat.label}
            size="sm"
            variant={categoryFilter === cat.value ? "default" : "ghost"}
            onClick={() => setCategoryFilter(cat.value)}
          >
            {cat.label}
          </Button>
        ))}
      </div>

      {/* Loading state */}
      {templatesQuery.isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }, (_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!templatesQuery.isLoading && templates.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-muted-foreground mb-2">
              {categoryFilter ? `No ${categoryFilter} templates yet` : "No templates yet"}
            </p>
            <Button size="sm" variant="outline" onClick={() => onShowNewChange(true)}>
              Create your first template
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Template cards grid */}
      {!templatesQuery.isLoading && templates.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card key={template.id} className="group hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-sm line-clamp-1">{template.name}</h3>
                  <Badge
                    variant="secondary"
                    className={CATEGORY_COLORS[template.category] ?? CATEGORY_COLORS.custom}
                  >
                    {template.category}
                  </Badge>
                </div>

                {template.subject && (
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    <span className="font-medium">Subject:</span> {template.subject}
                  </p>
                )}

                <p className="text-xs text-muted-foreground line-clamp-3">
                  {template.bodyMarkdown.slice(0, 120)}
                  {template.bodyMarkdown.length > 120 && "..."}
                </p>

                {template.tags && template.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {template.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex gap-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2"
                    onClick={() => setEditingTemplate(template)}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2"
                    onClick={() => duplicateTemplate.mutate({ templateId: template.id })}
                    disabled={duplicateTemplate.isPending}
                  >
                    <Copy className="h-3.5 w-3.5 mr-1" /> Duplicate
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                      if (confirm("Delete this template?")) {
                        deleteTemplate.mutate({ templateId: template.id })
                      }
                    }}
                    disabled={deleteTemplate.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Editor dialog — create */}
      <TemplateEditor
        open={showNew}
        onOpenChange={onShowNewChange}
        template={null}
      />

      {/* Editor dialog — edit */}
      <TemplateEditor
        open={editingTemplate !== null}
        onOpenChange={(open) => { if (!open) setEditingTemplate(null) }}
        template={editingTemplate}
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/outreach/templates/_components/template-cards.tsx
git commit -m "feat(outreach): add template cards grid with category filter"
```

---

### Task 11: Template editor dialog

**Files:**
- Create: `src/app/admin/outreach/templates/_components/template-editor.tsx`

- [ ] **Step 1: Create the template editor component**

Create `src/app/admin/outreach/templates/_components/template-editor.tsx`:

```tsx
"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/trpc/react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { X } from "lucide-react"
import type { OutreachTemplateRecord } from "@/modules/outreach/outreach.types"

const CATEGORIES = [
  { value: "intro", label: "Intro" },
  { value: "follow-up", label: "Follow-up" },
  { value: "break-up", label: "Break-up" },
  { value: "case-study", label: "Case Study" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "custom", label: "Custom" },
]

const CHANNELS = [
  { value: "EMAIL", label: "Email" },
  { value: "LINKEDIN_REQUEST", label: "LinkedIn Request" },
  { value: "LINKEDIN_MESSAGE", label: "LinkedIn Message" },
  { value: "CALL", label: "Call Script" },
]

const VARIABLES = ["{{firstName}}", "{{lastName}}", "{{company}}", "{{sector}}"]

interface TemplateEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template: OutreachTemplateRecord | null
}

export function TemplateEditor({ open, onOpenChange, template }: TemplateEditorProps) {
  const isEditing = template !== null

  const [name, setName] = useState("")
  const [category, setCategory] = useState("intro")
  const [channel, setChannel] = useState("EMAIL")
  const [subject, setSubject] = useState("")
  const [bodyMarkdown, setBodyMarkdown] = useState("")
  const [tagInput, setTagInput] = useState("")
  const [tags, setTags] = useState<string[]>([])

  // Reset form when template changes
  useEffect(() => {
    if (template) {
      setName(template.name)
      setCategory(template.category)
      setChannel(template.channel)
      setSubject(template.subject ?? "")
      setBodyMarkdown(template.bodyMarkdown)
      setTags(template.tags ?? [])
    } else {
      setName("")
      setCategory("intro")
      setChannel("EMAIL")
      setSubject("")
      setBodyMarkdown("")
      setTags([])
    }
    setTagInput("")
  }, [template, open])

  const utils = api.useUtils()

  const createTemplate = api.outreach.createTemplate.useMutation({
    onSuccess: () => {
      void utils.outreach.listTemplates.invalidate()
      toast.success("Template created")
      onOpenChange(false)
    },
    onError: (err) => toast.error(err.message),
  })

  const updateTemplate = api.outreach.updateTemplate.useMutation({
    onSuccess: () => {
      void utils.outreach.listTemplates.invalidate()
      toast.success("Template updated")
      onOpenChange(false)
    },
    onError: (err) => toast.error(err.message),
  })

  const isPending = createTemplate.isPending || updateTemplate.isPending
  const isEmailChannel = channel === "EMAIL"

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!name.trim() || !bodyMarkdown.trim()) {
      toast.error("Name and body are required")
      return
    }

    const payload = {
      name: name.trim(),
      category,
      channel,
      subject: isEmailChannel && subject.trim() ? subject.trim() : undefined,
      bodyMarkdown: bodyMarkdown.trim(),
      tags: tags.length > 0 ? tags : undefined,
    }

    if (isEditing) {
      updateTemplate.mutate({ templateId: template.id, ...payload })
    } else {
      createTemplate.mutate(payload)
    }
  }

  function addTag() {
    const tag = tagInput.trim()
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag])
    }
    setTagInput("")
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag))
  }

  function insertVariable(variable: string) {
    setBodyMarkdown((prev) => prev + variable)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Template" : "New Template"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Recruitment Intro Email"
            />
          </div>

          {/* Category + Channel row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Channel</label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHANNELS.map((ch) => (
                    <SelectItem key={ch.value} value={ch.value}>
                      {ch.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Subject (email only) */}
          {isEmailChannel && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Subject</label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Quick question about {{company}}"
              />
            </div>
          )}

          {/* Variable insertion pills */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Insert Variable</label>
            <div className="flex gap-1.5 flex-wrap">
              {VARIABLES.map((v) => (
                <Button
                  key={v}
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-6 text-xs px-2"
                  onClick={() => insertVariable(v)}
                >
                  {v}
                </Button>
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Body</label>
            <Textarea
              value={bodyMarkdown}
              onChange={(e) => setBodyMarkdown(e.target.value)}
              placeholder="Write your template body here..."
              rows={8}
              className="font-mono text-sm"
            />
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Tags</label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add a tag"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addTag()
                  }
                }}
              />
              <Button type="button" size="sm" variant="outline" onClick={addTag}>
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex gap-1 flex-wrap mt-1">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : isEditing ? "Save Changes" : "Create Template"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/outreach/templates/_components/template-editor.tsx
git commit -m "feat(outreach): add template editor dialog with variable insertion"
```

---

### Task 12: Snippet cards grid + snippet editor dialog

**Files:**
- Create: `src/app/admin/outreach/templates/_components/snippet-cards.tsx`
- Create: `src/app/admin/outreach/templates/_components/snippet-editor.tsx`

- [ ] **Step 1: Create the snippet cards component**

Create `src/app/admin/outreach/templates/_components/snippet-cards.tsx`:

```tsx
"use client"

import { useState } from "react"
import { api } from "@/lib/trpc/react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Pencil, ClipboardCopy, Trash2 } from "lucide-react"
import { SnippetEditor } from "./snippet-editor"
import type { OutreachSnippetRecord } from "@/modules/outreach/outreach.types"

interface SnippetCardsProps {
  showNew: boolean
  onShowNewChange: (show: boolean) => void
}

export function SnippetCards({ showNew, onShowNewChange }: SnippetCardsProps) {
  const [editingSnippet, setEditingSnippet] = useState<OutreachSnippetRecord | null>(null)

  const utils = api.useUtils()

  const snippetsQuery = api.outreach.listSnippets.useQuery({})

  const deleteSnippet = api.outreach.deleteSnippet.useMutation({
    onSuccess: () => {
      void utils.outreach.listSnippets.invalidate()
      toast.success("Snippet deleted")
    },
    onError: (err) => toast.error(err.message),
  })

  const snippets = snippetsQuery.data ?? []

  async function copySnippet(bodyMarkdown: string, name: string) {
    await navigator.clipboard.writeText(bodyMarkdown)
    toast.success(`Copied "${name}" to clipboard`)
  }

  return (
    <div className="space-y-4">
      {/* Loading state */}
      {snippetsQuery.isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }, (_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-3 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!snippetsQuery.isLoading && snippets.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-muted-foreground mb-2">No snippets yet</p>
            <Button size="sm" variant="outline" onClick={() => onShowNewChange(true)}>
              Create your first snippet
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Snippet cards grid */}
      {!snippetsQuery.isLoading && snippets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {snippets.map((snippet) => (
            <Card key={snippet.id} className="group hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-sm line-clamp-1">{snippet.name}</h3>
                  <Badge variant="secondary">{snippet.category}</Badge>
                </div>

                <p className="text-xs text-muted-foreground line-clamp-3">
                  {snippet.bodyMarkdown.slice(0, 120)}
                  {snippet.bodyMarkdown.length > 120 && "..."}
                </p>

                <div className="flex gap-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2"
                    onClick={() => setEditingSnippet(snippet)}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2"
                    onClick={() => copySnippet(snippet.bodyMarkdown, snippet.name)}
                  >
                    <ClipboardCopy className="h-3.5 w-3.5 mr-1" /> Copy
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                      if (confirm("Delete this snippet?")) {
                        deleteSnippet.mutate({ snippetId: snippet.id })
                      }
                    }}
                    disabled={deleteSnippet.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Editor dialog — create */}
      <SnippetEditor
        open={showNew}
        onOpenChange={onShowNewChange}
        snippet={null}
      />

      {/* Editor dialog — edit */}
      <SnippetEditor
        open={editingSnippet !== null}
        onOpenChange={(open) => { if (!open) setEditingSnippet(null) }}
        snippet={editingSnippet}
      />
    </div>
  )
}
```

- [ ] **Step 2: Create the snippet editor component**

Create `src/app/admin/outreach/templates/_components/snippet-editor.tsx`:

```tsx
"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/trpc/react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import type { OutreachSnippetRecord } from "@/modules/outreach/outreach.types"

const SNIPPET_CATEGORIES = [
  "case-study",
  "cta",
  "social-proof",
  "break-up-closer",
  "objection-handler",
  "intro-hook",
  "custom",
]

interface SnippetEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  snippet: OutreachSnippetRecord | null
}

export function SnippetEditor({ open, onOpenChange, snippet }: SnippetEditorProps) {
  const isEditing = snippet !== null

  const [name, setName] = useState("")
  const [category, setCategory] = useState("custom")
  const [bodyMarkdown, setBodyMarkdown] = useState("")

  // Reset form when snippet changes
  useEffect(() => {
    if (snippet) {
      setName(snippet.name)
      setCategory(snippet.category)
      setBodyMarkdown(snippet.bodyMarkdown)
    } else {
      setName("")
      setCategory("custom")
      setBodyMarkdown("")
    }
  }, [snippet, open])

  const utils = api.useUtils()

  const createSnippet = api.outreach.createSnippet.useMutation({
    onSuccess: () => {
      void utils.outreach.listSnippets.invalidate()
      toast.success("Snippet created")
      onOpenChange(false)
    },
    onError: (err) => toast.error(err.message),
  })

  const updateSnippet = api.outreach.updateSnippet.useMutation({
    onSuccess: () => {
      void utils.outreach.listSnippets.invalidate()
      toast.success("Snippet updated")
      onOpenChange(false)
    },
    onError: (err) => toast.error(err.message),
  })

  const isPending = createSnippet.isPending || updateSnippet.isPending

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!name.trim() || !bodyMarkdown.trim()) {
      toast.error("Name and body are required")
      return
    }

    const payload = {
      name: name.trim(),
      category,
      bodyMarkdown: bodyMarkdown.trim(),
    }

    if (isEditing) {
      updateSnippet.mutate({ snippetId: snippet.id, ...payload })
    } else {
      createSnippet.mutate(payload)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Snippet" : "New Snippet"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Social Proof — 50+ companies"
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Category</label>
            <div className="flex gap-1.5 flex-wrap">
              {SNIPPET_CATEGORIES.map((cat) => (
                <Button
                  key={cat}
                  type="button"
                  size="sm"
                  variant={category === cat ? "default" : "outline"}
                  className="h-7 text-xs"
                  onClick={() => setCategory(cat)}
                >
                  {cat.replace(/-/g, " ")}
                </Button>
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Body</label>
            <Textarea
              value={bodyMarkdown}
              onChange={(e) => setBodyMarkdown(e.target.value)}
              placeholder="Write your snippet content..."
              rows={6}
              className="font-mono text-sm"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : isEditing ? "Save Changes" : "Create Snippet"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/outreach/templates/_components/snippet-cards.tsx src/app/admin/outreach/templates/_components/snippet-editor.tsx
git commit -m "feat(outreach): add snippet cards grid and editor dialog"
```

---

### Task 13: Final verification

- [ ] **Step 1: Run type check**

Run: `npx tsc --noEmit 2>&1 | tail -20`
Expected: No errors.

- [ ] **Step 2: Run outreach tests**

Run: `npx vitest run src/modules/outreach/ 2>&1 | tail -20`
Expected: All tests pass (both existing and new template/snippet tests).

- [ ] **Step 3: Run full test suite**

Run: `npx vitest run 2>&1 | tail -30`
Expected: No regressions.

- [ ] **Step 4: Run build**

Run: `NEXT_PHASE=phase-production-build npx next build 2>&1 | tail -20`
Expected: Build succeeds.

- [ ] **Step 5: Verify the Select component import**

The template editor uses `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` from `@/components/ui/select`. If this component doesn't exist yet, either:
1. Create it using shadcn: `npx shadcn@latest add select`
2. Replace with a native `<select>` element temporarily

Run: `ls src/components/ui/select.tsx 2>/dev/null && echo "exists" || echo "missing"`

If missing, run `npx shadcn@latest add select` before the build step.

- [ ] **Step 6: Fix any remaining issues**

Address any tsc or build errors found in previous steps. Common fixes:
- Missing component imports: install via shadcn or adjust to available components
- Type mismatches: ensure Zod schemas align with service input types
- Import paths: verify `@/` alias resolution for new files
