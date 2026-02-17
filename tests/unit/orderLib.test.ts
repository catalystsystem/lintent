import { describe, expect, it } from "bun:test";
import { chainMap } from "../../src/lib/config";
import { getOutputHash, validateOrder } from "../../src/lib/utils/orderLib";
import type { MandateOutput, StandardOrder } from "../../src/types";

const b32 = (byte: string) => `0x${byte.repeat(64)}` as `0x${string}`;

const output: MandateOutput = {
	oracle: b32("1"),
	settler: b32("2"),
	chainId: BigInt(chainMap.arbitrum.id),
	token: b32("3"),
	amount: 1n,
	recipient: b32("4"),
	callbackData: "0x",
	context: "0x00"
};

function makeOrder(overrides: Partial<StandardOrder> = {}): StandardOrder {
	return {
		user: "0x1111111111111111111111111111111111111111",
		nonce: 1n,
		originChainId: BigInt(chainMap.ethereum.id),
		expires: Math.floor(Date.now() / 1000) + 1000,
		fillDeadline: Math.floor(Date.now() / 1000) + 1000,
		inputOracle: "0x0000000000000000000000000000000000000001",
		inputs: [[1n, 1n]],
		outputs: [output],
		...overrides
	};
}

describe("orderLib", () => {
	it("produces stable output hashes", () => {
		const h1 = getOutputHash(output);
		const h2 = getOutputHash(output);
		expect(h1).toBe(h2);
	});

	it("changes hash when output amount changes", () => {
		const h1 = getOutputHash(output);
		const h2 = getOutputHash({ ...output, amount: output.amount + 1n });
		expect(h1).not.toBe(h2);
	});

	it("rejects expired orders", () => {
		const expired = makeOrder({
			expires: Math.floor(Date.now() / 1000) - 1,
			fillDeadline: Math.floor(Date.now() / 1000) - 1
		});
		expect(validateOrder(expired)).toBe(false);
	});

	it("rejects orders with multiple outputs", () => {
		const multiOutput = makeOrder({ outputs: [output, { ...output, amount: 2n }] });
		expect(validateOrder(multiOutput)).toBe(false);
	});
});
