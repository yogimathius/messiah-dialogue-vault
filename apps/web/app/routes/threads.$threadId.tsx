import { json, redirect } from "react-router";
import { Link, Form } from "react-router";
import type { Route } from "./+types/threads.$threadId";
import { prisma } from "~/lib/db.server";
import { UpdateThreadSchema, CreateTurnSchema } from "@vault/core";
import { useState } from "react";
import ReactMarkdown from "react-markdown";

export async function loader({ params }: Route.LoaderArgs) {
  const thread = await prisma.thread.findUnique({
    where: { id: params.threadId },
    include: {
      tags: {
        include: {
          tag: true,
        },
      },
      turns: {
        orderBy: {
          orderIndex: "asc",
        },
      },
      contextPacks: true,
    },
  });

  if (!thread) {
    throw new Response("Thread not found", { status: 404 });
  }

  const allTags = await prisma.tag.findMany({
    orderBy: { name: "asc" },
  });

  return json({ thread, allTags });
}

export async function action({ request, params }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "update-thread") {
    const data = UpdateThreadSchema.parse({
      title: formData.get("title") || undefined,
      description: formData.get("description") || undefined,
      status: formData.get("status") || undefined,
    });

    await prisma.thread.update({
      where: { id: params.threadId },
      data,
    });

    return json({ success: true });
  }

  if (intent === "delete-thread") {
    await prisma.thread.delete({
      where: { id: params.threadId },
    });

    return redirect("/threads");
  }

  if (intent === "archive") {
    await prisma.thread.update({
      where: { id: params.threadId },
      data: { status: "ARCHIVED" },
    });

    return json({ success: true });
  }

  if (intent === "unarchive") {
    await prisma.thread.update({
      where: { id: params.threadId },
      data: { status: "ACTIVE" },
    });

    return json({ success: true });
  }

  if (intent === "create-turn") {
    const thread = await prisma.thread.findUnique({
      where: { id: params.threadId },
      select: {
        _count: {
          select: { turns: true },
        },
      },
    });

    const data = CreateTurnSchema.parse({
      threadId: params.threadId,
      role: formData.get("role"),
      content: formData.get("content"),
      orderIndex: thread?._count.turns || 0,
    });

    await prisma.turn.create({ data });

    return json({ success: true });
  }

  if (intent === "delete-turn") {
    const turnId = formData.get("turnId") as string;
    await prisma.turn.delete({
      where: { id: turnId },
    });

    return json({ success: true });
  }

  return json({ error: "Invalid intent" }, { status: 400 });
}

function RoleBadge({ role }: { role: string }) {
  const colors = {
    MESSIAH: "bg-purple-600",
    REFLECTION: "bg-blue-600",
    NOTE: "bg-amber-600",
  };

  return (
    <span className={`px-2 py-1 text-xs rounded ${colors[role as keyof typeof colors]}`}>
      {role}
    </span>
  );
}

