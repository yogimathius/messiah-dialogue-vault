/**
 * MCP Tool Definitions and Handlers for Messiah Dialogue Vault
 */

import { prisma, Role } from "@vault/db";
import { exportThreadToMarkdown, exportThreadToJson, importThreadFromMarkdown, importThreadFromJson } from "@vault/core";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";

// Tool definitions following MCP spec
export const toolDefinitions: Tool[] = [
  {
    name: "list_threads",
    description: "List all dialogue threads with optional filtering",
    inputSchema: {
      type: "object" as const,
      properties: {
        includeArchived: {
          type: "boolean",
          description: "Include archived threads (default: false)",
        },
        limit: {
          type: "number",
          description: "Maximum number of threads to return (default: 50)",
        },
      },
    },
  },
  {
    name: "get_thread",
    description: "Get a specific thread with all its turns and metadata",
    inputSchema: {
      type: "object" as const,
      properties: {
        threadId: {
          type: "string",
          description: "The thread ID (UUID)",
        },
      },
      required: ["threadId"],
    },
  },
  {
    name: "list_turns",
    description: "List turns for a specific thread with optional filtering",
    inputSchema: {
      type: "object" as const,
      properties: {
        threadId: {
          type: "string",
          description: "The thread ID",
        },
        limit: {
          type: "number",
          description: "Maximum number of turns to return",
        },
        role: {
          type: "string",
          enum: ["MESSIAH", "REFLECTION", "NOTE"],
          description: "Filter by role",
        },
        after: {
          type: "string",
          description: "Return turns after this turn ID",
        },
      },
      required: ["threadId"],
    },
  },
  {
    name: "get_recent_turns",
    description: "Get the N most recent turns from a thread",
    inputSchema: {
      type: "object" as const,
      properties: {
        threadId: {
          type: "string",
          description: "The thread ID",
        },
        n: {
          type: "number",
          description: "Number of recent turns to retrieve (default: 10)",
        },
      },
      required: ["threadId"],
    },
  },
  {
    name: "search_turns",
    description: "Semantic search across all turns using embeddings",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search query text",
        },
        k: {
          type: "number",
          description: "Number of results to return (default: 10)",
        },
        threadId: {
          type: "string",
          description: "Limit search to a specific thread",
        },
        role: {
          type: "string",
          enum: ["MESSIAH", "REFLECTION", "NOTE"],
          description: "Filter by role",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "create_turn",
    description: "Create a new turn in a thread",
    inputSchema: {
      type: "object" as const,
      properties: {
        threadId: {
          type: "string",
          description: "The thread ID",
        },
        role: {
          type: "string",
          enum: ["MESSIAH", "REFLECTION", "NOTE"],
          description: "The role for this turn",
        },
        content: {
          type: "string",
          description: "The turn content (markdown supported)",
        },
        orderIndex: {
          type: "number",
          description: "Position in thread (auto-calculated if omitted)",
        },
      },
      required: ["threadId", "role", "content"],
    },
  },
  {
    name: "update_turn",
    description: "Update an existing turn's content or annotations",
    inputSchema: {
      type: "object" as const,
      properties: {
        turnId: {
          type: "string",
          description: "The turn ID to update",
        },
        content: {
          type: "string",
          description: "New content for the turn",
        },
        annotations: {
          type: "object",
          description: "Custom annotations to attach to the turn",
        },
      },
      required: ["turnId"],
    },
  },
  {
    name: "delete_turn",
    description: "Delete a turn from a thread",
    inputSchema: {
      type: "object" as const,
      properties: {
        turnId: {
          type: "string",
          description: "The turn ID to delete",
        },
      },
      required: ["turnId"],
    },
  },
  {
    name: "export_thread",
    description: "Export a thread to markdown or JSON format",
    inputSchema: {
      type: "object" as const,
      properties: {
        threadId: {
          type: "string",
          description: "The thread ID to export",
        },
        format: {
          type: "string",
          enum: ["markdown", "json"],
          description: "Export format (default: markdown)",
        },
      },
      required: ["threadId"],
    },
  },
  {
    name: "import_thread",
    description: "Import a thread from markdown or JSON format",
    inputSchema: {
      type: "object" as const,
      properties: {
        format: {
          type: "string",
          enum: ["markdown", "json"],
          description: "Import format",
        },
        payload: {
          type: "string",
          description: "The content to import",
        },
      },
      required: ["format", "payload"],
    },
  },
  {
    name: "upsert_context_pack",
    description: "Create or update a context pack for a thread",
    inputSchema: {
      type: "object" as const,
      properties: {
        threadId: {
          type: "string",
          description: "The thread ID",
        },
        title: {
          type: "string",
          description: "Title of the context pack",
        },
        body: {
          type: "object",
          description: "Context pack content (curated excerpts, guiding principles)",
        },
        setCanonical: {
          type: "boolean",
          description: "Mark this as the canonical context pack for the thread",
        },
      },
      required: ["threadId", "title", "body"],
    },
  },
  {
    name: "get_context_pack",
    description: "Get context pack(s) for a thread",
    inputSchema: {
      type: "object" as const,
      properties: {
        threadId: {
          type: "string",
          description: "The thread ID",
        },
        canonicalOnly: {
          type: "boolean",
          description: "Only return the canonical context pack",
        },
      },
      required: ["threadId"],
    },
  },
];

