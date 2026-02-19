import { describe, expect, it } from "bun:test";
import { INPUT_SETTLER_ESCROW_LIFI, MULTICHAIN_INPUT_SETTLER_ESCROW, chainMap } from "../../config";
import { isStandardOrder, orderToIntent } from ".";
import { MultichainOrderIntent } from "./multichain";
import { StandardOrderIntent } from "./standard";
import { makeMultichainOrder, makeStandardOrder } from "../testing/orderFixtures";

describe("intent core split", () => {
	it("hydrates a standard order and keeps orderId deterministic", () => {
		const order = makeStandardOrder({
			originChainId: BigInt(chainMap.ethereum.id)
		});
		const intent = orderToIntent({
			inputSettler: INPUT_SETTLER_ESCROW_LIFI,
			order
		});

		expect(intent).toBeInstanceOf(StandardOrderIntent);
		expect(intent.inputChains()).toEqual([BigInt(chainMap.ethereum.id)]);
		expect(intent.orderId()).toBe(intent.orderId());
	});

	it("hydrates a multichain order and computes one shared orderId", () => {
		const intent = orderToIntent({
			inputSettler: MULTICHAIN_INPUT_SETTLER_ESCROW,
			order: makeMultichainOrder()
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
