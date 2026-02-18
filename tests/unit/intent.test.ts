import { describe, expect, it } from "bun:test";
import {
	COIN_FILLER,
	INPUT_SETTLER_ESCROW_LIFI,
	MULTICHAIN_INPUT_SETTLER_ESCROW,
	chainMap
} from "../../src/lib/config";
import { addressToBytes32 } from "../../src/lib/core/helpers/convert";
import { orderToIntent } from "../../src/lib/core/intent";
import type { MandateOutput, MultichainOrder, StandardOrder } from "../../src/lib/core/types";

const b32 = (byte: string) => `0x${byte.repeat(64)}` as `0x${string}`;

function makeOutput(chain: keyof typeof chainMap, amount = 1n): MandateOutput {
	return {
		oracle: addressToBytes32(COIN_FILLER),
		settler: addressToBytes32(COIN_FILLER),
		chainId: BigInt(chainMap[chain].id),
		token: b32("3"),
		amount,
		recipient: b32("4"),
		callbackData: "0x",
		context: "0x"
	};
}

describe("intent core split", () => {
	it("hydrates a standard order and keeps orderId deterministic", () => {
		const order: StandardOrder = {
			user: "0x1111111111111111111111111111111111111111",
			nonce: 1n,
			originChainId: BigInt(chainMap.ethereum.id),
			expires: Math.floor(Date.now() / 1000) + 1000,
			fillDeadline: Math.floor(Date.now() / 1000) + 900,
			inputOracle: COIN_FILLER,
			inputs: [[1n, 1n]],
			outputs: [makeOutput("arbitrum")]
		};

		const intent = orderToIntent({
			inputSettler: INPUT_SETTLER_ESCROW_LIFI,
			order
		});

		expect(intent.inputChains()).toEqual([BigInt(chainMap.ethereum.id)]);
		expect(intent.orderId()).toBe(intent.orderId());
	});

	it("hydrates a multichain order and computes one shared orderId", () => {
		const order: MultichainOrder = {
			user: "0x1111111111111111111111111111111111111111",
			nonce: 2n,
			expires: Math.floor(Date.now() / 1000) + 1000,
			fillDeadline: Math.floor(Date.now() / 1000) + 900,
			inputOracle: COIN_FILLER,
			outputs: [makeOutput("base", 2n)],
			inputs: [
				{ chainId: BigInt(chainMap.ethereum.id), inputs: [[1n, 1n]] },
				{ chainId: BigInt(chainMap.arbitrum.id), inputs: [[2n, 2n]] }
			]
		};

		const intent = orderToIntent({
			inputSettler: MULTICHAIN_INPUT_SETTLER_ESCROW,
			order
		});

		expect(intent.inputChains().length).toBe(2);
		const orderId = intent.orderId();
		expect(orderId.startsWith("0x")).toBe(true);
		expect(orderId.length).toBe(66);
	});
});
