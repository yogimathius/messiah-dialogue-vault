import { redirect } from "react-router";
import { Link, Form } from "react-router";
import type { Route } from "./+types/threads.$threadId.context-packs.$packId";
import { prisma } from "~/lib/db.server";
import { UpdateContextPackSchema } from "@vault/core";
import { useState } from "react";

export async function loader({ params }: Route.LoaderArgs) {
  const pack = await prisma.contextPack.findUnique({
    where: { id: params.packId },
    include: {
      thread: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  if (!pack) {
    throw new Response("Context pack not found", { status: 404 });
  }

  // Get recent turns from the thread for adding excerpts
  const turns = await prisma.turn.findMany({
    where: { threadId: params.threadId },
    orderBy: { orderIndex: "asc" },
    take: 100,
  });

  return { pack, turns };
}

export async function action({ request, params }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "update") {
    const data = UpdateContextPackSchema.parse({
      title: formData.get("title") || undefined,
      body: formData.get("body")
        ? JSON.parse(formData.get("body") as string)
        : undefined,
      isCanonical: formData.get("isCanonical") === "true",
    });

    // If marking as canonical, unmark others in this thread
    if (data.isCanonical) {
      await prisma.contextPack.updateMany({
        where: {
          threadId: params.threadId,
          isCanonical: true,
          id: { not: params.packId },
        },
        data: { isCanonical: false },
      });
    }

    await prisma.contextPack.update({
      where: { id: params.packId },
      data,
    });

    return { success: true };
  }

  if (intent === "delete") {
    await prisma.contextPack.delete({
      where: { id: params.packId },
    });

    return redirect(`/threads/${params.threadId}/context-packs`);
  }

  return Response.json({ error: "Invalid intent" }, { status: 400 });
}

export default function ContextPackDetail({ loaderData }: Route.ComponentProps) {
  const { pack, turns } = loaderData;
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(pack.title);
  const [body, setBody] = useState(pack.body as any);
  const [isCanonical, setIsCanonical] = useState(pack.isCanonical);
  const [newExcerpt, setNewExcerpt] = useState("");
  const [newPrinciple, setNewPrinciple] = useState("");

  const excerpts = (body?.excerpts || []) as Array<{
    turnId?: string;
    content: string;
  }>;
  const principles = (body?.principles || []) as string[];

  const addExcerpt = () => {
    if (!newExcerpt.trim()) return;
    setBody({
      ...body,
      excerpts: [...excerpts, { content: newExcerpt }],
    });
    setNewExcerpt("");
  };

  const removeExcerpt = (idx: number) => {
    setBody({
      ...body,
      excerpts: excerpts.filter((_, i) => i !== idx),
    });
  };

  const addPrinciple = () => {
    if (!newPrinciple.trim()) return;
    setBody({
      ...body,
      principles: [...principles, newPrinciple],
    });
    setNewPrinciple("");
  };

  const removePrinciple = (idx: number) => {
    setBody({
      ...body,
      principles: principles.filter((_, i) => i !== idx),
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link
            to={`/threads/${pack.thread.id}/context-packs`}
            className="text-zinc-400 hover:text-zinc-100 mb-4 inline-block"
          >
            ← Back to Context Packs
          </Link>
        </div>

        {!editing ? (
          <>
            {/* View Mode */}
            <div className="mb-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold">{pack.title}</h1>
                    {pack.isCanonical && (
                      <span className="px-2 py-1 text-sm bg-indigo-600 rounded">
                        Canonical
                      </span>
                    )}
                  </div>
                  <p className="text-zinc-400">{pack.thread.title}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditing(true)}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg"
                  >
                    Edit
                  </button>
                  <Form method="post">
                    <input type="hidden" name="intent" value="delete" />
                    <button
                      onClick={(e) => {
                        if (!confirm("Delete this context pack?")) {
                          e.preventDefault();
                        }
                      }}
                      className="px-4 py-2 bg-red-900/20 hover:bg-red-900/30 text-red-400 rounded-lg"
                    >
                      Delete
                    </button>
                  </Form>
                </div>
              </div>
            </div>

            {/* Excerpts */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Curated Excerpts</h2>
              {excerpts.length === 0 ? (
                <p className="text-zinc-500">No excerpts yet. Edit to add excerpts.</p>
              ) : (
                <div className="space-y-4">
                  {excerpts.map((excerpt, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-zinc-900 rounded-lg border border-zinc-800"
                    >
                      <p className="text-zinc-300">{excerpt.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Principles */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Guiding Principles</h2>
              {principles.length === 0 ? (
                <p className="text-zinc-500">No principles yet. Edit to add principles.</p>
              ) : (
                <ul className="space-y-2">
                  {principles.map((principle, idx) => (
                    <li
                      key={idx}
                      className="p-3 bg-zinc-900 rounded border border-zinc-800"
                    >
                      {principle}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Export */}
            <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-800">
              <h3 className="font-semibold mb-2">Export</h3>
              <p className="text-sm text-zinc-400 mb-3">
                Download this context pack as JSON for use with MCP or other tools
              </p>
              <a
                href={`data:application/json;charset=utf-8,${encodeURIComponent(
                  JSON.stringify(
                    {
                      title: pack.title,
                      threadId: pack.threadId,
                      isCanonical: pack.isCanonical,
                      excerpts,
                      principles,
                    },
                    null,
                    2
                  )
                )}`}
                download={`context-pack-${pack.id}.json`}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg inline-block"
              >
                Download JSON
              </a>
            </div>
          </>
        ) : (
          <>
            {/* Edit Mode */}
            <Form
              method="post"
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData();
                formData.set("intent", "update");
                formData.set("title", title);
                formData.set("body", JSON.stringify(body));
                formData.set("isCanonical", isCanonical.toString());
                fetch("", { method: "POST", body: formData }).then(() => {
                  setEditing(false);
                  window.location.reload();
                });
              }}
            >
              <div className="space-y-6">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium mb-2">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg"
                  />
                </div>

                {/* Canonical */}
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isCanonical}
                      onChange={(e) => setIsCanonical(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm">Mark as canonical</span>
                  </label>
                </div>

                {/* Excerpts */}
                <div>
                  <h3 className="font-semibold mb-3">Curated Excerpts</h3>
                  <div className="space-y-3">
                    {excerpts.map((excerpt, idx) => (
                      <div
                        key={idx}
                        className="flex gap-2 items-start p-3 bg-zinc-900 rounded border border-zinc-800"
                      >
                        <p className="flex-1 text-sm">{excerpt.content}</p>
                        <button
                          type="button"
                          onClick={() => removeExcerpt(idx)}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <textarea
                        value={newExcerpt}
                        onChange={(e) => setNewExcerpt(e.target.value)}
                        placeholder="Add an excerpt..."
                        rows={3}
                        className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded text-sm"
                      />
                      <button
                        type="button"
                        onClick={addExcerpt}
                        className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded self-start"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>

                {/* Principles */}
                <div>
                  <h3 className="font-semibold mb-3">Guiding Principles</h3>
                  <div className="space-y-2">
                    {principles.map((principle, idx) => (
                      <div
                        key={idx}
                        className="flex gap-2 items-start p-3 bg-zinc-900 rounded border border-zinc-800"
                      >
                        <p className="flex-1 text-sm">{principle}</p>
                        <button
                          type="button"
                          onClick={() => removePrinciple(idx)}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newPrinciple}
                        onChange={(e) => setNewPrinciple(e.target.value)}
                        placeholder="Add a guiding principle..."
                        className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded text-sm"
                      />
                      <button
                        type="button"
                        onClick={addPrinciple}
                        className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </Form>
          </>
        )}
      </div>
    </div>
  );
}
