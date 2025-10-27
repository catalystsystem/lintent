<script lang="ts">
	import AwaitButton from "$lib/components/AwaitButton.svelte";
	import GetQuote from "$lib/components/GetQuote.svelte";
	import {
		INPUT_SETTLER_COMPACT_LIFI,
		POLYMER_ALLOCATOR,
		formatTokenAmount,
		type chain,
		INPUT_SETTLER_ESCROW_LIFI
	} from "$lib/config";
	import { IntentFactory, escrowApprove } from "$lib/libraries/intentFactory";
	import { CompactLib } from "$lib/libraries/compactLib";
	import store from "$lib/state.svelte";
	import TokenModal from "./TokenModal.svelte";

	const bigIntSum = (...nums: bigint[]) => nums.reduce((a, b) => a + b, 0n);

	let {
		scroll,
		preHook,
		postHook,
		account
	}: {
		scroll: (direction: boolean | number) => () => void;
		preHook?: (chain: chain) => Promise<any>;
		postHook: () => Promise<void>;
		account: () => `0x${string}`;
	} = $props();

	let showTokenSelector = $state<{
		active: number;
		input: boolean;
		index: number;
	}>({
		active: 1,
		input: true,
		index: 0
	});

	const opts = $derived({
		exclusiveFor: store.exclusiveFor,
		allocatorId: store.allocatorId,
		inputTokens: store.inputTokens,
		preHook,
		postHook,
		outputTokens: store.outputTokens,
		inputAmounts: store.inputAmounts,
		outputAmounts: store.outputAmounts,
		verifier: store.verifier,
		inputSettler: store.inputSettler,
		account
	});

	const postHookScroll = async () => {
		await postHook();
		scroll(true)();
	};

	const intentFactory = $derived(
		new IntentFactory({
			mainnet: store.mainnet,
			walletClient: store.walletClient,
			preHook,
			postHook: postHookScroll,
			ordersPointer: store.orders
		})
	);

	const approveFunction = $derived(
		store.inputSettler === INPUT_SETTLER_COMPACT_LIFI
			? CompactLib.compactApprove(store.walletClient, opts)
			: escrowApprove(store.walletClient, opts)
	);

	let allowanceCheck = $state(true);
	$effect(() => {
		allowanceCheck = true;
		if (!store.allowances[store.inputTokens[0].chain]) {
			allowanceCheck = false;
			return;
		}
		for (let i = 0; i < store.inputTokens.length; ++i) {
			const token = store.inputTokens[i];
			const inputAmount = store.inputAmounts[i];
			store.allowances[token.chain][token.address].then((a) => {
				allowanceCheck = allowanceCheck && a >= inputAmount;
			});
		}
	});
	let balanceCheckWallet = $state(true);
	$effect(() => {
		balanceCheckWallet = true;
		if (!store.balances[store.inputTokens[0].chain]) {
			balanceCheckWallet = false;
			return;
		}
		for (let i = 0; i < store.inputTokens.length; ++i) {
			const token = store.inputTokens[i];
			const inputAmount = store.inputAmounts[i];
			store.balances[token.chain][token.address].then((b) => {
				balanceCheckWallet = balanceCheckWallet && b >= inputAmount;
			});
		}
	});
	let balanceCheckCompact = $state(true);
	$effect(() => {
		balanceCheckCompact = true;
		if (!store.compactBalances[store.inputTokens[0].chain]) {
			balanceCheckCompact = false;
			return;
		}
		for (let i = 0; i < store.inputTokens.length; ++i) {
			const token = store.inputTokens[i];
			const inputAmount = store.inputAmounts[i];
			store.compactBalances[token.chain][token.address].then((b) => {
				balanceCheckCompact = balanceCheckCompact && b >= inputAmount;
			});
		}
	});

	const allSameChains = $derived(
		store.inputTokens.every((v) => store.inputTokens[0].chain === v.chain)
	);

	const abstractInputs = $derived.by(() => {
		const inputs: {
			name: string;
			amount: bigint;
			decimals: number;
		}[] = [];
		// Get all unqiue tokens.
		const allUniqueNames = [...new Set(store.inputTokens.map((v) => v.name))];
		for (let i = 0; i < allUniqueNames.length; ++i) {
			$inspect(store.inputTokens);
			const name = allUniqueNames[i];
			console.log({
				name,
				found: store.inputTokens.map((v, i) => (v.name == name ? store.inputAmounts[i] : 0n))
			});
			inputs[i] = {
				name,
				amount: bigIntSum(
					...store.inputTokens.map((v, i) => (v.name == name ? store.inputAmounts[i] : 0n))
				),
				decimals: store.inputTokens.find((v) => v.name == name)!.decimals
			};
		}
		return inputs;
	});
