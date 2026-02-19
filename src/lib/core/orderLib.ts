import { encodePacked, keccak256 } from "viem";
import type { OrderValidationDeps } from "./deps";
import {
	BYTES32_ZERO,
	COIN_FILLER,
	INPUT_SETTLER_COMPACT_LIFI,
	MULTICHAIN_INPUT_SETTLER_COMPACT
} from "./constants";
import { addressToBytes32 } from "./helpers/convert";
import { isStandardOrder } from "./intent";
import type { MandateOutput, OrderContainer, StandardOrder } from "./types";

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

export type OrderValidator = {
	validateOrderWithReason: (order: StandardOrder) => ValidationResult;
	validateOrder: (order: StandardOrder) => boolean;
	validateOrderContainerWithReason: (orderContainer: OrderContainer) => ValidationResult;
	validateOrderContainer: (orderContainer: OrderContainer) => boolean;
};

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

function normalize(value: string) {
	return value.toLowerCase();
}

function isZeroBytes32(value: string) {
	return normalize(value) === normalize(BYTES32_ZERO);
}

function pass(): ValidationResult {
	return { passed: true, reason: VALIDATION_PASS_REASON };
}

function fail(reason: string): ValidationResult {
	return { passed: false, reason };
}

export function createOrderValidator(deps: OrderValidationDeps): OrderValidator {
	const compactSettlers = (
		deps.compactSettlers.length > 0
			? deps.compactSettlers
			: [INPUT_SETTLER_COMPACT_LIFI, MULTICHAIN_INPUT_SETTLER_COMPACT]
	).map(normalize);

	function getAllowedInputOracles(chainId: bigint, sameChainFill: boolean): string[] | undefined {
		const allowed = deps.allowedInputOracles(chainId, sameChainFill);
		if (!allowed) return undefined;
		return allowed.map(normalize);
	}

	function getAllowedOutputOracles(chainId: bigint): string[] | undefined {
		const allowed = deps.allowedOutputOracles(chainId);
		if (!allowed) return undefined;
		return [COIN_FILLER, ...allowed].map((oracle) => addressToBytes32(oracle)).map(normalize);
	}

	function getAllowedOutputSettlers(): string[] {
		return deps
			.allowedOutputSettlers()
			.map((settler) => addressToBytes32(settler))
			.map(normalize);
	}

	/// https://docs.li.fi/lifi-intents/for-solvers/orderflow#order-validation
	function validateOrderWithReason(order: StandardOrder): ValidationResult {
		// 1-2. temporal consistency only
		if (order.fillDeadline > order.expires)
			return fail(VALIDATION_ERRORS.FILL_DEADLINE_AFTER_EXPIRES);

		// 3. validation layer
		const sameChainFill = order.outputs.every((output) => output.chainId === order.originChainId);
		const allowedInputOracles = getAllowedInputOracles(order.originChainId, sameChainFill);
		if (!allowedInputOracles) return fail(VALIDATION_ERRORS.UNKNOWN_ORIGIN_CHAIN);
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
			const allowedOutputOracles = getAllowedOutputOracles(output.chainId);
			if (!allowedOutputOracles) return fail(VALIDATION_ERRORS.UNKNOWN_OUTPUT_CHAIN);
			if (output.amount < 0n) return fail(VALIDATION_ERRORS.OUTPUT_AMOUNT_NON_POSITIVE);
			if (isZeroBytes32(output.oracle)) return fail(VALIDATION_ERRORS.INVALID_OUTPUT_ORACLE);
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

	function validateOrder(order: StandardOrder): boolean {
		return validateOrderWithReason(order).passed;
	}

	function validateOrderContainerWithReason(orderContainer: OrderContainer): ValidationResult {
		if (compactSettlers.includes(normalize(orderContainer.inputSettler))) {
			// TODO: implement compact validation from LI.FI orderflow docs.
			return pass();
		}

		if (isStandardOrder(orderContainer.order)) return validateOrderWithReason(orderContainer.order);

		return pass();
	}

	function validateOrderContainer(orderContainer: OrderContainer): boolean {
		return validateOrderContainerWithReason(orderContainer).passed;
	}

	return {
		validateOrderWithReason,
		validateOrder,
		validateOrderContainerWithReason,
		validateOrderContainer
	};
}
