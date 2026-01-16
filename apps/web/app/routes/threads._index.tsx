import { json, redirect } from "react-router";
import { Link } from "react-router";
import type { Route } from "./+types/threads._index";
import { prisma } from "~/lib/db.server";
import { CreateThreadSchema } from "@vault/core";
import { useState } from "react";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const search = url.searchParams.get("q") || "";
  const status = url.searchParams.get("status") || "ACTIVE";

  const threads = await prisma.thread.findMany({
    where: {
      status: status as "ACTIVE" | "ARCHIVED",
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      tags: {
        include: {
          tag: true,
        },
      },
      _count: {
        select: {
          turns: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return json({ threads, search, status });
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "create") {
    const data = CreateThreadSchema.parse({
      title: formData.get("title"),
      description: formData.get("description"),
      metadata: formData.get("metadata")
        ? JSON.parse(formData.get("metadata") as string)
        : undefined,
    });

    const thread = await prisma.thread.create({
      data,
    });

    return redirect(`/threads/${thread.id}`);
  }

  return json({ error: "Invalid intent" }, { status: 400 });
}

export default function ThreadsIndex({ loaderData }: Route.ComponentProps) {
  const { threads, search, status } = loaderData;
  const [showCreateForm, setShowCreateForm] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Dialogue Threads</h1>
          <div className="flex gap-3">
            <Link
              to="/import"
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg"
            >
              Import
            </Link>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg"
            >
              New Thread
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <form className="mb-6 flex gap-4">
          <input
            type="text"
            name="q"
            defaultValue={search}
            placeholder="Search threads..."
            className="flex-1 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg"
          />
          <select
            name="status"
            defaultValue={status}
            className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg"
          >
            <option value="ACTIVE">Active</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          <button
            type="submit"
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg"
          >
            Filter
          </button>
        </form>

        {/* Create Form */}
        {showCreateForm && (
          <form method="post" className="mb-8 p-6 bg-zinc-900 rounded-lg border border-zinc-800">
            <input type="hidden" name="intent" value="create" />
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title</label>
                <input
                  type="text"
                  name="title"
                  required
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  name="description"
                  rows={3}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg"
                />
              </div>
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
          </form>
        )}

        {/* Threads Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {threads.map((thread) => (
            <Link
              key={thread.id}
              to={`/threads/${thread.id}`}
              className="p-6 bg-zinc-900 rounded-lg border border-zinc-800 hover:border-zinc-700 transition"
            >
              <h2 className="text-xl font-semibold mb-2">{thread.title}</h2>
              {thread.description && (
                <p className="text-zinc-400 text-sm mb-4 line-clamp-2">
                  {thread.description}
                </p>
              )}
              <div className="flex items-center justify-between text-sm text-zinc-500">
                <span>{thread._count.turns} turns</span>
                <span>{new Date(thread.updatedAt).toLocaleDateString()}</span>
              </div>
              {thread.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {thread.tags.map((t) => (
                    <span
                      key={t.tagId}
                      className="px-2 py-1 text-xs bg-zinc-800 rounded"
                    >
                      {t.tag.name}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>

        {threads.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            <p>No threads found. Create your first dialogue thread.</p>
          </div>
        )}
      </div>
    </div>
  );
}
