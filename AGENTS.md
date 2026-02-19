# Repository Guidelines

## Monorepo Structure & Ownership

- This repo is a Bun workspace monorepo with:
  - `app/issue-intent`: primary intent issuance/fill/prove/claim app (SvelteKit, Cloudflare adapter).
  - `app/explorer`: standalone intent explorer (SvelteKit, Node adapter).
  - `packages/lintent`: shared domain/core library published as `@lifi/lintent`.
- Root workspace wiring is defined in `package.json` (`workspaces: ["app/*", "packages/*"]`).
- Legacy note: references to `src/lib/core` are pre-monorepo. The core domain layer now lives in `packages/lintent/src`.

### `app/issue-intent`

- App routes: `app/issue-intent/src/routes/` (UI entry: `+page.svelte`).
- Scroll flow screens: `app/issue-intent/src/lib/screens/`.
- UI + helpers + state: `app/issue-intent/src/lib/components/`, `app/issue-intent/src/lib/utils/`, `app/issue-intent/src/lib/state.svelte.ts`.
- External orchestration wrappers: `app/issue-intent/src/lib/libraries/`.
- App DB and migrations: `app/issue-intent/src/lib/db.ts`, `app/issue-intent/src/lib/schema.ts`, `app/issue-intent/drizzle/`.

### `app/explorer`

- Route/UI surface: `app/explorer/src/routes/` (SSR list/detail pages and API routes).
- Domain logic (no network/runtime coupling): `app/explorer/src/lib/domain/`.
- Server integrations/services: `app/explorer/src/lib/server/order-server/`, `app/explorer/src/lib/server/intents/`.
- Shared helpers: `app/explorer/src/lib/shared/`.

### `packages/lintent` (Core Library)

- Canonical order/intent types and conversion/hydration flow: `packages/lintent/src/types.ts`, `packages/lintent/src/intent/`.
- Hashing/id/validation/parsing utilities: `packages/lintent/src/orderLib.ts`, `packages/lintent/src/typedMessage.ts`, `packages/lintent/src/api/orderServer.ts`.
- Compact and helper modules: `packages/lintent/src/compact/`, `packages/lintent/src/helpers/`.
- Keep protocol/domain logic here; keep app-level orchestration in `app/*`.

## Build, Test, and Development Commands

Use `bun` for all workflows.

### Root (run from repo root)

- `bun install`
- `bun run check` (runs checks for package + explorer + issue-intent)
- `bun run test` (runs package tests, explorer tests, and issue-intent unit tests)
- `bun run build` (build/typecheck across workspaces)

### Workspace Commands

- Issue intent app:
  - `bun run --cwd app/issue-intent dev`
  - `bun run --cwd app/issue-intent check`
  - `bun run --cwd app/issue-intent lint`
  - `bun run --cwd app/issue-intent format`
  - `bun run --cwd app/issue-intent test:unit`
  - `bun run --cwd app/issue-intent test:e2e`
  - `bun run --cwd app/issue-intent migrate`
- Explorer app:
  - `bun run --cwd app/explorer dev`
  - `bun run --cwd app/explorer check`
  - `bun run --cwd app/explorer test`
- Core package:
  - `bun run --cwd packages/lintent check`
  - `bun run --cwd packages/lintent test`
  - `bun run --cwd packages/lintent build`

## Coding Style & Naming Conventions

- Prefer TypeScript in all workspaces (`.ts`, `.svelte` with `lang="ts"` where applicable).
- `app/issue-intent` enforces formatting/linting via Prettier + ESLint (`bun run --cwd app/issue-intent format` / `lint`).
- Follow existing file naming patterns:
  - Package tests generally use `*.spec.ts`.
  - App tests generally use `*.test.ts`.
- Keep route files focused on composition/transport; move deterministic logic to domain modules.
- Use `@lifi/lintent` interfaces/types in apps instead of duplicating order/intent domain types.

## Testing Guidelines

- Baseline gate before merge:
  - `bun run check`
  - `bun run test`
- For issue-intent browser flows, run E2E explicitly:
  - `bun run --cwd app/issue-intent test:e2e`
- When changing hashing, typed messages, order parsing, or order-id behavior, update/add tests in `packages/lintent/src/**/*.spec.ts`.
- Keep tests close to the changed feature and deterministic where possible.

## Commit & Pull Request Guidelines

- Keep commit messages short, imperative, and capitalized (for example: `Fix build errors`, `Add explorer repository adapter`).
- PRs should include:
  - concise change summary
  - commands run for verification
  - screenshots for UI changes (`app/issue-intent` or `app/explorer`)
  - linked issue/context when available

## Configuration & Environment

- Issue intent app:
  - copy `app/issue-intent/.env.example` to `app/issue-intent/.env`
  - for E2E, copy `app/issue-intent/.env.e2e.example` to `app/issue-intent/.env.e2e`
  - Cloudflare deployment config: `app/issue-intent/svelte.config.js`, `app/issue-intent/wrangler.jsonc`
- Explorer app:
  - copy `app/explorer/.env.example` to `app/explorer/.env`
  - key server envs include `ORDER_SERVER_BASE_URL` and `ORDER_SERVER_TIMEOUT_MS`
- Root `.gitignore` allows checked-in examples (`.env.example`, `.env.e2e.example`) while ignoring local `.env*` files.