</script>

<div class="relative h-[29rem] w-[25rem] flex-shrink-0 snap-center snap-always p-4">
	<h1 class="w-full text-center text-2xl font-medium">Intent Issuance</h1>
	<p class="text-sm">
		Select assets for your intent along with the verifier for the intent. Then choose your desired
		style of execution. Your intent will be sent to the LI.FI dev order server.
	</p>
	<TokenModal bind:showTokenSelector></TokenModal>
	<div class="my-4 flex w-full flex-row justify-evenly">
		<div class="flex flex-col justify-center space-y-1">
			<h2 class="text-center text-sm">You Pay</h2>
			{#each abstractInputs as input, i}
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
							<div>{formatTokenAmount(input.amount, input.decimals)}</div>
						</div>
						<div>{input.name.toUpperCase()}</div>
					</div>
				</button>
			{/each}
			<!-- <button
				class="flex h-16 w-28 cursor-pointer items-center justify-center rounded border border-dashed border-gray-200 bg-gray-100 text-center align-middle"
				onclick={() =>
					(showTokenSelector = {
						active: new Date().getTime(),
						input: true,
						index: -1
					})}
			>
				+
			</button> -->
		</div>
		<div class="flex flex-col justify-center">
			<div class="flex flex-col items-center">
				<div>In</div>
				<div>exchange</div>
				<div>for</div>
			</div>
		</div>
		<div class="flex flex-col justify-center space-y-1">
			<h2 class="text-center text-sm">You Receive</h2>
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
						<div>{formatTokenAmount(store.outputAmounts[0], store.outputTokens[0].decimals)}</div>
						<div>{store.outputTokens[0].name.toUpperCase()}</div>
					</div>
					<div>{store.outputTokens[0].chain}</div>
				</div>
			</button>
			<GetQuote
				bind:exclusiveFor={store.exclusiveFor}
				inputAmounts={store.inputAmounts}
				mainnet={store.mainnet}
				bind:outputAmount={store.outputAmounts[0]}
				inputTokens={store.inputTokens}
				outputToken={store.outputTokens[0]}
				{account}
			></GetQuote>
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
	<div class="mb-2 flex flex-wrap items-center justify-center gap-2">
		<span class="font-medium">Exclusive For</span>
		<input
			type="text"
			class="w-20 rounded border border-gray-800 bg-gray-50 px-2 py-1"
			placeholder="0x..."
			bind:value={store.exclusiveFor}
		/>
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
		{:else if store.inputTokens.length != 1}
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
				{:else if store.inputSettler === INPUT_SETTLER_ESCROW_LIFI}
					<AwaitButton buttonFunction={intentFactory.openIntent(opts)}>
						{#snippet name()}
							Execute Open
						{/snippet}
						{#snippet awaiting()}
							Waiting for transaction...
						{/snippet}
					</AwaitButton>
				{:else if store.inputSettler === INPUT_SETTLER_COMPACT_LIFI}
					<AwaitButton buttonFunction={intentFactory.compactDepositAndRegister(opts)}>
						{#snippet name()}
							Execute Deposit and Open
						{/snippet}
						{#snippet awaiting()}
							Waiting for transaction...
						{/snippet}
					</AwaitButton>
				{/if}
				{#if store.inputSettler === INPUT_SETTLER_COMPACT_LIFI && store.allocatorId !== POLYMER_ALLOCATOR}
					{#if !balanceCheckCompact}
						<button
							type="button"
							class="h-8 rounded border px-4 text-xl font-bold text-gray-300"
							disabled
						>
							Low Compact Balance
						</button>
					{:else}
						<AwaitButton buttonFunction={intentFactory.openIntent(opts)}>
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
