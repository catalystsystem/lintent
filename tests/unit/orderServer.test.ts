import { describe, expect, it } from "bun:test";
import { parseOrderStatusPayload } from "../../src/lib/libraries/orderServer";

const BYTES32_ONE = "0x0000000000000000000000000000000000000000000000000000000000000001" as const;

describe("parseOrderStatusPayload", () => {
	it("parses a status payload into an OrderContainer", () => {
		const payload = {
			data: {
				order: {
					user: "0x1111111111111111111111111111111111111111",
					nonce: "123",
					originChainId: "8453",
					expires: Math.floor(Date.now() / 1000) + 3600,
					fillDeadline: Math.floor(Date.now() / 1000) + 1800,
					inputOracle: "0x0000000000000000000000000000000000000001",
					inputs: [["1", "1000000"]],
					outputs: [
						{
							oracle: BYTES32_ONE,
							settler: BYTES32_ONE,
							chainId: "42161",
							token: BYTES32_ONE,
							amount: "1000000",
							recipient: BYTES32_ONE,
							callbackData: "0x",
							context: "0x"
						}
					]
				},
				inputSettler: "0x000025c3226C00B2Cdc200005a1600509f4e00C0",
				sponsorSignature: null,
				allocatorSignature: "0x1234"
			}
		};

		const parsed = parseOrderStatusPayload(payload);

		expect(parsed.inputSettler).toBe("0x000025c3226C00B2Cdc200005a1600509f4e00C0");
		expect(parsed.order.nonce).toBe(123n);
		expect("originChainId" in parsed.order && parsed.order.originChainId).toBe(8453n);
		expect(parsed.sponsorSignature).toEqual({ type: "None", payload: "0x" });
		expect(parsed.allocatorSignature).toEqual({ type: "ECDSA", payload: "0x1234" });
	});

	it("throws for invalid payload", () => {
		expect(() => parseOrderStatusPayload({ data: {} })).toThrow();
	});
});
