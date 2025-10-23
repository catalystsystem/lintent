import { encodePacked, hashStruct, toHex } from "viem";
import type { BatchCompact, CompactMandate, MandateOutput, StandardOrder } from "../../types";
import { COMPACT_ABI } from "../abi/compact";
import {
	chainMap,
	COIN_FILLER,
	COMPACT,
	getOracle,
	INPUT_SETTLER_COMPACT_LIFI,
	INPUT_SETTLER_ESCROW_LIFI,
	type chain,
	type Token,
	type Verifier,
	type WC
} from "../config";
import { ResetPeriod, toId } from "../utils/idLib";
import { compact_type_hash, compactTypes } from "../utils/typedMessage";
import { addressToBytes32 } from "../utils/convert";
import { SETTLER_ESCROW_ABI } from "../abi/escrow";

export type CreateIntentOptions = {
	exclusiveFor: string;
	allocatorId: string;
	inputTokens: Token[];
	outputToken: Token;
	inputAmounts: bigint[];
	outputAmount: bigint;
	verifier: Verifier;
	account: () => `0x${string}`;
	inputSettler: typeof INPUT_SETTLER_COMPACT_LIFI | typeof INPUT_SETTLER_ESCROW_LIFI;
};

function findChain(chainId: bigint) {
	for (const [name, data] of Object.entries(chainMap)) {
		if (BigInt(data.id) === chainId) {
			return chainMap[name as chain];
		}
	}
	return undefined;
}

/**
 * @notice Class representing a Li.Fi Intent. Contains intent abstractions and helpers.
 */
export class Intent {
	private order: StandardOrder;

	constructor(opts: CreateIntentOptions) {
		const { order } = Intent.create(opts);
		this.order = order;
	}

	static create(opts: CreateIntentOptions) {
		const {
			exclusiveFor,
			allocatorId,
			inputTokens,
			outputToken,
			inputAmounts,
			outputAmount,
			verifier,
			account,
			inputSettler
		} = opts;

		// Check if exclusiveFor has right formatting:
		if (exclusiveFor) {
			// Length should be 42.
			const formattedCorrectly = exclusiveFor.length === 42 && exclusiveFor.slice(0, 2) === "0x";
			if (!formattedCorrectly)
				throw new Error(`ExclusiveFor not formatted correctly ${exclusiveFor}`);
		}

		const inputChain = inputTokens[0].chain;
		const inputs: [bigint, bigint][] = [];
		for (let i = 0; i < inputTokens.length; ++i) {
			// If Compact input, then generate the tokenId otherwise cast into uint256.
			const inputTokenId =
				inputSettler == INPUT_SETTLER_COMPACT_LIFI
					? toId(true, ResetPeriod.OneDay, allocatorId, inputTokens[i].address)
					: BigInt(inputTokens[i].address);
			inputs.push([inputTokenId, inputAmounts[i]]);
		}

		const outputSettler = COIN_FILLER;
		const outputOracle = getOracle(verifier, outputToken.chain)!;
		const inputOracle = getOracle(verifier, inputChain)!;

		// Get the current epoch timestamp:
		const currentTime = Math.floor(Date.now() / 1000);
		const ONE_MINUTE = 60;

		let context: `0x${string}` = "0x";
		if (exclusiveFor) {
			const paddedExclusiveFor: `0x${string}` = `0x${exclusiveFor.replace("0x", "").padStart(64, "0")}`;
			context = encodePacked(
				["bytes1", "bytes32", "uint32"],
				["0xe0", paddedExclusiveFor, currentTime + ONE_MINUTE]
			);
		}

		// Make Outputs
		const output: MandateOutput = {
			oracle: addressToBytes32(outputOracle),
			settler: addressToBytes32(outputSettler),
			chainId: BigInt(chainMap[outputToken.chain].id),
			token: addressToBytes32(outputToken.address),
			amount: outputAmount,
			recipient: addressToBytes32(account()),
			call: "0x",
			context
		};
		const outputs = [output];

		// Make order
		const order: StandardOrder = {
			user: account(),
			nonce: BigInt(Math.floor(Math.random() * 2 ** 32)), // Random nonce
			originChainId: BigInt(chainMap[inputChain].id),
			fillDeadline: currentTime + ONE_MINUTE * 120,
			expires: currentTime + ONE_MINUTE * 120,
			inputOracle: inputOracle,
			inputs: inputs,
			outputs: outputs
		};

		return { order };
	}

	// -- Order Representations -- //

	/**
	 * @notice Returns the order as a StandardOrder.
	 * @returns Order as StandardOrder
	 */
	asStandardOrder(): StandardOrder {
		return this.order;
	}

	/**
	 * @notice Returns the order as a BatchCompact.
	 * @returns Order as BatchCompact (signed object for Compact)
	 */
	asBatchCompact(): BatchCompact {
		const { order } = this;
		const mandate: CompactMandate = {
			fillDeadline: order.fillDeadline,
			inputOracle: order.inputOracle,
			outputs: order.outputs
		};
		const commitments = order.inputs.map(([tokenId, amount]) => {
			const lockTag: `0x${string}` = `0x${toHex(tokenId)
				.replace("0x", "")
				.slice(0, 12 * 2)}`;
			const token: `0x${string}` = `0x${toHex(tokenId)
				.replace("0x", "")
				.slice(12 * 2, 32 * 2)}`;
			return {
				lockTag,
				token,
				amount
			};
		});
		return {
			arbiter: INPUT_SETTLER_COMPACT_LIFI,
			sponsor: order.user,
			nonce: order.nonce,
			expires: order.expires,
			commitments,
			mandate
		};
	}

	// -- Escrow Helpers -- //

	/**
	 * @notice Opens an intent using the escrow input settler by depositing into it.
	 * @param account Account that calls open.
	 * @param walletClient Wallet client for sending the call to.
	 * @returns transactionHash for the on-chain call.
	 */
	openEscrow(account: `0x${string}`, walletClient: WC): Promise<`0x${string}`> {
		const chain = findChain(this.order.originChainId);
		if (!chain)
			throw new Error("Chain not found for chainId " + this.order.originChainId.toString());
		return walletClient.writeContract({
			chain,
			account,
			address: INPUT_SETTLER_ESCROW_LIFI,
			abi: SETTLER_ESCROW_ABI,
			functionName: "open",
			args: [this.order]
		});
	}

	// -- Compact Helpers -- //

	compactClaimHash(): `0x${string}` {
		const claimHash = hashStruct({
			data: this.asBatchCompact(),
			types: compactTypes,
			primaryType: "BatchCompact"
		});
		return claimHash;
	}

	signCompact(account: `0x${string}`, walletClient: WC): Promise<`0x${string}`> {
		const chainId = this.order.originChainId;
		return walletClient.signTypedData({
			account,
			domain: {
				name: "The Compact",
				version: "1",
				chainId,
				verifyingContract: COMPACT
			} as const,
			types: compactTypes,
			primaryType: "BatchCompact",
			message: this.asBatchCompact()
		});
	}

	depositAndRegisterCompact(account: `0x${string}`, walletClient: WC): Promise<`0x${string}`> {
		const chain = findChain(this.order.originChainId);
		if (!chain)
			throw new Error("Chain not found for chainId " + this.order.originChainId.toString());
		return walletClient.writeContract({
			chain,
			account,
			address: COMPACT,
			abi: COMPACT_ABI,
			functionName: "batchDepositAndRegisterMultiple",
			args: [this.order.inputs, [[this.compactClaimHash(), compact_type_hash]]]
		});
	}
}
