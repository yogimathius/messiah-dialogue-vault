import { FlagEmbedding } from "fastembed";
import { BaseEmbeddingProvider } from "./base";

export class LocalEmbeddingProvider extends BaseEmbeddingProvider {
  name = "local-fastembed";
  dimensions = 1024;

  private model: FlagEmbedding | null = null;
  private initPromise: Promise<void> | null = null;

  private async ensureInitialized(): Promise<void> {
    if (this.model) return;

    if (!this.initPromise) {
      this.initPromise = this.initialize();
    }

    await this.initPromise;
  }

  private async initialize(): Promise<void> {
    // BAAI/bge-large-en-v1.5 model (1024 dimensions)
    this.model = await FlagEmbedding.init({
      model: "BAAI/bge-large-en-v1.5" as any,
      maxLength: 512,
    });
  }

  async embed(text: string): Promise<number[]> {
    await this.ensureInitialized();
    if (!this.model) throw new Error("Model not initialized");

    const truncated = this.truncateText(text);
    const embedding = await this.model.queryEmbed(truncated);

    return Array.from(embedding);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    await this.ensureInitialized();
    if (!this.model) throw new Error("Model not initialized");

    const truncated = texts.map((t) => this.truncateText(t));
    const embeddingsGenerator = await this.model.embed(truncated);

    const results: number[][] = [];
    for await (const embedding of embeddingsGenerator) {
      // FastEmbed types can be tricky, ensuring we get number[]
      results.push(Array.from(embedding as any) as number[]);
    }

    return results;
  }
}
