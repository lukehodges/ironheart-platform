import { z } from "zod"

export const createRoleSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(255).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  permissionIds: z.array(z.uuid()),
  isDefault: z.boolean().default(false),
})

export const updateRoleSchema = z.object({
  roleId: z.uuid(),
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(255).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  permissionIds: z.array(z.uuid()).optional(),
  isDefault: z.boolean().optional(),
})

export const deleteRoleSchema = z.object({
  roleId: z.uuid(),
})

export const assignRoleSchema = z.object({
  userId: z.uuid(),
  roleId: z.uuid(),
})

export const removeRoleSchema = z.object({
  userId: z.uuid(),
  roleId: z.uuid(),
})
