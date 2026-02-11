import type { WalletState } from "@web3-onboard/core";
import type { OrderContainer } from "../types";
import {
	ALWAYS_OK_ALLOCATOR,
	chainMap,
	clients,
	coinList,
	COMPACT,
	INPUT_SETTLER_COMPACT_LIFI,
	INPUT_SETTLER_ESCROW_LIFI,
	MULTICHAIN_INPUT_SETTLER_COMPACT,
	MULTICHAIN_INPUT_SETTLER_ESCROW,
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
import { browser } from "$app/environment";
import { initDb, db } from "./db";
import { intents, fillTransactions as fillTransactionsTable } from "./schema";
import { eq } from "drizzle-orm";
import { orderToIntent } from "./libraries/intent";

export type TokenContext = {
	token: Token;
	amount: bigint;
};

class Store {
	mainnet = $state<boolean>(true);
	orders = $state<OrderContainer[]>([]);

	// Load orders from PGLite/Drizzle-backed DB instead of only keeping them in memory
	async loadOrdersFromDb() {
		if (!browser) return;
		if (!db) await initDb();
		if (!db) return;
		const rows = await db!.select().from(intents);
		this.orders = rows.map((r: any) => JSON.parse(r.data) as OrderContainer);
	}

	async saveOrderToDb(order: OrderContainer) {
		if (!browser) return;
		if (!db) await initDb();
		if (!db) return;
		const orderId = orderToIntent(order).orderId();
		const now = Date.now();
		const id =
			(order as any).id ?? (typeof crypto !== "undefined" ? crypto.randomUUID() : String(now));
		const intentType = (order as any).intentType ?? "escrow";
		await db!
			.insert(intents)
			.values({
				id,
				orderId: orderId,
				intentType,
				data: JSON.stringify(order),
				createdAt: now
			})
			.onConflictDoUpdate({
				target: intents.orderId,
				set: {
					intentType,
					data: JSON.stringify(order)
				}
			});
		// Update in-memory too
		const idx = this.orders.findIndex((o) => orderToIntent(o).orderId() === orderId);
		if (idx >= 0) {
			this.orders[idx] = order;
		} else {
			this.orders.push(order);
		}
	}

	async deleteOrderFromDb(orderId: string) {
		if (!browser) return;
		if (!db) await initDb();
		if (!db) return;
		await db!.delete(intents).where(eq(intents.orderId, orderId));
		await this.loadOrdersFromDb();
	}

	async loadFillTransactionsFromDb() {
		if (!browser) return;
		if (!db) await initDb();
		if (!db) return;
		const rows = await db!.select().from(fillTransactionsTable);
		const loaded: { [outputId: string]: `0x${string}` } = {};
		for (const row of rows) {
			loaded[row.outputHash] = row.txHash as `0x${string}`;
		}
		this.fillTransactions = loaded;
	}

	async saveFillTransaction(outputHash: string, txHash: `0x${string}`) {
		if (!browser) return;
		if (!db) await initDb();
		if (!db) return;
		const existing = await db!
			.select()
			.from(fillTransactionsTable)
			.where(eq(fillTransactionsTable.outputHash, outputHash));
		if (existing.length > 0) {
			await db!
				.update(fillTransactionsTable)
				.set({ txHash })
				.where(eq(fillTransactionsTable.outputHash, outputHash));
		} else {
			await db!.insert(fillTransactionsTable).values({
				id: typeof crypto !== "undefined" ? crypto.randomUUID() : String(Date.now()),
				outputHash,
				txHash
			});
		}
	}

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

	fillTransactions = $state<{ [outputId: string]: `0x${string}` }>({});

	balances = $derived.by(() => {
		return this.mapOverCoins(getBalance, this.mainnet, this.updatedDerived);
	});
	allowances = $derived.by(() => {
		return this.mapOverCoins(
			getAllowance(
				this.inputSettler === INPUT_SETTLER_COMPACT_LIFI ||
					this.inputSettler === MULTICHAIN_INPUT_SETTLER_COMPACT
					? COMPACT
					: this.inputSettler
			),
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

	multichain = $derived([...new Set(this.inputTokens.map((i) => i.token.chain))].length > 1);

	// --- Input Side --- //
	// TODO: remove
	inputSettler = $derived.by(() => {
		if (this.intentType === "escrow" && !this.multichain) return INPUT_SETTLER_ESCROW_LIFI;
		if (this.intentType === "escrow" && this.multichain) return MULTICHAIN_INPUT_SETTLER_ESCROW;

		if (this.intentType === "compact" && !this.multichain) return INPUT_SETTLER_COMPACT_LIFI;
		if (this.intentType === "compact" && this.multichain) return MULTICHAIN_INPUT_SETTLER_COMPACT;

		return INPUT_SETTLER_ESCROW_LIFI;
	});
	intentType = $state<"escrow" | "compact">("escrow");
	allocatorId = $state<availableAllocators>(ALWAYS_OK_ALLOCATOR);

	// --- Oracle --- //
	verifier = $state<Verifier>("polymer");

	// --- Output Side --- //
	exclusiveFor: string = $state("");

	// --- Misc --- //
	updatedDerived = $state(0);

	forceUpdate = () => {
		this.updatedDerived += 1;
	};

	// Background sync settings
	syncIntervalMs = 5000;
	_syncHandle?: ReturnType<typeof setInterval>;

	startSync(intervalMs?: number) {
		this.stopSync();
		this._syncHandle = setInterval(() => {
			this.loadOrdersFromDb().catch((e) => console.warn("sync error", e));
		}, intervalMs ?? this.syncIntervalMs);
	}

	stopSync() {
		if (this._syncHandle) {
			clearInterval(this._syncHandle);
			this._syncHandle = undefined;
		}
	}

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

	dbReady: Promise<void> | undefined;

	constructor() {
		this.inputTokens = [{ token: coinList(this.mainnet)[0], amount: 1000000n }];
		this.outputTokens = [{ token: coinList(this.mainnet)[1], amount: 1000000n }];

		this.wallets.subscribe((v) => {
			this.activeWallet.wallet = v?.[0];
		});
		setInterval(() => {
			this.updatedDerived += 1;
		}, 10000);

		// Initial load from DB — expose as a promise so callers can await readiness
		this.dbReady = browser
			? Promise.all([
					this.loadOrdersFromDb().catch((e) => console.warn("loadOrdersFromDb error", e)),
					this.loadFillTransactionsFromDb().catch((e) =>
						console.warn("loadFillTransactionsFromDb error", e)
					)
				]).then(() => {})
			: Promise.resolve();
	}
}

export const store = new Store();
export default store;
