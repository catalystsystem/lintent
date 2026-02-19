import { describe, expect, it } from "bun:test";
import { toId } from "./idLib";

const CHECKSUMMED_TOKEN = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const LOWERCASE_TOKEN = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";

describe("idLib.toId", () => {
	it("returns deterministic lock ids for identical inputs", () => {
		const id1 = toId(true, 0, "1", CHECKSUMMED_TOKEN);
		const id2 = toId(true, 0, "1", CHECKSUMMED_TOKEN);
		expect(id1).toBe(id2);
	});

	it("sets scope bit based on inputChains flag", () => {
		const multichainId = toId(true, 0, "1", CHECKSUMMED_TOKEN);
		const singlechainId = toId(false, 0, "1", CHECKSUMMED_TOKEN);

		expect((multichainId >> 255n) & 1n).toBe(0n);
		expect((singlechainId >> 255n) & 1n).toBe(1n);
	});

	it("normalizes token addresses regardless of checksum casing", () => {
		const checksummed = toId(true, 0, "1", CHECKSUMMED_TOKEN);
		const lowercase = toId(true, 0, "1", LOWERCASE_TOKEN);
		expect(checksummed).toBe(lowercase);
	});

	it("throws for reset period outside [0, 7]", () => {
		expect(() => toId(true, -1, "1", CHECKSUMMED_TOKEN)).toThrow(
			"Reset period must be between 0 and 7"
		);
		expect(() => toId(true, 8, "1", CHECKSUMMED_TOKEN)).toThrow(
			"Reset period must be between 0 and 7"
		);
	});

	it("throws when allocator id does not fit in 92 bits", () => {
		const tooLargeAllocator = (1n << 92n).toString();
		expect(() => toId(true, 0, tooLargeAllocator, CHECKSUMMED_TOKEN)).toThrow(
			"AllocatorId must fit in 92 bits"
		);
	});
});
