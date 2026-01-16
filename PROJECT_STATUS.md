# Messiah Dialogue Vault - Project Status

**Created:** 2026-01-15
**Location:** `/Users/mathiusjohnson/projects/build/messiah-dialogue-vault`

## Project Overview

A production-ready, deployable full-stack React app + MCP server for messianic dialogue threads with:
- Thread/Turn CRUD operations
- Semantic search via pgvector
- Anthropic API integration for dialogue continuation
- Retrieval-augmented generation
- MCP server for external integrations
- Export/import to markdown

## Stack

- **Frontend:** React Router v7 (SSR, file-based routes) + Tailwind CSS
- **Backend:** Node.js + TypeScript
- **Database:** PostgreSQL + pgvector
- **ORM:** Prisma
- **Embeddings:** Configurable (local fastembed default, OpenAI, VoyageAI)
- **LLM:** Anthropic Messages API
- **Package Manager:** pnpm
- **Monorepo:** Turborepo

## ✅ Completed Tasks

### Infrastructure (100%)
- [x] Monorepo structure with pnpm workspaces
- [x] Turborepo configuration
- [x] Docker Compose with Postgres + pgvector
- [x] Git ignore and workspace config

### Database Layer (100%)
- [x] Prisma schema with Thread, Turn, Tag, ThreadTag, ContextPack models
- [x] pgvector extension support for embeddings
- [x] Enums: Status (ACTIVE, ARCHIVED), Role (MESSIAH, REFLECTION, NOTE)

### Core Package (100%)
- [x] Zod schemas for all operations
- [x] TypeScript types and interfaces
- [x] Retrieval service with pgvector search
- [x] Anthropic LLM provider abstraction
- [x] Provider singletons with environment-based config

### Embeddings Package (100%)
- [x] Base embedding provider interface
- [x] Local provider (fastembed with BAAI/bge-large-en-v1.5, 1024 dims)
- [x] OpenAI provider (text-embedding-3-large, 3072 dims)
- [x] VoyageAI provider (voyage-3, 1024 dims)
- [x] Factory pattern with environment-based selection

### Web App Foundation (100%)
- [x] React Router v7 setup with SSR
- [x] Vite build configuration
- [x] Tailwind CSS configuration (dark theme by default)
- [x] Root layout with proper meta/links
- [x] TypeScript configuration

## 🚧 Remaining Tasks

### 1. Server-Side Logic (app/routes/*.tsx with loaders/actions)

Create route files with React Router v7 loaders and actions:

#### `/app/routes/_index.tsx`
- Redirect to `/threads` or show landing page

#### `/app/routes/threads._index.tsx`
- **Loader:** List all threads with tags, search/filter support
- **Action:** Create new thread

#### `/app/routes/threads.$threadId.tsx`
- **Loader:** Get thread with turns, tags, context packs
- **Actions:**
  - Update thread (title, description, status, tags)
  - Delete thread
  - Archive/unarchive thread

#### `/app/routes/threads.$threadId.turns.tsx`
- **Actions:**
  - Create turn
  - Update turn
  - Delete turn
  - Reorder turns

#### `/app/routes/threads.$threadId.dialogue.tsx`
- **Action:** Continue dialogue with retrieval augmentation
  - Save MESSIAH turn
  - Retrieve similar turns
  - Call Anthropic API
  - Save REFLECTION turn
  - Return response with retrieved context

#### `/app/routes/threads.$threadId.export.tsx`
- **Action:** Export thread to markdown or JSON

#### `/app/routes/import.tsx`
- **Action:** Import thread from markdown or JSON

#### `/app/routes/search.tsx`
- **Loader:** Semantic search with filters
- Query param: `q` (query), `threadId`, `role`, `tags[]`, `startDate`, `endDate`, `k`

#### `/app/routes/threads.$threadId.context-packs._index.tsx`
- **Loader:** List context packs for thread
- **Action:** Create context pack

#### `/app/routes/threads.$threadId.context-packs.$packId.tsx`
- **Loader:** Get specific context pack
- **Actions:**
  - Update context pack
  - Delete context pack
  - Mark as canonical

