<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		name,
		awaiting,
		buttonFunction,
		baseClass = 'w-full py-4 px-6 bg-gray-900 text-white text-lg font-medium rounded-xl transition-all duration-200 hover:bg-gray-800 active:bg-gray-950 hover:scale-105'
	}: {
		name: Snippet;
		awaiting: Snippet;
		buttonFunction: () => Promise<any>;
		baseClass?: string;
	} = $props();
	let buttonPromise: Promise<any> | undefined = $state();
</script>

{#await buttonPromise}
	<button type="button" class="w-full py-4 px-6 bg-gray-100 text-gray-400 text-lg font-medium rounded-xl cursor-not-allowed" disabled>
		{@render awaiting()}
	</button>
{:then a}
	<button
		onclick={() => (buttonPromise = buttonFunction())}
		type="button"
		class="{baseClass}"
	>
		{@render name()}
	</button>
{:catch error}
	<button
		onclick={() => (buttonPromise = buttonFunction())}
		type="button"
		class="w-full py-4 px-6 bg-gray-900 text-white text-lg font-medium rounded-xl transition-all duration-200 hover:bg-gray-800 active:bg-gray-950 hover:scale-105"
	>
		{@render name()}
	</button>
	{@html (() => {
		console.error(error);
	})()}
{/await}
