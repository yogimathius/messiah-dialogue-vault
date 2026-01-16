import OpenAI from 'openai';
import { BaseEmbeddingProvider } from './base';

export class OpenAIEmbeddingProvider extends BaseEmbeddingProvider {
  name = 'openai';
  dimensions = 3072; // text-embedding-3-large

  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string = 'text-embedding-3-large') {
    super();
    this.client = new OpenAI({ apiKey });
    this.model = model;

    // Update dimensions based on model
    if (model === 'text-embedding-3-small') {
      this.dimensions = 1536;
    } else if (model === 'text-embedding-3-large') {
      this.dimensions = 3072;
    }
  }

  async embed(text: string): Promise<number[]> {
    const truncated = this.truncateText(text);

    const response = await this.client.embeddings.create({
      model: this.model,
      input: truncated,
    });

    return response.data[0].embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const truncated = texts.map((t) => this.truncateText(t));

    const response = await this.client.embeddings.create({
      model: this.model,
      input: truncated,
    });

    return response.data.map((d) => d.embedding);
  }
}
