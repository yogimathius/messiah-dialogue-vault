import type {} from "react-router";
import { Form } from "react-router";
import type { Route } from "./+types/threads.$threadId.dialogue";
import { prisma } from "~/lib/db.server";
import { ContinueDialogueSchema } from "@vault/core";
import { getEmbeddingProvider } from "@vault/embeddings";
import { RetrievalService, getLLMProvider } from "@vault/core";
import { useState } from "react";
import ReactMarkdown from "react-markdown";

export async function loader({ params }: Route.LoaderArgs) {
  const thread = await prisma.thread.findUnique({
    where: { id: params.threadId },
    select: {
      id: true,
      title: true,
      turns: {
        orderBy: { orderIndex: "asc" },
        take: 10,
      },
    },
  });

  if (!thread) {
    throw new Response("Thread not found", { status: 404 });
  }

  return { thread };
}

export async function action({ request, params }: Route.ActionArgs) {
  const formData = await request.formData();

  const input = ContinueDialogueSchema.parse({
    threadId: params.threadId,
    messiahContent: formData.get("messiahContent"),
    retrievalK: formData.get("retrievalK")
      ? parseInt(formData.get("retrievalK") as string)
      : 5,
    model: formData.get("model") || "claude-3-7-sonnet-20250219",
    maxTokens: formData.get("maxTokens")
      ? parseInt(formData.get("maxTokens") as string)
      : 4096,
  });

  // Get thread for context
  const thread = await prisma.thread.findUnique({
    where: { id: params.threadId },
    select: {
      id: true,
      title: true,
      description: true,
      turns: {
        orderBy: { orderIndex: "asc" },
        take: 20, // Recent context
      },
      _count: {
        select: { turns: true },
      },
    },
  });

  if (!thread) {
    throw new Response("Thread not found", { status: 404 });
  }

  // 1. Create MESSIAH turn
  const messiahTurn = await prisma.turn.create({
    data: {
      threadId: params.threadId,
      role: "MESSIAH",
      content: input.messiahContent,
      orderIndex: thread._count.turns,
    },
  });

  // 2. Generate embedding for the new turn
  const embeddingProvider = getEmbeddingProvider();
  const retrieval = new RetrievalService(embeddingProvider);
  await retrieval.upsertTurnEmbedding(messiahTurn.id);

  // 3. Retrieve similar turns for context
  const retrievedContext =
    input.retrievalK > 0
      ? await retrieval.getRetrievedContextForDialogue(
          params.threadId,
          input.messiahContent,
          input.retrievalK
        )
      : [];

  // 4. Build conversation history for LLM
  const conversationHistory = thread.turns.slice(-10).map((turn) => ({
    role: turn.role === "MESSIAH" ? ("user" as const) : ("assistant" as const),
    content: `**${turn.role}:**\n${turn.content}`,
  }));

  // Add the new MESSIAH turn
  conversationHistory.push({
    role: "user",
    content: input.messiahContent,
  });

  // 5. Build system prompt with retrieved context
  let systemPrompt = `You are engaging in a deeply personal messianic dialogue. This is a spiritual practice of the user.

Respond as REFLECTION - a contemplative, insightful voice that:
- Honors the spiritual and personal nature of this dialogue
- Provides thoughtful reflection without editorializing the practice
- Stays grounded and respectful
- Focuses on insight, depth, and resonance

Thread: "${thread.title}"
${thread.description ? `Description: ${thread.description}` : ""}`;

  if (retrievedContext.length > 0) {
    systemPrompt += `\n\nRelevant context from previous turns:\n\n`;
    retrievedContext.forEach((ctx, i) => {
      systemPrompt += `[${i + 1}] (similarity: ${ctx.similarity.toFixed(2)})\n${ctx.snippet}\n\n`;
    });
  }

  // 6. Call LLM
  const llm = getLLMProvider();
  const completion = await llm.complete({
    model: input.model,
    maxTokens: input.maxTokens,
    temperature: 1.0,
    system: systemPrompt,
    messages: conversationHistory,
  });

  // 7. Create REFLECTION turn
  const reflectionTurn = await prisma.turn.create({
    data: {
      threadId: params.threadId,
      role: "REFLECTION",
      content: completion.content,
      orderIndex: thread._count.turns + 1,
      tokenCountEstimate: completion.usage.inputTokens + completion.usage.outputTokens,
    },
  });

  // 8. Generate embedding for reflection turn
  await retrieval.upsertTurnEmbedding(reflectionTurn.id);

  return {
    messiahTurn,
    reflectionTurn,
    retrievedContext,
    usage: completion.usage,
  };
}

