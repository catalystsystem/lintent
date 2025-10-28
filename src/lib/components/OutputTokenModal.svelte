<script lang="ts">
	import BalanceField from "$lib/components/BalanceField.svelte";
	import { chainList, type chain, chains, coinList, type Token } from "$lib/config";
	import store, { type TokenContext } from "$lib/state.svelte";
	import { toBigIntWithDecimals } from "$lib/utils/convert";

	let {
		active = $bindable(),
		currentOutputTokens = $bindable()
	}: {
		active: boolean;
		currentOutputTokens: TokenContext[];
	} = $props();

	const outputs = $state<{ chain: chain; name: string; amount: number }[]>(
		currentOutputTokens.map(({ token, amount }) => {
			return {
				chain: token.chain,
				name: token.name,
				amount: Number(amount) / 10 ** token.decimals
			};
		})
	);

	function getTokensForChain(chain: chain) {
		const coins = coinList(store.mainnet);
		console.log(chain);
		return coins.filter((v) => v.chain == chain);
	}

	function save() {
		const coins = coinList(store.mainnet);
		const nextOutputTokens = [];
		for (const output of outputs) {
			const { name, chain, amount } = output;
			const token = coins.find((v) => v.name == name && v.chain == chain);
			// Check if we found token.
			if (!token) {
				console.log(`Could not find ${name} on ${chain}`);
				continue;
			}
			nextOutputTokens.push({
				token,
				amount: toBigIntWithDecimals(amount, token.decimals)
			});
		}

		currentOutputTokens = nextOutputTokens;
		active = false;
	}

	function add() {
		if (outputs.length == 3) return;
		outputs.push({
			chain: outputs[outputs.length -1].chain,
			name: "usdc",
			amount: 0
		});
	}

	function remove() {
		if (outputs.length == 1) return;
		outputs.pop();
	}
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
		<h3 class="-mt-2 text-center text-xl font-medium">Select Output</h3>
		<div class="flex flex-row space-x-2">
			<div class="flex flex-col space-y-2">
				{#each outputs as output}
					<div class="flex flex-row space-x-2">
						<input
							type="number"
							class="w-20 rounded border px-2 py-1"
							defaultValue="0"
							bind:value={output.amount}
						/>
						<select
							class="rounded rounded-l-none border border-gray-400 px-2 py-1"
							bind:value={output.chain}
						>
							{#each Object.values(chainList(store.mainnet)) as chain}
								<option value={chain}>{chain}</option>
							{/each}
						</select>
						<select
							class="rounded rounded-l-none border border-gray-400 px-2 py-1"
							bind:value={output.name}
						>
							{#each getTokensForChain(output.chain) as token}
								<option value={token.name}>{token.name.toUpperCase()}</option>
							{/each}
						</select>
					</div>
				{/each}
			</div>
		</div>
		<div class="flex w-full flex-row justify-evenly">
			<button
				class="w-8 cursor-pointer rounded bg-red-100 font-medium hover:bg-red-200"
				onclick={remove}
			>
				-
			</button>
			<button
				class="bg-gray h-8 rounded border px-4 text-xl font-bold text-gray-600 hover:text-blue-600"
				onclick={save}>Save</button
			>
			<button
				class="w-8 cursor-pointer rounded bg-green-100 font-medium hover:bg-green-200"
				onclick={add}
			>
				+
			</button>
		</div>
	</div>
</div>
