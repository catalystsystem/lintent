/// -- Compact -- ///
import { maxInt32, maxUint256, toHex } from "viem";
import { ResetPeriod, toId } from "$lib/core/compact/idLib";
import {
	ADDRESS_ZERO,
	type chain,
	chainMap,
	clients,
	COMPACT,
	type Token,
	type WC
} from "$lib/config";
import { COMPACT_ABI } from "$lib/abi/compact";
import { addressToBytes32 } from "$lib/core/helpers/convert";
import { ERC20_ABI } from "$lib/abi/erc20";
import type { TokenContext } from "$lib/core/types";

export class CompactLib {
	static compactDeposit(
		walletClient: WC,
		opts: {
			preHook?: (chain: chain) => Promise<any>;
			postHook?: () => Promise<any>;
			inputToken: TokenContext;
			account: () => `0x${string}`;
			allocatorId: string;
		}
	) {
		return async () => {
			const { preHook, postHook, inputToken, account, allocatorId } = opts;
			const { token, amount } = inputToken;
			const publicClients = clients;
			if (preHook) await preHook(token.chain);
			const lockTag: `0x${string}` = `0x${toHex(
				toId(true, ResetPeriod.OneDay, allocatorId, ADDRESS_ZERO),
				{
					size: 32
				}
			)
				.replace("0x", "")
				.slice(0, 24)}`;
			const recipient = ADDRESS_ZERO; // This means sender.

			let transactionHash: `0x${string}`;
			if (token.address === ADDRESS_ZERO) {
				transactionHash = await walletClient.writeContract({
					chain: chainMap[token.chain],
					account: account(),
					address: COMPACT,
					abi: COMPACT_ABI,
					functionName: "depositNative",
					value: amount,
					args: [lockTag, recipient]
				});
			} else {
				transactionHash = await walletClient.writeContract({
					chain: chainMap[token.chain],
					account: account(),
					address: COMPACT,
					abi: COMPACT_ABI,
					functionName: "depositERC20",
					args: [token.address, lockTag, amount, recipient]
				});
			}
			await publicClients[token.chain].waitForTransactionReceipt({
				hash: await transactionHash
			});
			if (postHook) await postHook();
			return transactionHash;
		};
	}

	static compactWithdraw(
		walletClient: WC,
		opts: {
			preHook?: (chain: chain) => Promise<any>;
			postHook?: () => Promise<any>;
			inputToken: TokenContext;
			account: () => `0x${string}`;
			allocatorId: string;
		}
	) {
		return async () => {
			const { preHook, postHook, inputToken, account, allocatorId } = opts;
			const { token, amount } = inputToken;
			const publicClients = clients;
			const assetId = toId(true, ResetPeriod.OneDay, allocatorId, token.address);

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
						amount: amount
					}
				]
			};

			if (preHook) await preHook(token.chain);
			const transactionHash = walletClient.writeContract({
				chain: chainMap[token.chain],
				account: account(),
				address: COMPACT,
				abi: COMPACT_ABI,
				functionName: "allocatedTransfer",
				args: [allocatedTransferStruct]
			});
			await publicClients[token.chain].waitForTransactionReceipt({
				hash: await transactionHash
			});
			if (postHook) await postHook();
			return transactionHash;
		};
	}

	static compactApprove(
		walletClient: WC,
		opts: {
			preHook?: (chain: chain) => Promise<any>;
			postHook?: () => Promise<any>;
			inputTokens: TokenContext[];
			account: () => `0x${string}`;
		}
	) {
		return async () => {
			const { preHook, postHook, inputTokens, account } = opts;
			for (let i = 0; i < inputTokens.length; ++i) {
				const { token: inputToken, amount } = inputTokens[i];
				if (preHook) await preHook(inputToken.chain);
				const publicClient = clients[inputToken.chain];
				// Check if we have sufficient allowance already.
				const currentAllowance = await publicClient.readContract({
					address: inputToken.address,
					abi: ERC20_ABI,
					functionName: "allowance",
					args: [account(), COMPACT]
				});
				if (currentAllowance >= amount) continue;
				const transactionHash = walletClient.writeContract({
					chain: chainMap[inputToken.chain],
					account: account(),
					address: inputToken.address,
					abi: ERC20_ABI,
					functionName: "approve",
					args: [COMPACT, maxUint256]
				});

				await publicClient.waitForTransactionReceipt({
					hash: await transactionHash
				});
			}
			if (postHook) await postHook();
		};
	}
}
