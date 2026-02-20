import { encodeAbiParameters, encodePacked, keccak256, parseAbiParameters } from "viem";
import type { MandateOutput, MultichainOrder, StandardOrder } from "../../types";
import { type chain, chainMap, POLYMER_ORACLE, WORMHOLE_ORACLE } from "../config";

export function getOutputHash(output: MandateOutput) {
	return keccak256(
		encodePacked(
			[
				"bytes32",
				"bytes32",
				"uint256",
				"bytes32",
				"uint256",
				"bytes32",
				"uint16",
				"bytes",
				"uint16",
				"bytes"
			],
			[
				output.oracle,
				output.settler,
				output.chainId,
				output.token,
				output.amount,
				output.recipient,
				output.callbackData.replace("0x", "").length / 2,
				output.callbackData,
				output.context.replace("0x", "").length / 2,
				output.context
			]
		)
	);
}

export function encodeMandateOutput(
	solver: `0x${string}`,
	orderId: `0x${string}`,
	timestamp: number,
	output: MandateOutput
) {
	return encodePacked(
		[
			"bytes32",
			"bytes32",
			"uint32",
			"bytes32",
			"uint256",
			"bytes32",
			"uint16",
			"bytes",
			"uint16",
			"bytes"
		],
		[
			solver,
			orderId,
			timestamp,
			output.token,
			output.amount,
			output.recipient,
			output.callbackData.replace("0x", "").length / 2,
			output.callbackData,
			output.context.replace("0x", "").length / 2,
			output.context
		]
	);
}

/// https://docs.catalyst.exchange/solver/orderflow/#order-validation
export function validateOrder(order: StandardOrder): boolean {
	const currentTime = Math.floor(Date.now() / 1000);

	// 1. Filldeadline
	const isBeforeFilltime = currentTime < order.fillDeadline;
	if (!isBeforeFilltime) return false;
	// 2. Expires
	const isBeforeExpiry = currentTime < order.expires;
	if (!isBeforeExpiry) return false;

	// 3. Validation layer.
	const inputChain = Object.entries(chainMap).find(([k, v]) => {
		return v.id === Number(order.originChainId);
	})?.[0] as chain | undefined;
	if (!inputChain) return false;
	// Polymer?
	const isPolymer =
		inputChain in POLYMER_ORACLE &&
		POLYMER_ORACLE[inputChain as keyof typeof POLYMER_ORACLE] !== order.inputOracle;
	const isWormhole =
		inputChain in WORMHOLE_ORACLE &&
		WORMHOLE_ORACLE[inputChain as keyof typeof WORMHOLE_ORACLE] !== order.inputOracle;
	const whitelistedOracle = isPolymer || isWormhole;
	if (!whitelistedOracle) return false;

	// 4. Check inputs.
	// TODO: check the outputs.
	// 5. Lockid of inputs.
	// 6. reset period of inputs.
	// 7. allocatorid
	// 8. claim sig
	// 9. Outputs
	for (const output of order.outputs) {
		if (!output.oracle) return false;
	}
	// 10. Multiple outputs.
	if (order.outputs.length > 1) return false;

	// 11. Allocatordata

	// 12. Nonce.

	return true;
}
