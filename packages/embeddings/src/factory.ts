import type { EmbeddingProvider } from '@vault/core';
import { LocalEmbeddingProvider } from './local';
import { OpenAIEmbeddingProvider } from './openai';
import { VoyageAIEmbeddingProvider } from './voyage';

export type EmbeddingProviderType = 'local' | 'openai' | 'voyageai';

export interface EmbeddingConfig {
  provider: EmbeddingProviderType;
  apiKey?: string;
  model?: string;
}

export function createEmbeddingProvider(
  config: EmbeddingConfig
): EmbeddingProvider {
  switch (config.provider) {
    case 'local':
      return new LocalEmbeddingProvider();

    case 'openai':
      if (!config.apiKey) {
        throw new Error('OpenAI API key required');
      }
      return new OpenAIEmbeddingProvider(config.apiKey, config.model);

    case 'voyageai':
      if (!config.apiKey) {
        throw new Error('VoyageAI API key required');
      }
      return new VoyageAIEmbeddingProvider(config.apiKey, config.model);

    default:
      throw new Error(`Unknown embedding provider: ${config.provider}`);
  }
}

// Singleton instance
let embeddingProvider: EmbeddingProvider | null = null;

export function getEmbeddingProvider(): EmbeddingProvider {
  if (!embeddingProvider) {
    // Default to local provider
    const config: EmbeddingConfig = {
      provider: (process.env.EMBEDDING_PROVIDER as EmbeddingProviderType) || 'local',
      apiKey: process.env.EMBEDDING_API_KEY,
      model: process.env.EMBEDDING_MODEL,
    };

    embeddingProvider = createEmbeddingProvider(config);
  }

  return embeddingProvider;
}

export function setEmbeddingProvider(provider: EmbeddingProvider): void {
  embeddingProvider = provider;
}
