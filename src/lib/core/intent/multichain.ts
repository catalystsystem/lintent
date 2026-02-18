import { encodeAbiParameters, encodePacked, hashStruct, keccak256, parseAbiParameters } from "viem";
import { INPUT_SETTLER_COMPACT_LIFI, MULTICHAIN_INPUT_SETTLER_COMPACT } from "../../config";
import {
	MULTICHAIN_COMPACT_TYPEHASH_WITH_WITNESS,
	multichainCompactClaimHash
} from "./compact/claims";
import {
	inputsToLocks,
	toMultichainBatchCompact,
	toMultichainElements
} from "./compact/conversions";
import { encodeOutputs } from "./helpers/output-encoding";
import { selectAllBut } from "./helpers/shared";
import { compactTypes } from "../../utils/typedMessage";
import type {
	CompactLock,
	CompactMandate,
	Element,
	EscrowLock,
	MultichainCompact,
	MultichainOrder,
	MultichainOrderComponent
} from "../types";
import type { OrderIntentCommon } from "./types";

/**
 * @notice Hashes a multichain input segment using the chain id and encoded input locks.
 * @dev Mirrors the multichain input hashing shape used by OIF multichain order components.
 * @param chainId The chain id for this input segment.
 * @param inputs The ordered input locks encoded as token/amount tuples.
 * @return The keccak256 hash of `abi.encodePacked(chainId, inputs)`.
 * @see https://github.com/openintentsframework/oif-contracts/blob/d9d9768f035656c8e49bdfbd9e1f88d4a207d69a/src/input/types/MultichainOrderComponentType.sol#L49-L58
 */
export function hashMultichainInputs(chainId: bigint, inputs: [bigint, bigint][]) {
	return keccak256(encodePacked(["uint256", "uint256[2][]"], [chainId, inputs]));
}

export function constructInputHash(
	inputsChainId: bigint,
	chainIndex: bigint,
	inputs: [bigint, bigint][],
	additionalChains: `0x${string}`[]
) {
	const inputHash = hashMultichainInputs(inputsChainId, inputs);
	const numSegments = additionalChains.length + 1;
	if (numSegments <= chainIndex)
		throw new Error(`ChainIndexOutOfRange(${chainIndex},${numSegments})`);
	const claimStructure: `0x${string}`[] = [];
	for (let i = 0; i < numSegments; ++i) {
		const additionalChainsIndex = i > chainIndex ? i - 1 : i;
		const inputHashElement =
			chainIndex === BigInt(i) ? inputHash : additionalChains[additionalChainsIndex];
		claimStructure[i] = inputHashElement;
	}
	return keccak256(encodePacked(["bytes32[]"], [claimStructure]));
}

export function computeMultichainEscrowOrderId(
	inputSettler: `0x${string}`,
	orderComponent: MultichainOrderComponent
) {
	return keccak256(
		encodePacked(
			["address", "address", "uint256", "uint32", "uint32", "address", "bytes32", "bytes"],
			[
				inputSettler,
				orderComponent.user,
				orderComponent.nonce,
				orderComponent.expires,
				orderComponent.fillDeadline,
				orderComponent.inputOracle,
				constructInputHash(
					orderComponent.chainIdField,
					orderComponent.chainIndex,
					orderComponent.inputs,
					orderComponent.additionalChains
				),
				encodeOutputs(orderComponent.outputs)
			]
		)
	);
}

export function computeMultichainCompactOrderId(
	inputSettler: `0x${string}`,
	orderComponent: MultichainOrderComponent,
	chainId: bigint
) {
	const { fillDeadline, inputOracle, outputs, inputs } = orderComponent;
	const mandate: CompactMandate = {
		fillDeadline,
		inputOracle,
		outputs
	};
	const element: Element = {
		arbiter: inputSettler,
		chainId: chainId,
		commitments: inputsToLocks(inputs),
		mandate
	};

	const elementHash = hashStruct({
		types: compactTypes,
		primaryType: "Element",
		data: element
	});

	const elementHashes = [
		...orderComponent.additionalChains.slice(0, Number(orderComponent.chainIndex)),
		elementHash,
		...orderComponent.additionalChains.slice(Number(orderComponent.chainIndex))
	];

	return keccak256(
		encodeAbiParameters(
			parseAbiParameters(["bytes32", "address", "uint256", "uint256", "bytes32"]),
			[
				MULTICHAIN_COMPACT_TYPEHASH_WITH_WITNESS,
				orderComponent.user,
				orderComponent.nonce,
				BigInt(orderComponent.expires),
				keccak256(encodePacked(["bytes32[]"], [elementHashes]))
			]
		)
	);
}

