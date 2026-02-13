<script lang="ts">
	type Option = {
		label: string;
		value: string;
	};

	let {
		options,
		value = $bindable(),
		onChange
	}: {
		options: Option[];
		value: string;
		onChange?: (value: string) => void;
	} = $props();
</script>

<div class="inline-flex">
	{#each options as option, i (option.value)}
		<button
			type="button"
			class={[
				"h-8 border border-gray-200 px-3 text-sm transition-colors",
				i === 0 ? "rounded-l" : "",
				i === options.length - 1 ? "rounded-r" : "border-l-0",
				value === option.value
					? "bg-gray-100 font-semibold text-gray-800"
					: "bg-white text-gray-700 hover:bg-gray-50"
			]}
			onclick={() => {
				value = option.value;
				onChange?.(option.value);
			}}
		>
			{option.label}
		</button>
	{/each}
</div>
