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
		formatTokenAmount,
		type chain,
		INPUT_SETTLER_ESCROW_LIFI
	} from '$lib/config';
	import { compactApprove } from '$lib/utils/compact/tx';
	import { depositAndSwap, escrowApprove, openIntent, swap } from '$lib/utils/lifiintent/tx';
	import type { OrderContainer } from '../../types';

	let {
		scroll,
		showTokenSelector = $bindable(),
		inputSettler,
		allocatorId,
		inputAmounts,
		outputAmount,
		inputTokens,
		outputToken,
		verifier,
		compactBalances,
		balances,
		allowances,
		walletClient,
		orders = $bindable(),
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
		inputAmounts: bigint[];
		outputAmount: bigint;
		inputTokens: Token[];
		outputToken: Token;
		compactBalances: balanceQuery;
		verifier: Verifier;
		balances: balanceQuery;
		allowances: balanceQuery;
		walletClient: WC;
		orders: OrderContainer[];
		preHook?: (chain: chain) => Promise<any>;
		postHook: () => Promise<void>;
		account: () => `0x${string}`;
	} = $props();

	const opts = $derived({
		allocatorId,
		inputTokens,
		preHook,
		postHook,
		outputToken,
		inputAmounts,
		outputAmount,
		verifier,
		inputSettler,
		account
	});

	const postHookScroll = async () => {
		await postHook();
		scroll(true)();
	};

	const approveFunction = $derived(
		inputSettler === INPUT_SETTLER_COMPACT_LIFI
			? compactApprove(walletClient, opts)
			: escrowApprove(walletClient, opts)
	);

	let allowanceCheck = $state(true);
	$effect(() => {
		allowanceCheck = true;
		for (let i = 0; i < inputTokens.length; ++i) {
			const token = inputTokens[i];
			const inputAmount = inputAmounts[i];
			allowances[token.chain][token.address].then((a) => {
				allowanceCheck = allowanceCheck && a >= inputAmount;
			});
		}
	});
	let balanceCheckWallet = $state(true);
	$effect(() => {
		balanceCheckWallet = true;
		for (let i = 0; i < inputTokens.length; ++i) {
			const token = inputTokens[i];
			const inputAmount = inputAmounts[i];
			balances[token.chain][token.address].then((b) => {
				balanceCheckWallet = balanceCheckWallet && b >= inputAmount;
			});
		}
	});
	let balanceCheckCompact = $state(true);
	$effect(() => {
		balanceCheckCompact = true;
		for (let i = 0; i < inputTokens.length; ++i) {
			const token = inputTokens[i];
			const inputAmount = inputAmounts[i];
			compactBalances[token.chain][token.address].then((b) => {
				balanceCheckCompact = balanceCheckCompact && b >= inputAmount;
			});
		}
	});

	const allSameChains = $derived(inputTokens.every((v) => inputTokens[0].chain === v.chain));
</script>

<div class="h-[29rem] w-[25rem] flex-shrink-0 snap-center snap-always p-4">
	<h1 class="w-full text-center text-2xl font-medium">Intent Issuance</h1>
	<p class="text-sm">
		Select assets for your intent along with the verifier for the intent. Then choose your desired
		style of execution. Your intent will be sent to the LI.FI dev order server.
	</p>
	<div class="my-4 flex w-full flex-row justify-evenly">
		<div class="flex flex-col justify-center space-y-1">
			{#each inputTokens as inputToken, i}
				<button
					class="h-16 w-28 cursor-pointer rounded bg-sky-100 text-center hover:bg-sky-200 hover:shadow-sm"
					onclick={() =>
						(showTokenSelector = {
							active: new Date().getTime(),
							input: true,
							index: i
						})}
				>
					<div class="flex flex-col items-center justify-center align-middle">
						<div class="flex flex-row space-x-1">
							<div>{formatTokenAmount(inputAmounts[i], inputToken)}</div>
							<div>{inputToken.name.toUpperCase()}</div>
						</div>
						<div>{inputToken.chain}</div>
					</div>
				</button>
			{/each}
			<button
				class="flex h-16 w-28 cursor-pointer items-center justify-center rounded border border-dashed border-gray-200 bg-gray-100 text-center align-middle"
				onclick={() =>
					(showTokenSelector = {
						active: new Date().getTime(),
						input: true,
						index: -1
					})}
			>
				+
			</button>
		</div>
		<div class="flex flex-col justify-center">
			<div class="flex flex-col items-center">
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
		{#if !allSameChains}
			<button
				type="button"
				class="h-8 rounded border px-4 text-xl font-bold text-gray-300"
				disabled
			>
				Not Same Chain Inputs
			</button>
		{:else if inputTokens.length != 1}
			<button
				type="button"
				class="h-8 rounded border px-4 text-xl font-bold text-gray-300"
				disabled
			>
				Not supported yet
			</button>
		{:else if !allowanceCheck}
			<AwaitButton buttonFunction={approveFunction}>
				{#snippet name()}
					Set allowance
				{/snippet}
				{#snippet awaiting()}
					Waiting for transaction...
				{/snippet}
			</AwaitButton>
		{:else}
			<div class="flex flex-row space-x-2">
				{#if !balanceCheckWallet}
					<button
						type="button"
						class="h-8 rounded border px-4 text-xl font-bold text-gray-300"
						disabled
					>
						Low Balance
					</button>
				{:else if inputSettler === INPUT_SETTLER_ESCROW_LIFI}
					<AwaitButton
						buttonFunction={openIntent(
							walletClient,
							{
								...opts,
								postHook: postHookScroll
							},
							orders
						)}
					>
						{#snippet name()}
							Execute Open
						{/snippet}
						{#snippet awaiting()}
							Waiting for transaction...
						{/snippet}
					</AwaitButton>
				{:else if inputSettler === INPUT_SETTLER_COMPACT_LIFI}
					<AwaitButton
						buttonFunction={depositAndSwap(
							walletClient,
							{
								...opts,
								postHook: postHookScroll
							},
							[]
						)}
					>
						{#snippet name()}
							Execute Deposit and Open
						{/snippet}
						{#snippet awaiting()}
							Waiting for transaction...
						{/snippet}
					</AwaitButton>
				{/if}
				{#if !balanceCheckCompact}
					<button
						type="button"
						class="h-8 rounded border px-4 text-xl font-bold text-gray-300"
						disabled
					>
						Low Compact Balance
					</button>
				{:else if inputSettler === INPUT_SETTLER_COMPACT_LIFI}
					{#if allocatorId !== POLYMER_ALLOCATOR}
						<AwaitButton
							buttonFunction={swap(
								walletClient,
								{
									...opts,
									postHook: postHookScroll
								},
								[]
							)}
						>
							{#snippet name()}
								Sign Order
							{/snippet}
							{#snippet awaiting()}
								Waiting for transaction...
							{/snippet}
						</AwaitButton>
					{/if}
				{/if}
			</div>
		{/if}
	</div>
</div>
