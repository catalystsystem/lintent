<script lang="ts">
	import { formatTokenAmount, getChainName, getCoin } from "$lib/config";
	import { idToToken } from "$lib/utils/convert";
	import { getOrderId } from "$lib/utils/orderLib";
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
</script>

<div class="h-[29rem] w-[25rem] flex-shrink-0 snap-center snap-always p-4">
	<h1 class="mb-2 w-full text-center text-2xl font-medium">Select Intent To Solve</h1>
	<p class="text-sm">
		Browse issued intents, including your own. You can fill intents by clicking on them. Solvers
		listening to the intent server also sees these intents.
	</p>
	<div class="flex h-[22rem] flex-col items-center space-y-2 overflow-y-auto align-middle">
		{#each orderContainers as orderContainer}
			<button
				class="w-11/12 cursor-pointer rounded border border-gray-200 bg-gray-100 pt-1 pb-2 transition-shadow ease-linear hover:shadow-xl"
				onclick={() => {
					selectedOrder = orderContainer;
					setTimeout(scroll(true), 100);
				}}
			>
				<div class="flex w-full flex-row justify-evenly">
					<div class="flex flex-col">
						<div class="text-center font-medium">OrderId</div>
						<div>{getOrderId(orderContainer).slice(2, 12)}</div>
						<div class="text-center font-medium">User</div>
						<div>{orderContainer.order.user.slice(0, 8)}...</div>
					</div>
					<div class="flex flex-col">
						<div class="text-center font-medium">Inputs</div>
						<div class="flex flex-col">
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
										<div>{getChainName(orderContainer.order.originChainId)}</div>
									</div>
								</div>
							{/each}
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
