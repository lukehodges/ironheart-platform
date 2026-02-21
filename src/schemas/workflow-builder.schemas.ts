import { z } from 'zod';

export const nodePositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const workflowNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  position: nodePositionSchema,
  data: z.record(z.string(), z.unknown()),
});

export const workflowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
});

export const saveWorkflowSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  triggerEvent: z.string(),
  nodes: z.array(workflowNodeSchema),
  edges: z.array(workflowEdgeSchema),
  isActive: z.boolean().default(false),
});

export type SaveWorkflowInput = z.infer<typeof saveWorkflowSchema>;
