<script lang="ts">
	import { OrderServer } from "$lib/libraries/orderServer";
	import type { TokenContext } from "$lib/state.svelte";
	import { interval } from "rxjs";

	let {
		exclusiveFor = $bindable(),
		inputTokens,
		outputTokens = $bindable(),
		account,
		mainnet
	}: {
		exclusiveFor: string;
		inputTokens: TokenContext[];
		outputTokens: TokenContext[];
		account: () => `0x${string}`;
		mainnet: boolean;
	} = $props();

	const orderServer = $derived(new OrderServer(mainnet));

	async function getQuoteAndSet() {
		try {
			const response = await orderServer.getQuotes({
				user: account(),
				userChain: inputTokens[0].token.chain,
				inputs: inputTokens.map(({ token, amount }) => {
					return {
						sender: account(),
						asset: token.address,
						chain: token.chain,
						amount: amount
					};
				}),
				outputs: outputTokens.map(({ token }) => {
					return {
						receiver: account(),
						asset: token.address,
						chain: token.chain,
						amount: 0n
					};
				})
			});
			if (response?.quotes?.length ?? 0) {
				const quote = response.quotes[0];
				quoteExpires = quote.validUntil ?? new Date().getTime() + 30 * 1000;
				if (quoteExpires < new Date().getTime()) quoteExpires = new Date().getTime() + 30 * 1000;
				quoteDuration = quoteExpires - new Date().getTime();
				outputTokens[0].amount = BigInt(quote.preview.outputs[0].amount);
				exclusiveFor = quote.metadata.exclusiveFor ?? "";
				updater();
			} else {
				quoteExpires = 0;
				exclusiveFor = "";
			}
		} catch (e) {
			console.log("Could not fetch a quote", e);
			return;
		}
	}

	const updater = () => {
		const timeLeft = quoteExpires - new Date().getTime();
		const percentageOfOriginalQuote = timeLeft / quoteDuration;
		const intermediatewidth = percentageOfOriginalQuote * 100;
		if (intermediatewidth <= 100 && intermediatewidth > 0) {
			width = intermediatewidth;
			return;
		}
		width = 0;
		updateQuote();
	};

	export function updateQuote() {
		quoteRequest = getQuoteAndSet();
	}

	$effect(() => {
		mainnet;
		setTimeout(() => {
			updateQuote();
		}, 1000);
	});

	$effect(() => {
		quoteExpires;
		if (quoteExpires === 0) {
			width = 0;
			counter.unsubscribe();
			return;
		}
		counter.unsubscribe();
		counter = interval(1000).subscribe(updater);
	});
	let quoteDuration = 30 * 1000;
	let counter = interval(1000).subscribe(updater);

	let quoteExpires = $state(new Date().getTime() + 5 * 1000);
	let width = $state(0);
	let quoteRequest: Promise<void> = $state(Promise.resolve());
</script>

<div class="relative my-1 flex w-full items-center justify-center text-center align-middle">
	{#await quoteRequest}
		<div class="relative h-7 w-full animate-pulse rounded border px-2 font-bold">Fetch Quote</div>
	{:then _}
		<!-- Button gradually shows how long until it is expired by fill background -->
		{#if quoteExpires !== 0}
			<div
				class="absolute top-0 left-0 h-7 rounded bg-blue-200 transition-all"
				style="width: {width}%"
			></div>
			<button
				class="relative h-7 w-full cursor-pointer rounded border px-2 font-bold hover:text-blue-800"
				onclick={updateQuote}>Fetch Quote</button
			>
		{:else}
			<div
				class="absolute top-0 left-0 h-7 rounded bg-red-200 transition-all"
				style="width: 100%"
			></div>
			<button
				class="relative h-7 w-full cursor-pointer rounded border px-2 font-bold hover:text-blue-800"
				onclick={updateQuote}>No Quote</button
			>
		{/if}
	{/await}
</div>
