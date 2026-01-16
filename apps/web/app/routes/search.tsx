import { json } from "react-router";
import { Link, Form } from "react-router";
import type { Route } from "./+types/search";
import { RetrievalService, SearchTurnsSchema } from "@vault/core";
import { getEmbeddingProvider } from "@vault/embeddings";
import { prisma } from "~/lib/db.server";
import { useState } from "react";
import ReactMarkdown from "react-markdown";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q");

  if (!query) {
    return json({ results: null, query: null, tags: await getAllTags() });
  }

  // Parse search parameters
  const searchInput = SearchTurnsSchema.parse({
    query,
    k: url.searchParams.get("k") ? parseInt(url.searchParams.get("k")!) : 10,
    threadId: url.searchParams.get("threadId") || undefined,
    role: url.searchParams.get("role") || undefined,
    tagIds: url.searchParams.getAll("tagIds"),
    startDate: url.searchParams.get("startDate")
      ? new Date(url.searchParams.get("startDate")!)
      : undefined,
    endDate: url.searchParams.get("endDate")
      ? new Date(url.searchParams.get("endDate")!)
      : undefined,
  });

  // Execute search
  const embeddingProvider = getEmbeddingProvider();
  const retrieval = new RetrievalService(embeddingProvider);
  const results = await retrieval.searchSimilarTurns(searchInput);

  const tags = await getAllTags();

  return json({ results, query, tags, filters: searchInput });
}

async function getAllTags() {
  return prisma.tag.findMany({
    orderBy: { name: "asc" },
  });
}

function RoleBadge({ role }: { role: string }) {
  const colors = {
    MESSIAH: "bg-purple-600",
    REFLECTION: "bg-blue-600",
    NOTE: "bg-amber-600",
  };

  return (
    <span
      className={`px-2 py-1 text-xs rounded ${
        colors[role as keyof typeof colors]
      }`}
    >
      {role}
    </span>
  );
}

export default function Search({ loaderData }: Route.ComponentProps) {
  const { results, query, tags, filters } = loaderData;
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Semantic Search</h1>
          <Link
            to="/threads"
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg"
          >
            Back to Threads
          </Link>
        </div>

        {/* Search Form */}
        <Form method="get" className="space-y-4 mb-8">
          <div className="flex gap-4">
            <input
              type="text"
              name="q"
              defaultValue={query || ""}
              placeholder="Search dialogue turns semantically..."
              className="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg"
            >
              {showFilters ? "Hide" : "Show"} Filters
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium"
            >
              Search
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="p-6 bg-zinc-900 rounded-lg border border-zinc-800">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Role
                  </label>
                  <select
                    name="role"
                    defaultValue={filters?.role || ""}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded"
                  >
                    <option value="">All Roles</option>
                    <option value="MESSIAH">MESSIAH</option>
                    <option value="REFLECTION">REFLECTION</option>
                    <option value="NOTE">NOTE</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Max Results
                  </label>
                  <input
                    type="number"
                    name="k"
                    defaultValue={filters?.k || 10}
                    min="1"
                    max="50"
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    defaultValue={
                      filters?.startDate
                        ? new Date(filters.startDate).toISOString().split("T")[0]
                        : ""
                    }
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    defaultValue={
                      filters?.endDate
                        ? new Date(filters.endDate).toISOString().split("T")[0]
                        : ""
                    }
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded"
                  />
                </div>

                {tags.length > 0 && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">
                      Filter by Tags
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <label
                          key={tag.id}
                          className="flex items-center gap-2 px-3 py-2 bg-zinc-800 rounded cursor-pointer hover:bg-zinc-700"
                        >
                          <input
                            type="checkbox"
                            name="tagIds"
                            value={tag.id}
                            defaultChecked={filters?.tagIds?.includes(tag.id)}
                          />
                          <span className="text-sm">{tag.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </Form>

        {/* Results */}
        {results === null && (
          <div className="text-center py-12 text-zinc-500">
            <p>Enter a search query to find similar turns across all threads.</p>
          </div>
        )}

        {results !== null && results.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            <p>No results found for "{query}"</p>
          </div>
        )}

        {results !== null && results.length > 0 && (
          <div className="space-y-4">
            <div className="text-sm text-zinc-400 mb-4">
              Found {results.length} result{results.length !== 1 ? "s" : ""} for "
              {query}"
            </div>

            {results.map((result, idx) => (
              <Link
                key={result.turn.id}
                to={`/threads/${result.turn.threadId}`}
                className="block p-6 bg-zinc-900 rounded-lg border border-zinc-800 hover:border-zinc-700 transition"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <RoleBadge role={result.turn.role} />
                    <span className="text-sm text-zinc-500">
                      {new Date(result.turn.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-zinc-500">
                      Similarity: {(result.similarity * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="mb-3">
                  <span className="text-sm text-indigo-400">
                    {result.thread.title}
                  </span>
                </div>

                <div className="prose prose-invert prose-sm max-w-none line-clamp-4">
                  <ReactMarkdown>{result.turn.content}</ReactMarkdown>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
