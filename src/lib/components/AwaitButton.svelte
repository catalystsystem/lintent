<script lang="ts">
	import type { Snippet } from "svelte";

    let { name, awaiting, buttonFunction, baseClass = "rounded border px-4 h-8 text-xl font-bold" }: {name: Snippet, awaiting: Snippet, buttonFunction: () => Promise<any>, baseClass?: string} = $props();
    let buttonPromise: Promise<any> | undefined = $state();
</script>

{#await buttonPromise}
    <button
        type="button"
        class="{baseClass} text-gray-300"
    disabled>
        {@render awaiting()}
    </button>
{:then a}
    <button
        onclick={() => buttonPromise = buttonFunction()}
        type="button"
        class="{baseClass} text-gray-600 hover:text-blue-600 bg-gray"
    >
        {@render name()}
    </button>
{:catch error}
    <button
        onclick={() => buttonPromise = buttonFunction()}
        type="button"
        class="{baseClass} text-gray-600 hover:text-blue-600"
    >
        {@render name()}
    </button>
    {@html (() => {
        console.error(error);
    })()}
{/await}