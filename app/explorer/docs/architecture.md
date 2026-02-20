# Architecture (Phase 0 Baseline)

## Folder Conventions

- `src/lib/domain`: business types and deterministic logic (no network, no SvelteKit runtime dependencies).
- `src/lib/server/intent-api`: LI.FI intent-api integration (HTTP client + schemas).
- `src/lib/server/intents`: intent use-cases and repository abstractions.
- `src/routes`: pages and API route handlers only; routes depend on services, not vice versa.
- `tests/unit`: deterministic unit tests for domain logic.

## Layer Boundaries

- UI and API call into `IntentService`.
- `IntentService` depends on an `IntentRepository` interface.
- `Phase0IntentApiIntentRepository` is the current implementation.
- Phase 1 swaps repository implementation to Postgres/Goldsky while preserving route contracts.

## Evolution Plan

- Keep domain status derivation in `src/lib/domain/intents`.
- Add DB adapters under `src/lib/server/db` in Phase 1.
- Add worker jobs under `src/lib/server/workers` in Phase 1.
- Preserve API route payload shapes to avoid front-end rewrites.
