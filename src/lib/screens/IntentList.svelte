<script lang="ts">
	import { onDestroy } from "svelte";
	import { tick } from "svelte";
	import { orderToIntent } from "$lib/libraries/intent";
	import IntentListDetailRow from "$lib/components/IntentListDetailRow.svelte";
	import {
		buildBaseIntentRow,
		withTiming,
		formatRelativeDeadline,
		formatRemaining,
		type TimedIntentRow
	} from "$lib/libraries/intentList";
	import type { OrderContainer } from "../../types";

	let {
		scroll,
		selectedOrder = $bindable(),
		orderContainers
	}: {
		scroll: (direction: boolean | number) => () => void;
		selectedOrder: OrderContainer | undefined;
		orderContainers: OrderContainer[];
	} = $props();

	function getActiveRightBadge(row: TimedIntentRow, selectedOrderId: string | undefined) {
		return selectedOrderId === row.orderId ? "Active" : "Expires";
	}

	function getActiveRightText(row: TimedIntentRow, selectedOrderId: string | undefined) {
		return selectedOrderId === row.orderId
			? `for ${formatRemaining(row.secondsToDeadline)}`
			: `in ${formatRemaining(row.secondsToDeadline)}`;
	}

	let nowSeconds = $state(Math.floor(Date.now() / 1000));
	let expandedExpiredOrderId = $state<string | undefined>(undefined);
	const clock = setInterval(() => {
		nowSeconds = Math.floor(Date.now() / 1000);
	}, 1000);
	onDestroy(() => clearInterval(clock));

	const baseRows = $derived(
		orderContainers.map((orderContainer) => buildBaseIntentRow(orderContainer))
	);
	const rows = $derived(baseRows.map((row) => withTiming(row, nowSeconds)));

	const activeRows = $derived(
		[...rows]
			.filter((row) => row.status !== "expired")
			.sort((a, b) => a.fillDeadline - b.fillDeadline)
	);

	const expiredRows = $derived(
		[...rows]
			.filter((row) => row.status === "expired")
			.sort((a, b) => b.fillDeadline - a.fillDeadline)
	);

	const selectedOrderId = $derived(
		selectedOrder ? orderToIntent(selectedOrder).orderId() : undefined
	);
</script>

<div class="h-[29rem] w-[25rem] flex-shrink-0 snap-center snap-always p-4">
	<h1 class="mb-2 w-full text-center text-2xl font-medium">Select Intent To Solve</h1>
	<p class="text-sm">Urgent intents are shown first. Click any row to open it in the fill flow.</p>
	<div class="mt-2 flex h-[22rem] flex-col overflow-y-auto align-middle">
		<div class="mb-2 text-xs font-semibold text-gray-500">Active intents ({activeRows.length})</div>
		<div class="space-y-2">
			{#each activeRows as row (row.orderId)}
				<button
					class:border-amber-300={row.status === "expiring"}
					class:bg-amber-50={row.status === "expiring"}
					class="w-full cursor-pointer rounded border border-gray-200 bg-white px-2 py-2 text-left transition-shadow ease-linear select-none hover:shadow-md focus:outline-none focus-visible:outline-none"
					style="-webkit-tap-highlight-color: transparent;"
					onclick={async () => {
						selectedOrder = row.orderContainer;
						await tick();
						scroll(3)();
					}}
				>
					<IntentListDetailRow
						{row}
						rightBadge={getActiveRightBadge(row, selectedOrderId)}
						rightText={getActiveRightText(row, selectedOrderId)}
					/>
				</button>
			{/each}
		</div>

		<div class="mt-3 mb-2 text-xs font-semibold text-gray-400">
			Expired intents ({expiredRows.length})
		</div>
		<div class="space-y-1">
			{#each expiredRows as row (row.orderId)}
				<button
					class="w-full cursor-pointer rounded border border-gray-200 bg-gray-50 px-2 py-1.5 text-left text-xs text-gray-500 transition-colors select-none hover:bg-gray-100 focus:outline-none focus-visible:outline-none"
					style="-webkit-tap-highlight-color: transparent;"
					onclick={async () => {
						expandedExpiredOrderId =
							expandedExpiredOrderId === row.orderId ? undefined : row.orderId;
					}}
				>
					{#if expandedExpiredOrderId === row.orderId}
						<IntentListDetailRow
							{row}
							rightBadge="Expired"
							rightText={formatRelativeDeadline(row.secondsToDeadline)}
						/>
					{:else}
						<div class="flex items-center justify-between gap-2">
							<div class="min-w-0 truncate">
								{row.chainScope} • {row.inputCount} in → {row.outputCount} out • {row.orderIdShort}
							</div>
							<div class="flex-shrink-0">{formatRelativeDeadline(row.secondsToDeadline)}</div>
						</div>
					{/if}
				</button>
			{/each}
		</div>
	</div>
</div>