// Tool handler implementation
export async function handleToolCall(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "list_threads": {
      const includeArchived = args.includeArchived as boolean | undefined;
      const limit = (args.limit as number) || 50;
      
      return prisma.thread.findMany({
        where: includeArchived ? {} : { status: "ACTIVE" },
        include: {
          tags: { include: { tag: true } },
          _count: { select: { turns: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: limit,
      });
    }

    case "get_thread": {
      const threadId = args.threadId as string;
      const thread = await prisma.thread.findUnique({
        where: { id: threadId },
        include: {
          turns: { orderBy: { orderIndex: "asc" } },
          tags: { include: { tag: true } },
          contextPacks: true,
        },
      });
      
      if (!thread) {
        throw new Error(`Thread not found: ${threadId}`);
      }
      
      return thread;
    }

    case "list_turns": {
      const threadId = args.threadId as string;
      const limit = args.limit as number | undefined;
      const role = args.role as Role | undefined;
      const after = args.after as string | undefined;

      let cursor: { id: string } | undefined;
      if (after) {
        cursor = { id: after };
      }

      return prisma.turn.findMany({
        where: {
          threadId,
          ...(role ? { role } : {}),
        },
        orderBy: { orderIndex: "asc" },
        take: limit,
        ...(cursor ? { cursor, skip: 1 } : {}),
      });
    }

    case "get_recent_turns": {
      const threadId = args.threadId as string;
      const n = (args.n as number) || 10;

      return prisma.turn.findMany({
        where: { threadId },
        orderBy: { orderIndex: "desc" },
        take: n,
      });
    }

    case "search_turns": {
      const query = args.query as string;
      const k = (args.k as number) || 10;
      const threadId = args.threadId as string | undefined;
      const role = args.role as Role | undefined;

      // For now, use simple text search
      // Full semantic search would require embedding generation
      return prisma.turn.findMany({
        where: {
          content: { contains: query, mode: "insensitive" },
          ...(threadId ? { threadId } : {}),
          ...(role ? { role } : {}),
        },
        include: {
          thread: { select: { id: true, title: true } },
        },
        take: k,
      });
    }

    case "create_turn": {
      const threadId = args.threadId as string;
      const role = args.role as Role;
      const content = args.content as string;
      let orderIndex = args.orderIndex as number | undefined;

      // Auto-calculate orderIndex if not provided
      if (orderIndex === undefined) {
        const lastTurn = await prisma.turn.findFirst({
          where: { threadId },
          orderBy: { orderIndex: "desc" },
        });
        orderIndex = lastTurn ? lastTurn.orderIndex + 1 : 0;
      }

      return prisma.turn.create({
        data: {
          threadId,
          role,
          content,
          orderIndex,
        },
      });
    }

    case "update_turn": {
      const turnId = args.turnId as string;
      const content = args.content as string | undefined;
      const annotations = args.annotations as object | undefined;

      return prisma.turn.update({
        where: { id: turnId },
        data: {
          ...(content !== undefined ? { content } : {}),
          ...(annotations !== undefined ? { annotations } : {}),
        },
      });
    }

    case "delete_turn": {
      const turnId = args.turnId as string;
      return prisma.turn.delete({
        where: { id: turnId },
      });
    }

    case "export_thread": {
      const threadId = args.threadId as string;
      const format = (args.format as string) || "markdown";

      if (format === "markdown") {
        return exportThreadToMarkdown(threadId);
      } else {
        return exportThreadToJson(threadId);
      }
    }

    case "import_thread": {
      const format = args.format as string;
      const payload = args.payload as string;

      if (format === "markdown") {
        return importThreadFromMarkdown(payload);
      } else {
        return importThreadFromJson(JSON.parse(payload));
      }
    }

    case "upsert_context_pack": {
      const threadId = args.threadId as string;
      const title = args.title as string;
      const body = args.body as object;
      const setCanonical = args.setCanonical as boolean | undefined;

      // If setting as canonical, unset any existing canonical packs
      if (setCanonical) {
        await prisma.contextPack.updateMany({
          where: { threadId, isCanonical: true },
          data: { isCanonical: false },
        });
      }

      // Check if a pack with this title exists
      const existing = await prisma.contextPack.findFirst({
        where: { threadId, title },
      });

      if (existing) {
        return prisma.contextPack.update({
          where: { id: existing.id },
          data: {
            body,
            isCanonical: setCanonical || existing.isCanonical,
          },
        });
      }

      return prisma.contextPack.create({
        data: {
          threadId,
          title,
          body,
          isCanonical: setCanonical || false,
        },
      });
    }

    case "get_context_pack": {
      const threadId = args.threadId as string;
      const canonicalOnly = args.canonicalOnly as boolean | undefined;

      if (canonicalOnly) {
        return prisma.contextPack.findFirst({
          where: { threadId, isCanonical: true },
        });
      }

      return prisma.contextPack.findMany({
        where: { threadId },
        orderBy: { updatedAt: "desc" },
      });
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
