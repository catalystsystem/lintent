import { describe, expect, it } from "bun:test";
import { COIN_FILLER } from "../../src/lib/core/constants";
import { addressToBytes32 } from "../../src/lib/core/helpers/convert";
import { VALIDATION_ERRORS, createOrderValidator } from "../../src/lib/core/orderLib";
import { makeMandateOutput, makeStandardOrder } from "../../src/lib/core/testing/orderFixtures";
import { orderValidationDeps } from "../../src/lib/libraries/coreDeps";

const orderValidator = createOrderValidator(orderValidationDeps);

describe("orderValidationDeps unknown-chain handling", () => {
	it("rejects unsupported origin chains even when same-chain fill uses COIN_FILLER", () => {
		const unknownChainId = 999999999n;
		const result = orderValidator.validateOrderWithReason(
			makeStandardOrder({
				originChainId: unknownChainId,
				inputOracle: COIN_FILLER,
				outputs: [
					makeMandateOutput(unknownChainId, 1n, {
						oracle: addressToBytes32(COIN_FILLER),
						settler: addressToBytes32(COIN_FILLER),
						context: "0x00"
					})
				]
			})
		);

		expect(result.passed).toBe(false);
		expect(result.reason).toBe(VALIDATION_ERRORS.UNKNOWN_ORIGIN_CHAIN);
	});

	it("rejects unsupported output chains instead of treating them as COIN_FILLER-only", () => {
		const unknownChainId = 999999999n;
		const result = orderValidator.validateOrderWithReason(
			makeStandardOrder({
				outputs: [
					makeMandateOutput(unknownChainId, 1n, {
						oracle: addressToBytes32(COIN_FILLER),
						settler: addressToBytes32(COIN_FILLER),
						context: "0x00"
					})
				]
			})
		);

		expect(result.passed).toBe(false);
		expect(result.reason).toBe(VALIDATION_ERRORS.UNKNOWN_OUTPUT_CHAIN);
	});
});
