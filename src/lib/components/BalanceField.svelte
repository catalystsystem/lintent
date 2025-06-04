<script lang="ts">
	import { toBigIntWithDecimals } from "$lib/utils/convert";

	let {
        value,
		decimals
	}: {
		value: Promise<bigint>,
			decimals: number
	} = $props();
</script>

{#await value}
	<input
		type="text"
		class="w-20 rounded border border-gray-800 bg-gray-50 px-2 py-1"
		disabled
		value="..."
	/>
{:then value}
	<input
		type="text"
		class="w-20 rounded border border-gray-800 bg-gray-50 px-2 py-1"
		disabled
		value={Number(value) / 10 ** decimals}
	/>
{:catch error}
	<input
		type="text"
		class="w-20 rounded border border-gray-800 bg-gray-50 px-2 py-1"
		disabled
		value="err"
	/>
{/await}
