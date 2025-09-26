<script lang="ts">
	import type { Snippet } from "svelte";

	let {
		name,
		awaiting,
		buttonFunction,
		baseClass = ["rounded border px-4 h-8 text-xl font-bold"],
		hoverClass = ["text-gray-600 hover:text-blue-600"],
		lazyClass = ["text-gray-300"]
	}: {
		name: Snippet;
		awaiting: Snippet;
		buttonFunction: () => Promise<any>;
		baseClass?: string[];
		hoverClass?: string[];
		lazyClass?: string[];
	} = $props();
	let buttonPromise: Promise<any> | undefined = $state();
</script>

{#await buttonPromise}
	<button type="button" class={[...baseClass, ...lazyClass]} disabled>
		{@render awaiting()}
	</button>
{:then _}
	<button
		onclick={() => (buttonPromise = buttonFunction())}
		type="button"
		class={[...baseClass, ...hoverClass]}
	>
		{@render name()}
	</button>
{:catch error}
	<button
		onclick={() => (buttonPromise = buttonFunction())}
		type="button"
		class={[...baseClass, ...hoverClass]}
	>
		{@render name()}
	</button>
	{@html (() => {
		console.error(error);
	})()}
{/await}
