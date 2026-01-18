import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  route("threads", "routes/threads._index.tsx"),
  route("threads/:threadId", "routes/threads.$threadId.tsx"),
  route("threads/:threadId/dialogue", "routes/threads.$threadId.dialogue.tsx"),
  route("threads/:threadId/export", "routes/threads.$threadId.export.tsx"),
  route("threads/:threadId/context-packs", "routes/threads.$threadId.context-packs._index.tsx"),
  route(
    "threads/:threadId/context-packs/:packId",
    "routes/threads.$threadId.context-packs.$packId.tsx"
  ),
  route("search", "routes/search.tsx"),
  route("import", "routes/import.tsx"),
  route("login", "routes/login.tsx"),
  route("signup", "routes/signup.tsx"),
  route("logout", "routes/logout.tsx"),
] satisfies RouteConfig;
