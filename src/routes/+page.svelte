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
	import FlowProgressList, { type FlowStep } from "$lib/components/ui/FlowProgressList.svelte";
	import store from "$lib/state.svelte";
	import { orderToIntent } from "$lib/libraries/intent";
	import { getOrderProgressChecks, getOutputStorageKey } from "$lib/libraries/flowProgress";

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
	let currentScreenIndex = $state(0);
	let scrollStepProgress = $state(0);
	let progressRefreshTick = $state(0);
	let flowChecksRun = 0;
	let flowChecks = $state({
		allFilled: false,
		allValidated: false,
		allFinalised: false
	});

	let snapContainer: HTMLDivElement;

	function getScreenWidth() {
		if (!snapContainer) return 0;
		return snapContainer.clientWidth + 1;
	}

	function getMaxScreenIndex() {
		if (!snapContainer) return 0;
		const width = getScreenWidth();
		return Math.max(Math.ceil(snapContainer.scrollWidth / width) - 1, 0);
	}

	function updateCurrentScreenIndex() {
		if (!snapContainer) return;
		const width = getScreenWidth();
		const maxScreenIndex = getMaxScreenIndex();
		const rawIndex = snapContainer.scrollLeft / width;
		scrollStepProgress = Math.max(0, Math.min(rawIndex, maxScreenIndex));
		currentScreenIndex = Math.round(scrollStepProgress);
	}

	function goToScreen(index: number) {
		if (!snapContainer) return;
		const width = getScreenWidth();
		const maxScreenIndex = getMaxScreenIndex();
		const targetScreenIndex = Math.max(0, Math.min(index, maxScreenIndex));
		currentScreenIndex = targetScreenIndex;
		scrollStepProgress = targetScreenIndex;
		snapContainer.scrollTo({
			left: targetScreenIndex * width,
			behavior: "smooth"
		});
	}

	function scroll(next: boolean | number) {
		return () => {
			if (!snapContainer) return;
			updateCurrentScreenIndex();
			const maxScreenIndex = getMaxScreenIndex();
			const targetScreenIndex =
				typeof next === "number"
					? Math.max(0, Math.min(next, maxScreenIndex))
					: Math.max(0, Math.min(currentScreenIndex + (next ? 1 : -1), maxScreenIndex));
			goToScreen(targetScreenIndex);
		};
	}

	const selectedOutputFillHashSignature = $derived.by(() => {
		if (!selectedOrder) return "";
		return selectedOrder.order.outputs
			.map((output) => store.fillTransactions[getOutputStorageKey(output)] ?? "")
			.join("|");
	});

	$effect(() => {
		const interval = setInterval(() => {
			progressRefreshTick += 1;
		}, 30_000);
		return () => clearInterval(interval);
	});

	$effect(() => {
		progressRefreshTick;
		store.connectedAccount;
		store.walletClient;
		selectedOrder;
		selectedOutputFillHashSignature;

		if (!store.connectedAccount || !store.walletClient || !selectedOrder) {
			flowChecks = {
				allFilled: false,
				allValidated: false,
				allFinalised: false
			};
			return;
		}

		const currentRun = ++flowChecksRun;
		getOrderProgressChecks(selectedOrder, store.fillTransactions)
			.then((checks) => {
				if (currentRun !== flowChecksRun) return;
				flowChecks = checks;
			})
			.catch((error) => {
				console.warn("flow progress update failed", error);
				if (currentRun !== flowChecksRun) return;
				flowChecks = {
					allFilled: false,
					allValidated: false,
					allFinalised: false
				};
			});
	});

	const progressSteps = $derived.by(() => {
		const connected = !!store.connectedAccount && !!store.walletClient;
		if (!connected) {
			return [
				{
					id: "connect",
					label: "Connect Wallet",
					status: "active",
					clickable: true,
					targetIndex: 0
				},
				{
					id: "assets",
					label: "Assets Management",
					status: "locked",
					clickable: false
				},
				{
					id: "issue",
					label: "Intent Issuance",
					status: "locked",
					clickable: false
				},
				{
					id: "select",
					label: "Select Intent",
					status: "locked",
					clickable: false
				},
				{
					id: "fill",
					label: "Fill Intent",
					status: "locked",
					clickable: false
				},
				{
					id: "proof",
					label: "Submit Proof",
					status: "locked",
					clickable: false
				},
				{
					id: "finalise",
					label: "Finalise Intent",
					status: "locked",
					clickable: false
				}
			] as FlowStep[];
		}

		const selected = selectedOrder !== undefined;
		const activeByIndex = ["assets", "issue", "select", "fill", "proof", "finalise"];
		const activeStep =
			activeByIndex[Math.max(0, Math.min(currentScreenIndex, activeByIndex.length - 1))];

		const assetsDone = currentScreenIndex > 0;
		const issueDone = currentScreenIndex > 1;
		const selectDone = selected;

		return [
			{
				id: "assets",
				label: "Asset",
				status: activeStep === "assets" ? "active" : assetsDone ? "completed" : "pending",
				clickable: true,
				targetIndex: 0
			},
			{
				id: "issue",
				label: "Issue",
				status: activeStep === "issue" ? "active" : issueDone ? "completed" : "pending",
				clickable: true,
				targetIndex: 1
			},
			{
				id: "select",
				label: "Fetch",
				status: activeStep === "select" ? "active" : selectDone ? "completed" : "pending",
				clickable: true,
				targetIndex: 2
			},
			{
				id: "fill",
				label: "Fill",
				status: !selected
					? "locked"
					: activeStep === "fill"
						? "active"
						: flowChecks.allFilled
							? "completed"
							: "pending",
				clickable: selected,
				targetIndex: 3
			},
			{
				id: "proof",
				label: "Prove",
				status: !selected
					? "locked"
					: activeStep === "proof"
						? "active"
						: flowChecks.allValidated
							? "completed"
							: "pending",
				clickable: selected,
				targetIndex: 4
			},
			{
				id: "finalise",
				label: "Claim",
				status: !selected
					? "locked"
					: activeStep === "finalise"
						? "active"
						: flowChecks.allFinalised
							? "completed"
							: "pending",
				clickable: selected,
				targetIndex: 5
			}
		] as FlowStep[];
	});

	const progressConnectorPosition = $derived.by(() => {
		if (!store.connectedAccount || !store.walletClient) return 0;
		const maxIndex = Math.max(progressSteps.length - 1, 0);
		return Math.max(0, Math.min(scrollStepProgress, maxIndex));
	});
