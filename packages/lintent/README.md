# Core Library

`src` is the domain layer for orders and intents.

It owns:

- Order data models and type guards.
- Intent creation and conversion logic.
- Order id and hashing logic for standard + multichain flows.
- Core validation/parsing used by higher-level libraries/screens.
- Dependency-injected domain behavior (for chain/oracle policy), without importing app config.

It does not own:

- UI behavior from app workspaces (`app/*`).
- External orchestration wrappers that live outside this package (except core parsing helpers in `api/`).

## Architecture

- `types.ts`
  - Canonical types such as `StandardOrder`, `MultichainOrder`, and `OrderContainer`.
  - Core token model is chain-id based (`token.chainId`), not chain-name based.
- `deps.ts`
  - Minimal dependency interfaces consumed by core constructors/functions.
- `intent/`
  - `create.ts`: High-level `Intent` builder.
  - `fromOrder.ts`: `orderToIntent(...)` and `isStandardOrder(...)`.
  - `standard.ts` / `multichain.ts`: Concrete intent implementations and order-id derivation.
  - `compact/*`: Compact conversions/signing/claims helpers used by intent flows.
- `orderLib.ts`
  - Validation helpers (`validateOrder...`) and output encoding/hash helpers.
  - Multi-argument helpers accept object params, e.g. `validateOrderWithReason({ order, deps })`.
- `api/intentApi.ts`
  - Normalization/parsing for intent-api payloads.
- `typedMessage.ts`
  - EIP-712 type definitions and precomputed type hashes used in compact flows.
- `helpers/` and `compact/`
  - Shared low-level helpers (conversions and compact lock/id utilities).

## Core Entry Points

Most contributors start with `intent/index.ts`:

- `orderToIntent(...)`
- `isStandardOrder(...)`
- `StandardOrderIntent`
- `MultichainOrderIntent`
- `computeStandardOrderId(...)`
- `computeMultichainEscrowOrderId(...)`
- `computeMultichainCompactOrderId(...)`
- `hashMultichainInputs(...)`

## Order Models

`OrderContainer` wraps:

- `inputSettler`
- `order` (`StandardOrder | MultichainOrder`)
- sponsor/allocator signatures

Use `isStandardOrder(...)` as the canonical discriminator for branching between single-chain and multichain order logic.

## Order Creation Flow

Typical contributor path:

1. Build an intent with `Intent` in `intent/create.ts` and inject `IntentDeps`.
2. Convert/hydrate with `orderToIntent(...)` from `intent/fromOrder.ts`.
3. Compute `orderId()` and chain-specific behavior through `StandardOrderIntent` or `MultichainOrderIntent`.

Example: create/convert and derive order id.

```ts
import { orderToIntent } from "@lifi/lintent/intent";
import type { OrderContainer } from "@lifi/lintent/types";

function getOrderId(orderContainer: OrderContainer): `0x${string}` {
  return orderToIntent(orderContainer).orderId();
}
```

Example: branch behavior by order type during creation/execution logic.

```ts
import { isStandardOrder, orderToIntent } from "@lifi/lintent/intent";
import type { OrderContainer } from "@lifi/lintent/types";

function getInputCount(orderContainer: OrderContainer): number {
  if (isStandardOrder(orderContainer.order))
    return orderContainer.order.inputs.length;
  return orderContainer.order.inputs.reduce(
    (sum, v) => sum + v.inputs.length,
    0,
  );
}

function getInputChains(orderContainer: OrderContainer): bigint[] {
  return orderToIntent(orderContainer).inputChains();
}
```

## Hashing and Typed Messages

`typedMessage.ts` defines EIP-712 type structures and verifies that computed type hashes match expected on-chain constants. Any change here can break compact claim/signature compatibility.

When touching compact hashing or typed message definitions:

- Keep encodings aligned with contracts.
- Treat hash constant changes as protocol-level changes.

## Validation and Parsing

- `orderLib.ts`
  - `validateOrderWithReason(...)`
  - `validateOrderContainerWithReason(...)`
- `api/intentApi.ts`
  - `parseOrderStatusPayload(...)`

These utilities are the core gate for normalizing and validating inbound order data before execution paths consume it.

## Dependency Model

- Core has no direct imports from app config/util modules.
- Dependencies are passed in scope at creation time (constructor/function), never via global mutable runtime.
- Keep dependencies minimal:
  - `Intent` receives `IntentDeps`.
  - Standard order validation receives `StandardOrderValidationDeps` (`{ order, deps }`).
  - Container validation receives `OrderContainerValidationDeps` (`{ orderContainer, deps }`), adding `inputSettlers` for compact input-settler policy.
  - Core-internal protocol constants live in `constants.ts`.

## Safe Change Checklist

- Use `isStandardOrder(...)` for order branching, not ad-hoc property checks.
- Keep hashing/encoding behavior stable unless you are intentionally changing protocol semantics.
- Keep core APIs chain-id based. Map app chain names to ids at app boundaries.
- Update/add tests when changing order construction, parsing, or hashing behavior.
- Run `bun run check` and relevant unit tests before merging.

## File References

- `src/types/index.ts`
- `src/intent/index.ts`
- `src/intent/create.ts`
- `src/intent/fromOrder.ts`
- `src/intent/standard.ts`
- `src/intent/multichain.ts`
- `src/output.ts`
- `src/validation.ts`
- `src/api/intentApi.ts`
- `src/typedMessage.ts`
