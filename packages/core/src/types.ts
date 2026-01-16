import type { Thread, Turn, Tag, ContextPack } from '@vault/db';

// Extended types with relations
export interface ThreadWithRelations extends Thread {
  turns: Turn[];
  tags: (TagOnThread & { tag: Tag })[];
  contextPacks: ContextPack[];
}

export interface TagOnThread {
  threadId: string;
  tagId: string;
}

// Search result types
export interface TurnSearchResult {
  turn: Turn;
  similarity: number;
  thread: {
    id: string;
    title: string;
  };
}

// Retrieved context for dialogue continuation
export interface RetrievedContext {
  turn: Turn;
  similarity: number;
  snippet: string;
}

// Dialogue response
export interface DialogueResponse {
  messiahTurn: Turn;
  reflectionTurn: Turn;
  retrievedContext: RetrievedContext[];
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

// Provider types
export interface EmbeddingProvider {
  name: string;
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
  dimensions: number;
}

export interface LLMProvider {
  name: string;
  complete(params: CompletionParams): Promise<CompletionResponse>;
}

export interface CompletionParams {
  model: string;
  messages: Message[];
  maxTokens: number;
  temperature?: number;
  system?: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface CompletionResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  stopReason: string;
}

// Export/Import types
export interface MarkdownExport {
  frontmatter: {
    title: string;
    threadId: string;
    createdAt: string;
    tags?: string[];
  };
  turns: Array<{
    role: string;
    content: string;
    orderIndex: number;
  }>;
}

export interface JsonExport {
  thread: Thread;
  turns: Turn[];
  tags: Tag[];
  contextPacks: ContextPack[];
}