#### `/app/routes/tags._index.tsx`
- **Loader:** List all tags
- **Action:** Create tag

#### `/app/routes/tags.$tagId.tsx`
- **Actions:**
  - Update tag
  - Delete tag

### 2. UI Components

Create reusable components in `/app/components/`:

#### Layout Components
- **`<AppShell>`** - Main navigation layout
  - Sidebar with threads list
  - Top nav with search, settings
- **`<ThreadNav>`** - Thread-specific navigation
  - Tabs: Turns, Dialogue, Context Packs, Export

#### Thread Components
- **`<ThreadList>`** - Grid/list of threads with tags, status
- **`<ThreadCard>`** - Individual thread preview
- **`<ThreadForm>`** - Create/edit thread form
- **`<TagSelector>`** - Multi-select tag picker with create option

#### Turn Components
- **`<TurnTimeline>`** - Vertical timeline of turns
- **`<TurnCard>`** - Individual turn with role badge, content, actions
- **`<TurnEditor>`** - Markdown editor with preview
  - Use `react-markdown` for preview
  - Textarea for editing
- **`<TurnReorder>`** - Up/down buttons or drag-drop interface

#### Dialogue Components
- **`<DialoguePanel>`** - Continue dialogue interface
  - Input for MESSIAH turn
  - Submit button
  - Settings (model, maxTokens, retrievalK)
- **`<RetrievedContextPanel>`** - Show retrieved turns
  - Collapsible
  - Display similarity scores
  - Snippet highlighting

#### Search Components
- **`<SearchBar>`** - Full-text and semantic search
- **`<SearchFilters>`** - Role, tags, date range
- **`<SearchResults>`** - List of matching turns with snippets

#### Context Pack Components
- **`<ContextPackList>`** - List of packs for a thread
- **`<ContextPackEditor>`** - Curate excerpts, add guiding principles
- **`<ContextPackViewer>`** - Display pack content

#### Shared Components
- **`<MarkdownPreview>`** - Styled markdown rendering
- **`<RoleBadge>`** - Color-coded role indicator
- **`<StatusBadge>`** - ACTIVE/ARCHIVED indicator
- **`<LoadingSpinner>`** - Loading state
- **`<ErrorMessage>`** - Error display

### 3. MCP Server (packages/mcp)

#### Setup
- Create `packages/mcp/package.json` with dependencies:
  - `@modelcontextprotocol/sdk`
  - `@vault/core`, `@vault/db`, `@vault/embeddings`

#### `/packages/mcp/src/server.ts`
Implement MCP server with stdio transport:

**Tools to implement:**
- `list_threads({ includeArchived?: boolean })`
- `get_thread({ threadId: string })`
- `list_turns({ threadId: string, limit?: number, after?: string, role?: Role })`
- `get_recent_turns({ threadId: string, n: number })`
- `search_turns({ query: string, k?: number, filters?: {...} })`
- `create_turn({ threadId: string, role: Role, content: string, orderIndex?: number })`
- `update_turn({ turnId: string, content?: string, annotations?: any })`
- `delete_turn({ turnId: string })`
- `export_thread({ threadId: string, format: 'markdown' | 'json' })`
- `import_thread({ format: 'markdown' | 'json', payload: string })`
- `upsert_context_pack({ threadId: string, title: string, body: any, setCanonical?: boolean })`
- `get_context_pack({ threadId: string, canonicalOnly?: boolean })`

**Resources:**
- Expose threads as resources
- Resource URIs: `vault://thread/{threadId}`, `vault://turn/{turnId}`

#### `/packages/mcp/src/example-client.ts`
Test client that:
- Connects to MCP server via stdio
- Calls several tools
- Prints results
- Use for testing MCP functionality

### 4. Export/Import Logic

#### `/packages/core/src/export.ts`
- `exportThreadToMarkdown(threadId: string): Promise<string>`
  - YAML frontmatter with title, threadId, createdAt, tags
  - Sections: `**Messiah:**`, `**Reflection:**`, `**Note:**`
- `exportThreadToJson(threadId: string): Promise<JsonExport>`

