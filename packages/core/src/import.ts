import { prisma } from '@vault/db';
import YAML from 'yaml';
import type { MarkdownExport, JsonExport } from './types';

export async function importThreadFromMarkdown(
  markdown: string
): Promise<{ threadId: string }> {
  // Parse frontmatter
  const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    throw new Error('Invalid markdown: missing frontmatter');
  }

  const frontmatter = YAML.parse(frontmatterMatch[1]) as MarkdownExport['frontmatter'];

  // Remove frontmatter and split by role sections
  const content = markdown.slice(frontmatterMatch[0].length).trim();

  // Extract turns by parsing **ROLE:** sections
  const turnRegex = /##\s*\*\*([A-Z]+):\*\*\s*\n([\s\S]*?)(?=\n##\s*\*\*[A-Z]+:\*\*|\n---\n|$)/g;
  const turns: Array<{ role: string; content: string }> = [];

  let match;
  while ((match = turnRegex.exec(content)) !== null) {
    const role = match[1].trim();
    const turnContent = match[2].trim().replace(/^---\n*/, '').trim();

    if (turnContent) {
      turns.push({ role, content: turnContent });
    }
  }

  // Create thread
  const thread = await prisma.thread.create({
    data: {
      title: frontmatter.title,
      status: 'ACTIVE',
    },
  });

  // Create turns
  for (let i = 0; i < turns.length; i++) {
    await prisma.turn.create({
      data: {
        threadId: thread.id,
        role: turns[i].role as 'MESSIAH' | 'REFLECTION' | 'NOTE',
        content: turns[i].content,
        orderIndex: i,
      },
    });
  }

  // Create tags if they don't exist and link them
  if (frontmatter.tags && frontmatter.tags.length > 0) {
    for (const tagName of frontmatter.tags) {
      const tag = await prisma.tag.upsert({
        where: { name: tagName },
        create: { name: tagName },
        update: {},
      });

      await prisma.threadTag.create({
        data: {
          threadId: thread.id,
          tagId: tag.id,
        },
      });
    }
  }

  return { threadId: thread.id };
}

export async function importThreadFromJson(
  jsonExport: JsonExport
): Promise<{ threadId: string }> {
  // Create thread
  const thread = await prisma.thread.create({
    data: {
      title: jsonExport.thread.title,
      description: jsonExport.thread.description,
      status: jsonExport.thread.status,
      metadata: jsonExport.thread.metadata,
    },
  });

  // Create turns
  for (const turn of jsonExport.turns) {
    await prisma.turn.create({
      data: {
        threadId: thread.id,
        role: turn.role,
        content: turn.content,
        orderIndex: turn.orderIndex,
        tokenCountEstimate: turn.tokenCountEstimate,
        annotations: turn.annotations,
      },
    });
  }

  // Create tags and link them
  for (const tag of jsonExport.tags) {
    const createdTag = await prisma.tag.upsert({
      where: { name: tag.name },
      create: { name: tag.name, color: tag.color },
      update: {},
    });

    await prisma.threadTag.create({
      data: {
        threadId: thread.id,
        tagId: createdTag.id,
      },
    });
  }

  // Create context packs
  for (const pack of jsonExport.contextPacks) {
    await prisma.contextPack.create({
      data: {
        threadId: thread.id,
        title: pack.title,
        body: pack.body,
        isCanonical: pack.isCanonical,
      },
    });
  }

  return { threadId: thread.id };
}