export default function ThreadDetail({ loaderData }: Route.ComponentProps) {
  const { thread, allTags } = loaderData;
  const [editingThread, setEditingThread] = useState(false);
  const [showTurnForm, setShowTurnForm] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"MESSIAH" | "REFLECTION" | "NOTE">("MESSIAH");

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link to="/threads" className="text-zinc-400 hover:text-zinc-100">
              ← Back to Threads
            </Link>
            {thread.status === "ARCHIVED" && (
              <span className="px-2 py-1 text-xs bg-zinc-700 rounded">ARCHIVED</span>
            )}
          </div>

          {!editingThread ? (
            <div>
              <h1 className="text-3xl font-bold mb-2">{thread.title}</h1>
              {thread.description && (
                <p className="text-zinc-400 mb-4">{thread.description}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingThread(true)}
                  className="px-3 py-1 text-sm bg-zinc-800 hover:bg-zinc-700 rounded"
                >
                  Edit
                </button>
                {thread.status === "ACTIVE" ? (
                  <Form method="post">
                    <input type="hidden" name="intent" value="archive" />
                    <button className="px-3 py-1 text-sm bg-zinc-800 hover:bg-zinc-700 rounded">
                      Archive
                    </button>
                  </Form>
                ) : (
                  <Form method="post">
                    <input type="hidden" name="intent" value="unarchive" />
                    <button className="px-3 py-1 text-sm bg-zinc-800 hover:bg-zinc-700 rounded">
                      Unarchive
                    </button>
                  </Form>
                )}
              </div>
            </div>
          ) : (
            <Form method="post" onSubmit={() => setEditingThread(false)}>
              <input type="hidden" name="intent" value="update-thread" />
              <div className="space-y-4 mb-4">
                <input
                  type="text"
                  name="title"
                  defaultValue={thread.title}
                  className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-2xl font-bold"
                />
                <textarea
                  name="description"
                  defaultValue={thread.description || ""}
                  rows={3}
                  className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-3 py-1 text-sm bg-indigo-600 hover:bg-indigo-700 rounded"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditingThread(false)}
                  className="px-3 py-1 text-sm bg-zinc-800 hover:bg-zinc-700 rounded"
                >
                  Cancel
                </button>
              </div>
            </Form>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-zinc-800 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex gap-6">
              <Link
                to={`/threads/${thread.id}`}
                className="pb-2 border-b-2 border-indigo-600"
              >
                Turns
              </Link>
              <Link
                to={`/threads/${thread.id}/dialogue`}
                className="pb-2 text-zinc-400 hover:text-zinc-100"
              >
                Continue Dialogue
              </Link>
              <Link
                to={`/threads/${thread.id}/context-packs`}
                className="pb-2 text-zinc-400 hover:text-zinc-100"
              >
                Context Packs
              </Link>
            </div>
            <div className="flex gap-2 pb-2">
              <a
                href={`/threads/${thread.id}/export?format=markdown`}
                download
                className="px-3 py-1 text-sm bg-zinc-800 hover:bg-zinc-700 rounded"
              >
                Export MD
              </a>
              <a
                href={`/threads/${thread.id}/export?format=json`}
                download
                className="px-3 py-1 text-sm bg-zinc-800 hover:bg-zinc-700 rounded"
              >
                Export JSON
              </a>
            </div>
          </div>
        </div>

        {/* Add Turn Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowTurnForm(!showTurnForm)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg"
          >
            Add Turn
          </button>
        </div>

        {/* Turn Form */}
        {showTurnForm && (
          <Form
            method="post"
            className="mb-6 p-6 bg-zinc-900 rounded-lg border border-zinc-800"
            onSubmit={() => setShowTurnForm(false)}
          >
            <input type="hidden" name="intent" value="create-turn" />
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Role</label>
                <div className="flex gap-2">
                  {["MESSIAH", "REFLECTION", "NOTE"].map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setSelectedRole(role as any)}
                      className={`px-4 py-2 rounded ${
                        selectedRole === role
                          ? "bg-indigo-600"
                          : "bg-zinc-800 hover:bg-zinc-700"
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
                <input type="hidden" name="role" value={selectedRole} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Content (Markdown)</label>
                <textarea
                  name="content"
                  required
                  rows={8}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg font-mono text-sm"
                  placeholder="Write your turn content in markdown..."
                />
              </div>
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                >
                  Create Turn
                </button>
                <button
                  type="button"
                  onClick={() => setShowTurnForm(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          </Form>
        )}

        {/* Turns Timeline */}
        <div className="space-y-4">
          {thread.turns.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <p>No turns yet. Add your first turn to start the dialogue.</p>
            </div>
          ) : (
            thread.turns.map((turn) => (
              <div
                key={turn.id}
                className="p-6 bg-zinc-900 rounded-lg border border-zinc-800"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <RoleBadge role={turn.role} />
                    <span className="text-sm text-zinc-500">
                      {new Date(turn.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <Form method="post">
                    <input type="hidden" name="intent" value="delete-turn" />
                    <input type="hidden" name="turnId" value={turn.id} />
                    <button className="text-sm text-red-400 hover:text-red-300">
                      Delete
                    </button>
                  </Form>
                </div>
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{turn.content}</ReactMarkdown>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
