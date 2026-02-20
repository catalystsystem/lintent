import { describe, expect, it } from "bun:test";
import { encodePacked, keccak256 } from "viem";
import {
  MULTICHAIN_INPUT_SETTLER_COMPACT,
  MULTICHAIN_INPUT_SETTLER_ESCROW,
} from "../constants";
import { ResetPeriod } from "../compact/idLib";
import {
  constructInputHash,
  hashMultichainInputs,
  MultichainOrderIntent,
} from "./multichain";
import { b32, makeMultichainOrder } from "../../tests/orderFixtures";

function expectBytes32Hex(value: `0x${string}`) {
  expect(value.startsWith("0x")).toBe(true);
  expect(value.length).toBe(66);
}

describe("multichain intent", () => {
  describe("hash helpers", () => {
    it("hashMultichainInputs is deterministic and sensitive to input amounts", () => {
      const h1 = hashMultichainInputs(1n, [[1n, 10n]]);
      const h2 = hashMultichainInputs(1n, [[1n, 10n]]);
      const h3 = hashMultichainInputs(1n, [[1n, 11n]]);

      expect(h1).toBe(h2);
      expect(h1).not.toBe(h3);
      expectBytes32Hex(h1);
    });

    it("constructInputHash builds expected claim structure and validates chain index", () => {
      const additionalChains = [b32("a"), b32("b")];
      const inputHash = hashMultichainInputs(1n, [[1n, 10n]]);
      const expected = keccak256(
        encodePacked(
          ["bytes32[]"],
          [[additionalChains[0], inputHash, additionalChains[1]]],
        ),
      );

      expect(constructInputHash(1n, 1n, [[1n, 10n]], additionalChains)).toBe(
        expected,
      );
      expect(() =>
        constructInputHash(1n, 3n, [[1n, 10n]], additionalChains),
      ).toThrow("ChainIndexOutOfRange");
    });
  });

  describe("MultichainOrderIntent", () => {
    it("returns the original multichain order from asOrder", () => {
      const order = makeMultichainOrder();
      const intent = new MultichainOrderIntent(
        MULTICHAIN_INPUT_SETTLER_ESCROW,
        order,
        { type: "escrow" },
      );

      expect(intent.asOrder()).toBe(order);
      expect(intent.inputChains().length).toBe(2);
    });

    it("builds components for every input chain and computes a stable escrow order id", () => {
      const order = makeMultichainOrder();
      const intent = new MultichainOrderIntent(
        MULTICHAIN_INPUT_SETTLER_ESCROW,
        order,
        {
          type: "escrow",
        },
      );
      const components = intent.asComponents();

      expect(components.length).toBe(order.inputs.length);
      expect(components[0].orderComponent.chainIndex).toBe(0n);
      expect(components[1].orderComponent.chainIndex).toBe(1n);
      expect(components[0].orderComponent.additionalChains.length).toBe(1);
      expect(components[1].orderComponent.additionalChains.length).toBe(1);

      const orderId1 = intent.orderId();
      const orderId2 = intent.orderId();
      expect(orderId1).toBe(orderId2);
      expectBytes32Hex(orderId1);
    });

    it("computes compact multichain order ids and uses compact secondaries layout", () => {
      const order = makeMultichainOrder();
      const intent = new MultichainOrderIntent(
        MULTICHAIN_INPUT_SETTLER_COMPACT,
        order,
        {
          type: "compact",
          resetPeriod: ResetPeriod.OneSecond,
          allocatorId: "1",
        },
      );
      const components = intent.asComponents();
      const compactOrderId = intent.orderId();

      expect(components.length).toBe(order.inputs.length);
      expect(
        components.every(
          (component) =>
            component.orderComponent.chainIdField === order.inputs[0].chainId,
        ),
      ).toBe(true);
      expectBytes32Hex(compactOrderId);
    });
  });
});
