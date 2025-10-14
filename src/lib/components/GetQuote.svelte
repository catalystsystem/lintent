<script lang="ts">
	import type { Token } from "$lib/config";
	import { getQuotes } from "$lib/utils/api";
	import { interval } from "rxjs";

	let {
		exclusiveFor = $bindable(),
		inputAmounts,
		outputAmount = $bindable(),
		inputTokens,
		outputToken,
		account
	}: {
		exclusiveFor: string;
		inputAmounts: bigint[];
		outputAmount: bigint;
		inputTokens: Token[];
		outputToken: Token;
		account: () => `0x${string}`;
	} = $props();

	async function getQuoteAndSet() {
		const response = await getQuotes({
			user: account(),
			userChain: inputTokens[0].chain,
			inputs: inputTokens.map((input, i) => {
				return {
					sender: account(),
					asset: input.address,
					chain: input.chain,
					amount: inputAmounts[i]
				};
			}),
			outputs: [
				{
					receiver: account(),
					asset: outputToken.address,
					chain: outputToken.chain,
					amount: 0n
				}
			]
		});
		if (response?.quotes?.length ?? 0) {
			const quote = response.quotes[0];
			quoteExpires = quote.validUntil ?? new Date().getTime() + 30 * 1000;
			quoteDuration = quoteExpires - new Date().getTime();
			outputAmount = BigInt(quote.preview.outputs[0].amount);
			exclusiveFor = quote.metadata.exclusiveFor ?? "";
			updater();
		}
	}

	const updater = () => {
		const timeLeft = quoteExpires - new Date().getTime();
		const percentageOfOriginalQuote = timeLeft / quoteDuration;
		const intermediatewidth = percentageOfOriginalQuote * 100;
		if (intermediatewidth <= 100 && intermediatewidth > 0) {
			width = intermediatewidth;
			console.log(width);
			return;
		}
		console.log(width);
		width = 0;
		updateQuote();
	};

	export function updateQuote() {
		quoteRequest = getQuoteAndSet();
	}

	$effect(() => {
		quoteExpires;
		counter.unsubscribe();
		counter = interval(1000).subscribe(updater);
	});
	let quoteDuration = 30 * 1000;
	let counter = interval(100).subscribe(updater);

	let quoteExpires = $state(new Date().getTime() + 30 * 1000);
	let width = $state(0);
	let quoteRequest: Promise<void> = $state(Promise.resolve());
</script>

<div class="relative my-1 flex items-center justify-center align-middle">
	{#await quoteRequest}
		<div class="h-7 rounded border px-2 font-bold">...</div>
	{:then _}
		<!-- Button gradually shows how long until it is expired by fill background -->
		<div
			class="absolute top-0 left-0 h-7 rounded bg-blue-200 transition-all"
			style="width: {width}%"
		></div>
		<button
			class="relative h-7 cursor-pointer rounded border px-2 font-bold hover:text-blue-800"
			onclick={() => {
				updateQuote;
			}}>Fetch Quote</button
		>
	{/await}
</div>
