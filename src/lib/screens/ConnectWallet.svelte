<script lang="ts">
	import AwaitButton from '$lib/components/AwaitButton.svelte';

	let { onboard }: { onboard: any } = $props();
</script>

<div class="h-[29rem] w-[25rem] snap-center snap-always p-4 px-10">
	<div class="mb-14 flex h-full flex-col items-center justify-center align-middle">
		<AwaitButton buttonFunction={() => onboard.connectWallet()} baseClass={['h-full w-full']}>
			{#snippet name()}
				Connect Wallet
			{/snippet}
			{#snippet awaiting()}
				Waiting for wallet...
			{/snippet}
		</AwaitButton>
		<div></div>
	</div>
</div>