#### `/packages/core/src/import.ts`
- `importThreadFromMarkdown(markdown: string): Promise<{ thread: Thread, turns: Turn[] }>`
  - Parse YAML frontmatter
  - Extract sections by role
  - Create thread and turns
- `importThreadFromJson(json: JsonExport): Promise<void>`

### 5. Deployment Setup

#### `/Dockerfile`
Multi-stage build:
1. Base: Install dependencies
2. Build: Build all packages and web app
3. Production: Minimal image with only production dependencies

```dockerfile
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/*/package.json ./packages/
COPY apps/*/package.json ./apps/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/web/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

EXPOSE 3000
CMD ["pnpm", "start"]
```

#### `/.dockerignore`
```
node_modules
.git
.env
dist
build
.turbo
*.log
```

### 6. Documentation

#### `/README.md`
Include:
- Project overview
- Local development setup:
  ```bash
  # 1. Clone and install
  pnpm install

  # 2. Start Postgres + pgvector
  docker-compose up -d

  # 3. Run migrations
  pnpm db:generate
  pnpm db:migrate

  # 4. Start dev server
  pnpm dev
  ```
- Environment variables
- Embedding provider configuration
- MCP server usage
- Deployment to Fly.io (Docker-based)
- Project structure

#### `/.env.example`
```
# Database
DATABASE_URL="postgresql://vault:vault_dev_password@localhost:5432/vault"

# LLM Provider
ANTHROPIC_API_KEY="sk-ant-..."

# Embedding Provider (optional, defaults to 'local')
EMBEDDING_PROVIDER="local"  # local | openai | voyageai
EMBEDDING_API_KEY=""        # Required for openai/voyageai
EMBEDDING_MODEL=""          # Optional: model name override

# App
NODE_ENV="development"
```

### 7. Testing & Validation

- [ ] Install all dependencies: `pnpm install`
- [ ] Start Docker Compose: `docker-compose up -d`
- [ ] Run Prisma generate: `pnpm db:generate`
- [ ] Run migrations: `pnpm db:migrate`
- [ ] Start dev server: `pnpm dev`
- [ ] Test thread CRUD operations
- [ ] Test turn CRUD operations
- [ ] Test dialogue continuation with Anthropic
- [ ] Test retrieval augmentation
- [ ] Test export/import
- [ ] Test MCP server with example client
- [ ] Build for production: `pnpm build`
- [ ] Test production build: `docker build . -t vault && docker run -p 3000:3000 vault`

## Architecture Notes

### Data Model
- **Thread:** Top-level container with metadata, tags, status
- **Turn:** Individual dialogue entry with role, content, embedding
- **Tag:** Categorization system (many-to-many with threads)
- **ContextPack:** Curated context for thread, exportable for MCP

### Embedding Strategy
- Default: Local embeddings (no API calls, works offline)
- Optional: OpenAI or VoyageAI for higher quality (configurable via env)
- Vector dimension: 1024 (local/voyageai) or 3072 (openai)
- Stored in pgvector for similarity search

### Retrieval Strategy
- Hybrid scoring: 70% similarity + 30% recency
- Recency decay: exp(-days/30)
- Top-k results by combined score

### Security
- ANTHROPIC_API_KEY and other secrets only in server env
- Never expose secrets to client
- Validate all inputs with Zod schemas

## File Structure

