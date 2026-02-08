# Messiah Dialogue Vault

A full-stack application for managing messianic dialogue threads with AI-powered continuation, semantic search, and MCP server integration.

## Features

- **Thread Management**: Create, edit, archive, and organize dialogue threads
- **Turn-Based Dialogues**: Three role types (MESSIAH, REFLECTION, NOTE) with markdown support
- **AI Continuation**: Continue dialogues using Anthropic's Claude with retrieval augmentation
- **Semantic Search**: pgvector-powered similarity search across all turns
- **Context Packs**: Curate and export context collections
- **Export/Import**: Markdown and JSON formats with YAML frontmatter
- **MCP Server**: Model Context Protocol server for external integrations
- **Configurable Embeddings**: Local (fastembed), OpenAI, or VoyageAI providers

## Current Status

- Core thread, turn, search, and context-pack flows appear implemented in the web app.
- MCP server package exists but is marked TODO in the README.
- Operational estimate: **75%** (core product features exist; MCP integration and polish pending).

## Tech Stack

- **Frontend**: React Router v7 (SSR) + Tailwind CSS
- **Backend**: Node.js + TypeScript
- **Database**: PostgreSQL + pgvector
- **ORM**: Prisma
- **LLM**: Anthropic Messages API
- **Embeddings**: Configurable (local/OpenAI/VoyageAI)
- **Monorepo**: pnpm + Turborepo

## Prerequisites

- Node.js 22+
- pnpm 9+
- Docker (for PostgreSQL)
- Anthropic API key

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Start Database

```bash
docker-compose up -d
```

This starts PostgreSQL 17 with pgvector extension on port 5432.

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and add your Anthropic API key:

```env
DATABASE_URL="postgresql://vault:vault_dev_password@localhost:5432/vault"
ANTHROPIC_API_KEY="sk-ant-your-key-here"
```

### 4. Run Migrations

```bash
pnpm db:generate
pnpm db:migrate
```

### 5. Start Development Server

```bash
pnpm dev
```

The app will be available at `http://localhost:5173`

## Project Structure

```
messiah-dialogue-vault/
├── apps/
│   └── web/                    # React Router v7 app
│       ├── app/
│       │   ├── routes/         # File-based routes
│       │   ├── lib/            # Server utilities
│       │   └── components/     # UI components
│       └── public/             # Static assets
├── packages/
│   ├── db/                     # Prisma schema and client
│   ├── core/                   # Shared types, schemas, business logic
│   ├── embeddings/             # Embedding provider implementations
│   └── mcp/                    # MCP server (TODO)
├── docker-compose.yml          # PostgreSQL + pgvector
└── README.md                   # This file
```

## Configuration

### Embedding Providers

By default, the app uses local embeddings (no API required). To use OpenAI or VoyageAI:

**OpenAI:**

```env
EMBEDDING_PROVIDER="openai"
EMBEDDING_API_KEY="sk-..."
EMBEDDING_MODEL="text-embedding-3-large"  # or text-embedding-3-small
```

**VoyageAI:**

```env
EMBEDDING_PROVIDER="voyageai"
EMBEDDING_API_KEY="pa-..."
EMBEDDING_MODEL="voyage-3"  # or voyage-3-large
```

**Local (default):**

```env
EMBEDDING_PROVIDER="local"
# No API key required
```

### Models

| Provider | Model                  | Dimensions |
| -------- | ---------------------- | ---------- |
| Local    | BAAI/bge-large-en-v1.5 | 1024       |
| OpenAI   | text-embedding-3-large | 3072       |
| OpenAI   | text-embedding-3-small | 1536       |
| VoyageAI | voyage-3               | 1024       |
| VoyageAI | voyage-3-large         | 1024       |

## Usage

### Creating a Thread

1. Navigate to `/threads`
2. Click "New Thread"
3. Enter title and optional description
4. Add tags (optional)

### Adding Turns

1. Open a thread
2. Click "Add Turn"
3. Select role (MESSIAH, REFLECTION, NOTE)
4. Write content in markdown
5. Submit

### Continue Dialogue with AI

1. Open a thread
2. Go to "Continue Dialogue" tab
3. Write your MESSIAH turn
4. Configure settings (retrieval K, max tokens)
5. Submit

The system will:

- Save your MESSIAH turn
- Retrieve semantically similar turns from thread history
- Send context + conversation to Claude
- Save REFLECTION response
- Show retrieved context for transparency

### Export/Import

**Export to Markdown:**

