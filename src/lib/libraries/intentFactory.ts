import {
	type chain,
	chainMap,
	clients,
	INPUT_SETTLER_COMPACT_LIFI,
	INPUT_SETTLER_ESCROW_LIFI,
	MULTICHAIN_INPUT_SETTLER_ESCROW,
	type Token,
	type WC
} from "$lib/config";
import { maxUint256 } from "viem";
import type {
	CreateIntentOptions,
	MultichainOrder,
	NoSignature,
	OrderContainer,
	Signature,
	StandardOrder,
	TokenContext
} from "../core/types";
import { ERC20_ABI } from "$lib/abi/erc20";
import { Intent } from "$lib/core/intent";
import { OrderServer } from "$lib/core/api/orderServer";
import { store } from "$lib/state.svelte";
import { depositAndRegisterCompact, openEscrowIntent, signIntentCompact } from "./intentExecution";

/**
 * @notice Factory class for creating and managing intents. Functions called by integrators.
 */
export class IntentFactory {
	mainnet: boolean;
	orderServer: OrderServer;

	walletClient: WC;

	preHook?: (chain: chain) => Promise<any>;
	postHook?: () => Promise<any>;

	orders: OrderContainer[] = [];

	constructor(options: {
		mainnet: boolean;
		walletClient: WC;
		preHook?: (chain: chain) => Promise<any>;
		postHook?: () => Promise<any>;
		ordersPointer?: OrderContainer[];
	}) {
		const { mainnet, walletClient, preHook, postHook, ordersPointer } = options;
		this.mainnet = mainnet;
		this.orderServer = new OrderServer(mainnet);
		this.walletClient = walletClient;

		this.preHook = preHook;
		this.postHook = postHook;

		if (ordersPointer) this.orders = ordersPointer;
	}

	private saveOrder(options: {
		order: StandardOrder | MultichainOrder;
		inputSettler: `0x${string}`;
		sponsorSignature?: Signature | NoSignature;
		allocatorSignature?: Signature | NoSignature;
	}) {
		const { order, inputSettler, sponsorSignature, allocatorSignature } = options;

		const orderContainer: OrderContainer = {
			order,
			inputSettler,
			sponsorSignature: sponsorSignature ?? {
				type: "None",
				payload: "0x"
			},
			allocatorSignature: allocatorSignature ?? {
				type: "None",
				payload: "0x"
			}
		};
		this.orders.push(orderContainer);
		store.saveOrderToDb(orderContainer).catch((e) => console.warn("saveOrderToDb error", e));
	}

	compact(opts: CreateIntentOptions) {
		return async () => {
			const { account, inputTokens } = opts;
			const inputChain = inputTokens[0].token.chain;
			if (this.preHook) await this.preHook(inputChain);
			const intent = new Intent(opts).order();

			const sponsorSignature = await signIntentCompact(intent, account(), this.walletClient);

			console.log({
				order: intent.asOrder(),
				sponsorSignature
			});

			this.saveOrder({
				order: intent.asOrder(),
				inputSettler: intent.inputSettler,
				sponsorSignature: {
					type: "ECDSA",
					payload: sponsorSignature
				}
			});

			const signedOrder = await this.orderServer.submitOrder({
				orderType: "CatalystCompactOrder",
				order: intent.asOrder() as StandardOrder,
				inputSettler: INPUT_SETTLER_COMPACT_LIFI,
				sponsorSignature,
				allocatorSignature: "0x"
			});
			console.log("signedOrder", signedOrder);

			if (this.postHook) await this.postHook();
		};
	}

	compactDepositAndRegister(opts: CreateIntentOptions) {
		return async () => {
			const { inputTokens, account } = opts;
			const publicClients = clients;
			const intent = new Intent(opts).singlechain();

			if (this.preHook) await this.preHook(inputTokens[0].token.chain);

			let transactionHash = await depositAndRegisterCompact(intent, account(), this.walletClient);

			const receipt = await publicClients[inputTokens[0].token.chain].waitForTransactionReceipt({
				hash: transactionHash
			});

			// If you use another allocator than polymer, there should be logic for potentially getting the allocator signature here.
			// You may consider getting the allocator signature before you call depositAndRegisterCompact

			// Add the order to our local order list.
			this.saveOrder({
				order: intent.asStandardOrder(),
				inputSettler: INPUT_SETTLER_COMPACT_LIFI
			});

			// Submit the order to the order server.
			const unsignedOrder = await this.orderServer.submitOrder({
				orderType: "CatalystCompactOrder",
				order: intent.asStandardOrder(),
				inputSettler: INPUT_SETTLER_COMPACT_LIFI,
				compactRegistrationTxHash: transactionHash
			});

			console.log("unsignedOrder", unsignedOrder);
			if (this.postHook) await this.postHook();
		};
	}

	openIntent(opts: CreateIntentOptions) {
		return async () => {
			const { inputTokens, account } = opts;
			const intent = new Intent(opts).order();

			const inputChain = inputTokens[0].token.chain;
			if (this.preHook) await this.preHook(inputChain);

			// Execute the open.
			const transactionHashes = await openEscrowIntent(intent, account(), this.walletClient);
			console.log({ tsh: transactionHashes });

			// for (const hash of transactionHashes) {
			// 	await clients[inputChain].waitForTransactionReceipt({
			// 		hash: await hash
			// 	});
			// }

			if (this.postHook) await this.postHook();

			this.saveOrder({
				order: intent.asOrder(),
				inputSettler: store.inputSettler
			});

			return transactionHashes;
		};
	}
}

export function escrowApprove(
	walletClient: WC,
	opts: {
		preHook?: (chain: chain) => Promise<any>;
		postHook?: () => Promise<any>;
		inputTokens: TokenContext[];
		account: () => `0x${string}`;
	}
) {
	return async () => {
		const settler = store.multichain ? MULTICHAIN_INPUT_SETTLER_ESCROW : INPUT_SETTLER_ESCROW_LIFI;

		const { preHook, postHook, inputTokens, account } = opts;
		for (let i = 0; i < inputTokens.length; ++i) {
			const { token, amount } = inputTokens[i];
			if (preHook) await preHook(token.chain);
			const publicClient = clients[token.chain];
			const currentAllowance = await publicClient.readContract({
				address: token.address,
				abi: ERC20_ABI,
				functionName: "allowance",
				args: [account(), settler]
			});
			if (currentAllowance >= amount) continue;
			const transactionHash = walletClient.writeContract({
				chain: chainMap[token.chain],
				account: account(),
				address: token.address,
				abi: ERC20_ABI,
				functionName: "approve",
				args: [settler, maxUint256]
			});

			await publicClient.waitForTransactionReceipt({
				hash: await transactionHash
			});
		}
		if (postHook) await postHook();
	};
}
