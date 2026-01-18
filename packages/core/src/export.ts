import { prisma } from "@vault/db";
import YAML from "yaml";
import type { MarkdownExport, JsonExport } from "./types";

export async function exportThreadToMarkdown(threadId: string): Promise<string> {
  const thread = await prisma.thread.findUnique({
    where: { id: threadId },
    include: {
      turns: {
        orderBy: { orderIndex: "asc" },
      },
      tags: {
        include: {
          tag: true,
        },
      },
    },
  });

  if (!thread) {
    throw new Error(`Thread not found: ${threadId}`);
  }

  const markdownExport: MarkdownExport = {
    frontmatter: {
      title: thread.title,
      threadId: thread.id,
      createdAt: thread.createdAt.toISOString(),
      tags: thread.tags.map((t) => t.tag.name),
    },
    turns: thread.turns.map((turn) => ({
      role: turn.role,
      content: turn.content,
      orderIndex: turn.orderIndex,
    })),
  };

  // Build markdown
  let markdown = "---\n";
  markdown += YAML.stringify(markdownExport.frontmatter);
  markdown += "---\n\n";

  markdown += `# ${thread.title}\n\n`;

  if (thread.description) {
    markdown += `${thread.description}\n\n`;
  }

  markdown += "---\n\n";

  // Group turns by role for readability
  for (const turn of markdownExport.turns) {
    markdown += `## **${turn.role}:**\n\n`;
    markdown += `${turn.content}\n\n`;
    markdown += "---\n\n";
  }

  return markdown;
}

export async function exportThreadToJson(threadId: string): Promise<JsonExport> {
  const thread = await prisma.thread.findUnique({
    where: { id: threadId },
    include: {
      turns: {
        orderBy: { orderIndex: "asc" },
      },
      tags: {
        include: {
          tag: true,
        },
      },
      contextPacks: true,
    },
  });

  if (!thread) {
    throw new Error(`Thread not found: ${threadId}`);
  }

  return {
    thread: {
      id: thread.id,
      title: thread.title,
      description: thread.description,
      status: thread.status,
      metadata: thread.metadata,
      userId: thread.userId,
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
    },
    turns: thread.turns.map((turn) => ({
      id: turn.id,
      threadId: turn.threadId,
      role: turn.role,
      content: turn.content,
      orderIndex: turn.orderIndex,
      tokenCountEstimate: turn.tokenCountEstimate,
      annotations: turn.annotations,
      createdAt: turn.createdAt,
      updatedAt: turn.updatedAt,
    })),
    tags: thread.tags.map((t) => t.tag),
    contextPacks: thread.contextPacks,
  };
}