export default function ThreadDialogue({ loaderData, actionData }: Route.ComponentProps) {
  const { thread } = loaderData;
  const [messiahContent, setMessiahContent] = useState("");
  const [retrievalK, setRetrievalK] = useState(5);
  const [maxTokens, setMaxTokens] = useState(4096);
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">{thread.title}</h1>
        <p className="text-zinc-400 mb-6">Continue the dialogue with AI assistance</p>

        {/* Settings */}
        <div className="mb-6">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-sm text-zinc-400 hover:text-zinc-100"
          >
            {showSettings ? "Hide" : "Show"} Settings
          </button>
        </div>

        {showSettings && (
          <div className="mb-6 p-4 bg-zinc-900 rounded-lg border border-zinc-800">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Retrieval K (similar turns)
                </label>
                <input
                  type="number"
                  value={retrievalK}
                  onChange={(e) => setRetrievalK(parseInt(e.target.value))}
                  min="0"
                  max="20"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Max Tokens</label>
                <input
                  type="number"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                  min="256"
                  max="8192"
                  step="256"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded"
                />
              </div>
            </div>
          </div>
        )}

        {/* Main Form */}
        <Form method="post" className="space-y-6">
          <input type="hidden" name="retrievalK" value={retrievalK} />
          <input type="hidden" name="maxTokens" value={maxTokens} />
          <input type="hidden" name="model" value="claude-3-7-sonnet-20250219" />

          <div>
            <label className="block text-sm font-medium mb-2">
              Your Turn (MESSIAH)
            </label>
            <textarea
              name="messiahContent"
              value={messiahContent}
              onChange={(e) => setMessiahContent(e.target.value)}
              required
              rows={12}
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg font-mono text-sm"
              placeholder="Write your messianic turn in markdown..."
            />
          </div>

          <button
            type="submit"
            disabled={!messiahContent.trim()}
            className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-lg font-medium"
          >
            Continue Dialogue
          </button>
        </Form>

        {/* Response */}
        {actionData && (
          <div className="mt-8 space-y-6">
            <div className="p-6 bg-zinc-900 rounded-lg border border-zinc-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Your Turn (MESSIAH)</h3>
                <span className="text-sm text-zinc-500">
                  {new Date(actionData.messiahTurn.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown>{actionData.messiahTurn.content}</ReactMarkdown>
              </div>
            </div>

            {actionData.retrievedContext && actionData.retrievedContext.length > 0 && (
              <details className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
                <summary className="cursor-pointer font-medium text-zinc-400 hover:text-zinc-100">
                  Retrieved Context ({actionData.retrievedContext.length} similar turns)
                </summary>
                <div className="mt-4 space-y-3">
                  {actionData.retrievedContext.map((ctx: any, i: number) => (
                    <div key={i} className="p-3 bg-zinc-800 rounded text-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-zinc-500">
                          Similarity: {(ctx.similarity * 100).toFixed(1)}%
                        </span>
                      </div>
                      <p className="text-zinc-300">{ctx.snippet}</p>
                    </div>
                  ))}
                </div>
              </details>
            )}

            <div className="p-6 bg-zinc-900 rounded-lg border border-zinc-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">AI Response (REFLECTION)</h3>
                <div className="flex gap-4 text-sm text-zinc-500">
                  <span>
                    {new Date(actionData.reflectionTurn.createdAt).toLocaleString()}
                  </span>
                  {actionData.usage && (
                    <span>
                      {actionData.usage.inputTokens + actionData.usage.outputTokens} tokens
                    </span>
                  )}
                </div>
              </div>
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown>{actionData.reflectionTurn.content}</ReactMarkdown>
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg"
              >
                Continue Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
