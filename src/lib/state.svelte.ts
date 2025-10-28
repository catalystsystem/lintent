import type { WalletState } from "@web3-onboard/core";
import type { OrderContainer } from "../types";
import {
	chainMap,
	clients,
	coinList,
	COMPACT,
	INPUT_SETTLER_COMPACT_LIFI,
	INPUT_SETTLER_ESCROW_LIFI,
	POLYMER_ALLOCATOR,
	type availableAllocators,
	type availableInputSettlers,
	type chain,
	type Token,
	type Verifier
} from "./config";
import { getAllowance, getBalance, getCompactBalance } from "./libraries/token";
import onboard from "./utils/web3-onboard";
import { createWalletClient, custom } from "viem";

export type TokenContext = {
	token: Token;
	amount: bigint;
};

class Store {
	mainnet = $state<boolean>(true);
	orders = $state<OrderContainer[]>([]);

	// --- Wallet --- //
	wallets = onboard.state.select("wallets");
	activeWallet = $state<{ wallet?: WalletState }>({});
	connectedAccount = $derived(this.activeWallet.wallet?.accounts?.[0]);
	walletClient = $derived(
		this.activeWallet?.wallet?.provider
			? createWalletClient({
					transport: custom(this.activeWallet?.wallet?.provider)
				})
			: undefined
	)!;

	// --- Token --- //
	inputTokens = $state<TokenContext[]>([]);
	outputTokens = $state<TokenContext[]>([]);

	// inputTokens = $state<Token[]>([]);
	// outputTokens = $state<Token[]>([]);
	// inputAmounts = $state<bigint[]>([1000000n]);
	// outputAmounts = $state<bigint[]>([1000000n]);

	balances = $derived.by(() => {
		return this.mapOverCoins(getBalance, this.mainnet, this.updatedDerived);
	});
	allowances = $derived.by(() => {
		return this.mapOverCoins(
			getAllowance(this.inputSettler == INPUT_SETTLER_COMPACT_LIFI ? COMPACT : this.inputSettler),
			this.mainnet,
			this.updatedDerived
		);
	});
	compactBalances = $derived.by(() => {
		return this.mapOverCoins(
			(
				user: `0x${string}` | undefined,
				asset: `0x${string}`,
				client: (typeof clients)[keyof typeof clients]
			) => getCompactBalance(user, asset, client, this.allocatorId),
			this.mainnet,
			this.updatedDerived
		);
	});

	// --- Input Side --- //
	inputSettler = $state<availableInputSettlers>(INPUT_SETTLER_ESCROW_LIFI);
	allocatorId = $state<availableAllocators>(POLYMER_ALLOCATOR);

	// --- Oracle --- //
	verifier = $state<Verifier>("polymer");

	// --- Output Side --- //
	exclusiveFor: string = $state("");

	// --- Misc --- //
	updatedDerived = $state(0);

	forceUpdate = () => {
		this.updatedDerived += 1;
	};

	async setWalletToCorrectChain(chain: chain) {
		try {
			return await this.walletClient?.switchChain({ id: chainMap[chain].id });
		} catch (error) {
			console.warn(
				`Wallet does not support switchChain or failed to switch chain: ${chainMap[chain].id}`,
				error
			);
			return undefined;
		}
	}

	mapOverCoins<T>(
		func: (
			user: `0x${string}` | undefined,
			asset: `0x${string}`,
			client: (typeof clients)[keyof typeof clients]
		) => T,
		isMainnet: boolean,
		_: any
	) {
		const resolved: Record<chain, Record<`0x${string}`, T>> = {} as any;
		for (const token of coinList(isMainnet)) {
			// Check whether we have me the chain before.
			if (!resolved[token.chain as chain]) resolved[token.chain] = {};

			resolved[token.chain][token.address] = func(
				this.connectedAccount?.address,
				token.address,
				clients[token.chain]
			);
		}
		return resolved;
	}

	constructor() {
		this.inputTokens = [{ token: coinList(this.mainnet)[0], amount: 1000000n }];
		this.outputTokens = [{ token: coinList(this.mainnet)[1], amount: 1000000n }];

		this.wallets.subscribe((v) => {
			this.activeWallet.wallet = v?.[0];
		});
		setInterval(() => {
			this.updatedDerived += 1;
		}, 10000);
	}
}

export const store = new Store();
export default store;
