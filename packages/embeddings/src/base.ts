import type { EmbeddingProvider } from '@vault/core';

export abstract class BaseEmbeddingProvider implements EmbeddingProvider {
  abstract name: string;
  abstract dimensions: number;

  abstract embed(text: string): Promise<number[]>;

  async embedBatch(texts: string[]): Promise<number[][]> {
    // Default implementation: sequential embedding
    // Override for providers with native batch support
    const embeddings: number[][] = [];
    for (const text of texts) {
      embeddings.push(await this.embed(text));
    }
    return embeddings;
  }

  protected truncateText(text: string, maxTokens: number = 8192): string {
    // Rough approximation: 4 chars per token
    const maxChars = maxTokens * 4;
    if (text.length <= maxChars) return text;
    return text.slice(0, maxChars);
  }
}
