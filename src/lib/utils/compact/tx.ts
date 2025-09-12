/// -- Compact -- ///
import { maxInt32, maxUint256, toHex } from "viem";
import { ResetPeriod, toId } from "./IdLib";
import {
	ADDRESS_ZERO,
	type chain,
	chainMap,
	clients,
	COMPACT,
	type Token,
	type WC,
} from "$lib/config";
import { COMPACT_ABI } from "$lib/abi/compact";
import { addressToBytes32 } from "../convert";
import { ERC20_ABI } from "$lib/abi/erc20";

export function compactDeposit(
	walletClient: WC,
	opts: {
		preHook?: (chain: chain) => Promise<any>;
		postHook?: () => Promise<any>;
		inputToken: Token;
		account: () => `0x${string}`;
		inputAmount: bigint;
		allocatorId: string;
	},
) {
	return async () => {
		const { preHook, postHook, inputToken, account, allocatorId, inputAmount } =
			opts;
		const publicClients = clients;
		if (preHook) await preHook(inputToken.chain);
		const lockTag: `0x${string}` = `0x${
			toHex(
				toId(true, ResetPeriod.OneDay, allocatorId, ADDRESS_ZERO),
				{
					size: 32,
				},
			)
				.replace("0x", "")
				.slice(0, 24)
		}`;
		const recipient = ADDRESS_ZERO; // This means sender.

		let transactionHash: `0x${string}`;
		if (inputToken.address === ADDRESS_ZERO) {
			transactionHash = await walletClient.writeContract({
				chain: chainMap[inputToken.chain],
				account: account(),
				address: COMPACT,
				abi: COMPACT_ABI,
				functionName: "depositNative",
				value: inputAmount,
				args: [lockTag, recipient],
			});
		} else {
			transactionHash = await walletClient.writeContract({
				chain: chainMap[inputToken.chain],
				account: account(),
				address: COMPACT,
				abi: COMPACT_ABI,
				functionName: "depositERC20",
				args: [inputToken.address, lockTag, inputAmount, recipient],
			});
		}
		await publicClients[inputToken.chain].waitForTransactionReceipt({
			hash: await transactionHash,
		});
		if (postHook) await postHook();
		return transactionHash;
	};
}

export function compactWithdraw(
	walletClient: WC,
	opts: {
		preHook?: (chain: chain) => Promise<any>;
		postHook?: () => Promise<any>;
		inputToken: Token;
		account: () => `0x${string}`;
		inputAmount: bigint;
		allocatorId: string;
	},
) {
	return async () => {
		const { preHook, postHook, inputToken, account, allocatorId, inputAmount } =
			opts;
		const publicClients = clients;
		const assetId = toId(
			true,
			ResetPeriod.OneDay,
			allocatorId,
			inputToken.address,
		);

		const allocatedTransferStruct: {
			allocatorData: `0x${string}`;
			nonce: bigint;
			expires: bigint;
			id: bigint;
			recipients: {
				claimant: bigint;
				amount: bigint;
			}[];
		} = {
			allocatorData: "0x", // TODO: Get from allocator
			nonce: BigInt(Math.floor(Math.random() * 2 ** 32)),
			expires: maxInt32, // TODO:
			id: assetId,
			recipients: [
				{
					claimant: BigInt(addressToBytes32(account())),
					amount: inputAmount,
				},
			],
		};

		if (preHook) await preHook(inputToken.chain);
		const transactionHash = walletClient.writeContract({
			chain: chainMap[inputToken.chain],
			account: account(),
			address: COMPACT,
			abi: COMPACT_ABI,
			functionName: "allocatedTransfer",
			args: [allocatedTransferStruct],
		});
		await publicClients[inputToken.chain].waitForTransactionReceipt({
			hash: await transactionHash,
		});
		if (postHook) await postHook();
		return transactionHash;
	};
}

export function compactApprove(
	walletClient: WC,
	opts: {
		preHook?: (chain: chain) => Promise<any>;
		postHook?: () => Promise<any>;
		inputTokens: Token[];
		inputAmounts: bigint[];
		account: () => `0x${string}`;
	},
) {
	return async () => {
		const { preHook, postHook, inputTokens, inputAmounts, account } = opts;
		for (let i = 0; i < inputTokens.length; ++i) {
			const inputToken = inputTokens[i];
			if (preHook) await preHook(inputToken.chain);
			const publicClient = clients[inputToken.chain];
			// Check if we have sufficient allowance already.
			const currentAllowance = await publicClient.readContract({
				address: inputToken.address,
				abi: ERC20_ABI,
				functionName: "allowance",
				args: [account(), COMPACT],
			});
			if (currentAllowance >= inputAmounts[i]) continue;
			const transactionHash = walletClient.writeContract({
				chain: chainMap[inputToken.chain],
				account: account(),
				address: inputToken.address,
				abi: ERC20_ABI,
				functionName: "approve",
				args: [COMPACT, maxUint256],
			});

			await publicClient.waitForTransactionReceipt({
				hash: await transactionHash,
			});
		}
		if (postHook) await postHook();
	};
}
