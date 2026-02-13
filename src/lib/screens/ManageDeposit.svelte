<script lang="ts">
	import {
		ALWAYS_OK_ALLOCATOR,
		POLYMER_ALLOCATOR,
		type chain,
		type Token,
		coinList,
		printToken
	} from "$lib/config";
	import BalanceField from "$lib/components/BalanceField.svelte";
	import AwaitButton from "$lib/components/AwaitButton.svelte";
	import FormControl from "$lib/components/ui/FormControl.svelte";
	import SegmentedControl from "$lib/components/ui/SegmentedControl.svelte";
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

	let selectedTokenIndex = $state<number>(0);
	const token = $derived<Token>(coinList(store.mainnet)[selectedTokenIndex]);

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
</script>

<div class="h-[29rem] w-[25rem] flex-shrink-0 snap-center snap-always p-4">
	<h1 class="mb-1 w-full text-center text-2xl font-medium text-gray-900">Assets Management</h1>
	<p class="mb-2 text-center text-xs leading-relaxed text-gray-500">
		Select input type for your intent and manage deposited tokens. When done, continue to the right.
		If you want to be using TheCompact with signatures, ensure your tokens are deposited before you
		continue.
	</p>
	<div class="my-4 flex flex-row">
		<h2 class="text-md mt-0.5 mr-4 font-medium">Network</h2>
		<SegmentedControl
			testIdPrefix="network"
			options={[
				{ label: "Testnet", value: "testnet" },
				{ label: "Mainnet", value: "mainnet" }
			]}
			value={store.mainnet ? "mainnet" : "testnet"}
			onChange={(v) => (store.mainnet = v === "mainnet")}
		/>
	</div>
	<div class="my-4 flex flex-row">
		<h2 class="text-md mt-0.5 mr-4 font-medium">Input Type</h2>
		<SegmentedControl
			testIdPrefix="intent-type"
			options={[
				{ label: "Compact Lock", value: "compact" },
				{ label: "Escrow", value: "escrow" }
			]}
			value={store.intentType}
			onChange={(v) => (store.intentType = v as "compact" | "escrow")}
		/>
	</div>
	{#if store.intentType === "compact"}
		<div class="w-full space-y-4 rounded-md">
			<div class="flex flex-row">
				<h2 class="text-md mr-4 font-medium">Allocator</h2>
				<SegmentedControl
					testIdPrefix="allocator"
					options={[
						{ label: "AlwaysYesAllocator", value: ALWAYS_OK_ALLOCATOR },
						{ label: "Polymer", value: POLYMER_ALLOCATOR }
					]}
					value={store.allocatorId}
					onChange={(v) => (store.allocatorId = v as typeof store.allocatorId)}
				/>
			</div>
			<div class="flex flex-wrap items-center justify-start gap-2">
				<FormControl as="select" id="in-asset" bind:value={manageAssetAction}>
					<option value="deposit" selected>Deposit</option>
					<option value="withdraw">Withdraw</option>
				</FormControl>
				<FormControl type="number" className="w-20" bind:value={inputNumber} />
				<span>of</span>
				{#if (manageAssetAction === "withdraw" ? store.compactBalances : store.balances)[token.chain]}
					<BalanceField
						value={(manageAssetAction === "withdraw" ? store.compactBalances : store.balances)[
							token.chain
						][token.address]}
						decimals={token.decimals}
					/>
				{/if}
				<FormControl as="select" id="inputToken" bind:value={selectedTokenIndex}>
					{#each coinList(store.mainnet) as tkn, i}
						<option value={i}>{printToken(tkn)}</option>
					{/each}
				</FormControl>
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
		</div>
	{:else}
		<div class="px-4">
			<p>
				The Escrow Input Settler does not have any asset management. Skip to the next step to select
				which assets to use. In the future, this place will be updated to show your pending intents.
			</p>
		</div>
	{/if}
</div>
