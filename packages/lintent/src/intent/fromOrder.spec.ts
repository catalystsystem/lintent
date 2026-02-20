import { describe, expect, it } from "bun:test";
import {
  INPUT_SETTLER_ESCROW_LIFI,
  MULTICHAIN_INPUT_SETTLER_ESCROW,
} from "../constants";
import { isStandardOrder, orderToIntent } from ".";
import { MultichainOrderIntent } from "./multichain";
import { StandardOrderIntent } from "./standard";
import {
  CHAIN_ID_ETHEREUM,
  makeMultichainOrder,
  makeStandardOrder,
} from "../../tests/orderFixtures";

describe("intent core split", () => {
  it("hydrates a standard order and keeps orderId deterministic", () => {
    const order = makeStandardOrder({
      originChainId: CHAIN_ID_ETHEREUM,
    });
    const intent = orderToIntent({
      inputSettler: INPUT_SETTLER_ESCROW_LIFI,
      order,
    });

    expect(intent).toBeInstanceOf(StandardOrderIntent);
    expect(intent.inputChains()).toEqual([CHAIN_ID_ETHEREUM]);
    expect(intent.orderId()).toBe(intent.orderId());
  });

  it("hydrates a multichain order and computes one shared orderId", () => {
    const intent = orderToIntent({
      inputSettler: MULTICHAIN_INPUT_SETTLER_ESCROW,
      order: makeMultichainOrder(),
    });

    expect(intent).toBeInstanceOf(MultichainOrderIntent);
    expect(intent.inputChains().length).toBe(2);
    const orderId = intent.orderId();
    expect(orderId.startsWith("0x")).toBe(true);
    expect(orderId.length).toBe(66);
  });

  it("uses originChainId as the standard-vs-multichain discriminator", () => {
    expect(isStandardOrder(makeStandardOrder())).toBe(true);
    expect(isStandardOrder(makeMultichainOrder())).toBe(false);
  });
});
