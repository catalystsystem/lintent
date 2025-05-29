<script lang="ts">
	import type { Snippet } from "svelte";

    let { name, awaiting, buttonFunction }: {name: Snippet, awaiting: Snippet, buttonFunction: () => Promise<any>} = $props();
    let buttonPromise: Promise<any> | undefined = $state();
</script>

{#await buttonPromise}
    <button
        type="button"
        class="rounded border px-4 text-xl font-bold text-gray-300"
    disabled>
        {@render awaiting()}
    </button>
{:then a}
    <button
        onclick={() => buttonPromise = buttonFunction()}
        type="button"
        class="rounded border px-4 text-xl font-bold text-gray-600 hover:text-blue-600"
    >
        {@render name()}
    </button>
{:catch error}
    <button
        onclick={() => buttonPromise = buttonFunction()}
        type="button"
        class="rounded border px-4 text-xl font-bold text-gray-600 hover:text-blue-600"
    >
        {@render name()}
    </button>
    {@html (() => {
        console.error(error);
    })()}
{/await}