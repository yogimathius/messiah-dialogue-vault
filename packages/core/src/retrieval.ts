import { prisma, type Turn } from '@vault/db';
import type { EmbeddingProvider, RetrievedContext, TurnSearchResult } from './types';
import type { SearchTurnsInput } from './schemas';

export class RetrievalService {
  constructor(private embeddingProvider: EmbeddingProvider) {}

  async embedTurn(content: string): Promise<number[]> {
    return this.embeddingProvider.embed(content);
  }

  async upsertTurnEmbedding(turnId: string): Promise<void> {
    const turn = await prisma.turn.findUnique({
      where: { id: turnId },
      select: { content: true },
    });

    if (!turn) {
      throw new Error(`Turn not found: ${turnId}`);
    }

    const embedding = await this.embedTurn(turn.content);

    await prisma.$executeRaw`
      UPDATE turns
      SET embedding = ${JSON.stringify(embedding)}::vector
      WHERE id = ${turnId}
    `;
  }

  async searchSimilarTurns(
    input: SearchTurnsInput
  ): Promise<TurnSearchResult[]> {
    const queryEmbedding = await this.embedTurn(input.query);

    // Build WHERE clause
    const conditions: string[] = [];
    const params: any[] = [];

    if (input.threadId) {
      conditions.push(`t."threadId" = $${params.length + 1}`);
      params.push(input.threadId);
    }

    if (input.role) {
      conditions.push(`t.role = $${params.length + 1}`);
      params.push(input.role);
    }

    if (input.startDate) {
      conditions.push(`t."createdAt" >= $${params.length + 1}`);
      params.push(input.startDate);
    }

    if (input.endDate) {
      conditions.push(`t."createdAt" <= $${params.length + 1}`);
      params.push(input.endDate);
    }

    if (input.tagIds && input.tagIds.length > 0) {
      conditions.push(`
        EXISTS (
          SELECT 1 FROM thread_tags tt
          WHERE tt."threadId" = t."threadId"
          AND tt."tagId" = ANY($${params.length + 1}::uuid[])
        )
      `);
      params.push(input.tagIds);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const results = await prisma.$queryRawUnsafe<any[]>(`
      SELECT
        t.*,
        th.id as "thread_id",
        th.title as "thread_title",
        1 - (t.embedding <=> $${params.length + 1}::vector) as similarity
      FROM turns t
      JOIN threads th ON th.id = t."threadId"
      ${whereClause}
      AND t.embedding IS NOT NULL
      ORDER BY t.embedding <=> $${params.length + 1}::vector
      LIMIT $${params.length + 2}
    `, ...params, JSON.stringify(queryEmbedding), input.k);

    return results.map((row) => ({
      turn: {
        id: row.id,
        threadId: row.threadId,
        role: row.role,
        content: row.content,
        orderIndex: row.orderIndex,
        tokenCountEstimate: row.tokenCountEstimate,
        annotations: row.annotations,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      } as Turn,
      similarity: row.similarity,
      thread: {
        id: row.thread_id,
        title: row.thread_title,
      },
    }));
  }

  async getRetrievedContextForDialogue(
    threadId: string,
    query: string,
    k: number = 5
  ): Promise<RetrievedContext[]> {
    const results = await this.searchSimilarTurns({
      query,
      k: k * 2, // Get more candidates
      threadId, // Only search within this thread
    });

    // Score by recency + similarity
    const now = Date.now();
    const scoredResults = results.map((result) => {
      const ageInDays = (now - result.turn.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      const recencyScore = Math.exp(-ageInDays / 30); // Decay over 30 days
      const combinedScore = result.similarity * 0.7 + recencyScore * 0.3;

      return {
        ...result,
        combinedScore,
      };
    });

    // Take top k by combined score
    const topResults = scoredResults
      .sort((a, b) => b.combinedScore - a.combinedScore)
      .slice(0, k);

    return topResults.map((result) => ({
      turn: result.turn,
      similarity: result.similarity,
      snippet: this.extractSnippet(result.turn.content),
    }));
  }

  private extractSnippet(content: string, maxLength: number = 200): string {
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength) + '...';
  }

  async ensureTurnEmbedding(turnId: string): Promise<void> {
    const turn = await prisma.turn.findUnique({
      where: { id: turnId },
      select: { embedding: true },
    });

    // Check if embedding exists (this is a rough check)
    if (!turn) {
      throw new Error(`Turn not found: ${turnId}`);
    }

    // If no embedding, generate it
    // Note: We can't directly check the Unsupported type, so we'll just regenerate
    await this.upsertTurnEmbedding(turnId);
  }
}
