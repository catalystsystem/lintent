import { describe, expect, it } from "bun:test";
import {
	COIN_FILLER,
	INPUT_SETTLER_COMPACT_LIFI,
	POLYMER_ORACLE,
	chainMap
} from "../../src/lib/config";
import {
	getOutputHash,
	validateOrder,
	validateOrderContainer,
	validateOrderWithReason,
	VALIDATION_ERRORS
} from "../../src/lib/core/orderLib";
import { addressToBytes32 } from "../../src/lib/core/helpers/convert";
import type { MandateOutput, OrderContainer, StandardOrder } from "../../src/lib/core/types";

const b32 = (byte: string) => `0x${byte.repeat(64)}` as `0x${string}`;

const output: MandateOutput = {
	oracle: addressToBytes32(COIN_FILLER),
	settler: addressToBytes32(COIN_FILLER),
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
		inputOracle: POLYMER_ORACLE.ethereum,
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

	it("rejects orders where fillDeadline is later than expires", () => {
		const invalidTiming = makeOrder({
			expires: Math.floor(Date.now() / 1000) + 1000,
			fillDeadline: Math.floor(Date.now() / 1000) + 1001
		});
		const result = validateOrderWithReason(invalidTiming);
		expect(result.passed).toBe(false);
		expect(result.reason).toBe(VALIDATION_ERRORS.FILL_DEADLINE_AFTER_EXPIRES);
	});

	it("accepts orders with multiple outputs", () => {
		const multiOutput = makeOrder({ outputs: [output, { ...output, amount: 2n }] });
		expect(validateOrder(multiOutput)).toBe(true);
	});

	it("rejects orders with unknown source oracle", () => {
		const invalidOracle = makeOrder({
			inputOracle: "0x0000000000000000000000000000000000000001"
		});
		const result = validateOrderWithReason(invalidOracle);
		expect(result.passed).toBe(false);
		expect(result.reason).toBe(VALIDATION_ERRORS.INPUT_ORACLE_NOT_ALLOWED);
	});

	it("accepts same-chain intents with COIN_FILLER as inputOracle", () => {
		const sameChainCoinFiller = makeOrder({
			inputOracle: COIN_FILLER,
			outputs: [{ ...output, chainId: BigInt(chainMap.ethereum.id) }]
		});
		expect(validateOrder(sameChainCoinFiller)).toBe(true);
	});

	it("rejects orders with empty inputs", () => {
		const emptyInputs = makeOrder({ inputs: [] });
		const result = validateOrderWithReason(emptyInputs);
		expect(result.passed).toBe(false);
		expect(result.reason).toBe(VALIDATION_ERRORS.NO_INPUTS);
	});

	it("accepts orders with zero output amount", () => {
		const zeroOutputAmount = makeOrder({
			outputs: [{ ...output, amount: 0n }]
		});
		expect(validateOrder(zeroOutputAmount)).toBe(true);
	});

	it("rejects orders with negative output amount", () => {
		const negativeOutputAmount = makeOrder({
			outputs: [{ ...output, amount: -1n }]
		});
		const result = validateOrderWithReason(negativeOutputAmount);
		expect(result.passed).toBe(false);
		expect(result.reason).toBe(VALIDATION_ERRORS.OUTPUT_AMOUNT_NON_POSITIVE);
	});

	it("rejects orders with unknown output chain", () => {
		const badOutputChain = makeOrder({
			outputs: [{ ...output, chainId: 999999999n }]
		});
		const result = validateOrderWithReason(badOutputChain);
		expect(result.passed).toBe(false);
		expect(result.reason).toBe(VALIDATION_ERRORS.UNKNOWN_OUTPUT_CHAIN);
	});

	it("rejects orders with non-whitelisted output oracle", () => {
		const badOutputOracle = makeOrder({
			outputs: [{ ...output, oracle: b32("a") }]
		});
		const result = validateOrderWithReason(badOutputOracle);
		expect(result.passed).toBe(false);
		expect(result.reason).toBe(VALIDATION_ERRORS.INVALID_OUTPUT_ORACLE);
	});

	it("rejects orders with non-whitelisted output settler", () => {
		const badOutputSettler = makeOrder({
			outputs: [{ ...output, settler: b32("b") }]
		});
		const result = validateOrderWithReason(badOutputSettler);
		expect(result.passed).toBe(false);
		expect(result.reason).toBe(VALIDATION_ERRORS.INVALID_OUTPUT_SETTLER);
	});

	it("treats compact intents as valid in container validator (TODO path)", () => {
		const compactContainer: OrderContainer = {
			inputSettler: INPUT_SETTLER_COMPACT_LIFI,
			order: makeOrder({
				inputOracle: "0x0000000000000000000000000000000000000001"
			}),
			sponsorSignature: { type: "None", payload: "0x" },
			allocatorSignature: { type: "None", payload: "0x" }
		};
		expect(validateOrderContainer(compactContainer)).toBe(true);
	});
});
