# lintent Monorepo

This repository contains three projects:

- [Issue Intent App](./app/issue-intent/README.md) (`app/issue-intent`)
  - Main LI.FI intent app for issuance, fill, prove, and claim flows.
- [Intent Explorer](./app/explorer/README.md) (`app/explorer`)
  - Standalone explorer for listing/searching intent/order data.
- [lintent Core Package](./packages/lintent/README.md) (`packages/lintent`)
  - Shared domain library for order/intent types, hashing, validation, and parsing.

## Workspace Commands

Run from repo root:

- `bun install`
- `bun run check`
- `bun run test`
- `bun run build`

## Direct Project Commands

- `bun run --cwd app/issue-intent dev`
- `bun run --cwd app/explorer dev`
- `bun run --cwd packages/lintent test`
