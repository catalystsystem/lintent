<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';

	let { children } = $props();
	let mounted = $state(false);

	onMount(() => {
		setTimeout(() => {
			mounted = true;
		}, 100);
	});
</script>

<div class="transition-all duration-1000 {mounted ? 'opacity-100' : 'opacity-0'}">
	{@render children()}
</div>
