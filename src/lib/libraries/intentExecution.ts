import { encodeAbiParameters, parseAbiParameters } from "viem";
import { COMPACT_ABI } from "$lib/abi/compact";
import { MULTICHAIN_SETTLER_COMPACT_ABI } from "$lib/abi/multichain_compact";
import { MULTICHAIN_SETTLER_ESCROW_ABI } from "$lib/abi/multichain_escrow";
import { SETTLER_ESCROW_ABI } from "$lib/abi/escrow";
import { SETTLER_COMPACT_ABI } from "$lib/abi/settlercompact";
import {
	COMPACT,
	INPUT_SETTLER_COMPACT_LIFI,
	INPUT_SETTLER_ESCROW_LIFI,
	MULTICHAIN_INPUT_SETTLER_COMPACT,
	MULTICHAIN_INPUT_SETTLER_ESCROW,
	chainMap,
	type chain,
	type WC
} from "$lib/config";
import { compact_type_hash } from "$lib/utils/typedMessage";
import { addressToBytes32 } from "$lib/core/helpers/convert";
import { signMultichainCompact, signStandardCompact } from "$lib/core/intent/compact/signing";
import { findChain } from "$lib/core/intent/helpers/shared";
import { MultichainOrderIntent, StandardOrderIntent } from "$lib/core/intent";
import type { NoSignature, Signature } from "$lib/core/types";

function combineSignatures(signatures: {
	sponsorSignature: Signature | NoSignature;
	allocatorSignature: Signature | NoSignature;
}) {
	const { sponsorSignature, allocatorSignature } = signatures;
	return encodeAbiParameters(parseAbiParameters(["bytes", "bytes"]), [
		sponsorSignature.payload ?? "0x",
		allocatorSignature.payload
	]);
}

export function signIntentCompact(
	intent: StandardOrderIntent | MultichainOrderIntent,
	account: `0x${string}`,
	walletClient: WC
): Promise<`0x${string}`> {
	if (intent instanceof StandardOrderIntent) {
		return signStandardCompact(
			account,
			walletClient,
			intent.order.originChainId,
			intent.asBatchCompact()
		);
	}
	return signMultichainCompact(
		account,
		walletClient,
		intent.order.inputs[0].chainId,
		intent.asMultichainBatchCompact()
	);
}

export async function depositAndRegisterCompact(
	intent: StandardOrderIntent,
	account: `0x${string}`,
	walletClient: WC
): Promise<`0x${string}`> {
	const chain = findChain(intent.order.originChainId);
	if (!chain) {
		throw new Error("Chain not found for chainId " + intent.order.originChainId.toString());
	}
	return walletClient.writeContract({
		chain,
		account,
		address: COMPACT,
		abi: COMPACT_ABI,
		functionName: "batchDepositAndRegisterMultiple",
		args: [intent.order.inputs, [[intent.compactClaimHash(), compact_type_hash]]]
	});
}

export async function openEscrowIntent(
	intent: StandardOrderIntent | MultichainOrderIntent,
	account: `0x${string}`,
	walletClient: WC
): Promise<`0x${string}`[]> {
	if (intent instanceof StandardOrderIntent) {
		const chain = findChain(intent.order.originChainId);
		walletClient.switchChain({ id: Number(intent.order.originChainId) });
		if (!chain) {
			throw new Error("Chain not found for chainId " + intent.order.originChainId.toString());
		}
		return [
			await walletClient.writeContract({
				chain,
				account,
				address: INPUT_SETTLER_ESCROW_LIFI,
				abi: SETTLER_ESCROW_ABI,
				functionName: "open",
				args: [intent.order]
			})
		];
	}

	const components = intent.asComponents();
	const results: `0x${string}`[] = [];
	for (const { chainId, orderComponent } of components) {
		const chain = findChain(chainId);
		if (!chain) throw new Error("Chain not found for chainId " + chainId.toString());
		walletClient.switchChain({ id: chain.id });
		results.push(
			await walletClient.writeContract({
				chain,
				account,
				address: intent.inputSettler,
				abi: MULTICHAIN_SETTLER_ESCROW_ABI,
				functionName: "open",
				args: [orderComponent]
			})
		);
	}
	return results;
}

export async function finaliseIntent(options: {
	intent: StandardOrderIntent | MultichainOrderIntent;
	sourceChain: chain;
	account: `0x${string}`;
	walletClient: WC;
	solveParams: { timestamp: number; solver: `0x${string}` }[];
	signatures: {
		sponsorSignature: Signature | NoSignature;
		allocatorSignature: Signature | NoSignature;
	};
}) {
	const { intent, sourceChain, account, walletClient, solveParams, signatures } = options;
	const actionChain = chainMap[sourceChain];

	if (intent instanceof StandardOrderIntent) {
		if (actionChain.id !== Number(intent.order.originChainId)) {
			throw new Error(
				`Origin chain id and action ID does not match: ${intent.order.originChainId}, ${actionChain.id}`
			);
		}
		if (intent.inputSettler.toLowerCase() === INPUT_SETTLER_ESCROW_LIFI.toLowerCase()) {
			return walletClient.writeContract({
				chain: actionChain,
				account,
				address: intent.inputSettler,
				abi: SETTLER_ESCROW_ABI,
				functionName: "finalise",
				args: [intent.order, solveParams, addressToBytes32(account), "0x"]
			});
		}
		if (intent.inputSettler.toLowerCase() === INPUT_SETTLER_COMPACT_LIFI.toLowerCase()) {
			const combinedSignatures = combineSignatures(signatures);
			return walletClient.writeContract({
				chain: actionChain,
				account,
				address: intent.inputSettler,
				abi: SETTLER_COMPACT_ABI,
				functionName: "finalise",
				args: [intent.order, combinedSignatures, solveParams, addressToBytes32(account), "0x"]
			});
		}
		throw new Error(`Could not detect settler type ${intent.inputSettler}`);
	}

	const inputChainIds = intent.inputChains().map((v) => Number(v));
	if (!inputChainIds.includes(actionChain.id)) {
		throw new Error(
			`Action chain must be one of input chains for finalise: ${inputChainIds}, action=${actionChain.id}`
		);
	}
	const components = intent.asComponents().filter((c) => Number(c.chainId) === actionChain.id);
	if (components.length === 0) {
		throw new Error(
			`No multichain order component found for action chain ${actionChain.id} (${sourceChain}).`
		);
	}

	for (const { orderComponent } of components) {
		if (intent.inputSettler.toLowerCase() === MULTICHAIN_INPUT_SETTLER_ESCROW.toLowerCase()) {
			return walletClient.writeContract({
				chain: actionChain,
				account,
				address: intent.inputSettler,
				abi: MULTICHAIN_SETTLER_ESCROW_ABI,
				functionName: "finalise",
				args: [orderComponent, solveParams, addressToBytes32(account), "0x"]
			});
		}
		if (intent.inputSettler.toLowerCase() === MULTICHAIN_INPUT_SETTLER_COMPACT.toLowerCase()) {
			const combinedSignatures = combineSignatures(signatures);
			return walletClient.writeContract({
				chain: actionChain,
				account,
				address: intent.inputSettler,
				abi: MULTICHAIN_SETTLER_COMPACT_ABI,
				functionName: "finalise",
				args: [orderComponent, combinedSignatures, solveParams, addressToBytes32(account), "0x"]
			});
		}
		throw new Error(`Could not detect settler type ${intent.inputSettler}`);
	}

	throw new Error(`Failed to finalise multichain order on chain ${sourceChain}.`);
}
