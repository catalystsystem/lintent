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
	import { compactTypes } from "$lib/utils/typedMessage";
	import { hashStruct } from "viem";

	let {
		scroll,
		orderContainer,
		account,
		preHook,
		postHook
	}: {
		scroll: (direction: boolean | number) => () => void;
		orderContainer: OrderContainer;
		preHook?: (chain: chain) => Promise<any>;
		postHook: () => Promise<any>;
		account: () => `0x${string}`;
	} = $props();

	let refreshValidation = $state(0);
	let autoScrolledOrderId = $state<`0x${string}` | null>(null);
	let fillRun = 0;
	const postHookScroll = async () => {
		await postHook();
		refreshValidation += 1;
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
		return result;
	}

	function sortOutputsByChain(orderContainer: OrderContainer) {
		const outputs = orderContainer.order.outputs;
		const positionMap: { [chainId: string]: number } = {};
		const arrMap: [bigint, MandateOutput[]][] = [];
		for (const output of outputs) {
			const chainId = output.chainId;
			// Check if chainId exists.
			let position = positionMap[chainId.toString()];
			if (position == undefined) {
				position = arrMap.length;
				positionMap[chainId.toString()] = position;
				arrMap.push([chainId, []]);
			}
			arrMap[position][1].push(output);
		}
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

	$effect(() => {
		refreshValidation;

		const orderId = orderToIntent(orderContainer).orderId();
		if (autoScrolledOrderId === orderId) return;

		const outputs = sortOutputsByChain(orderContainer).flatMap(([, chainOutputs]) => chainOutputs);
		if (outputs.length === 0) return;

		const currentRun = ++fillRun;
		Promise.all(outputs.map((output) => isFilled(orderId, output, refreshValidation)))
			.then((fillResults) => {
				if (currentRun !== fillRun) return;
				if (!fillResults.every((result) => result !== BYTES32_ZERO)) return;
				autoScrolledOrderId = orderId;
				scroll(4)();
			})
			.catch((e) => console.warn("auto-scroll fill check failed", e));
	});

	const fillWrapper = (outputs: MandateOutput[], func: ReturnType<typeof Solver.fill>) => {
		return async () => {
			const result = await func();

			for (const output of outputs) {
				const outputHash = hashStruct({
					data: output,
					types: compactTypes,
					primaryType: "MandateOutput"
				});
				store.fillTransactions[outputHash] = result;
				store
					.saveFillTransaction(outputHash, result)
					.catch((e) => console.warn("saveFillTransaction error", e));
			}
		};
	};
</script>

<div class="h-[29rem] w-[25rem] flex-shrink-0 snap-center snap-always p-4">
	<h1 class="mb-1 w-full text-center text-2xl font-medium text-gray-900">Fill Intent</h1>
	<p class="mb-2 text-center text-xs leading-relaxed text-gray-500">
		Fill each chain once and continue to the right. If you refreshed the page provide your fill tx
		hash in the input box.
	</p>
	<div class="w-full">
		{#each sortOutputsByChain(orderContainer) as chainIdAndOutputs, c}
			<h2 class="w-full text-center text-lg font-medium">
				{getChainName(chainIdAndOutputs[0])}
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
									chainIdAndOutputs[1],
									Solver.fill(
										store.walletClient,
										{
											orderContainer,
											outputs: chainIdAndOutputs[1]
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
				{#each chainIdAndOutputs[1] as output, i}
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
			<!-- <input
				class="w-20 rounded border px-2 py-1"
				placeholder="fillTransactionHash"
				bind:value={
					store.fillTransactions[
						hashStruct({
							data: { outputs: chainIdAndOutputs.outputs },
							types: {
								...compactTypes,
								Outputs
							},
							primaryType: "Outputs"
						})
					]
				}
			/> -->
		{/each}
	</div>
</div>
