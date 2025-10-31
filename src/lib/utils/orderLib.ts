import { encodeAbiParameters, encodePacked, keccak256, parseAbiParameters } from "viem";
import type { MandateOutput, StandardOrder } from "../../types";
import { type chain, chainMap, POLYMER_ORACLE, WORMHOLE_ORACLE } from "$lib/config";

export function getOrderId(orderContainer: { order: StandardOrder; inputSettler: `0x${string}` }) {
	const { order, inputSettler } = orderContainer;
	return keccak256(
		encodePacked(
			[
				"uint256",
				"address",
				"address",
				"uint256",
				"uint32",
				"uint32",
				"address",
				"bytes32",
				"bytes"
			],
			[
				order.originChainId,
				inputSettler,
				order.user,
				order.nonce,
				order.expires,
				order.fillDeadline,
				order.inputOracle,
				keccak256(encodePacked(["uint256[2][]"], [order.inputs])),
				encodeAbiParameters(
					parseAbiParameters(
						"(bytes32 oracle, bytes32 settler, uint256 chainId, bytes32 token, uint256 amount, bytes32 recipient, bytes callbackData, bytes context)[]"
					),
					[order.outputs]
				)
			]
		)
	);
}

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
	const isPolymer = POLYMER_ORACLE[inputChain] !== order.inputOracle;
	const isWormhole = WORMHOLE_ORACLE[inputChain] !== order.inputOracle;
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
