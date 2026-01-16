import { type Route } from "./+types/threads.$threadId.export";
import { exportThreadToMarkdown, exportThreadToJson } from "@vault/core";

export async function loader({ params, request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const format = url.searchParams.get("format") || "markdown";

  if (format === "json") {
    const jsonData = await exportThreadToJson(params.threadId);

    return new Response(JSON.stringify(jsonData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="thread-${params.threadId}.json"`,
      },
    });
  }

  // Default to markdown
  const markdown = await exportThreadToMarkdown(params.threadId);

  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown",
      "Content-Disposition": `attachment; filename="thread-${params.threadId}.md"`,
    },
  });
}
