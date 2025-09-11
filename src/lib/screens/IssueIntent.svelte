<script lang="ts">
	import AwaitButton from '$lib/components/AwaitButton.svelte';
	import {
		INPUT_SETTLER_COMPACT_LIFI,
		type WC,
		type availableAllocators,
		type availableInputSettlers,
		type balanceQuery,
		type Token,
		type Verifier,
		POLYMER_ALLOCATOR,

		formatTokenAmount

	} from '$lib/config';
	import { compactApprove } from '$lib/utils/compact/tx';
	import { depositAndSwap, escrowApprove, openIntent, swap } from '$lib/utils/lifiintent/tx';

	let {
		scroll,
		showTokenSelector = $bindable(),
		inputSettler,
		allocatorId,
		inputAmount,
		outputAmount,
		inputToken,
		outputToken,
		verifier,
		compactBalances,
		balances,
		allowances,
		walletClient,
		preHook,
		postHook,
		account
	}: {
		scroll: (direction: boolean | number) => () => void;
		showTokenSelector: {
			active: number;
			input: boolean;
			index: number;
		};
		inputSettler: availableInputSettlers;
		allocatorId: availableAllocators;
		inputAmount: bigint;
		outputAmount: bigint;
		inputToken: Token;
		outputToken: Token;
		compactBalances: balanceQuery;
		verifier: Verifier;
		balances: balanceQuery;
		allowances: balanceQuery;
		walletClient: WC;
		preHook: () => Promise<void>;
		postHook: () => Promise<void>;
		account: () => `0x${string}`;
	} = $props();

	const opts = $derived({
		allocatorId,
		inputToken,
		preHook,
		postHook,
		outputToken,
		inputAmount,
		outputAmount,
		verifier,
		inputSettler,
		account
	});

	const approveFunction = $derived(
		inputSettler === INPUT_SETTLER_COMPACT_LIFI
			? compactApprove(walletClient, opts)
			: escrowApprove(walletClient, opts)
	);

	let allowance = $state(0n);
	$effect(() => {
		allowances[inputToken.chain][inputToken.address].then((a) => {
			allowance = a;
		});
	});
	let balance = $state(0n);
	$effect(() => {
		(inputSettler == INPUT_SETTLER_COMPACT_LIFI ? compactBalances : balances)[inputToken.chain][
			inputToken.address
		].then((b) => {
			balance = b;
		});
	});
</script>

<div class="h-[29rem] w-[25rem] flex-shrink-0 snap-center snap-always p-4">
	<h1 class="w-full text-center text-2xl font-medium">Intent Issuance</h1>
	<div class="my-4 flex w-full flex-row justify-evenly">
		<div class="flex flex-col justify-center space-y-1">
			<button
				class="h-16 w-28 cursor-pointer rounded bg-sky-100 text-center hover:bg-sky-200 hover:shadow-sm"
				onclick={() =>
					(showTokenSelector = {
						active: new Date().getTime(),
						input: true,
						index: 0
					})}
			>
				<div class="flex flex-col items-center justify-center align-middle">
					<div class="flex flex-row space-x-1">
						<div>{formatTokenAmount(inputAmount, inputToken)}</div>
						<div>{inputToken.name.toUpperCase()}</div>
					</div>
					<div>{inputToken.chain}</div>
				</div>
			</button>
			<!-- <button
				class="flex h-16 w-28 cursor-pointer items-center justify-center rounded border border-dashed border-gray-200 bg-gray-100 text-center align-middle"
				onclick={() => (showTokenSelector = {
						active: new Date().getTime(),
						input: true,
						index: -1
					})}
			>
				+
			</button> -->
		</div>
		<div class="flex flex-col justify-center">
			<div class="flex h-full flex-col items-center">
				<div>In</div>
				<div>exchange</div>
				<div>for</div>
			</div>
		</div>
		<div class="flex flex-col justify-center space-y-1">
			<button
				class="h-16 w-28 cursor-pointer rounded bg-sky-100 text-center hover:bg-sky-200 hover:shadow-sm"
				onclick={() =>
					(showTokenSelector = {
						active: new Date().getTime(),
						input: false,
						index: 0
					})}
			>
				<div class="flex flex-col items-center justify-center align-middle">
					<div class="flex flex-row space-x-1">
						<div>{formatTokenAmount(outputAmount, outputToken)}</div>
						<div>{outputToken.name.toUpperCase()}</div>
					</div>
					<div>{outputToken.chain}</div>
				</div>
			</button>
			<!-- <button
				class="flex h-16 w-28 cursor-pointer items-center justify-center rounded border border-dashed border-gray-200 bg-gray-100 text-center align-middle"
				onclick={() => (showTokenSelector = {
						active: new Date().getTime(),
						input: false,
						index: -1
					})}
			>
				+
			</button> -->
		</div>
	</div>

	<div class="mb-2 flex flex-wrap items-center justify-center gap-2">
		<span class="font-medium">Verified by</span>
		<select id="verified-by" class="rounded border px-2 py-1">
			<option value="polymer" selected> Polymer </option>
			<option value="wormhole" disabled> Wormhole </option>
		</select>
	</div>

	<!-- Action Button -->
	<div class="flex justify-center">
		{#if allowance < inputAmount}
			<AwaitButton buttonFunction={approveFunction}>
				{#snippet name()}
					Set allowance
				{/snippet}
				{#snippet awaiting()}
					Waiting for transaction...
				{/snippet}
			</AwaitButton>
		{:else if balance < inputAmount}
			<button
				type="button"
				class="h-8 rounded border px-4 text-xl font-bold text-gray-300"
				disabled
			>
				Low Balance
			</button>
		{:else}
			<div class="flex flex-row space-x-2">
				{#if inputSettler === INPUT_SETTLER_COMPACT_LIFI}
					{#if allocatorId !== POLYMER_ALLOCATOR}
						<AwaitButton buttonFunction={swap(walletClient, opts, [])}>
							{#snippet name()}
								Sign Order
							{/snippet}
							{#snippet awaiting()}
								Waiting for transaction...
							{/snippet}
						</AwaitButton>
					{/if}
					<AwaitButton buttonFunction={depositAndSwap(walletClient, opts, [])}>
						{#snippet name()}
							Execute Deposit and Open
						{/snippet}
						{#snippet awaiting()}
							Waiting for transaction...
						{/snippet}
					</AwaitButton>
				{:else}
					<AwaitButton buttonFunction={openIntent(walletClient, opts, [])}>
						{#snippet name()}
							Execute Open
						{/snippet}
						{#snippet awaiting()}
							Waiting for transaction...
						{/snippet}
					</AwaitButton>
				{/if}
			</div>
		{/if}
	</div>
</div>