```
messiah-dialogue-vault/
├── apps/
│   └── web/
│       ├── app/
│       │   ├── routes/         # React Router v7 routes (NEEDS IMPLEMENTATION)
│       │   ├── components/     # UI components (NEEDS IMPLEMENTATION)
│       │   ├── lib/            # Client utilities
│       │   ├── root.tsx        # ✅ Root layout
│       │   └── app.css         # ✅ Global styles
│       ├── public/             # Static assets
│       ├── package.json        # ✅
│       ├── tsconfig.json       # ✅
│       ├── vite.config.ts      # ✅
│       ├── tailwind.config.ts  # ✅
│       └── react-router.config.ts # ✅
├── packages/
│   ├── db/                     # ✅ COMPLETE
│   │   ├── prisma/
│   │   │   └── schema.prisma   # ✅
│   │   ├── src/
│   │   │   └── index.ts        # ✅
│   │   ├── package.json        # ✅
│   │   └── tsconfig.json       # ✅
│   ├── core/                   # ✅ COMPLETE (needs export/import logic)
│   │   ├── src/
│   │   │   ├── schemas.ts      # ✅ Zod schemas
│   │   │   ├── types.ts        # ✅ TypeScript types
│   │   │   ├── retrieval.ts    # ✅ Retrieval service
│   │   │   ├── llm-provider.ts # ✅ Anthropic provider
│   │   │   ├── export.ts       # NEEDS IMPLEMENTATION
│   │   │   ├── import.ts       # NEEDS IMPLEMENTATION
│   │   │   └── index.ts        # ✅
│   │   ├── package.json        # ✅
│   │   └── tsconfig.json       # ✅
│   ├── embeddings/             # ✅ COMPLETE
│   │   ├── src/
│   │   │   ├── base.ts         # ✅
│   │   │   ├── local.ts        # ✅
│   │   │   ├── openai.ts       # ✅
│   │   │   ├── voyage.ts       # ✅
│   │   │   ├── factory.ts      # ✅
│   │   │   └── index.ts        # ✅
│   │   ├── package.json        # ✅
│   │   └── tsconfig.json       # ✅
│   └── mcp/                    # NEEDS IMPLEMENTATION
│       ├── src/
│       │   ├── server.ts       # MCP server
│       │   ├── tools/          # Individual tool implementations
│       │   └── example-client.ts
│       ├── package.json
│       └── tsconfig.json
├── docker-compose.yml          # ✅
├── init.sql                    # ✅
├── Dockerfile                  # NEEDS IMPLEMENTATION
├── .dockerignore               # NEEDS IMPLEMENTATION
├── package.json                # ✅
├── pnpm-workspace.yaml         # ✅
├── turbo.json                  # ✅
├── .gitignore                  # ✅
├── .env.example                # NEEDS IMPLEMENTATION
├── README.md                   # NEEDS IMPLEMENTATION
└── PROJECT_STATUS.md           # ✅ THIS FILE
```

## Next Steps

1. **Implement server-side routes** in `apps/web/app/routes/` with loaders/actions
2. **Build UI components** in `apps/web/app/components/`
3. **Implement export/import logic** in `packages/core/src/`
4. **Create MCP server** in `packages/mcp/`
5. **Add Dockerfile and deployment config**
6. **Write comprehensive README**
7. **Test end-to-end**

## Implementation Priority

**High Priority (Core MVP):**
1. Thread list and CRUD routes
2. Turn CRUD routes
3. Basic UI components (ThreadList, TurnTimeline, TurnEditor)
4. Dialogue continuation with Anthropic
5. Retrieval augmentation

**Medium Priority (Essential Features):**
6. Export/import to markdown
7. Semantic search UI
8. Context Packs CRUD

**Lower Priority (Polish & Integrations):**
9. MCP server
10. Dockerfile and deployment
11. Advanced UI polish

## Known Issues & Considerations

- **Prisma pgvector:** Using `Unsupported("vector(1024)")` for embedding column. Raw SQL queries required for vector operations.
- **Embedding dimensions:** Local provider uses 1024, OpenAI uses 3072. Schema uses 1024. If switching to OpenAI, update schema to `vector(3072)`.
- **React Router v7 CLI:** GitHub template fetch failed. Built structure manually from official docs.
- **Background jobs:** Embedding generation is inline for v1. Can be queued later with BullMQ or similar.
- **Auth:** Not implemented. Add Clerk, Auth0, or custom auth later if needed.

## Resources

- React Router v7 docs: https://reactrouter.com/
- Prisma docs: https://www.prisma.io/docs
- MCP SDK: https://github.com/modelcontextprotocol/typescript-sdk
- Anthropic API: https://docs.anthropic.com/
- pgvector: https://github.com/pgvector/pgvector

---

**Status as of 2026-01-15:** Foundation complete, ready for route/UI implementation.