```markdown
---
title: My Thread
threadId: uuid
createdAt: 2026-01-15
tags: [shadow-work, integration]
---

## **MESSIAH:**

Content here...

---

## **REFLECTION:**

Response here...
```

**Import from Markdown:**
Upload a markdown file with the above format.

## App Routes (Server Actions)

This app is implemented with React Router server loaders/actions rather than a public REST API.

- `/login`, `/signup`, `/logout`
- `/threads`, `/threads/:threadId`
- `/threads/:threadId/dialogue`
- `/threads/:threadId/context-packs` and `/threads/:threadId/context-packs/:packId`
- `/threads/:threadId/export`
- `/import`
- `/search`

## Database Schema

**Thread**

- id, title, description, status, metadata
- Relations: turns, tags, contextPacks

**Turn**

- id, threadId, role, content, orderIndex, embedding
- tokenCountEstimate, annotations
- Relations: thread

## Tests

- `pnpm test` (2026-02-08) passed: 12 tests, 0 failures.

## Future Work

- Finish MCP server package and document tool surface area.
- Add API documentation for any external integrations.
- Extend test coverage for routes and DB workflows.

**Tag**

- id, name, color
- Relations: threads (many-to-many)

**ContextPack**

- id, threadId, title, body, isCanonical
- Relations: thread

## Development

### Available Commands

```bash
# Development
pnpm dev                # Start dev server (Turbo watches all packages)

# Database
pnpm db:generate        # Generate Prisma client
pnpm db:migrate         # Run migrations
pnpm db:studio          # Open Prisma Studio

# Build
pnpm build              # Build all packages

# MCP (when implemented)
pnpm mcp:server         # Start MCP server
pnpm mcp:example        # Run example client
```

### Adding a New Route

Create a file in `apps/web/app/routes/`:

```tsx
// apps/web/app/routes/my-route.tsx
import { json } from "react-router";
import type { Route } from "./+types/my-route";

export async function loader({ request }: Route.LoaderArgs) {
  // Server-side data loading
  return json({ data: "..." });
}

export async function action({ request }: Route.ActionArgs) {
  // Handle form submissions
  return json({ success: true });
}

export default function MyRoute({ loaderData }: Route.ComponentProps) {
  return <div>{loaderData.data}</div>;
}
```

## Deployment

### Docker Build

```bash
docker build -t messiah-dialogue-vault .
docker run -p 3000:3000 -e DATABASE_URL="..." -e ANTHROPIC_API_KEY="..." messiah-dialogue-vault
```

### Fly.io (Recommended)

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Create app
fly launch

# Set secrets
fly secrets set ANTHROPIC_API_KEY="sk-ant-..."
fly secrets set DATABASE_URL="postgresql://..."

# Deploy
fly deploy
```

## MCP Server (Planned)

The MCP server will expose dialogue vault functionality via the Model Context Protocol:

### Tools

- `list_threads`, `get_thread`, `create_thread`
- `list_turns`, `get_turn`, `create_turn`, `update_turn`
- `search_turns` (semantic search)
- `export_thread`, `import_thread`
- `upsert_context_pack`, `get_context_pack`

### Resources

- `vault://thread/{threadId}`
- `vault://turn/{turnId}`

## Troubleshooting

**Database connection failed:**

- Ensure Docker is running: `docker ps`
- Check PostgreSQL is healthy: `docker-compose ps`
- Verify DATABASE_URL in `.env`

**Embedding generation slow:**

- Local embeddings download model on first run (~200MB)
- Subsequent runs are fast
- Consider using OpenAI/VoyageAI for production

**Build errors:**

- Run `pnpm install` to ensure dependencies are up to date
- Clear `.turbo` cache: `rm -rf .turbo`
- Regenerate Prisma client: `pnpm db:generate`

## Architecture Notes

### Retrieval Strategy

The dialogue continuation feature uses hybrid scoring:

- **70% similarity**: Cosine similarity from pgvector
- **30% recency**: Exponential decay over 30 days
- Top-k results by combined score

This ensures relevant historical context while favoring recent turns.

### Security

- API keys are server-side only (never exposed to client)
- All inputs validated with Zod schemas
- Prisma provides SQL injection protection
- Rate limiting recommended for production

## Contributing

This is a personal spiritual practice tool. Fork for your own use.

## License

MIT

## Acknowledgments

- Built with React Router v7
- Powered by Anthropic's Claude
- Embeddings via fastembed, OpenAI, or VoyageAI
- Vector search via pgvector
