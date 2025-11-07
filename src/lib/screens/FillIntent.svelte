<script lang="ts">
	import {
		BYTES32_ZERO,
		formatTokenAmount,
		getChainName,
		getClient,
		getCoin,
		type chain,
		type WC
	} from "$lib/config";
	import { bytes32ToAddress } from "$lib/utils/convert";
	import { getOutputHash } from "$lib/utils/orderLib";
	import type { MandateOutput, OrderContainer } from "../../types";
	import { Solver } from "$lib/libraries/solver";
	import { COIN_FILLER_ABI } from "$lib/abi/outputsettler";
	import AwaitButton from "$lib/components/AwaitButton.svelte";
	import store from "$lib/state.svelte";
	import { Intent, orderToIntent } from "$lib/libraries/intent";

	let {
		scroll,
		orderContainer,
		fillTransactionHash = $bindable(),
		account,
		preHook,
		postHook
	}: {
		scroll: (direction: boolean | number) => () => void;
		orderContainer: OrderContainer;
		fillTransactionHash: `0x${string}` | undefined;
		preHook?: (chain: chain) => Promise<any>;
		postHook: () => Promise<any>;
		account: () => `0x${string}`;
	} = $props();

	let refreshValidation = $state(0);
	const postHookScroll = async () => {
		await postHook();
		refreshValidation += 1;
		scroll(true)();
	};

	async function isFilled(orderId: `0x${string}`, output: MandateOutput, _?: any) {
		const outputHash = getOutputHash(output);
		const outputClient = getClient(output.chainId);
		const result = await outputClient.readContract({
			address: bytes32ToAddress(output.settler),
			abi: COIN_FILLER_ABI,
			functionName: "getFillRecord",
			args: [orderId, outputHash]
		});
		console.log({ orderId, output, result, outputHash });
		return result;
	}

	function sortOutputsByChain(orderContainer: OrderContainer) {
		const outputs = orderContainer.order.outputs;
		const postionMap: { [chainId: string]: number } = {};
		const arrMap: [bigint, MandateOutput[]][] = [];
		for (const output of outputs) {
			const chainId = output.chainId;
			// Check if chainId exists.
			let position = postionMap[chainId.toString()];
			if (position == undefined) {
				position = arrMap.length;
				postionMap[chainId.toString()] = position;
				arrMap.push([chainId, []]);
			}
			arrMap[position][1].push(output);
		}
		console.log(arrMap);
		return arrMap;
	}

	const filledStatusPromises: [bigint, Promise<`0x${string}`>[]][] = $derived(
		sortOutputsByChain(orderContainer).map(([c, outputs]) => [
			c,
			outputs.map((output) =>
				isFilled(orderToIntent(orderContainer).orderId(), output, refreshValidation)
			)
		])
	);

	const fillWrapper = (func: ReturnType<typeof Solver.fill>) => {
		return async () => {
			const result = await func();
			fillTransactionHash = result;
		};
	};
</script>

<div class="h-[29rem] w-[25rem] flex-shrink-0 snap-center snap-always p-4">
	<h1 class="w-full text-center text-2xl font-medium">Fill Intent</h1>
	<p class="my-2">
		Fill each chain once and continue to the right. If you refreshed the page provide your fill tx
		hash in the input box.
	</p>
	<div class="w-full">
		{#each sortOutputsByChain(orderContainer) as [chainId, outputs], c}
			<h2 class="w-full text-center text-lg font-medium">
				{getChainName(chainId)}
			</h2>
			<hr class="my-1" />
			<div class="flex w-full flex-row space-x-1 overflow-y-hidden">
				{#await Promise.all(filledStatusPromises[c][1])}
					<button class="h-8 w-min max-w-min min-w-max rounded border px-4 font-medium" disabled>
						Fill
					</button>
				{:then filledStatus}
					<AwaitButton
						buttonFunction={filledStatus.every((v) => v == BYTES32_ZERO)
							? fillWrapper(
									Solver.fill(
										store.walletClient,
										{
											orderContainer,
											outputs
										},
										{
											preHook,
											postHook: postHookScroll,
											account
										}
									)
								)
							: async () => {}}
					>
						{#snippet name()}
							Fill
						{/snippet}
						{#snippet awaiting()}
							Waiting for transaction...
						{/snippet}
					</AwaitButton>
				{/await}
				{#each outputs as output, i}
					{#await filledStatusPromises[c][1][i]}
						<div class="h-8 w-28 rounded bg-slate-200 pt-0.5 text-center">
							<div class="flex flex-col items-center justify-center align-middle">
								<div class="flex flex-row space-x-1">
									<div>
										{formatTokenAmount(
											output.amount,
											getCoin({
												address: output.token,
												chain: getChainName(output.chainId)
											}).decimals
										)}
									</div>
									<div>
										{getCoin({ address: output.token, chain: getChainName(output.chainId) }).name}
									</div>
								</div>
							</div>
						</div>
					{:then filled}
						<div
							class={[
								"h-8 w-28 rounded pt-0.5 text-center",
								filled === BYTES32_ZERO ? "bg-slate-200" : "bg-green-100"
							]}
						>
							<div class="flex flex-col items-center justify-center align-middle">
								<div class="flex flex-row space-x-1">
									<div>
										{formatTokenAmount(
											output.amount,
											getCoin({
												address: output.token,
												chain: getChainName(output.chainId)
											}).decimals
										)}
									</div>
									<div>
										{getCoin({ address: output.token, chain: getChainName(output.chainId) }).name}
									</div>
								</div>
							</div>
						</div>
					{/await}
				{/each}
			</div>
		{/each}

		<input
			class="w-20 rounded border px-2 py-1"
			placeholder="fillTransactionHash"
			bind:value={fillTransactionHash}
		/>
	</div>
</div>
