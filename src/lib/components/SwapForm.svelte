<script lang="ts">
	import AwaitButton from './AwaitButton.svelte';
	import { coinMap, decimalMap, getCoins, type chain, type coin, type verifier } from '$lib/config';
	import type { Snippet } from 'svelte';
	import { toBigIntWithDecimals } from '$lib/utils/convert';
	import BalanceField from './BalanceField.svelte';

	const {
		title,
		executeName,
		swapInputOutput,
		executeFunction,
		approveFunction,
		showConnect,
		connectFunction,
		opts = $bindable(),
		balances,
		allowances
	}: {
		balances: {
			-readonly [K in keyof typeof coinMap]: {
				-readonly [V in keyof (typeof coinMap)[K]]: Promise<bigint>;
			};
		};
		allowances: {
			-readonly [K in keyof typeof coinMap]: {
				-readonly [V in keyof (typeof coinMap)[K]]: Promise<bigint>;
			};
		};
		title: Snippet;
		executeName: Snippet;
		swapInputOutput: () => void;
		executeFunction: () => Promise<any>;
		approveFunction: () => Promise<any>;
		connectFunction: () => Promise<any>;
		showConnect: boolean;
		opts: {
			inputAsset: coin;
			inputAmount: bigint;
			inputChain: chain;
			outputAsset: coin;
			outputAmount: bigint;
			outputChain: chain;
			verifier: verifier;
		};
	} = $props();

	let inputNumber = $derived(Number(opts.inputAmount) / 10 ** decimalMap[opts.inputAsset]);
	function updateInputAmount(input: number) {
		opts.inputAmount = toBigIntWithDecimals(input, decimalMap[opts.inputAsset]);
	}
	let outputNumber = $derived(Number(opts.outputAmount) / 10 ** decimalMap[opts.outputAsset]);
	function updateOutputAmount(output: number) {
		opts.outputAmount = toBigIntWithDecimals(output, decimalMap[opts.outputAsset]);
	}
</script>

<form class="mt-3 w-full space-y-3 rounded-md border border-gray-200 bg-gray-50 p-4">
	<h1 class="text-xl font-medium">{@render title()}</h1>
	<!-- Sell -->
	<div class="flex flex-wrap items-center justify-start gap-2">
		<span class="font-medium">Sell</span>
		<input
			type="number"
			class="w-20 rounded border px-2 py-1"
			bind:value={() => inputNumber, updateInputAmount}
		/>
		<span>of</span>
		<BalanceField
			value={balances[opts.inputChain][
				opts.inputAsset as keyof (typeof coinMap)[typeof opts.inputChain]
			]}
			decimals={decimalMap[opts.inputAsset]}
		/>
		<select id="sell-chain" class="rounded border px-2 py-1" bind:value={opts.inputChain}>
			<option value="sepolia" selected>Sepolia</option>
			<option value="baseSepolia">Base Sepolia</option>
			<option value="optimismSepolia">Optimism Sepolia</option>
		</select>
		<select id="deposit-asset" class="rounded border px-2 py-1" bind:value={opts.inputAsset}>
			{#each getCoins(opts.inputChain) as coin (coin)}
				<option value={coin} selected={coin === opts.inputAsset}
					>{coinMap[opts.inputChain][coin].toUpperCase()}</option
				>
			{/each}
		</select>
	</div>

	<!-- Swap button -->
	<div class="flex justify-center">
		<button
			type="button"
			class="px-4 text-xl font-bold text-gray-600 hover:text-blue-600"
			onclick={swapInputOutput}
		>
			⇅
		</button>
	</div>

	<!-- Buy -->
	<div class="flex flex-wrap items-center justify-start gap-2">
		<span class="font-medium">Buy</span>
		<input type="number" class="w-20 rounded border px-2 py-1" bind:value={() => outputNumber, updateOutputAmount} />
		<select id="buy-chain" class="rounded border px-2 py-1" bind:value={opts.outputChain}>
			<option value="sepolia">Sepolia</option>
			<option value="baseSepolia" selected>Base Sepolia</option>
			<option value="optimismSepolia">Optimism Sepolia</option>
		</select>
		<select id="deposit-asset" class="rounded border px-2 py-1" bind:value={opts.outputAsset}>
			{#each getCoins(opts.outputChain) as coin (coin)}
				<option value={coin} selected={coin === opts.outputAsset}
					>{coinMap[opts.outputChain][coin].toUpperCase()}</option
				>
			{/each}
		</select>
	</div>

	<!-- Verified by -->
	<div class="flex flex-wrap items-center justify-center gap-2">
		<span class="font-medium">Verified by</span>
		<select id="verified-by" class="rounded border px-2 py-1" bind:value={opts.verifier}>
			<option value="polymer" selected> Polymer </option>
			<option value="wormhole" disabled> Wormhole </option>
		</select>
	</div>

	<!-- Action Button -->
	<div class="flex justify-center">
		{#if showConnect}
			<AwaitButton buttonFunction={connectFunction}>
				{#snippet name()}
					Connect Wallet
				{/snippet}
				{#snippet awaiting()}
					Waiting for wallet...
				{/snippet}
			</AwaitButton>
		{:else}
			{#await allowances[opts.inputChain][opts.inputAsset as keyof (typeof coinMap)[typeof opts.inputChain]]}
				<button
					type="button"
					class="h-8 rounded border px-4 text-xl font-bold text-gray-300"
					disabled
				>
					...
				</button>
			{:then allowance}
				{#if allowance < opts.inputAmount}
					<AwaitButton buttonFunction={approveFunction}>
						{#snippet name()}
							Set allowance
						{/snippet}
						{#snippet awaiting()}
							Waiting for transaction...
						{/snippet}
					</AwaitButton>
				{:else}
					{#await balances[opts.inputChain][opts.inputAsset as keyof (typeof coinMap)[typeof opts.inputChain]]}
						<button
							type="button"
							class="h-8 rounded border px-4 text-xl font-bold text-gray-300"
							disabled
						>
							...
						</button>
					{:then balances}
						{#if balances < opts.inputAmount}
							<button
								type="button"
								class="h-8 rounded border px-4 text-xl font-bold text-gray-300"
								disabled
							>
								Low Balance
							</button>
						{:else}
							<AwaitButton buttonFunction={executeFunction}>
								{#snippet name()}
									{@render executeName()}
								{/snippet}
								{#snippet awaiting()}
									Waiting for transaction...
								{/snippet}
							</AwaitButton>
						{/if}
					{/await}
				{/if}
			{/await}
		{/if}
	</div>
</form>
