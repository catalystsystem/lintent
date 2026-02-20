import { describe, expect, it } from "bun:test";
import {
  INPUT_SETTLER_COMPACT_LIFI,
  INPUT_SETTLER_ESCROW_LIFI,
} from "../constants";
import { compactClaimHash as computeCompactClaimHash } from "./compact/claims";
import { toStandardBatchCompact } from "./compact/conversions";
import { computeStandardOrderId, StandardOrderIntent } from "./standard";
import { makeStandardOrder } from "../../tests/orderFixtures";
import type { StandardOrder } from "../types";

function expectBytes32Hex(value: `0x${string}`) {
  expect(value.startsWith("0x")).toBe(true);
  expect(value.length).toBe(66);
}

describe("standard intent", () => {
  describe("computeStandardOrderId", () => {
    it("is deterministic for identical inputs", () => {
      const order = makeStandardOrder();
      const id1 = computeStandardOrderId(INPUT_SETTLER_ESCROW_LIFI, order);
      const id2 = computeStandardOrderId(INPUT_SETTLER_ESCROW_LIFI, order);

      expect(id1).toBe(id2);
      expectBytes32Hex(id1);
    });

    it("changes when inputSettler changes", () => {
      const order = makeStandardOrder();
      const id1 = computeStandardOrderId(INPUT_SETTLER_ESCROW_LIFI, order);
      const id2 = computeStandardOrderId(INPUT_SETTLER_COMPACT_LIFI, order);

      expect(id1).not.toBe(id2);
    });

    it("changes when order-id fields change", () => {
      const baseOrder = makeStandardOrder();
      const baseId = computeStandardOrderId(
        INPUT_SETTLER_ESCROW_LIFI,
        baseOrder,
      );

      const mutations: {
        name: string;
        mutate: (order: StandardOrder) => StandardOrder;
      }[] = [
        {
          name: "originChainId",
          mutate: (order) => ({
            ...order,
            originChainId: order.originChainId + 1n,
          }),
        },
        {
          name: "user",
          mutate: (order) => ({
            ...order,
            user: "0x2222222222222222222222222222222222222222",
          }),
        },
        {
          name: "nonce",
          mutate: (order) => ({
            ...order,
            nonce: order.nonce + 1n,
          }),
        },
        {
          name: "expires",
          mutate: (order) => ({
            ...order,
            expires: order.expires + 1,
          }),
        },
        {
          name: "fillDeadline",
          mutate: (order) => ({
            ...order,
            fillDeadline: order.fillDeadline + 1,
          }),
        },
        {
          name: "inputOracle",
          mutate: (order) => ({
            ...order,
            inputOracle: "0x0000000000000000000000000000000000000001",
          }),
        },
        {
          name: "inputs",
          mutate: (order) => ({
            ...order,
            inputs: [[order.inputs[0][0], order.inputs[0][1] + 1n]],
          }),
        },
        {
          name: "outputs",
          mutate: (order) => ({
            ...order,
            outputs: [
              { ...order.outputs[0], amount: order.outputs[0].amount + 1n },
            ],
          }),
        },
      ];

      for (const mutation of mutations) {
        const mutatedOrder = mutation.mutate(baseOrder);
        const mutatedId = computeStandardOrderId(
          INPUT_SETTLER_ESCROW_LIFI,
          mutatedOrder,
        );
        expect(mutatedId).not.toBe(baseId);
      }
    });
  });

  describe("StandardOrderIntent", () => {
    it("returns the original order from accessor methods", () => {
      const order = makeStandardOrder();
      const intent = new StandardOrderIntent(INPUT_SETTLER_ESCROW_LIFI, order);

      expect(intent.asOrder()).toBe(order);
      expect(intent.asStandardOrder()).toBe(order);
    });

    it("returns the origin chain as the only input chain", () => {
      const order = makeStandardOrder();
      const intent = new StandardOrderIntent(INPUT_SETTLER_ESCROW_LIFI, order);

      expect(intent.inputChains()).toEqual([order.originChainId]);
    });

    it("computes a deterministic orderId from its current state", () => {
      const order = makeStandardOrder();
      const intent = new StandardOrderIntent(INPUT_SETTLER_ESCROW_LIFI, order);
      const id1 = intent.orderId();
      const id2 = intent.orderId();

      expect(id1).toBe(id2);
      expect(id1).toBe(
        computeStandardOrderId(INPUT_SETTLER_ESCROW_LIFI, order),
      );
      expectBytes32Hex(id1);
    });

    it("asBatchCompact maps order fields and uses compact arbiter constant", () => {
      const order = makeStandardOrder();
      const intent = new StandardOrderIntent(INPUT_SETTLER_ESCROW_LIFI, order);
      const batch = intent.asBatchCompact();
      const expected = toStandardBatchCompact(
        order,
        INPUT_SETTLER_COMPACT_LIFI,
      );

      expect(batch).toEqual(expected);
      expect(batch.arbiter).toBe(INPUT_SETTLER_COMPACT_LIFI);
    });

    it("compactClaimHash matches claim hash of asBatchCompact and is deterministic", () => {
      const order = makeStandardOrder();
      const intent = new StandardOrderIntent(INPUT_SETTLER_ESCROW_LIFI, order);
      const claimHash1 = intent.compactClaimHash();
      const claimHash2 = intent.compactClaimHash();
      const expected = computeCompactClaimHash(intent.asBatchCompact());

      expect(claimHash1).toBe(claimHash2);
      expect(claimHash1).toBe(expected);
      expectBytes32Hex(claimHash1);
    });

    it("compactClaimHash changes when commitments or mandate fields change", () => {
      const baseOrder = makeStandardOrder();
      const baseIntent = new StandardOrderIntent(
        INPUT_SETTLER_ESCROW_LIFI,
        baseOrder,
      );
      const changedIntent = new StandardOrderIntent(
        INPUT_SETTLER_ESCROW_LIFI,
        makeStandardOrder({
          outputs: [
            {
              ...baseOrder.outputs[0],
              amount: baseOrder.outputs[0].amount + 1n,
            },
          ],
        }),
      );

      expect(changedIntent.compactClaimHash()).not.toBe(
        baseIntent.compactClaimHash(),
      );
    });
  });
});
