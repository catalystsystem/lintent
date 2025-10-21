<script lang="ts">
	import BalanceField from "$lib/components/BalanceField.svelte";
	import {
		ADDRESS_ZERO,
		coinList,
		getCoin,
		INPUT_SETTLER_COMPACT_LIFI,
		INPUT_SETTLER_ESCROW_LIFI,
		printToken,
		type availableInputSettlers,
		type balanceQuery,
		type chain,
		type Token
	} from "$lib/config";
	import { toBigIntWithDecimals } from "$lib/utils/convert";

	let {
		showTokenSelector = $bindable(),
		inputSettler,
		compactBalances,
		balances,
		inputTokens = $bindable(),
		outputToken = $bindable(),
		inputAmounts = $bindable(),
		outputAmount = $bindable()
	}: {
		showTokenSelector: {
			active: number;
			input: boolean;
			index: number;
		};
		inputSettler: availableInputSettlers;
		compactBalances: balanceQuery;
		balances: balanceQuery;
		inputTokens: Token[];
		outputToken: Token;
		inputAmounts: bigint[];
		outputAmount: bigint;
	} = $props();

	$effect(() => {
		const tkn = showTokenSelector.input
			? (inputTokens[showTokenSelector.index] ?? coinList[0])
			: outputToken;
		const defaultModelValue =
			(showTokenSelector.input
				? Number(inputAmounts[showTokenSelector.index])
				: Number(outputAmount)) /
			10 ** tkn.decimals;
		modalNumber = (defaultModelValue ?? 0) > 0 ? defaultModelValue : 1;
		selectedToken = tkn;
	});

	let selectedToken: Token = $state(
		showTokenSelector.input ? inputTokens[showTokenSelector.index] : outputToken
	);
	let modalNumber: number = $state(1);

	function submit() {
		// Input side
		if (showTokenSelector.input) {
			const val = toBigIntWithDecimals(modalNumber, selectedToken.decimals);
			if (showTokenSelector.index === -1) {
				console.log("push");
				inputAmounts.push(val);
				inputTokens.push(selectedToken);
			} else {
				console.log("update", showTokenSelector.index);
				inputAmounts[showTokenSelector.index] = val;
				inputTokens[showTokenSelector.index] = selectedToken;
			}
		} else {
			// Output side
			outputToken = selectedToken;
			outputAmount = toBigIntWithDecimals(modalNumber, outputToken.decimals);
		}
		showTokenSelector.active = 0;
	}
</script>

{#if showTokenSelector.active > 0}
	<div
		style="position: fixed; inset: 0; z-index: 0; background: transparent; pointer-events: auto;"
		aria-hidden="true"
		onclick={() => {
			if (showTokenSelector.active < new Date().getTime() - 200) showTokenSelector.active = 0;
		}}
	></div>
	<div
		class="absolute top-30 left-10 z-10 h-[12rem] w-[20rem] rounded border border-gray-200 bg-sky-50"
	>
		<div class="flex h-full w-full flex-col items-center justify-center space-y-3 align-middle">
			{#if showTokenSelector.index === -1}
				<h3 class="-mt-2 text-center text-xl font-medium">Add Asset</h3>
			{:else}
				<h3 class="-mt-2 text-center text-xl font-medium">Select Asset</h3>
			{/if}
			<div class="flex flex-row space-x-2">
				<input type="number" class="w-20 rounded border px-2 py-1" bind:value={modalNumber} />
				{#if showTokenSelector.input}
					<span class="mt-0.5">of</span>
					<BalanceField
						value={(inputSettler === INPUT_SETTLER_COMPACT_LIFI ? compactBalances : balances)[
							selectedToken.chain
						][selectedToken.address]}
						decimals={selectedToken.decimals}
					/>
				{:else}{/if}
			</div>
			<div class="flex flex-row space-x-2">
				<select
					id="tokenSelector"
					class="rounded border px-2 py-1"
					bind:value={
						() => `${selectedToken.address},${selectedToken.chain}`,
						(v) => {
							console.log(v);
							const [address, chain] = v.split(",");
							selectedToken = getCoin({ address: address as `0x${string}`, chain: chain as chain });
						}
					}
				>
					{#if showTokenSelector.input}
						{#each coinList.filter( (v) => (inputSettler === INPUT_SETTLER_ESCROW_LIFI ? v.address != ADDRESS_ZERO : true) ) as token, i}
							<option value={`${token.address},${token.chain}`}>{printToken(token)}</option>
						{/each}
					{:else}
						{#each coinList.filter((v) => v.address !== ADDRESS_ZERO) as token, i}
							<option value={`${token.address},${token.chain}`}>{printToken(token)}</option>
						{/each}
					{/if}
				</select>
			</div>
			<button
				class="bg-gray h-8 rounded border px-4 text-xl font-bold text-gray-600 hover:text-blue-600"
				onclick={submit}>Save</button
			>
		</div>
	</div>
{/if}
