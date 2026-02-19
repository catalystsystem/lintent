# LI.FI Intent Standalone Explorer

Phase 0 scaffold for the LI.FI Intent Standalone Explorer.

## Stack

- Bun runtime
- SvelteKit + TypeScript (strict)
- Order server proxy (Phase 0 data source)

## Quick Start

1. Install dependencies:

```bash
bun install
```

2. Copy environment variables:

```bash
cp .env.example .env
```

3. Run dev server:

```bash
bun run dev
```

## Current Scope

- SSR list page at `/`
- SSR detail page at `/intent/[orderId]`
- Server API routes:
  - `GET /api/intents`
  - `GET /api/intents/[orderId]`
  - `GET /api/intents/search?q=...`

## Architecture

See `docs/architecture.md` for folder conventions and boundaries.
