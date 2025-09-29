<script lang="ts">
	import AwaitButton from "../components/AwaitButton.svelte";

	import { claim } from "$lib/utils/lifiintent/tx";
	import type { OrderContainer, StandardOrder } from "../../types";
	import {
		COMPACT,
		formatTokenAmount,
		getChainName,
		getClient,
		getCoin,
		INPUT_SETTLER_COMPACT_LIFI,
		INPUT_SETTLER_ESCROW_LIFI,
		type chain,
		type WC
	} from "$lib/config";
	import { COMPACT_ABI } from "$lib/abi/compact";
	import { SETTLER_ESCROW_ABI } from "$lib/abi/escrow";
	import { idToToken } from "$lib/utils/convert";

	let {
		orderContainer,
		walletClient,
		fillTransactionHash,
		account,
		preHook,
		postHook
	}: {
		orderContainer: OrderContainer;
		walletClient: WC;
		fillTransactionHash: `0x${string}`;
		preHook?: (chain: chain) => Promise<any>;
		postHook?: () => Promise<any>;
		account: () => `0x${string}`;
	} = $props();

	// Order status enum
	const OrderStatus_None = 0;
	const OrderStatus_Deposited = 1;
	const OrderStatus_Claimed = 2;
	const OrderStatus_Refunded = 3;

	async function isClaimed(
		container: { order: StandardOrder; inputSettler: `0x${string}` },
		_: any
	) {
		const { order, inputSettler } = container;
		const inputChainClient = getClient(order.originChainId);

		// Determine the order type.
		if (inputSettler == INPUT_SETTLER_ESCROW_LIFI) {
			// Check order status
			const orderId = await inputChainClient.readContract({
				address: inputSettler,
				abi: SETTLER_ESCROW_ABI,
				functionName: "orderIdentifier",
				args: [order]
			});
			const orderStatus = await inputChainClient.readContract({
				address: inputSettler,
				abi: SETTLER_ESCROW_ABI,
				functionName: "orderStatus",
				args: [orderId]
			});
			return orderStatus == OrderStatus_Claimed || orderStatus == OrderStatus_Refunded;
		} else if (inputSettler == INPUT_SETTLER_COMPACT_LIFI) {
			// Check claim status
			const [token, allocator, resetPeriod, scope] = await inputChainClient.readContract({
				address: COMPACT,
				abi: COMPACT_ABI,
				functionName: "getLockDetails",
				args: [order.inputs[0][0]]
			});
			// Check if nonce is spent.
			return await inputChainClient.readContract({
				address: COMPACT,
				abi: COMPACT_ABI,
				functionName: "hasConsumedAllocatorNonce",
				args: [order.nonce, allocator]
			});
		}
	}
</script>

<div class="h-[29rem] w-[25rem] flex-shrink-0 snap-center snap-always p-4">
	<h1 class="mb-2 w-full text-center text-2xl font-medium">Finalise Intent</h1>
	<p>Finalise the order to receive the inputs.</p>
	<div class="w-full">
		<h2 class="w-full text-center text-lg font-medium">
			{getChainName(orderContainer.order.originChainId)}
		</h2>
		<hr class="my-1" />
		<div class="flex w-full flex-row space-x-1 overflow-y-hidden">
			{#await isClaimed(orderContainer, "")}
				<button
					type="button"
					class="h-8 rounded-r border px-4 text-xl font-bold text-gray-300"
					disabled
				>
					Finalise
				</button>
			{:then isClaimed}
				{#if isClaimed}
					<button
						type="button"
						class="h-8 rounded-r border px-4 text-xl font-bold text-gray-300"
						disabled
					>
						Finalised
					</button>
				{:else}
					<AwaitButton
						buttonFunction={claim(
							walletClient,
							{
								orderContainer,
								fillTransactionHash
							},
							{
								account,
								preHook,
								postHook
							}
						)}
					>
						{#snippet name()}
							Claim
						{/snippet}
						{#snippet awaiting()}
							Waiting for transaction...
						{/snippet}
					</AwaitButton>
				{/if}
			{:catch}
				<AwaitButton
					buttonFunction={claim(
						walletClient,
						{
							orderContainer,
							fillTransactionHash
						},
						{
							account,
							preHook,
							postHook
						}
					)}
				>
					{#snippet name()}
						Claim
					{/snippet}
					{#snippet awaiting()}
						Waiting for transaction...
					{/snippet}
				</AwaitButton>
			{/await}
			<div class="flex">
				{#each orderContainer.order.inputs as input}
					<div class="h-8 w-28 rounded bg-slate-200 pt-0.5 text-center">
						<div class="flex flex-col items-center justify-center align-middle">
							<div class="flex flex-row space-x-1">
								<div>
									{formatTokenAmount(
										input[1],
										getCoin({
											address: idToToken(input[0]),
											chain: getChainName(orderContainer.order.originChainId)
										})
									)}
								</div>
								<div>
									{getCoin({
										address: idToToken(input[0]),
										chain: getChainName(orderContainer.order.originChainId)
									}).name}
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>
