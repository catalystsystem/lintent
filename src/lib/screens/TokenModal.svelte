<script lang="ts">
	import BalanceField from "$lib/components/BalanceField.svelte";
	import { chainMap, coinList, INPUT_SETTLER_COMPACT_LIFI, type Token } from "$lib/config";
	import { AssetSelection } from "$lib/libraries/assetSelection";
	import store, { type TokenContext } from "$lib/state.svelte";
	import { toBigIntWithDecimals } from "$lib/utils/convert";
	import { type InteropableAddress, getInteropableAddress } from "$lib/utils/interopableAddresses";

	const v = (num: number | null) => (num ? num : 0);

	let {
		active = $bindable(),
		input,
		currentInputTokens
	}: {
		active: boolean;
		input: boolean;
		currentInputTokens: TokenContext[];
	} = $props();

	let inputs = $state<{ [index: InteropableAddress]: number | null }>(
		Object.fromEntries(
			(currentInputTokens ?? []).map(({ token, amount }) => [
				getInteropableAddress(token.address, chainMap[token.chain].id),
				Number(amount) / 10 ** token.decimals
			])
		)
	);
	// svelte-ignore state_referenced_locally
	let computerValue = $state<number | null>(Object.values(inputs).reduce((a, b) => v(a) + v(b), 0));

	type SortOrder = "largest" | "smallest";
	let sortOrder = $state<SortOrder>("largest");

	function getTokenFor(address: InteropableAddress): Token | undefined {
		for (const token of tokenSet) {
			const iaddr = getInteropableAddress(token.address, chainMap[token.chain].id);
			if (iaddr === address) return token;
		}
	}

	function save() {
		// Go over every single non-0 instance in the array:
		const inputKeys = Object.keys(inputs) as InteropableAddress[];
		const inputTokens: TokenContext[] = [];
		for (const key of inputKeys) {
			// Check that key is a number
			const inputValue = v(inputs[key]);
			// The token would be:
			const token = getTokenFor(key);
			if (!token)
				throw new Error(
					`For some reason a token has been selected that we could not find: ${key} in ${tokenSet.map((v) => [v.address, v.chain])}`
				);

			if (inputValue === 0) continue;
			inputTokens.push({ token, amount: toBigIntWithDecimals(inputValue, token.decimals) });
		}
		if (inputTokens.length === 0) {
			inputTokens.push({ token: tokenSet[0], amount: 0n });
		}
		console.log({
			inputTokens
		});
		store.inputTokens = inputTokens;

		active = false;
	}

	const unqiueTokens = $derived([...new Set(coinList(store.mainnet).map((v) => v.name))]);

	// svelte-ignore state_referenced_locally
	let selectedTokenName = $state<string>(currentInputTokens[0].token.name);
	const tokenSet = $derived(
		coinList(store.mainnet).filter((v) => v.name.toLowerCase() === selectedTokenName.toLowerCase())
	);

	async function computeInputs(total: number, order: SortOrder) {
		const tokens = tokenSet;
		const balancePromises = tokenSet.map(
			(tkn) =>
				(store.inputSettler === INPUT_SETTLER_COMPACT_LIFI
					? store.compactBalances
					: store.balances)[tkn.chain][tkn.address]
		);
		const balances = await Promise.all(balancePromises);

		const goal = toBigIntWithDecimals(total, tokens[0].decimals);
		const solution =
			AssetSelection.Sum(balances) < goal
				? balances
				: order === "largest"
					? new AssetSelection({ goal, values: balances }).largest().asValues()
					: new AssetSelection({ goal, values: balances }).smallest().asValues();

		for (let i = 0; i < tokens.length; ++i) {
			const token = tokenSet[i];
			const iaddr = getInteropableAddress(token.address, chainMap[token.chain].id);
			inputs[iaddr] = Number(solution[i]) / 10 ** token.decimals;
		}

		return Number(AssetSelection.Sum(solution)) / 10 ** tokens[0].decimals;
	}

	// svelte-ignore state_referenced_locally
	let lastComputed = $state<number | null>(computerValue);
	// svelte-ignore state_referenced_locally
	let lastSortOrder = $state<SortOrder>(sortOrder);

	// Only trigger computeInputs when the user actually changes `computerValue` or `sortOrder`.
	$effect(() => {
		if (computerValue === lastComputed && lastSortOrder === sortOrder) return;
		lastSortOrder = sortOrder;
		const requested = v(computerValue);
		computeInputs(requested, sortOrder).then(() => {
			// computeInputs updates `inputs`; the inputs-effect below will set
			// `computerValue` and `lastComputed` so we don't set them here.
		});
	});

	// Canonical source of truth: derive `computerValue` from `inputs`.
	$effect(() => {
		const sum = Object.values(inputs).reduce((a, b) => v(a) + v(b), 0) as number;
		lastComputed = sum;
		computerValue = sum;
	});
</script>

<div
	class="absolute top-30 left-1/2 z-20 mx-auto h-2/3 w-11/12 -translate-x-1/2 transform border border-gray-200 bg-gray-50"
>
	<!-- svelte-ignore a11y_consider_explicit_label -->
	<button
		class="absolute top-0 right-0 h-5 w-5 cursor-pointer bg-blue-100 text-center"
		onclick={() => {
			active = false;
		}}
	>
		<div class="absolute top-1.5 right-2.5 h-2 w-[1px] rotate-45 bg-black font-bold"></div>
		<div class="absolute top-1.5 right-2.5 h-2 w-[1px] -rotate-45 bg-black font-bold"></div>
	</button>
	<div class="flex h-full w-full flex-col items-center justify-center space-y-3 align-middle">
		<h3 class="-mt-2 text-center text-xl font-medium">Select {input ? "Input" : "Output"}</h3>
		<div class="flex flex-row">
			<select id="orderSelector" class="mr-0.5" bind:value={sortOrder}>
				<option value="largest">↑</option>
				<option value="smallest">↓</option>
			</select>
			<input
				type="number"
				class="w-20 rounded rounded-r-none border border-r-0 border-gray-400 px-2 py-1"
				bind:value={computerValue}
			/>
			<select
				id="tokenSelector"
				class="rounded rounded-l-none border border-gray-400 px-2 py-1"
				bind:value={selectedTokenName}
			>
				{#each unqiueTokens as token}
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
				{#each tokenSet as tkn}
					<div class="flex flex-row space-x-2">
						<input
							type="number"
							class="w-20 rounded border px-2 py-1"
							defaultValue="0"
							bind:value={inputs[getInteropableAddress(tkn.address, chainMap[tkn.chain].id)]}
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
