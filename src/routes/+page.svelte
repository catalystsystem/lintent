<script lang="ts">
	import onboard from "$lib/utils/web3-onboard";
	import type { NoSignature, OrderContainer, Signature, StandardOrder } from "../types";
	import { coinList, type chain } from "$lib/config";
	import { onDestroy } from "svelte";
	import Introduction from "$lib/components/Introduction.svelte";
	import { OrderServer } from "$lib/libraries/orderServer";
	import ManageDeposit from "$lib/screens/ManageDeposit.svelte";
	import IssueIntent from "$lib/screens/IssueIntent.svelte";
	import IntentList from "$lib/screens/IntentList.svelte";
	import FillIntent from "$lib/screens/FillIntent.svelte";
	import ReceiveMessage from "$lib/screens/ReceiveMessage.svelte";
	import Finalise from "$lib/screens/Finalise.svelte";
	import ConnectWallet from "$lib/screens/ConnectWallet.svelte";
	import store from "$lib/state.svelte";
	import { orderToIntent } from "$lib/libraries/intent";

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

	$effect(() => {
		store.mainnet;
		store.inputTokens = [{ token: coinList(store.mainnet)[0], amount: 0n }];
		store.outputTokens = [{ token: coinList(store.mainnet)[1], amount: 0n }];
	});

	const orderServer = $derived(new OrderServer(store.mainnet));

	let disconnectWs: (() => void) | undefined;

	async function initiatePage() {
		if (disconnectWs) disconnectWs();

		// Wait for DB to finish loading so WS orders don't race with DB load
		await store.dbReady;

		// Connect to websocket server
		const connection = orderServer.connectOrderServerSocket((order: OrderPackage) => {
			try {
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
				const orderContainer = { ...order, allocatorSignature, sponsorSignature };

				// Deduplicate: only add if not already present
				const orderId = orderToIntent(orderContainer).orderId();
				const alreadyExists = store.orders.some((o) => orderToIntent(o).orderId() === orderId);
				if (alreadyExists) return;

				store.orders.push(orderContainer);
				store.saveOrderToDb(orderContainer).catch((e) => console.warn("saveOrderToDb error", e));
				console.log({ orders: store.orders, order });
			} catch (error) {
				console.error(error);
			}
		});
		disconnectWs = connection.disconnect;
	}

	$effect(() => {
		store.mainnet;
		initiatePage();
	});

	onDestroy(() => {
		if (disconnectWs) disconnectWs();
	});

	// --- Wallet --- //

	export async function connect() {
		await onboard.connectWallet();
	}

	// --- Execute Transaction Variables --- //
	const preHook = (chain: chain) => store.setWalletToCorrectChain(chain);
	const postHook = async () => store.forceUpdate();
	const account = () => store.connectedAccount?.address!;

	let selectedOrder = $state<OrderContainer | undefined>(undefined);

	let snapContainer: HTMLDivElement;

	function scroll(next: boolean | number) {
		return () => {
			if (!snapContainer) return;
			const width = snapContainer.clientWidth + 1;
			const maxScreenIndex = Math.max(Math.ceil(snapContainer.scrollWidth / width) - 1, 0);
			const currentScreenIndex = Math.round(snapContainer.scrollLeft / width);
			const targetScreenIndex =
				typeof next === "number"
					? Math.max(0, Math.min(next, maxScreenIndex))
					: Math.max(0, Math.min(currentScreenIndex + (next ? 1 : -1), maxScreenIndex));
			snapContainer.scrollTo({
				left: targetScreenIndex * width,
				behavior: "smooth"
			});
		};
	}
</script>

<main class="main">
	<h1 class="mb-1 pt-3 text-center align-middle text-xl font-medium text-gray-900">
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

				{#if !(!store.connectedAccount || !store.walletClient)}
					<!-- Right Button -->
					<button
						class="absolute top-1.5 left-[23rem] z-50 cursor-pointer rounded bg-sky-50 px-1"
						onclick={scroll(true)}
					>
						→
					</button>
					<!-- Back Button -->
					<button
						class="absolute top-1.5 left-[1rem] z-50 cursor-pointer rounded bg-sky-50 px-1"
						onclick={scroll(false)}
					>
						←
					</button>
				{/if}
				<div class="flex h-full w-max flex-row">
					{#if !store.connectedAccount || !store.walletClient}
						<ConnectWallet {onboard}></ConnectWallet>
					{:else}
						<ManageDeposit {scroll} {preHook} {postHook} {account}></ManageDeposit>
						<IssueIntent {scroll} {preHook} {postHook} {account}></IssueIntent>
						<IntentList {scroll} bind:selectedOrder orderContainers={store.orders}></IntentList>
						{#if selectedOrder !== undefined}
							<!-- <IntentDescription></IntentDescription> -->
							<FillIntent {scroll} orderContainer={selectedOrder} {account} {preHook} {postHook}
							></FillIntent>
							<ReceiveMessage {scroll} orderContainer={selectedOrder} {account} {preHook} {postHook}
							></ReceiveMessage>
							<Finalise orderContainer={selectedOrder} {preHook} {postHook} {account}></Finalise>
						{/if}
					{/if}
				</div>
			</div>
		</div>
	</div>
	<!-- Make a table to display orders from users -->
	<!-- <IntentTable {orders} walletClient={walletClient!} bind:opts={swapState} {updatedDerived} /> -->
</main>
