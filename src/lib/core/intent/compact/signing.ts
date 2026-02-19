import { COMPACT } from "../../constants";
import { compactTypes } from "$lib/core/typedMessage";
import type { BatchCompact, MultichainCompact } from "../../types";
import type { WalletClient } from "viem";

export type TypedDataSigner = Pick<WalletClient, "signTypedData">;

export function signStandardCompact(
	account: `0x${string}`,
	walletClient: TypedDataSigner,
	chainId: bigint,
	message: BatchCompact
): Promise<`0x${string}`> {
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
		message
	});
}

export function signMultichainCompact(
	account: `0x${string}`,
	walletClient: TypedDataSigner,
	chainId: bigint,
	message: MultichainCompact
): Promise<`0x${string}`> {
	return walletClient.signTypedData({
		account,
		domain: {
			name: "The Compact",
			version: "1",
			chainId,
			verifyingContract: COMPACT
		} as const,
		types: compactTypes,
		primaryType: "MultichainCompact",
		message
	});
}