export class MultichainOrderIntent implements OrderIntentCommon<MultichainOrder> {
	lock?: { type: string } | EscrowLock | CompactLock;
	inputSettler: `0x${string}`;
	order: MultichainOrder;

	constructor(inputSetter: `0x${string}`, order: MultichainOrder, lock?: { type: string }) {
		this.inputSettler = inputSetter;
		this.order = order;

		const isCompact =
			this.inputSettler === INPUT_SETTLER_COMPACT_LIFI ||
			this.inputSettler === MULTICHAIN_INPUT_SETTLER_COMPACT;

		this.lock = lock ?? { type: isCompact ? "compact" : "escrow" };
	}

	asOrder(): MultichainOrder {
		return this.order;
	}

	inputChains(): bigint[] {
		return [...new Set(this.order.inputs.map((i) => i.chainId))];
	}

	orderId(): `0x${string}` {
		const components = this.asComponents();
		const computedOrderIds = components.map((c) =>
			this.lock?.type === "escrow"
				? computeMultichainEscrowOrderId(this.inputSettler, c.orderComponent)
				: computeMultichainCompactOrderId(this.inputSettler, c.orderComponent, c.chainId)
		);

		const orderId = computedOrderIds[0];
		computedOrderIds.map((v) => {
			if (v !== orderId) throw new Error(`Order ids are not equal ${computedOrderIds}`);
		});

		if (this.lock?.type === "compact") {
			const multichainCompactHash = multichainCompactClaimHash(this.asMultichainBatchCompact());
			if (multichainCompactHash !== orderId) {
				throw new Error(
					`MultichainCompact does not match orderId, ${multichainCompactHash} ${orderId}`
				);
			}
		}
		return orderId;
	}

	secondariesEscrow(): { chainIdField: bigint; additionalChains: `0x${string}`[] }[] {
		const inputsHash: `0x${string}`[] = this.order.inputs.map((input) =>
			keccak256(encodePacked(["uint256", "uint256[2][]"], [input.chainId, input.inputs]))
		);
		return this.order.inputs.map((v, i) => {
			return {
				chainIdField: v.chainId,
				additionalChains: selectAllBut(inputsHash, i)
			};
		});
	}

	asCompactElements() {
		return toMultichainElements(this.order, this.inputSettler);
	}

	secondariesCompact(): { chainIdField: bigint; additionalChains: `0x${string}`[] }[] {
		const { inputs } = this.order;
		const elements = this.asCompactElements().map((element) => {
			return hashStruct({
				types: compactTypes,
				primaryType: "Element",
				data: element
			});
		});
		return inputs.map((_, i) => {
			return {
				// Preserve existing behaviour: chainIdField for compact uses the first input chain.
				chainIdField: inputs[0].chainId,
				additionalChains: selectAllBut(elements, i)
			};
		});
	}

	asComponents(): { chainId: bigint; orderComponent: MultichainOrderComponent }[] {
		const { inputs, user, nonce, expires, fillDeadline, inputOracle, outputs } = this.order;
		if (!this.lock) throw new Error(`No lock provided, cannot compute secondaries.`);
		const secondaries =
			this.lock.type === "escrow" ? this.secondariesEscrow() : this.secondariesCompact();
		const components: { chainId: bigint; orderComponent: MultichainOrderComponent }[] = [];
		for (let i = 0; i < inputs.length; ++i) {
			const { chainIdField, additionalChains } = secondaries[i];
			components.push({
				chainId: inputs[i].chainId,
				orderComponent: {
					user,
					nonce,
					chainIdField,
					chainIndex: BigInt(i),
					expires,
					fillDeadline,
					inputOracle,
					inputs: inputs[i].inputs,
					outputs,
					additionalChains
				}
			});
		}
		return components;
	}

	asMultichainBatchCompact(): MultichainCompact {
		return toMultichainBatchCompact(this.order, this.inputSettler);
	}

	compactClaimHash(): `0x${string}` {
		return multichainCompactClaimHash(this.asMultichainBatchCompact());
	}
}
