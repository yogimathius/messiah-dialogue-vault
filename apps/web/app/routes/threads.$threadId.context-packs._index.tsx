import { json, redirect } from "react-router";
import { Link, Form } from "react-router";
import type { Route } from "./+types/threads.$threadId.context-packs._index";
import { prisma } from "~/lib/db.server";
import { CreateContextPackSchema } from "@vault/core";
import { useState } from "react";

export async function loader({ params }: Route.LoaderArgs) {
  const thread = await prisma.thread.findUnique({
    where: { id: params.threadId },
    select: {
      id: true,
      title: true,
    },
  });

  if (!thread) {
    throw new Response("Thread not found", { status: 404 });
  }

  const contextPacks = await prisma.contextPack.findMany({
    where: { threadId: params.threadId },
    orderBy: [{ isCanonical: "desc" }, { updatedAt: "desc" }],
  });

  return json({ thread, contextPacks });
}

export async function action({ request, params }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "create") {
    const data = CreateContextPackSchema.parse({
      threadId: params.threadId,
      title: formData.get("title"),
      body: formData.get("body")
        ? JSON.parse(formData.get("body") as string)
        : {},
      isCanonical: formData.get("isCanonical") === "true",
    });

    // If marking as canonical, unmark others
    if (data.isCanonical) {
      await prisma.contextPack.updateMany({
        where: { threadId: params.threadId, isCanonical: true },
        data: { isCanonical: false },
      });
    }

    const pack = await prisma.contextPack.create({ data });

    return redirect(`/threads/${params.threadId}/context-packs/${pack.id}`);
  }

  return json({ error: "Invalid intent" }, { status: 400 });
}

export default function ContextPacksIndex({ loaderData }: Route.ComponentProps) {
  const { thread, contextPacks } = loaderData;
  const [showCreateForm, setShowCreateForm] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link
            to={`/threads/${thread.id}`}
            className="text-zinc-400 hover:text-zinc-100 mb-4 inline-block"
          >
            ← Back to Thread
          </Link>
          <h1 className="text-3xl font-bold mb-2">{thread.title}</h1>
          <p className="text-zinc-400">Context Packs</p>
        </div>

        {/* Create Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg"
          >
            New Context Pack
          </button>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <Form
            method="post"
            className="mb-8 p-6 bg-zinc-900 rounded-lg border border-zinc-800"
            onSubmit={() => setShowCreateForm(false)}
          >
            <input type="hidden" name="intent" value="create" />
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title</label>
                <input
                  type="text"
                  name="title"
                  required
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg"
                  placeholder="e.g., Core Themes Summary"
                />
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="isCanonical"
                    value="true"
                    className="rounded"
                  />
                  <span className="text-sm">Mark as canonical (primary pack for this thread)</span>
                </label>
              </div>
              <input
                type="hidden"
                name="body"
                value={JSON.stringify({ excerpts: [], principles: [] })}
              />
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          </Form>
        )}

        {/* Context Packs List */}
        <div className="space-y-4">
          {contextPacks.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <p>No context packs yet. Create one to curate important excerpts and themes.</p>
            </div>
          ) : (
            contextPacks.map((pack) => (
              <Link
                key={pack.id}
                to={`/threads/${thread.id}/context-packs/${pack.id}`}
                className="block p-6 bg-zinc-900 rounded-lg border border-zinc-800 hover:border-zinc-700 transition"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold">{pack.title}</h3>
                      {pack.isCanonical && (
                        <span className="px-2 py-1 text-xs bg-indigo-600 rounded">
                          Canonical
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-500">
                      Updated {new Date(pack.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-sm text-zinc-400">
                    {(pack.body as any)?.excerpts?.length || 0} excerpts
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
