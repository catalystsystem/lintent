<script lang="ts">
	import BalanceField from "$lib/components/BalanceField.svelte";
	import {
		ADDRESS_ZERO,
		coinList,
		getCoin,
		INPUT_SETTLER_COMPACT_LIFI,
		INPUT_SETTLER_ESCROW_LIFI,
		printToken,
		type chain,
		type Token
	} from "$lib/config";
	import { AssetSelection } from "$lib/libraries/assetSelection";
	import store from "$lib/state.svelte";
	import { toBigIntWithDecimals } from "$lib/utils/convert";

	function zip<T, U>(arr1: T[], arr2: U[]): [T, U][] {
		return arr1.map((val, i) => [val, arr2[i]]);
	}

	let {
		showTokenSelector = $bindable()
	}: {
		showTokenSelector: {
			active: number;
			input: boolean;
			index: number;
		};
	} = $props();

	$effect(() => {
		const tkn = showTokenSelector.input
			? (store.inputTokens[showTokenSelector.index] ?? coinList(store.mainnet)[0])
			: (store.outputTokens[showTokenSelector.index] ?? coinList(store.mainnet)[0]);
		const defaultModelValue =
			(showTokenSelector.input
				? Number(store.inputAmounts[showTokenSelector.index])
				: Number(store.outputAmounts[showTokenSelector.index])) /
			10 ** tkn.decimals;
		modalNumber = (defaultModelValue ?? 0) > 0 ? defaultModelValue : 1;
		selectedToken = tkn;
	});

	let selectedToken = $state<Token>(
		showTokenSelector.input
			? store.inputTokens[showTokenSelector.index]
			: store.outputTokens[showTokenSelector.index]
	);
	let modalNumber = $state<number>(1);

	function save() {
		// Go over every single non-0 instance in the array:
		const inputKeys = Object.keys(inputs);
		const inputTokens: Token[] = [];
		const inputAmounts: bigint[] = [];
		for (const key of inputKeys) {
			// Check that key is a number
			const inputIndex = Number(key);
			console.log({ inputIndex, inputKeys });
			if (typeof inputIndex !== "number" || Number.isNaN(inputIndex))
				throw new Error("Input is not valid");
			const inputValue = inputs[inputIndex];
			// The token would be:
			const token = tokenSet[inputIndex];

			if (inputValue === 0) continue;
			inputTokens.push(token);
			inputAmounts.push(toBigIntWithDecimals(inputValue, token.decimals));
		}
		if (inputTokens.length === 0) {
			inputTokens.push(tokenSet[0]);
			inputAmounts.push(0n);
		}
		store.inputTokens = inputTokens;
		store.inputAmounts = inputAmounts;

		showTokenSelector.active = 0;
	}

	const unqiueTokens = $derived([...new Set(coinList(store.mainnet).map((v) => v.name))]);

	// svelte-ignore state_referenced_locally
	let selectedTokenName = $state<string>(selectedToken.name);
	const tokenSet = $derived(
		coinList(store.mainnet).filter((v) => v.name.toLowerCase() === selectedTokenName.toLowerCase())
	);

	let inputs = $state<{ [index: number]: number }>({});

	let computerValue = $state<number>(Object.values(inputs).reduce((a, b) => a + b, 0));

	async function computeInputs(total: number) {
		const tokens = tokenSet;
		const balancePromises = tokenSet.map(
			(tkn) =>
				(store.inputSettler === INPUT_SETTLER_COMPACT_LIFI
					? store.compactBalances
					: store.balances)[tkn.chain][tkn.address]
		);
		const balances = await Promise.all(balancePromises);

		const goal = toBigIntWithDecimals(computerValue, tokens[0].decimals);
		const solution =
			AssetSelection.Sum(balances) < goal
				? balances
				: new AssetSelection({ goal, values: balances }).largest().asValues();

		for (let i = 0; i < tokens.length; ++i) {
			inputs[i] = Number(solution[i]) / 10 ** tokens[i].decimals;
		}

		return Number(AssetSelection.Sum(solution)) / 10 ** tokens[0].decimals;
	}

	// svelte-ignore state_referenced_locally
	let lastComputed = $state<number>(computerValue);

	// Only trigger computeInputs when the user actually changes `computerValue`.
	$effect(() => {
		if (computerValue === lastComputed) return;
		const requested = computerValue;
		computeInputs(requested).then(() => {
			// computeInputs updates `inputs`; the inputs-effect below will set
			// `computerValue` and `lastComputed` so we don't set them here.
		});
	});

	// Canonical source of truth: derive `computerValue` from `inputs`.
	$effect(() => {
		const sum = Object.values(inputs).reduce((a, b) => a + b, 0);
		lastComputed = sum;
		computerValue = sum;
	});
</script>

{#if showTokenSelector.active > 0}
	<div
		class="absolute top-30 left-1/2 z-20 mx-auto h-2/3 w-11/12 -translate-x-1/2 transform border border-gray-200 bg-gray-50"
	>
		<!-- svelte-ignore a11y_consider_explicit_label -->
		<button
			class="absolute top-0 right-0 h-5 w-5 cursor-pointer bg-blue-100 text-center"
			onclick={() => {
				showTokenSelector.active = 0;
			}}
		>
			<div class="absolute top-1.5 right-2.5 h-2 w-[1px] rotate-45 bg-black font-bold"></div>
			<div class="absolute top-1.5 right-2.5 h-2 w-[1px] -rotate-45 bg-black font-bold"></div>
		</button>
		<div class="flex h-full w-full flex-col items-center justify-center space-y-3 align-middle">
			{#if showTokenSelector.index === -1}
				<h3 class="-mt-2 text-center text-xl font-medium">Add Asset</h3>
			{:else}
				<h3 class="-mt-2 text-center text-xl font-medium">Select Asset</h3>
			{/if}
			<div class="flex flex-row">
				<input type="number" class="w-20 rounded border px-2 py-1" bind:value={computerValue} />
				<select id="tokenSelector" class="rounded border px-2 py-1" bind:value={selectedTokenName}>
					{#each unqiueTokens as token, i}
						<option value={token}>{token.toUpperCase()}</option>
					{/each}
				</select>
			</div>
			<div class="flex flex-row space-x-2">
				<div class="flex flex-col space-y-2 text-right">
					{#each tokenSet as tkn}
						<span class="h-8">{tkn.chain}</span>
					{/each}
				</div>
				<div class="flex flex-col space-y-2">
					{#each tokenSet as tkn, i}
						<div class="flex flex-row space-x-2">
							<input
								type="number"
								class="w-20 rounded border px-2 py-1"
								defaultValue="0"
								bind:value={inputs[i]}
							/>
							<span class="mt-0.5">of</span>
							<BalanceField
								value={(store.inputSettler === INPUT_SETTLER_COMPACT_LIFI
									? store.compactBalances
									: store.balances)[tkn.chain][tkn.address]}
								decimals={tkn.decimals}
							/>
						</div>
					{/each}
				</div>
			</div>
			<button
				class="bg-gray h-8 rounded border px-4 text-xl font-bold text-gray-600 hover:text-blue-600"
				onclick={save}>Save</button
			>
		</div>
	</div>
{/if}
