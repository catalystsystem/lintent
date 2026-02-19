import { describe, expect, it } from "bun:test";
import { INPUT_SETTLER_COMPACT_LIFI, MULTICHAIN_INPUT_SETTLER_COMPACT } from "../config";
import { compactClaimHash, multichainCompactClaimHash } from "./intent/compact/claims";
import { toMultichainBatchCompact, toStandardBatchCompact } from "./intent/compact/conversions";
import { compact_type_hash, compactTypes, multichain_compact_type_hash } from "./typedMessage";
import { makeMultichainOrder, makeStandardOrder } from "./testing/orderFixtures";

const HEX_32_REGEX = /^0x[0-9a-fA-F]{64}$/;

describe("typedMessage", () => {
	it("exports stable 32-byte type hashes", () => {
		expect(compact_type_hash).toMatch(HEX_32_REGEX);
		expect(multichain_compact_type_hash).toMatch(HEX_32_REGEX);
	});

	it("includes all expected compact type groups", () => {
		expect(Object.keys(compactTypes)).toEqual([
			"BatchCompact",
			"Lock",
			"Mandate",
			"MandateOutput",
			"Element",
			"MultichainCompact"
		]);
	});

	it("computes deterministic compact and multichain compact claim hashes", () => {
		const batchCompact = toStandardBatchCompact(makeStandardOrder(), INPUT_SETTLER_COMPACT_LIFI);
		const multichainCompact = toMultichainBatchCompact(
			makeMultichainOrder(),
			MULTICHAIN_INPUT_SETTLER_COMPACT
		);

		const compactHash1 = compactClaimHash(batchCompact);
		const compactHash2 = compactClaimHash(batchCompact);
		const multichainHash1 = multichainCompactClaimHash(multichainCompact);
		const multichainHash2 = multichainCompactClaimHash(multichainCompact);

		expect(compactHash1).toBe(compactHash2);
		expect(multichainHash1).toBe(multichainHash2);
		expect(compactHash1).toMatch(HEX_32_REGEX);
		expect(multichainHash1).toMatch(HEX_32_REGEX);
	});
});
