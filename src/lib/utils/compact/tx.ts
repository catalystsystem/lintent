/// -- Compact -- ///
import { maxInt32, maxUint256, toHex } from "viem";
import { ResetPeriod, toId } from "./IdLib";
import {
    ADDRESS_ZERO,
    type chain,
    chainMap,
    clients,
    COMPACT,
    type WC,
} from "$lib/config";
import { COMPACT_ABI } from "$lib/abi/compact";
import { addressToBytes32 } from "../convert";
import { ERC20_ABI } from "$lib/abi/erc20";

export function compactDeposit(walletClient: WC, opts: {
    preHook?: (chain?: chain) => Promise<any>;
    postHook?: () => Promise<any>;
    inputChain: chain;
    account: () => `0x${string}`;
    inputAsset: `0x${string}`;
    inputAmount: bigint;
    allocatorId: string;
}) {
    return async () => {
        const {
            preHook,
            postHook,
            inputChain,
            account,
            inputAsset,
            allocatorId,
            inputAmount,
        } = opts;
        const publicClients = clients;
        if (preHook) await preHook();
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
        if (inputAsset === ADDRESS_ZERO) {
            transactionHash = await walletClient.writeContract({
                chain: chainMap[inputChain],
                account: account(),
                address: COMPACT,
                abi: COMPACT_ABI,
                functionName: "depositNative",
                value: inputAmount,
                args: [lockTag, recipient],
            });
        } else {
            transactionHash = await walletClient.writeContract({
                chain: chainMap[inputChain],
                account: account(),
                address: COMPACT,
                abi: COMPACT_ABI,
                functionName: "depositERC20",
                args: [inputAsset, lockTag, inputAmount, recipient],
            });
        }
        await publicClients[inputChain].waitForTransactionReceipt({
            hash: await transactionHash,
        });
        if (postHook) await postHook();
        return transactionHash;
    };
}

export function compactWithdraw(walletClient: WC, opts: {
    preHook?: (chain?: chain) => Promise<any>;
    postHook?: () => Promise<any>;
    inputChain: chain;
    account: () => `0x${string}`;
    inputAsset: `0x${string}`;
    inputAmount: bigint;
    allocatorId: string;
}) {
    return async () => {
        const {
            preHook,
            postHook,
            inputChain,
            account,
            inputAsset,
            allocatorId,
            inputAmount,
        } = opts;
        const publicClients = clients;
        const assetId = toId(
            true,
            ResetPeriod.OneDay,
            allocatorId,
            inputAsset,
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
            recipients: [{
                claimant: BigInt(addressToBytes32(account())),
                amount: inputAmount,
            }],
        };

        if (preHook) await preHook();
        const transactionHash = walletClient.writeContract({
            chain: chainMap[inputChain],
            account: account(),
            address: COMPACT,
            abi: COMPACT_ABI,
            functionName: "allocatedTransfer",
            args: [allocatedTransferStruct],
        });
        await publicClients[inputChain].waitForTransactionReceipt({
            hash: await transactionHash,
        });
        if (postHook) await postHook();
        return transactionHash;
    };
}

export function compactApprove(walletClient: WC, opts: {
    preHook?: (chain?: chain) => Promise<any>;
    postHook?: () => Promise<any>;
    inputChain: chain;
    account: () => `0x${string}`;
    inputAsset: `0x${string}`;
}) {
    return async () => {
        const {
            preHook,
            postHook,
            inputChain,
            account,
            inputAsset,
        } = opts;
        const publicClients = clients;
        if (preHook) await preHook();
        const transactionHash = walletClient.writeContract({
            chain: chainMap[inputChain],
            account: account(),
            address: inputAsset,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [COMPACT, maxUint256],
        });

        await publicClients[inputChain].waitForTransactionReceipt({
            hash: await transactionHash,
        });
        if (postHook) await postHook();
        return transactionHash;
    };
}
