import { describe, expect, it } from "bun:test";
import { toHex } from "viem";
import { tokenIdToLock } from "./conversions";

describe("compact conversions", () => {
	it("splits tokenId into lockTag and token without corrupting hex boundaries", () => {
		const tokenId = BigInt("0x112233445566778899aabbcc00112233445566778899aabbccddeeff00112233");
		const amount = 42n;
		const lock = tokenIdToLock(tokenId, amount);
		const raw = toHex(tokenId, { size: 32 }).slice(2);

		expect(lock.amount).toBe(amount);
		expect(lock.lockTag).toMatch(/^0x[0-9a-fA-F]{24}$/);
		expect(lock.token).toMatch(/^0x[0-9a-fA-F]{40}$/);
		expect(lock.lockTag.startsWith("0x0x")).toBe(false);
		expect(`${lock.lockTag.slice(2)}${lock.token.slice(2)}`).toBe(raw);
	});
});