</script>

<main class="main">
	<h1 class="mb-1 pt-3 text-center align-middle text-xl font-medium text-gray-900">
		Resource lock intents using OIF
	</h1>
	<div
		class="mx-auto flex flex-col-reverse items-center px-4 pt-2 md:max-w-[80rem] md:flex-row md:items-start md:px-10 md:pt-3"
	>
		<Introduction />
		<div class="mb-4 flex h-[30rem] w-max flex-row items-stretch gap-2 md:mb-0">
			<div class="relative h-full w-[25rem]">
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="h-[30rem] w-[25rem] snap-x snap-mandatory overflow-x-auto overflow-y-hidden rounded-md border border-gray-200 bg-gray-50"
					bind:this={snapContainer}
					onscroll={updateCurrentScreenIndex}
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
								<ReceiveMessage
									{scroll}
									orderContainer={selectedOrder}
									{account}
									{preHook}
									{postHook}
								></ReceiveMessage>
								<Finalise orderContainer={selectedOrder} {preHook} {postHook} {account}></Finalise>
							{/if}
						{/if}
					</div>
				</div>
			</div>
			<FlowProgressList
				className="h-full w-[6.25rem] flex-shrink-0"
				steps={progressSteps}
				progress={progressConnectorPosition}
				onStepClick={(step) => {
					if (step.targetIndex === undefined) return;
					goToScreen(step.targetIndex);
				}}
			/>
		</div>
	</div>
	<!-- Make a table to display orders from users -->
	<!-- <IntentTable {orders} walletClient={walletClient!} bind:opts={swapState} {updatedDerived} /> -->
</main>
