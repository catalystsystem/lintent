<script lang="ts">
	import onboard from '$lib/web3-onboard';
	import type { Writable } from 'svelte/store';
	import AwaitButton from './AwaitButton.svelte';
	import { getCoins, type chain, type coin, type verifiers } from '$lib/config';
	import type { Snippet } from 'svelte';

	async function connect() {
		await onboard.connectWallet();
	}

	const {
		title,
		executeName,
		activeChain,
		outputChain,
		activeAsset,
		outputAsset,
		inputValue,
		outputValue,
        verifier,
		executeFunction,
		approveFunction,
		showApprove,
		showError,
        showConnect,
        balance
	}: {
		title: Snippet;
		executeName: Snippet;
		activeChain: Writable<chain>;
		outputChain: Writable<chain>;
		activeAsset: Writable<coin>;
		outputAsset: Writable<coin>;
		inputValue: Writable<number>;
		outputValue: Writable<number>;
		verifier: Writable<verifiers>;
		executeFunction: () => Promise<any>;
		approveFunction: () => Promise<any>;
		showApprove: boolean;
		showError: number;
		showConnect: boolean;
        balance: number;
	} = $props();
</script>

<form class="mx-auto mt-3 space-y-4 rounded-md border p-4">
	<h1 class="text-xl font-medium">{@render title()}</h1>
	<!-- Sell -->
	<div class="flex flex-wrap items-center justify-start gap-2">
		<span class="font-medium">Sell</span>
		<input type="number" class="w-24 rounded border px-2 py-1" bind:value={$inputValue} />
		<span>of</span>
		<input
			type="text"
			class="w-24 rounded border border-gray-800 bg-gray-50 px-2 py-1"
			disabled
			value={balance}
		/>
		<select id="sell-chain" class="rounded border px-2 py-1" bind:value={$activeChain}>
			<option value="sepolia" selected>Sepolia</option>
			<option value="baseSepolia">Base Sepolia</option>
			<option value="optimismSepolia">Optimism Sepolia</option>
		</select>
		<select id="sell-asset" class="rounded border px-2 py-1" bind:value={$activeAsset}>
			{#each getCoins($activeChain) as coin (coin)}
				<option value={coin} selected={coin === $activeAsset}>{coin.toUpperCase()}</option>
			{/each}
		</select>
	</div>

	<!-- Swap button -->
	<div class="flex justify-center">
		<button type="button" class="px-4 text-xl font-bold text-gray-600 hover:text-blue-600">
			⇅
		</button>
	</div>

	<!-- Buy -->
	<div class="flex flex-wrap items-center justify-start gap-2">
		<span class="font-medium">Buy</span>
		<input type="number" class="w-24 rounded border px-2 py-1" bind:value={$outputValue} />
		<select id="buy-chain" class="rounded border px-2 py-1" bind:value={$outputChain}>
			<option value="sepolia">Sepolia</option>
			<option value="baseSepolia" selected>Base Sepolia</option>
			<option value="optimismSepolia">Optimism Sepolia</option>
		</select>
		<select id="buy-asset" class="rounded border px-2 py-1" bind:value={$outputAsset}>
			{#each getCoins($outputChain).filter((v) => v !== 'eth') as coin (coin)}
				<option value={coin} selected={coin === $outputAsset}>{coin.toUpperCase()}</option>
			{/each}
		</select>
	</div>

	<!-- Verified by -->
	<div class="flex flex-wrap items-center justify-center gap-2">
		<span class="font-medium">Verified by</span>
		<select id="verified-by" class="rounded border px-2 py-1" bind:value={$verifier}>
			<option value="polymer" selected> Polymer </option>
			<option value="wormhole" disabled> Wormhole </option>
		</select>
	</div>

	<!-- Action Button -->
	<div class="flex justify-center">
		{#if showConnect}
			<AwaitButton buttonFunction={connect}>
				{#snippet name()}
					Connect Wallet
				{/snippet}
				{#snippet awaiting()}
					Waiting for wallet...
				{/snippet}
			</AwaitButton>
		{:else if showError}
			<button type="button" class="rounded border bg-red-100 px-4 text-xl text-gray-600" disabled>
				Input not valid {showError}
			</button>
		{:else if showApprove}
			<AwaitButton buttonFunction={approveFunction}>
				{#snippet name()}
					Set allowance
				{/snippet}
				{#snippet awaiting()}
					Waiting for transaction...
				{/snippet}
			</AwaitButton>
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
	</div>
</form>
