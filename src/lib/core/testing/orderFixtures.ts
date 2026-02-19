import { COIN_FILLER, POLYMER_ORACLE, chainMap, type chain } from "../../config";
import { addressToBytes32 } from "../helpers/convert";
import type { MandateOutput, MultichainOrder, StandardOrder } from "../types";

export const TEST_USER = "0x1111111111111111111111111111111111111111" as const;
export const TEST_NOW_SECONDS = 1_700_000_000;

export const b32 = (nibble: string) => `0x${nibble.repeat(64)}` as `0x${string}`;

export function makeMandateOutput(
	chainName: chain = "arbitrum",
	amount: bigint = 1n,
	overrides: Partial<MandateOutput> = {}
): MandateOutput {
	return {
		oracle: addressToBytes32(COIN_FILLER),
		settler: addressToBytes32(COIN_FILLER),
		chainId: BigInt(chainMap[chainName].id),
		token: b32("3"),
		amount,
		recipient: b32("4"),
		callbackData: "0x",
		context: "0x",
		...overrides
	};
}

export function makeStandardOrder(overrides: Partial<StandardOrder> = {}): StandardOrder {
	return {
		user: TEST_USER,
		nonce: 1n,
		originChainId: BigInt(chainMap.ethereum.id),
		expires: TEST_NOW_SECONDS + 1000,
		fillDeadline: TEST_NOW_SECONDS + 900,
		inputOracle: POLYMER_ORACLE.ethereum,
		inputs: [[1n, 1n]],
		outputs: [makeMandateOutput("arbitrum")],
		...overrides
	};
}

export function makeMultichainOrder(overrides: Partial<MultichainOrder> = {}): MultichainOrder {
	return {
		user: TEST_USER,
		nonce: 2n,
		expires: TEST_NOW_SECONDS + 1000,
		fillDeadline: TEST_NOW_SECONDS + 900,
		inputOracle: POLYMER_ORACLE.ethereum,
		outputs: [makeMandateOutput("base", 2n)],
		inputs: [
			{ chainId: BigInt(chainMap.ethereum.id), inputs: [[1n, 1n]] },
			{ chainId: BigInt(chainMap.arbitrum.id), inputs: [[2n, 2n]] }
		],
		...overrides
	};
}
