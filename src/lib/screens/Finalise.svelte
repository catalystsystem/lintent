<script lang="ts">
	import AwaitButton from "../components/AwaitButton.svelte";

	import { Solver } from "$lib/libraries/solver";
	import type { OrderContainer, StandardOrder } from "../../types";
	import {
		COMPACT,
		formatTokenAmount,
		getChainName,
		getClient,
		getCoin,
		INPUT_SETTLER_COMPACT_LIFI,
		INPUT_SETTLER_ESCROW_LIFI,
		MULTICHAIN_INPUT_SETTLER_COMPACT,
		MULTICHAIN_INPUT_SETTLER_ESCROW,
		type chain,
		type WC
	} from "$lib/config";
	import { COMPACT_ABI } from "$lib/abi/compact";
	import { SETTLER_ESCROW_ABI } from "$lib/abi/escrow";
	import { idToToken } from "$lib/utils/convert";
	import store from "$lib/state.svelte";
	import { orderToIntent } from "$lib/libraries/intent";
	import { hashStruct } from "viem";
	import { compactTypes } from "$lib/utils/typedMessage";

	let {
		orderContainer,
		account,
		preHook,
		postHook
	}: {
		orderContainer: OrderContainer;
		preHook?: (chain: chain) => Promise<any>;
		postHook?: () => Promise<any>;
		account: () => `0x${string}`;
	} = $props();

	let refreshClaimed = $state(0);

	const postHookRefreshValidate = async () => {
		if (postHook) await postHook();
		refreshClaimed += 1;
	};

	// Order status enum
	const OrderStatus_None = 0;
	const OrderStatus_Deposited = 1;
	const OrderStatus_Claimed = 2;
	const OrderStatus_Refunded = 3;

	async function isClaimed(chainId: bigint, container: OrderContainer, _: any) {
		const { order, inputSettler } = container;
		const inputChainClient = getClient(chainId);

		const intent = orderToIntent(container);
		const orderId = intent.orderId();
		// Determine the order type.
		if (
			inputSettler === INPUT_SETTLER_ESCROW_LIFI ||
			inputSettler === MULTICHAIN_INPUT_SETTLER_ESCROW
		) {
			// Check order status
			const orderStatus = await inputChainClient.readContract({
				address: inputSettler,
				abi: SETTLER_ESCROW_ABI,
				functionName: "orderStatus",
				args: [orderId]
			});
			return orderStatus === OrderStatus_Claimed || orderStatus === OrderStatus_Refunded;
		} else if (
			inputSettler === INPUT_SETTLER_COMPACT_LIFI ||
			inputSettler === MULTICHAIN_INPUT_SETTLER_COMPACT
		) {
			// Check claim status
			const flattenedInputs = "originChainId" in order ? order.inputs : order.inputs[0].inputs;

			const [token, allocator, resetPeriod, scope] = await inputChainClient.readContract({
				address: COMPACT,
				abi: COMPACT_ABI,
				functionName: "getLockDetails",
				args: [flattenedInputs[0][0]]
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
	<h1 class="mb-1 w-full text-center text-2xl font-medium text-gray-900">Finalise Intent</h1>
	<p class="mb-2 text-center text-xs leading-relaxed text-gray-500">
		Finalise the order to receive the input assets.
	</p>
	{#each orderToIntent(orderContainer).inputChains() as inputChain}
		<div class="w-full">
			<h2 class="w-full text-center text-lg font-medium">
				{getChainName(inputChain)}
			</h2>
			<hr class="my-1" />
			<div class="flex w-full flex-row space-x-1 overflow-y-hidden">
				{#await isClaimed(inputChain, orderContainer, refreshClaimed)}
					<button
						type="button"
						class="h-8 rounded-r border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-400"
						disabled
					>
						Finalise
					</button>
				{:then isClaimed}
					{#if isClaimed}
						<button
							type="button"
							class="h-8 rounded-r border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-400"
							disabled
						>
							Finalised
						</button>
					{:else}
						<AwaitButton
							buttonFunction={Solver.claim(
								store.walletClient,
								{
									sourceChain: getChainName(inputChain),
									orderContainer,
									fillTransactionHashes: orderContainer.order.outputs.map(
										(output) =>
											store.fillTransactions[
												hashStruct({
													data: output,
													types: compactTypes,
													primaryType: "MandateOutput"
												})
											] as string
									)
								},
								{
									account,
									preHook,
									postHook: postHookRefreshValidate
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
						buttonFunction={Solver.claim(
							store.walletClient,
							{
								sourceChain: getChainName(inputChain),
								orderContainer,
								fillTransactionHashes: orderContainer.order.outputs.map(
									(output) =>
										store.fillTransactions[
											hashStruct({
												data: output,
												types: compactTypes,
												primaryType: "MandateOutput"
											})
										] as string
								)
							},
							{
								account,
								preHook,
								postHook: postHookRefreshValidate
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
					{#if "originChainId" in orderContainer.order}
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
												}).decimals
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
					{:else}
						{#each orderContainer.order.inputs.find((v) => v.chainId === inputChain)?.inputs ?? [] as input}
							<div class="h-8 w-28 rounded bg-slate-200 pt-0.5 text-center">
								<div class="flex flex-col items-center justify-center align-middle">
									<div class="flex flex-row space-x-1">
										<div>
											{formatTokenAmount(
												input[1],
												getCoin({
													address: idToToken(input[0]),
													chain: getChainName(inputChain)
												}).decimals
											)}
										</div>
										<div>
											{getCoin({
												address: idToToken(input[0]),
												chain: getChainName(inputChain)
											}).name}
										</div>
									</div>
								</div>
							</div>
						{/each}
					{/if}
				</div>
			</div>
		</div>
	{/each}
</div>
