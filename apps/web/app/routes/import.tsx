import { json, redirect } from "react-router";
import type { Route } from "./+types/import";
import { importThreadFromMarkdown, importThreadFromJson } from "@vault/core";
import { useState } from "react";

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const format = formData.get("format") as string;
  const content = formData.get("content") as string;

  try {
    let threadId: string;

    if (format === "json") {
      const jsonData = JSON.parse(content);
      const result = await importThreadFromJson(jsonData);
      threadId = result.threadId;
    } else {
      // markdown
      const result = await importThreadFromMarkdown(content);
      threadId = result.threadId;
    }

    return redirect(`/threads/${threadId}`);
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Import failed" },
      { status: 400 }
    );
  }
}

export default function Import({ actionData }: Route.ComponentProps) {
  const [format, setFormat] = useState<"markdown" | "json">("markdown");
  const [content, setContent] = useState("");

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Import Thread</h1>
        <p className="text-zinc-400 mb-8">
          Import a thread from markdown or JSON format
        </p>

        <form method="post" className="space-y-6">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium mb-3">Format</label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setFormat("markdown")}
                className={`px-6 py-3 rounded-lg ${
                  format === "markdown"
                    ? "bg-indigo-600"
                    : "bg-zinc-800 hover:bg-zinc-700"
                }`}
              >
                Markdown
              </button>
              <button
                type="button"
                onClick={() => setFormat("json")}
                className={`px-6 py-3 rounded-lg ${
                  format === "json"
                    ? "bg-indigo-600"
                    : "bg-zinc-800 hover:bg-zinc-700"
                }`}
              >
                JSON
              </button>
            </div>
            <input type="hidden" name="format" value={format} />
          </div>

          {/* Content Input */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Paste {format === "markdown" ? "Markdown" : "JSON"} Content
            </label>
            <textarea
              name="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={20}
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg font-mono text-sm"
              placeholder={
                format === "markdown"
                  ? "---\ntitle: My Thread\nthreadId: ...\n---\n\n## **MESSIAH:**\n\nContent..."
                  : '{\n  "thread": {...},\n  "turns": [...]\n}'
              }
            />
          </div>

          {/* Error Display */}
          {actionData?.error && (
            <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-400">
              {actionData.error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={!content.trim()}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-lg font-medium"
            >
              Import Thread
            </button>
            <a
              href="/threads"
              className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-medium"
            >
              Cancel
            </a>
          </div>
        </form>

        {/* Instructions */}
        <div className="mt-8 p-6 bg-zinc-900 rounded-lg border border-zinc-800">
          <h3 className="font-semibold mb-3">Import Instructions</h3>
          <div className="space-y-3 text-sm text-zinc-400">
            <div>
              <strong className="text-zinc-100">Markdown Format:</strong>
              <p>
                Include YAML frontmatter with title, threadId, createdAt, and tags.
                Separate turns with <code className="px-1 py-0.5 bg-zinc-800 rounded">## **ROLE:**</code> headers.
              </p>
            </div>
            <div>
              <strong className="text-zinc-100">JSON Format:</strong>
              <p>
                Must include thread, turns, tags, and contextPacks objects.
                Follows the export format from this application.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
