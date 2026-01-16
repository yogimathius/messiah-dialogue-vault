import { z } from 'zod';

// Enums
export const StatusSchema = z.enum(['ACTIVE', 'ARCHIVED']);
export const RoleSchema = z.enum(['MESSIAH', 'REFLECTION', 'NOTE']);

// Thread schemas
export const CreateThreadSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  status: StatusSchema.optional(),
  metadata: z.record(z.any()).optional(),
  tagIds: z.array(z.string()).optional(),
});

export const UpdateThreadSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional().nullable(),
  status: StatusSchema.optional(),
  metadata: z.record(z.any()).optional().nullable(),
  tagIds: z.array(z.string()).optional(),
});

// Turn schemas
export const CreateTurnSchema = z.object({
  threadId: z.string().uuid(),
  role: RoleSchema,
  content: z.string().min(1),
  orderIndex: z.number().int().optional(),
  annotations: z.record(z.any()).optional(),
});

export const UpdateTurnSchema = z.object({
  role: RoleSchema.optional(),
  content: z.string().min(1).optional(),
  orderIndex: z.number().int().optional(),
  annotations: z.record(z.any()).optional().nullable(),
});

// Tag schemas
export const CreateTagSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export const UpdateTagSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
});

// ContextPack schemas
export const CreateContextPackSchema = z.object({
  threadId: z.string().uuid(),
  title: z.string().min(1).max(500),
  body: z.record(z.any()),
  isCanonical: z.boolean().optional(),
});

export const UpdateContextPackSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  body: z.record(z.any()).optional(),
  isCanonical: z.boolean().optional(),
});

// Search schemas
export const SearchTurnsSchema = z.object({
  query: z.string(),
  k: z.number().int().min(1).max(100).default(10),
  threadId: z.string().uuid().optional(),
  role: RoleSchema.optional(),
  tagIds: z.array(z.string()).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

// Continue dialogue schema
export const ContinueDialogueSchema = z.object({
  threadId: z.string().uuid(),
  messiahContent: z.string().min(1),
  retrievalK: z.number().int().min(0).max(50).default(5),
  model: z.string().default('claude-3-7-sonnet-20250219'),
  maxTokens: z.number().int().min(1).max(8192).default(4096),
});

// Export/Import schemas
export const ExportFormatSchema = z.enum(['markdown', 'json']);

export const ExportThreadSchema = z.object({
  threadId: z.string().uuid(),
  format: ExportFormatSchema,
});

export const ImportThreadSchema = z.object({
  format: ExportFormatSchema,
  payload: z.string(),
  overwriteIfExists: z.boolean().default(false),
});

// Type exports
export type Status = z.infer<typeof StatusSchema>;
export type Role = z.infer<typeof RoleSchema>;
export type CreateThreadInput = z.infer<typeof CreateThreadSchema>;
export type UpdateThreadInput = z.infer<typeof UpdateThreadSchema>;
export type CreateTurnInput = z.infer<typeof CreateTurnSchema>;
export type UpdateTurnInput = z.infer<typeof UpdateTurnSchema>;
export type CreateTagInput = z.infer<typeof CreateTagSchema>;
export type UpdateTagInput = z.infer<typeof UpdateTagSchema>;
export type CreateContextPackInput = z.infer<typeof CreateContextPackSchema>;
export type UpdateContextPackInput = z.infer<typeof UpdateContextPackSchema>;
export type SearchTurnsInput = z.infer<typeof SearchTurnsSchema>;
export type ContinueDialogueInput = z.infer<typeof ContinueDialogueSchema>;
export type ExportFormat = z.infer<typeof ExportFormatSchema>;
export type ExportThreadInput = z.infer<typeof ExportThreadSchema>;
export type ImportThreadInput = z.infer<typeof ImportThreadSchema>;
