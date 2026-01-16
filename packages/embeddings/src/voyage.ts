import { BaseEmbeddingProvider } from './base';

export class VoyageAIEmbeddingProvider extends BaseEmbeddingProvider {
  name = 'voyageai';
  dimensions = 1024; // voyage-3

  private apiKey: string;
  private model: string;
  private baseUrl = 'https://api.voyageai.com/v1';

  constructor(apiKey: string, model: string = 'voyage-3') {
    super();
    this.apiKey = apiKey;
    this.model = model;

    // Update dimensions based on model
    if (model === 'voyage-3-large') {
      this.dimensions = 1024;
    } else if (model === 'voyage-3') {
      this.dimensions = 1024;
    }
  }

  async embed(text: string): Promise<number[]> {
    const truncated = this.truncateText(text);

    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        input: truncated,
      }),
    });

    if (!response.ok) {
      throw new Error(`VoyageAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const truncated = texts.map((t) => this.truncateText(t));

    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        input: truncated,
      }),
    });

    if (!response.ok) {
      throw new Error(`VoyageAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data.map((d: any) => d.embedding);
  }
}
