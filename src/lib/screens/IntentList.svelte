<script lang="ts">
	import { onDestroy } from "svelte";
	import { tick } from "svelte";
	import { formatTokenAmount, getChainName, getCoin } from "$lib/config";
	import { orderToIntent } from "$lib/libraries/intent";
	import { idToToken } from "$lib/utils/convert";
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

	function flattenInputs(
		inputs: { chainId: bigint; inputs: [bigint, bigint][] }[]
	): { chainId: bigint; input: [bigint, bigint] }[] {
		return inputs.flatMap((chainInput) => {
			return chainInput.inputs.flatMap((i) => {
				return {
					chainId: chainInput.chainId,
					input: i
				};
			});
		});
	}

	let nowSeconds = $state(Math.floor(Date.now() / 1000));
	const clock = setInterval(() => {
		nowSeconds = Math.floor(Date.now() / 1000);
	}, 10000);
	onDestroy(() => clearInterval(clock));

	const activeOrderContainers = $derived(
		orderContainers.filter((orderContainer) => orderContainer.order.fillDeadline > nowSeconds)
	);
</script>

<div class="h-[29rem] w-[25rem] flex-shrink-0 snap-center snap-always p-4">
	<h1 class="mb-2 w-full text-center text-2xl font-medium">Select Intent To Solve</h1>
	<p class="text-sm">
		Browse issued intents, including your own. You can fill intents by clicking on them. Solvers
		listening to the intent server also sees these intents.
	</p>
	<div class="flex h-[22rem] flex-col items-center space-y-2 overflow-y-auto align-middle">
		{#each activeOrderContainers as orderContainer}
			<button
				class="w-11/12 cursor-pointer rounded border border-gray-200 bg-gray-100 pt-1 pb-2 transition-shadow ease-linear hover:shadow-xl"
				onclick={async () => {
					selectedOrder = orderContainer;
					await tick();
					scroll(3)();
				}}
			>
				<div class="flex w-full flex-row justify-evenly">
					<div class="flex flex-col">
						<div class="text-center font-medium">OrderId</div>
						<div>{orderToIntent(orderContainer).orderId().slice(2, 12)}</div>
						<div class="text-center font-medium">User</div>
						<div>{orderContainer.order.user.slice(0, 8)}...</div>
					</div>
					<div class="flex flex-col">
						<div class="text-center font-medium">Inputs</div>
						<div class="flex flex-col">
							{#if "originChainId" in orderContainer.order}
								{#each orderContainer.order.inputs as input}
									<div class="h-12 w-24 rounded bg-sky-100 text-center">
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
											<div>{getChainName(orderContainer.order.originChainId)}</div>
										</div>
									</div>
								{/each}
							{:else}
								{#each flattenInputs(orderContainer.order.inputs) as input}
									<div class="h-12 w-24 rounded bg-sky-100 text-center">
										<div class="flex flex-col items-center justify-center align-middle">
											<div class="flex flex-row space-x-1">
												<div>
													{formatTokenAmount(
														input.input[1],
														getCoin({
															address: idToToken(input.input[0]),
															chain: getChainName(input.chainId)
														}).decimals
													)}
												</div>
												<div>
													{getCoin({
														address: idToToken(input.input[0]),
														chain: getChainName(input.chainId)
													}).name}
												</div>
											</div>
											<div>{getChainName(input.chainId)}</div>
										</div>
									</div>
								{/each}
							{/if}
						</div>
					</div>
					<div class="flex flex-col">
						<div class="text-center font-medium">Outputs</div>
						{#each orderContainer.order.outputs as output}
							<div class="h-12 w-24 rounded bg-sky-100 text-center">
								<div class="flex flex-col items-center justify-center align-middle">
									<div class="flex flex-row space-x-1">
										<div>
											{formatTokenAmount(
												output.amount,
												getCoin({ address: output.token, chain: getChainName(output.chainId) })
													.decimals
											)}
										</div>
										<div>
											{getCoin({ address: output.token, chain: getChainName(output.chainId) }).name}
										</div>
									</div>
									<div>{getChainName(output.chainId)}</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			</button>
		{/each}
	</div>
</div>
