<script lang="ts">
	import {
		ALWAYS_OK_ALLOCATOR,
		POLYMER_ALLOCATOR,
		INPUT_SETTLER_ESCROW_LIFI,
		INPUT_SETTLER_COMPACT_LIFI,
		type chain,
		type WC,
		type Token,
		coinList,
		printToken,
		getIndexOf,
		type availableAllocators,
		type availableInputSettlers,
		type balanceQuery
	} from "$lib/config";
	import BalanceField from "$lib/components/BalanceField.svelte";
	import AwaitButton from "$lib/components/AwaitButton.svelte";
	import { CompactLib } from "$lib/libraries/compactLib";
	import { toBigIntWithDecimals } from "$lib/utils/convert";
	import store from "$lib/state.svelte";

	let {
		scroll,
		preHook,
		postHook,
		account
	}: {
		scroll: (direction: boolean | number) => () => void;
		preHook: (chain: chain) => Promise<void>;
		postHook: () => Promise<void>;
		account: () => `0x${string}`;
	} = $props();

	let manageAssetAction: "deposit" | "withdraw" = $state("deposit");

	let inputNumber = $state<number>(1);

	let allowance = $state(0n);
	const inputAmount = $derived(toBigIntWithDecimals(inputNumber, token.decimals));
	$effect(() => {
		// Check if allowances contain the chain.
		if (!store.allowances[token.chain]) {
			allowance = 0n;
			return;
		}
		store.allowances[token.chain][token.address].then((a) => {
			allowance = a;
		});
	});

	let selectedTokenIndex = $state<number>(0);
	const token = $derived<Token>(coinList(store.mainnet)[selectedTokenIndex]);
</script>

<div class="h-[29rem] w-[25rem] flex-shrink-0 snap-center snap-always p-4">
	<h1 class="w-full text-center text-2xl font-medium">Assets Management</h1>
	<p class="text-sm">
		Select input type for your intent and manage deposited tokens. When done, continue to the right.
		If you want to be using TheCompact with signatures, ensure your tokens are deposited before you
		continue.
	</p>
	<div class="my-4 flex flex-row">
		<h2 class="text-md mt-0.5 mr-4 font-medium">Network</h2>
		<button
			class="h-8 rounded-l border px-4"
			class:hover:bg-gray-100={store.mainnet !== false}
			class:font-bold={store.mainnet === false}
			onclick={() => (store.mainnet = false)}
		>
			Testnet
		</button>
		<button
			class=" h-8 rounded-r border border-l-0 px-4"
			class:hover:bg-gray-100={store.mainnet !== true}
			class:font-bold={store.mainnet === true}
			onclick={() => (store.mainnet = true)}
		>
			Mainnet
		</button>
	</div>
	<div class="my-4 flex flex-row">
		<h2 class="text-md mt-0.5 mr-4 font-medium">Input Type</h2>
		<button
			class="h-8 rounded-l border px-4"
			class:hover:bg-gray-100={store.intentType !== "compact"}
			class:font-bold={store.intentType === "compact"}
			onclick={() => (store.intentType = "compact")}
		>
			Compact Lock
		</button>
		<button
			class=" h-8 rounded-r border border-l-0 px-4"
			class:hover:bg-gray-100={store.intentType !== "escrow"}
			class:font-bold={store.intentType === "escrow"}
			onclick={() => (store.intentType = "escrow")}
		>
			Escrow
		</button>
	</div>
	{#if store.intentType === "compact"}
		<form class="w-full space-y-4 rounded-md">
			<div class="flex flex-row">
				<h2 class="text-md mr-4 font-medium">Allocator</h2>
				<button
					class="h-8 rounded-l border px-4"
					class:hover:bg-gray-100={store.allocatorId !== ALWAYS_OK_ALLOCATOR}
					class:font-bold={store.allocatorId === ALWAYS_OK_ALLOCATOR}
					onclick={() => (store.allocatorId = ALWAYS_OK_ALLOCATOR)}
				>
					AlwaysYesAllocator
				</button>
				<button
					class=" h-8 rounded-r border border-l-0 px-4"
					class:hover:bg-gray-100={store.allocatorId !== POLYMER_ALLOCATOR}
					class:font-bold={store.allocatorId === POLYMER_ALLOCATOR}
					onclick={() => (store.allocatorId = POLYMER_ALLOCATOR)}
				>
					Polymer
				</button>
			</div>
			<div class="flex flex-wrap items-center justify-start gap-2">
				<select id="in-asset" class="rounded border px-2 py-1" bind:value={manageAssetAction}>
					<option value="deposit" selected>Deposit</option>
					<option value="withdraw">Withdraw</option>
				</select>
				<input type="number" class="w-20 rounded border px-2 py-1" bind:value={inputNumber} />
				<span>of</span>
				{#if (manageAssetAction === "withdraw" ? store.compactBalances : store.balances)[token.chain]}
					<BalanceField
						value={(manageAssetAction === "withdraw" ? store.compactBalances : store.balances)[
							token.chain
						][token.address]}
						decimals={token.decimals}
					/>
				{/if}
				<select id="inputToken" class="rounded border px-2 py-1" bind:value={selectedTokenIndex}>
					{#each coinList(store.mainnet) as tkn, i}
						<option value={i}>{printToken(tkn)}</option>
					{/each}
				</select>
			</div>

			<!-- Action Button -->
			<div class="flex justify-center">
				{#if manageAssetAction === "withdraw"}
					<AwaitButton
						buttonFunction={CompactLib.compactWithdraw(store.walletClient, {
							preHook,
							postHook,
							inputToken: { token, amount: inputAmount },
							account,
							allocatorId: store.allocatorId
						})}
					>
						{#snippet name()}
							Withdraw
						{/snippet}
						{#snippet awaiting()}
							Waiting for transaction...
						{/snippet}
					</AwaitButton>
				{:else if allowance < inputAmount}
					<AwaitButton
						buttonFunction={CompactLib.compactApprove(store.walletClient, {
							preHook,
							postHook,
							inputTokens: [{ token, amount: inputAmount }],
							account
						})}
					>
						{#snippet name()}
							Set allowance
						{/snippet}
						{#snippet awaiting()}
							Waiting for transaction...
						{/snippet}
					</AwaitButton>
				{:else}
					<AwaitButton
						buttonFunction={CompactLib.compactDeposit(store.walletClient!, {
							preHook,
							postHook,
							inputToken: { token, amount: inputAmount },
							account,
							allocatorId: store.allocatorId
						})}
					>
						{#snippet name()}
							Execute deposit
						{/snippet}
						{#snippet awaiting()}
							Waiting for transaction...
						{/snippet}
					</AwaitButton>
				{/if}
			</div>
		</form>
	{:else}
		<div class="px-4">
			<p>
				The Escrow Input Settler does not have any asset management. Skip to the next step to select
				which assets to use. In the future, this place will be updated to show your pending intents.
			</p>
		</div>
	{/if}
</div>
