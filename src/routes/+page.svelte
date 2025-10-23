<script lang="ts">
	import onboard from "$lib/utils/web3-onboard";
	import { createWalletClient, custom } from "viem";
	import type { WalletState } from "@web3-onboard/core";
	import type { NoSignature, OrderContainer, Signature, StandardOrder } from "../types";
	import {
		type Token,
		type chain,
		type Verifier,
		ALWAYS_OK_ALLOCATOR,
		POLYMER_ALLOCATOR,
		chainMap,
		clients,
		INPUT_SETTLER_COMPACT_LIFI,
		INPUT_SETTLER_ESCROW_LIFI,
		COMPACT,
		coinList
	} from "$lib/config";
	import { onDestroy, onMount } from "svelte";
	import Introduction from "$lib/components/Introduction.svelte";
	import { getBalance, getAllowance, getCompactBalance } from "$lib/state.svelte";
	import { OrderServer } from "$lib/libraries/orderServer";
	import { validateOrder } from "$lib/utils/orderLib";
	import ManageDeposit from "$lib/screens/ManageDeposit.svelte";
	import IssueIntent from "$lib/screens/IssueIntent.svelte";
	import IntentList from "$lib/screens/IntentList.svelte";
	import FillIntent from "$lib/screens/FillIntent.svelte";
	import ReceiveMessage from "$lib/screens/ReceiveMessage.svelte";
	import Finalise from "$lib/screens/Finalise.svelte";
	import ConnectWallet from "$lib/screens/ConnectWallet.svelte";
	import TokenModal from "$lib/screens/TokenModal.svelte";

	// Fix bigint so we can json serialize it:
	(BigInt.prototype as any).toJSON = function () {
		return this.toString();
	};

	type OrderPackage = {
		order: StandardOrder;
		inputSettler: `0x${string}`;
		sponsorSignature?: `0x${string}`;
		allocatorSignature?: `0x${string}`;
	};

	let mainnet = $state(true);
	const orderServer = $derived(new OrderServer(mainnet));

	let orders = $state<OrderContainer[]>([]);

	let s: WebSocket;
	function initatePage() {
		if (s) s.close();
		orders = [];
		// Connect to websocket server
		let { socket } = orderServer.connectOrderServerSocket((order: OrderPackage) => {
			const allocatorSignature = order.allocatorSignature
				? ({
						type: "ECDSA",
						payload: order.allocatorSignature
					} as Signature)
				: ({
						type: "None",
						payload: "0x"
					} as NoSignature);
			const sponsorSignature = order.sponsorSignature
				? ({
						type: "ECDSA",
						payload: order.sponsorSignature
					} as Signature)
				: ({
						type: "None",
						payload: "0x"
					} as NoSignature);
			orders.push({ ...order, allocatorSignature, sponsorSignature });
			console.log({ orders, order });
		});
		s = socket;
		onDestroy(() => s.close());
	}

	$effect(() => {
		mainnet;
		initatePage();
	});

	onMount(() => {
		initatePage();
	});

	// --- Wallet --- //
	const wallets = onboard.state.select("wallets");
	const activeWallet = $state<{ wallet?: WalletState }>({});
	wallets.subscribe((v) => {
		activeWallet.wallet = v?.[0];
	});
	const connectedAccount = $derived(activeWallet.wallet?.accounts?.[0]);

	const walletClient = $derived(
		activeWallet?.wallet?.provider
			? createWalletClient({
					transport: custom(activeWallet?.wallet?.provider)
				})
			: undefined
	);

	export async function setWalletToCorrectChain(chain: chain) {
		try {
			return await walletClient?.switchChain({ id: chainMap[chain].id });
		} catch (error) {
			console.warn(
				`Wallet does not support switchChain or failed to switch chain: ${chainMap[chain].id}`,
				error
			);
			return undefined;
		}
	}

	export async function connect() {
		await onboard.connectWallet();
	}

	// --- Execute Transaction Variables --- //
	const preHook = setWalletToCorrectChain;
	const postHook = async () => forceUpdate();
	const account = () => connectedAccount?.address!;
	let inputNumber = $state(1); // Window number
	let outputNumber = $state(1); // Window number

	let exclusiveFor: string = $state("");

	$effect(() => {
		mainnet;
		console.log(coinList(mainnet));
		inputTokens = [coinList(mainnet)[0]];
		outputToken = coinList(mainnet)[1];
	});

	// svelte-ignore state_referenced_locally
	let inputTokens: Token[] = $state([coinList(mainnet)[0]]);
	let inputToken = $derived(inputTokens[0]);
	// svelte-ignore state_referenced_locally
	let outputToken: Token = $state(coinList(mainnet)[1]);
	let inputAmounts = $state([1000000n]);
	let outputAmount = $state(1000000n);
	// const verifier: verifier = 'polymer';
	let allocatorId: typeof ALWAYS_OK_ALLOCATOR | typeof POLYMER_ALLOCATOR =
		$state(POLYMER_ALLOCATOR);
	let inputSettler: typeof INPUT_SETTLER_COMPACT_LIFI | typeof INPUT_SETTLER_ESCROW_LIFI =
		$state(INPUT_SETTLER_ESCROW_LIFI);

	let verifier: Verifier = $state("polymer");

	// Filling Orders
	let selectedOrder: OrderContainer | undefined = $state(undefined);
	let fillTransactionHash: `0x${string}` | undefined = $state(undefined);

	let showTokenSelector: {
		active: number;
		input: boolean;
		index: number;
	} = $state({
		active: 0,
		input: true,
		index: 0
	});

	let updatedDerived = $state(0);
	setInterval(() => {
		updatedDerived += 1;
	}, 10000);
	const forceUpdate = () => {
		updatedDerived += 1;
	};

	function mapOverCoins<T>(
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
				connectedAccount?.address,
				token.address,
				clients[token.chain]
			);
		}
		return resolved;
	}

	const balances = $derived.by(() => {
		return mapOverCoins(getBalance, mainnet, updatedDerived);
	});

	const allowances = $derived.by(() => {
		return mapOverCoins(
			getAllowance(inputSettler == INPUT_SETTLER_COMPACT_LIFI ? COMPACT : inputSettler),
			mainnet,
			updatedDerived
		);
	});

	const compactBalances = $derived.by(() => {
		return mapOverCoins(
			(
				user: `0x${string}` | undefined,
				asset: `0x${string}`,
				client: (typeof clients)[keyof typeof clients]
			) => getCompactBalance(user, asset, client, allocatorId),
			mainnet,
			updatedDerived
		);
	});

	let snapContainer: HTMLDivElement;

	function scroll(next: boolean | number) {
		return () => {
			if (!snapContainer) return;
			const scrollLeft = snapContainer.scrollLeft;
			const width = snapContainer.clientWidth;
			snapContainer.scrollTo({
				left: next ? scrollLeft + Number(next) * width : scrollLeft - width,
				behavior: "smooth"
			});
		};
	}
