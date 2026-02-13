<script lang="ts">
	import type { Snippet } from "svelte";

	let {
		name,
		awaiting,
		buttonFunction,
		size = "md",
		baseClass = [],
		hoverClass = [],
		lazyClass = []
	}: {
		name: Snippet;
		awaiting: Snippet;
		buttonFunction: () => Promise<unknown>;
		size?: "sm" | "md";
		baseClass?: string[];
		hoverClass?: string[];
		lazyClass?: string[];
	} = $props();
	const sizeClass = $derived(size === "sm" ? "h-7 px-2 text-xs" : "h-8 px-3 text-sm");
	const defaultBase = $derived([
		sizeClass,
		"rounded border border-gray-200 bg-white font-semibold text-gray-700"
	]);
	const defaultHover = ["hover:border-sky-300 hover:text-sky-700"];
	const defaultLazy = ["cursor-not-allowed text-gray-400"];
	let buttonPromise: Promise<unknown> | undefined = $state();
</script>

{#await buttonPromise}
	<button
		type="button"
		class={[...defaultBase, ...baseClass, ...defaultLazy, ...lazyClass]}
		disabled
	>
		{@render awaiting()}
	</button>
{:then}
	<button
		onclick={() => (buttonPromise = buttonFunction())}
		type="button"
		class={[...defaultBase, ...baseClass, ...defaultHover, ...hoverClass]}
	>
		{@render name()}
	</button>
{:catch}
	<button
		onclick={() => (buttonPromise = buttonFunction())}
		type="button"
		class={[...defaultBase, ...baseClass, ...defaultHover, ...hoverClass]}
	>
		{@render name()}
	</button>
{/await}
