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

	let {
		scroll,
		mainnet = $bindable(),
		inputSettler = $bindable(),
		allocatorId = $bindable(),
		inputNumber = $bindable(),
		inputToken = $bindable(),
		compactBalances,
		balances,
		allowances,
		walletClient,
		preHook,
		postHook,
		account
	}: {
		scroll: (direction: boolean | number) => () => void;
		mainnet: boolean;
		inputSettler: availableInputSettlers;
		allocatorId: availableAllocators;
		inputNumber: number;
		inputToken: Token;
		compactBalances: balanceQuery;
		balances: balanceQuery;
		allowances: balanceQuery;
		walletClient: WC;
		preHook: (chain: chain) => Promise<void>;
		postHook: () => Promise<void>;
		account: () => `0x${string}`;
	} = $props();

	let manageAssetAction: "deposit" | "withdraw" = $state("deposit");

	let allowance = $state(0n);
	const inputAmount = $derived(toBigIntWithDecimals(inputNumber, inputToken.decimals));
	$effect(() => {
		// Check if allowances contain the chain.
		if (!allowances[inputToken.chain]) {
			allowance = 0n;
			return;
		}
		allowances[inputToken.chain][inputToken.address].then((a) => {
			allowance = a;
		});
	});
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
			class:hover:bg-gray-100={mainnet !== false}
			class:font-bold={mainnet === false}
			onclick={() => (mainnet = false)}
		>
			Testnet
		</button>
		<button
			class=" h-8 rounded-r border border-l-0 px-4"
			class:hover:bg-gray-100={mainnet !== true}
			class:font-bold={mainnet === true}
			onclick={() => (mainnet = true)}
		>
			Mainnet
		</button>
	</div>
	<div class="my-4 flex flex-row">
		<h2 class="text-md mt-0.5 mr-4 font-medium">Input Type</h2>
		<!-- <button
			class="h-8 rounded-l border px-4"
			class:hover:bg-gray-100={inputSettler !== INPUT_SETTLER_COMPACT_LIFI}
			class:font-bold={inputSettler === INPUT_SETTLER_COMPACT_LIFI}
			onclick={() => (inputSettler = INPUT_SETTLER_COMPACT_LIFI)}
		>
			Compact Lock
		</button> -->
		<button
			class=" h-8 rounded border px-4"
			class:hover:bg-gray-100={inputSettler !== INPUT_SETTLER_ESCROW_LIFI}
			class:font-bold={inputSettler === INPUT_SETTLER_ESCROW_LIFI}
			onclick={() => (inputSettler = INPUT_SETTLER_ESCROW_LIFI)}
		>
			Escrow
		</button>
	</div>
	{#if inputSettler === INPUT_SETTLER_COMPACT_LIFI}
		<form class="w-full space-y-4 rounded-md">
			<div class="flex flex-row">
				<h2 class="text-md mr-4 font-medium">Allocator</h2>
				<button
					class="h-8 rounded-l border px-4"
					class:hover:bg-gray-100={allocatorId !== ALWAYS_OK_ALLOCATOR}
					class:font-bold={allocatorId === ALWAYS_OK_ALLOCATOR}
					onclick={() => (allocatorId = ALWAYS_OK_ALLOCATOR)}
				>
					AlwaysYesAllocator
				</button>
				<button
					class=" h-8 rounded-r border border-l-0 px-4"
					class:hover:bg-gray-100={allocatorId !== POLYMER_ALLOCATOR}
					class:font-bold={allocatorId === POLYMER_ALLOCATOR}
					onclick={() => (allocatorId = POLYMER_ALLOCATOR)}
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
				<BalanceField
					value={(manageAssetAction === "withdraw" ? compactBalances : balances)[inputToken.chain][
						inputToken.address
					]}
					decimals={inputToken.decimals}
				/>
				<select
					id="inputToken"
					class="rounded border px-2 py-1"
					bind:value={() => getIndexOf(inputToken), (v) => (inputToken = coinList(mainnet)[v])}
				>
					{#each coinList(mainnet) as token, i}
						<option value={i}>{printToken(token)}</option>
					{/each}
				</select>
			</div>

			<!-- Action Button -->
			<div class="flex justify-center">
				{#if manageAssetAction === "withdraw"}
					<AwaitButton
						buttonFunction={CompactLib.compactWithdraw(walletClient, {
							preHook,
							postHook,
							inputToken,
							account,
							inputAmount,
							allocatorId
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
						buttonFunction={CompactLib.compactApprove(walletClient, {
							preHook,
							postHook,
							inputTokens: [inputToken],
							inputAmounts: [inputAmount],
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
						buttonFunction={CompactLib.compactDeposit(walletClient!, {
							preHook,
							postHook,
							inputToken,
							account,
							inputAmount,
							allocatorId
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