</script>

<main class="main">
	<h1 class="mb-2 pt-3 text-center align-middle text-xl font-medium">
		Resource lock intents using OIF
	</h1>
	<div
		class="mx-auto flex flex-col-reverse items-center px-4 pt-2 md:max-w-[80rem] md:flex-row md:items-start md:px-10 md:pt-3"
	>
		<Introduction />
		<div class="relative mb-4 h-[30rem] w-[25rem] md:mb-0">
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="h-[30rem] w-[25rem] snap-x snap-mandatory overflow-x-auto overflow-y-hidden rounded-md border border-gray-200 bg-gray-50"
				bind:this={snapContainer}
			>
				<!-- Right Button -->
				<a
					class="absolute bottom-2 left-[18.5rem] w-40 cursor-pointer rounded px-1 text-xs hover:text-sky-800"
					href="https://li.fi"
				>
					Preview by LI.FI
				</a>

				<!-- Asset Overlay -->
				<TokenModal
					bind:showTokenSelector
					{mainnet}
					{inputSettler}
					{compactBalances}
					{balances}
					bind:inputTokens
					bind:outputToken
					bind:inputAmounts
					bind:outputAmount
				></TokenModal>
				{#if !(!connectedAccount || !walletClient)}
					<!-- Right Button -->
					<button
						class="absolute top-1.5 left-[23rem] cursor-pointer rounded bg-sky-50 px-1"
						onclick={scroll(true)}
					>
						→
					</button>
					<!-- Back Button -->
					<button
						class="absolute top-1.5 left-[1rem] cursor-pointer rounded bg-sky-50 px-1"
						onclick={scroll(false)}
					>
						←
					</button>
				{/if}
				<div class="flex h-full w-max flex-row">
					{#if !connectedAccount || !walletClient}
						<ConnectWallet {onboard}></ConnectWallet>
					{:else}
						<ManageDeposit
							{scroll}
							bind:inputSettler
							bind:allocatorId
							bind:inputNumber
							bind:inputToken
							bind:mainnet
							{compactBalances}
							{balances}
							{allowances}
							{walletClient}
							{preHook}
							{postHook}
							{account}
						></ManageDeposit>
						<IssueIntent
							{scroll}
							bind:showTokenSelector
							{inputSettler}
							bind:exclusiveFor
							{mainnet}
							{allocatorId}
							{inputAmounts}
							{outputAmount}
							{inputTokens}
							{outputToken}
							{verifier}
							{compactBalances}
							{balances}
							{allowances}
							{walletClient}
							bind:orders
							{preHook}
							{postHook}
							{account}
						></IssueIntent>
						<IntentList {scroll} bind:selectedOrder orderContainers={orders}></IntentList>
						{#if selectedOrder !== undefined}
							<!-- <IntentDescription></IntentDescription> -->
							<FillIntent
								{scroll}
								orderContainer={selectedOrder}
								{walletClient}
								{account}
								{preHook}
								{postHook}
								bind:fillTransactionHash
							></FillIntent>
							{#if fillTransactionHash}
								<ReceiveMessage
									orderContainer={selectedOrder}
									{walletClient}
									{fillTransactionHash}
									{account}
									{preHook}
									{postHook}
								></ReceiveMessage>
								<Finalise
									orderContainer={selectedOrder}
									{walletClient}
									{fillTransactionHash}
									{preHook}
									{postHook}
									{account}
								></Finalise>
							{/if}
						{/if}
					{/if}
				</div>
			</div>
		</div>
	</div>
	<!-- Make a table to display orders from users -->
	<!-- <IntentTable {orders} walletClient={walletClient!} bind:opts={swapState} {updatedDerived} /> -->
</main>
