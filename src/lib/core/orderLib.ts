import { encodePacked, keccak256 } from "viem";
import type { MandateOutput, OrderContainer, StandardOrder } from "./types";
import {
	BYTES32_ZERO,
	type chain,
	chainMap,
	COIN_FILLER,
	INPUT_SETTLER_COMPACT_LIFI,
	MULTICHAIN_INPUT_SETTLER_COMPACT,
	POLYMER_ORACLE,
	WORMHOLE_ORACLE
} from "../config";
import { addressToBytes32 } from "./helpers/convert";
import { isStandardOrder } from "./intent";

export type ValidationResult = {
	passed: boolean;
	reason: string;
};

export const VALIDATION_PASS_REASON = "" as const;

export enum VALIDATION_ERRORS {
	FILL_DEADLINE_AFTER_EXPIRES = "fillDeadline > expires",
	UNKNOWN_ORIGIN_CHAIN = "input chain",
	INPUT_ORACLE_NOT_ALLOWED = "inputOracle",
	NO_INPUTS = "inputs",
	INPUT_AMOUNT_NON_POSITIVE = "input amount",
	NO_OUTPUTS = "outputs",
	UNKNOWN_OUTPUT_CHAIN = "output chain",
	OUTPUT_AMOUNT_NON_POSITIVE = "output amount",
	INVALID_OUTPUT_ORACLE = "output oracle",
	INVALID_OUTPUT_SETTLER = "output settler",
	OUTPUT_TOKEN_ZERO = "output token",
	OUTPUT_RECIPIENT_ZERO = "output recipient"
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

function findChainById(chainId: bigint): chain | undefined {
	const numericChainId = Number(chainId);
	if (!Number.isInteger(numericChainId) || numericChainId <= 0) return undefined;
	return Object.entries(chainMap).find(([, value]) => value.id === numericChainId)?.[0] as
		| chain
		| undefined;
}

function normalize(value: string) {
	return value.toLowerCase();
}

function isZeroBytes32(value: string) {
	return normalize(value) === normalize(BYTES32_ZERO);
}

function getAllowedInputOracles(inputChain: chain, sameChainFill: boolean): string[] {
	const allowed: string[] = [];
	const polymer = POLYMER_ORACLE[inputChain as keyof typeof POLYMER_ORACLE];
	if (polymer) allowed.push(polymer);
	const wormhole = WORMHOLE_ORACLE[inputChain as keyof typeof WORMHOLE_ORACLE];
	if (wormhole && normalize(wormhole) !== "0x0000000000000000000000000000000000000000") {
		allowed.push(wormhole);
	}
	if (sameChainFill) allowed.push(COIN_FILLER);
	return allowed.map(normalize);
}

function getAllowedOutputOracles(outputChain: chain): string[] {
	const allowed: string[] = [addressToBytes32(COIN_FILLER)];
	const polymer = POLYMER_ORACLE[outputChain as keyof typeof POLYMER_ORACLE];
	if (polymer) allowed.push(addressToBytes32(polymer));
	const wormhole = WORMHOLE_ORACLE[outputChain as keyof typeof WORMHOLE_ORACLE];
	if (wormhole && normalize(wormhole) !== "0x0000000000000000000000000000000000000000") {
		allowed.push(addressToBytes32(wormhole));
	}
	return allowed.map(normalize);
}

function getAllowedOutputSettlers(): string[] {
	return [addressToBytes32(COIN_FILLER)].map(normalize);
}

function pass(): ValidationResult {
	return { passed: true, reason: VALIDATION_PASS_REASON };
}

function fail(reason: string): ValidationResult {
	return { passed: false, reason };
}

/// https://docs.li.fi/lifi-intents/for-solvers/orderflow#order-validation
export function validateOrderWithReason(order: StandardOrder): ValidationResult {
	// 1-2. temporal consistency only
	if (order.fillDeadline > order.expires)
		return fail(VALIDATION_ERRORS.FILL_DEADLINE_AFTER_EXPIRES);

	// 3. validation layer
	const inputChain = findChainById(order.originChainId);
	if (!inputChain) return fail(VALIDATION_ERRORS.UNKNOWN_ORIGIN_CHAIN);
	const sameChainFill = order.outputs.every((output) => output.chainId === order.originChainId);
	const allowedInputOracles = getAllowedInputOracles(inputChain, sameChainFill);
	if (!allowedInputOracles.includes(normalize(order.inputOracle))) {
		return fail(VALIDATION_ERRORS.INPUT_ORACLE_NOT_ALLOWED);
	}

	// 4. inputs
	if (!Array.isArray(order.inputs) || order.inputs.length === 0)
		return fail(VALIDATION_ERRORS.NO_INPUTS);
	for (const input of order.inputs) {
		const [, amount] = input;
		if (amount <= 0n) return fail(VALIDATION_ERRORS.INPUT_AMOUNT_NON_POSITIVE);
	}

	// 5. lock ID semantics are not validated yet.
	// TODO: validate lock IDs for escrow/compact compatibility and token mapping.
	// 6. reset period semantics are not validated yet.
	// TODO: decode and validate reset period constraints from lock IDs.
	// 7. allocator ID policy is not validated yet.
	// TODO: enforce allocator policy rules for active environments.
	// 8. claim/signature verification is not validated here.
	// TODO: validate sponsor/allocator signatures when required.

	// 9. outputs
	if (!Array.isArray(order.outputs) || order.outputs.length === 0)
		return fail(VALIDATION_ERRORS.NO_OUTPUTS);
	for (const output of order.outputs) {
		const outputChain = findChainById(output.chainId);
		if (!outputChain) return fail(VALIDATION_ERRORS.UNKNOWN_OUTPUT_CHAIN);
		if (output.amount < 0n) return fail(VALIDATION_ERRORS.OUTPUT_AMOUNT_NON_POSITIVE);
		if (isZeroBytes32(output.oracle)) return fail(VALIDATION_ERRORS.INVALID_OUTPUT_ORACLE);
		const allowedOutputOracles = getAllowedOutputOracles(outputChain);
		if (!allowedOutputOracles.includes(normalize(output.oracle))) {
			return fail(VALIDATION_ERRORS.INVALID_OUTPUT_ORACLE);
		}
		if (isZeroBytes32(output.settler)) return fail(VALIDATION_ERRORS.INVALID_OUTPUT_SETTLER);
		const allowedOutputSettlers = getAllowedOutputSettlers();
		if (!allowedOutputSettlers.includes(normalize(output.settler))) {
			return fail(VALIDATION_ERRORS.INVALID_OUTPUT_SETTLER);
		}
		if (isZeroBytes32(output.token)) return fail(VALIDATION_ERRORS.OUTPUT_TOKEN_ZERO);
		if (isZeroBytes32(output.recipient)) return fail(VALIDATION_ERRORS.OUTPUT_RECIPIENT_ZERO);
	}

	// 11. allocatorData is not validated yet.
	// TODO: parse and validate allocatorData.
	// 12. nonce freshness/replay checks require chain state.
	// TODO: validate nonce freshness against chain state.
	return pass();
}

export function validateOrder(order: StandardOrder): boolean {
	return validateOrderWithReason(order).passed;
}

export function validateOrderContainerWithReason(orderContainer: OrderContainer): ValidationResult {
	const compactSettlers = [INPUT_SETTLER_COMPACT_LIFI, MULTICHAIN_INPUT_SETTLER_COMPACT].map(
		normalize
	);
	if (compactSettlers.includes(normalize(orderContainer.inputSettler))) {
		// TODO: implement compact validation from LI.FI orderflow docs.
		return pass();
	}

	if (isStandardOrder(orderContainer.order)) return validateOrderWithReason(orderContainer.order);

	return pass();
}

export function validateOrderContainer(orderContainer: OrderContainer): boolean {
	return validateOrderContainerWithReason(orderContainer).passed;
}
