#!/usr/bin/env node
/**
 * Messiah Dialogue Vault MCP Server
 * 
 * A Model Context Protocol server for managing dialogue threads,
 * enabling AI assistants to interact with the vault.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { prisma } from "@vault/db";
import { toolDefinitions, handleToolCall } from "./tools/index.js";

const server = new Server(
  {
    name: "messiah-dialogue-vault",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: toolDefinitions,
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    const result = await handleToolCall(name, args || {});
    return {
      content: [
        {
          type: "text",
          text: typeof result === "string" ? result : JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [
        {
          type: "text",
          text: `Error: ${message}`,
        },
      ],
      isError: true,
    };
  }
});

// List available resources (threads as resources)
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const threads = await prisma.thread.findMany({
    where: { status: "ACTIVE" },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return {
    resources: threads.map((thread) => ({
      uri: `vault://thread/${thread.id}`,
      name: thread.title,
      description: thread.description || undefined,
      mimeType: "application/json",
    })),
  };
});

// Read a specific resource
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  
  // Parse URI: vault://thread/{id} or vault://turn/{id}
  const match = uri.match(/^vault:\/\/(thread|turn)\/(.+)$/);
  if (!match) {
    throw new Error(`Invalid resource URI: ${uri}`);
  }

  const [, resourceType, id] = match;

  if (resourceType === "thread") {
    const thread = await prisma.thread.findUnique({
      where: { id },
      include: {
        turns: {
          orderBy: { orderIndex: "asc" },
        },
        tags: {
          include: { tag: true },
        },
        contextPacks: true,
      },
    });

    if (!thread) {
      throw new Error(`Thread not found: ${id}`);
    }

    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(thread, null, 2),
        },
      ],
    };
  }

  if (resourceType === "turn") {
    const turn = await prisma.turn.findUnique({
      where: { id },
      include: {
        thread: true,
      },
    });

    if (!turn) {
      throw new Error(`Turn not found: ${id}`);
    }

    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(turn, null, 2),
        },
      ],
    };
  }

  throw new Error(`Unknown resource type: ${resourceType}`);
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Messiah Dialogue Vault MCP server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
