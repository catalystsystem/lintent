# Core Library

`src/lib/core` is the domain layer for orders and intents.

It owns:

- Order data models and type guards.
- Intent creation and conversion logic.
- Order id and hashing logic for standard + multichain flows.
- Core validation/parsing used by higher-level libraries/screens.

It does not own:

- UI behavior (`src/lib/screens`, `src/lib/components`).
- External orchestration wrappers in `src/lib/libraries` (except core parsing helpers in `api/`).

## Architecture

- `types.ts`
  - Canonical types such as `StandardOrder`, `MultichainOrder`, and `OrderContainer`.
- `intent/`
  - `create.ts`: High-level `Intent` builder.
  - `fromOrder.ts`: `orderToIntent(...)` and `isStandardOrder(...)`.
  - `standard.ts` / `multichain.ts`: Concrete intent implementations and order-id derivation.
  - `compact/*`: Compact conversions/signing/claims helpers used by intent flows.
- `orderLib.ts`
  - Validation and output encoding/hash helpers.
- `api/orderServer.ts`
  - Normalization/parsing for order server payloads.
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

1. Build an intent with `Intent` in `intent/create.ts`.
2. Convert/hydrate with `orderToIntent(...)` from `intent/fromOrder.ts`.
3. Compute `orderId()` and chain-specific behavior through `StandardOrderIntent` or `MultichainOrderIntent`.

Example: create/convert and derive order id.

```ts
import { orderToIntent } from "$lib/core/intent";
import type { OrderContainer } from "$lib/core/types";

function getOrderId(orderContainer: OrderContainer): `0x${string}` {
	return orderToIntent(orderContainer).orderId();
}
```

Example: branch behavior by order type during creation/execution logic.

```ts
import { isStandardOrder, orderToIntent } from "$lib/core/intent";
import type { OrderContainer } from "$lib/core/types";

function getInputCount(orderContainer: OrderContainer): number {
	if (isStandardOrder(orderContainer.order)) return orderContainer.order.inputs.length;
	return orderContainer.order.inputs.reduce((sum, v) => sum + v.inputs.length, 0);
}

function getInputChains(orderContainer: OrderContainer): bigint[] {
	return orderToIntent(orderContainer).inputChains();
}
```

## Hashing and Typed Messages

`core/typedMessage.ts` defines EIP-712 type structures and verifies that computed type hashes match expected on-chain constants. Any change here can break compact claim/signature compatibility.

When touching compact hashing or typed message definitions:

- Keep encodings aligned with contracts.
- Treat hash constant changes as protocol-level changes.

## Validation and Parsing

- `orderLib.ts`
  - `validateOrderWithReason(...)`
  - `validateOrderContainerWithReason(...)`
- `api/orderServer.ts`
  - `parseOrderStatusPayload(...)`

These utilities are the core gate for normalizing and validating inbound order data before execution paths consume it.

## Safe Change Checklist

- Use `isStandardOrder(...)` for order branching, not ad-hoc property checks.
- Keep hashing/encoding behavior stable unless you are intentionally changing protocol semantics.
- Update/add tests when changing order construction, parsing, or hashing behavior.
- Run `bun run check` and relevant unit tests before merging.

## File References

- `src/lib/core/types.ts`
- `src/lib/core/intent/index.ts`
- `src/lib/core/intent/create.ts`
- `src/lib/core/intent/fromOrder.ts`
- `src/lib/core/intent/standard.ts`
- `src/lib/core/intent/multichain.ts`
- `src/lib/core/orderLib.ts`
- `src/lib/core/api/orderServer.ts`
- `src/lib/core/typedMessage.ts`
